import { 
  BaseStorageProvider, 
  UploadOptions, 
  UploadResult, 
  SignedUrlOptions, 
  FileMetadata,
  HealthCheckResult 
} from './IStorageProvider';
import { OracleCloudConfig } from '@/config/storage.config';
import * as oci from 'oci-sdk';

/**
 * Oracle Cloud Object Storage Provider
 * Implements storage operations using Oracle Cloud Infrastructure (OCI)
 */
export class OracleCloudStorage extends BaseStorageProvider {
  private config: OracleCloudConfig;
  private objectStorageClient: oci.objectstorage.ObjectStorageClient;
  private namespace: string;
  private bucketName: string;

  constructor(config: OracleCloudConfig) {
    super('oracle_cloud');
    this.config = config;
    this.namespace = config.namespace;
    this.bucketName = config.bucketName;

    // Initialize OCI client
    this.objectStorageClient = this.initializeClient();
  }

  /**
   * Initialize Oracle Cloud Object Storage client
   */
  private initializeClient(): oci.objectstorage.ObjectStorageClient {
    try {
      // Create authentication provider
      const provider = new oci.common.SimpleAuthenticationDetailsProvider(
        this.config.tenancyId,
        this.config.userId,
        this.config.fingerprint,
        this.config.privateKey,
        null, // passphrase (null if no passphrase)
        oci.common.Region.fromRegionId(this.config.region)
      );

      // Create object storage client
      const client = new oci.objectstorage.ObjectStorageClient({
        authenticationDetailsProvider: provider
      });

      console.log(`Oracle Cloud Storage client initialized for region: ${this.config.region}`);
      return client;
    } catch (error: any) {
      console.error('Failed to initialize Oracle Cloud Storage client:', error);
      throw new Error(`Oracle Cloud client initialization failed: ${error.message}`);
    }
  }

  /**
   * Upload file to Oracle Cloud Object Storage
   */
  async upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    try {
      this.validateKey(key);

      const putObjectRequest: oci.objectstorage.requests.PutObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        objectName: key,
        putObjectBody: buffer,
        contentLength: buffer.length,
        contentType: options?.contentType || 'application/octet-stream',
        contentDisposition: options?.contentDisposition,
        cacheControl: options?.cacheControl,
        opcMeta: options?.metadata
      };

      const response = await this.objectStorageClient.putObject(putObjectRequest);

      // Generate signed URL for the uploaded file
      const signedUrl = await this.getSignedUrl(key, {
        expiresIn: this.config.urlExpirySeconds
      });

      return {
        success: true,
        key,
        url: signedUrl,
        size: buffer.length,
        etag: response.eTag,
        contentType: options?.contentType || 'application/octet-stream',
        metadata: options?.metadata
      };
    } catch (error: any) {
      console.error(`Failed to upload file to Oracle Cloud: ${key}`, error);
      throw new Error(`Oracle Cloud upload failed: ${error.message}`);
    }
  }

  /**
   * Download file from Oracle Cloud Object Storage
   */
  async download(key: string): Promise<Buffer> {
    try {
      this.validateKey(key);

      const getObjectRequest: oci.objectstorage.requests.GetObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        objectName: key
      };

      const response = await this.objectStorageClient.getObject(getObjectRequest);
      
      // Convert stream to Buffer
      // The response.value can be either a ReadableStream or already a Buffer
      if (Buffer.isBuffer(response.value)) {
        return response.value;
      }
      
      // Handle ReadableStream
      const chunks: Buffer[] = [];
      const stream = response.value as any;
      
      return new Promise((resolve, reject) => {
        if (stream.on) {
          // Node.js stream
          stream
            .on('data', (chunk: Buffer) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)))
            .on('error', reject);
        } else if (stream.getReader) {
          // Web ReadableStream
          const reader = stream.getReader();
          const readChunks = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(Buffer.from(value));
              }
              resolve(Buffer.concat(chunks));
            } catch (error) {
              reject(error);
            }
          };
          readChunks();
        } else {
          reject(new Error('Unsupported stream type'));
        }
      });
    } catch (error: any) {
      console.error(`Failed to download file from Oracle Cloud: ${key}`, error);
      
      if (error.statusCode === 404) {
        throw new Error(`File not found: ${key}`);
      }
      
      throw new Error(`Oracle Cloud download failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Oracle Cloud Object Storage
   */
  async delete(key: string): Promise<void> {
    try {
      this.validateKey(key);

      const deleteObjectRequest: oci.objectstorage.requests.DeleteObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        objectName: key
      };

      await this.objectStorageClient.deleteObject(deleteObjectRequest);
    } catch (error: any) {
      console.error(`Failed to delete file from Oracle Cloud: ${key}`, error);
      
      // Ignore 404 errors (file already doesn't exist)
      if (error.statusCode !== 404) {
        throw new Error(`Oracle Cloud delete failed: ${error.message}`);
      }
    }
  }

  /**
   * Delete multiple files from Oracle Cloud
   */
  async deleteMany(keys: string[]): Promise<void> {
    // OCI doesn't have batch delete, so we delete sequentially
    // We could parallelize this, but let's keep it simple for now
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Check if file exists in Oracle Cloud Object Storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      this.validateKey(key);

      const headObjectRequest: oci.objectstorage.requests.HeadObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        objectName: key
      };

      await this.objectStorageClient.headObject(headObjectRequest);
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw new Error(`Oracle Cloud exists check failed: ${error.message}`);
    }
  }

  /**
   * Get signed URL for file access (pre-authenticated request)
   */
  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    try {
      this.validateKey(key);

      const expiresIn = options?.expiresIn || this.config.urlExpirySeconds;
      const expirationDate = new Date();
      expirationDate.setSeconds(expirationDate.getSeconds() + expiresIn);

      // Create pre-authenticated request (PAR)
      const createPreauthenticatedRequestDetails: oci.objectstorage.models.CreatePreauthenticatedRequestDetails = {
        name: `par-${key}-${Date.now()}`,
        objectName: key,
        accessType: oci.objectstorage.models.CreatePreauthenticatedRequestDetails.AccessType.ObjectRead,
        timeExpires: expirationDate
      };

      const createParRequest: oci.objectstorage.requests.CreatePreauthenticatedRequestRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        createPreauthenticatedRequestDetails
      };

      const response = await this.objectStorageClient.createPreauthenticatedRequest(createParRequest);

      // Construct full URL
      const region = this.config.region;
      const fullUrl = `https://objectstorage.${region}.oraclecloud.com${response.preauthenticatedRequest.accessUri}`;

      return fullUrl;
    } catch (error: any) {
      console.error(`Failed to create signed URL for Oracle Cloud: ${key}`, error);
      throw new Error(`Oracle Cloud signed URL generation failed: ${error.message}`);
    }
  }

  /**
   * Get public URL (not applicable for private buckets)
   */
  getPublicUrl(key: string): string {
    // For private Oracle Cloud buckets, there's no direct public URL
    // Users must use signed URLs (PAR)
    const region = this.config.region;
    return `https://objectstorage.${region}.oraclecloud.com/n/${this.namespace}/b/${this.bucketName}/o/${encodeURIComponent(key)}`;
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata> {
    try {
      this.validateKey(key);

      const headObjectRequest: oci.objectstorage.requests.HeadObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        objectName: key
      };

      const response = await this.objectStorageClient.headObject(headObjectRequest);

      return {
        key,
        size: response.contentLength ? parseInt(response.contentLength.toString(), 10) : 0,
        contentType: response.contentType || 'application/octet-stream',
        lastModified: response.lastModified ? new Date(response.lastModified) : new Date(),
        etag: response.eTag,
        metadata: response.opcMeta || {}
      };
    } catch (error: any) {
      console.error(`Failed to get metadata from Oracle Cloud: ${key}`, error);
      
      if (error.statusCode === 404) {
        throw new Error(`File not found: ${key}`);
      }
      
      throw new Error(`Oracle Cloud get metadata failed: ${error.message}`);
    }
  }

  /**
   * Update file metadata
   */
  async updateMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    try {
      this.validateKey(key);

      // In OCI, we need to copy the object to itself with new metadata
      const copyObjectDetails: oci.objectstorage.models.CopyObjectDetails = {
        sourceObjectName: key,
        destinationBucket: this.bucketName,
        destinationNamespace: this.namespace,
        destinationRegion: this.config.region,
        destinationObjectName: key,
        destinationObjectMetadata: metadata
      };

      const copyObjectRequest: oci.objectstorage.requests.CopyObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        copyObjectDetails
      };

      await this.objectStorageClient.copyObject(copyObjectRequest);
    } catch (error: any) {
      console.error(`Failed to update metadata in Oracle Cloud: ${key}`, error);
      throw new Error(`Oracle Cloud update metadata failed: ${error.message}`);
    }
  }

  /**
   * List files with given prefix
   */
  async listFiles(prefix?: string, maxResults: number = 1000): Promise<string[]> {
    try {
      const listObjectsRequest: oci.objectstorage.requests.ListObjectsRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        prefix,
        limit: maxResults
      };

      const response = await this.objectStorageClient.listObjects(listObjectsRequest);
      
      return (response.listObjects.objects || []).map(obj => obj.name || '');
    } catch (error: any) {
      console.error('Failed to list files in Oracle Cloud:', error);
      throw new Error(`Oracle Cloud list files failed: ${error.message}`);
    }
  }

  /**
   * Copy file within Oracle Cloud
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      this.validateKey(sourceKey);
      this.validateKey(destinationKey);

      const copyObjectDetails: oci.objectstorage.models.CopyObjectDetails = {
        sourceObjectName: sourceKey,
        destinationBucket: this.bucketName,
        destinationNamespace: this.namespace,
        destinationRegion: this.config.region,
        destinationObjectName: destinationKey
      };

      const copyObjectRequest: oci.objectstorage.requests.CopyObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        copyObjectDetails
      };

      await this.objectStorageClient.copyObject(copyObjectRequest);
    } catch (error: any) {
      console.error(`Failed to copy file in Oracle Cloud: ${sourceKey} -> ${destinationKey}`, error);
      throw new Error(`Oracle Cloud copy failed: ${error.message}`);
    }
  }

  /**
   * Health check for Oracle Cloud Storage
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Try to get bucket information
      const getBucketRequest: oci.objectstorage.requests.GetBucketRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName
      };

      const response = await this.objectStorageClient.getBucket(getBucketRequest);

      return {
        status: 'healthy',
        provider: this.providerName,
        details: {
          message: 'Oracle Cloud Storage is accessible',
          namespace: this.namespace,
          bucket: this.bucketName,
          region: this.config.region,
          timestamp: new Date(),
          bucketCreatedAt: response.bucket.timeCreated
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        provider: this.providerName,
        details: {
          message: `Oracle Cloud Storage health check failed: ${error.message}`,
          namespace: this.namespace,
          bucket: this.bucketName,
          region: this.config.region,
          timestamp: new Date(),
          error: error.message
        }
      };
    }
  }
}
