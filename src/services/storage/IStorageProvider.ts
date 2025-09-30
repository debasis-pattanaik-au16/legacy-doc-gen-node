/**
 * Storage Provider Interface
 * Defines the contract that all storage providers must implement
 * This allows easy switching between different cloud storage providers (Oracle, AWS, Azure, GCP)
 */

/**
 * Upload options for file uploads
 */
export interface UploadOptions {
  contentType?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
  cacheControl?: string;
}

/**
 * Result of a successful upload operation
 */
export interface UploadResult {
  success: boolean;
  key: string;           // Storage key/path
  url: string;           // Public or signed URL
  publicUrl?: string;    // Direct public URL (if public)
  size: number;          // File size in bytes
  etag?: string;         // Entity tag for caching
  contentType?: string;  // MIME type
  metadata?: Record<string, string>;
}

/**
 * Options for generating signed URLs
 */
export interface SignedUrlOptions {
  expiresIn?: number;                    // Expiry time in seconds
  responseContentType?: string;          // Override content type in response
  responseContentDisposition?: string;   // Override content disposition (e.g., attachment)
  download?: boolean;                    // Force download instead of inline view
}

/**
 * File metadata information
 */
export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  provider: string;
  details: {
    message: string;
    timestamp: Date;
    [key: string]: any;
  };
}

/**
 * Storage provider interface
 * All cloud storage implementations must adhere to this interface
 */
export interface IStorageProvider {
  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Upload a file to storage
   * @param buffer File content as Buffer
   * @param key Storage key/path
   * @param options Upload options
   * @returns Upload result with URL
   */
  upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Download a file from storage
   * @param key Storage key/path
   * @returns File content as Buffer
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * @param key Storage key/path
   */
  delete(key: string): Promise<void>;

  /**
   * Delete multiple files from storage
   * @param keys Array of storage keys
   */
  deleteMany(keys: string[]): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param key Storage key/path
   * @returns True if file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get a signed URL for accessing a file
   * @param key Storage key/path
   * @param options Signed URL options
   * @returns Signed URL string
   */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Get a public URL for a file (if public)
   * @param key Storage key/path
   * @returns Public URL string
   */
  getPublicUrl(key: string): string;

  /**
   * Get file metadata
   * @param key Storage key/path
   * @returns File metadata
   */
  getMetadata(key: string): Promise<FileMetadata>;

  /**
   * Update file metadata
   * @param key Storage key/path
   * @param metadata Metadata to update
   */
  updateMetadata(key: string, metadata: Record<string, string>): Promise<void>;

  /**
   * List files with a given prefix
   * @param prefix Key prefix to filter by
   * @param maxResults Maximum number of results
   * @returns Array of file keys
   */
  listFiles(prefix?: string, maxResults?: number): Promise<string[]>;

  /**
   * Copy a file within storage
   * @param sourceKey Source file key
   * @param destinationKey Destination file key
   */
  copy(sourceKey: string, destinationKey: string): Promise<void>;

  /**
   * Move a file within storage (copy + delete source)
   * @param sourceKey Source file key
   * @param destinationKey Destination file key
   */
  move(sourceKey: string, destinationKey: string): Promise<void>;

  /**
   * Get total storage size used
   * @param prefix Optional prefix to filter by
   * @returns Total size in bytes
   */
  getStorageSize(prefix?: string): Promise<number>;

  /**
   * Health check for the storage provider
   * @returns Health check result
   */
  healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Base class for storage providers with common functionality
 */
export abstract class BaseStorageProvider implements IStorageProvider {
  protected providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  getProviderName(): string {
    return this.providerName;
  }

  abstract upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<UploadResult>;
  abstract download(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
  abstract getPublicUrl(key: string): string;
  abstract getMetadata(key: string): Promise<FileMetadata>;
  abstract updateMetadata(key: string, metadata: Record<string, string>): Promise<void>;
  abstract listFiles(prefix?: string, maxResults?: number): Promise<string[]>;
  abstract healthCheck(): Promise<HealthCheckResult>;

  /**
   * Default implementation for deleteMany
   */
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.delete(key)));
  }

  /**
   * Default implementation for copy
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const buffer = await this.download(sourceKey);
    const metadata = await this.getMetadata(sourceKey);
    await this.upload(buffer, destinationKey, {
      contentType: metadata.contentType,
      metadata: metadata.metadata
    });
  }

  /**
   * Default implementation for move
   */
  async move(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copy(sourceKey, destinationKey);
    await this.delete(sourceKey);
  }

  /**
   * Default implementation for getStorageSize
   */
  async getStorageSize(prefix?: string): Promise<number> {
    const files = await this.listFiles(prefix);
    let totalSize = 0;

    for (const key of files) {
      try {
        const metadata = await this.getMetadata(key);
        totalSize += metadata.size;
      } catch (error) {
        // Skip files that can't be accessed
        console.warn(`Could not get metadata for ${key}:`, error);
      }
    }

    return totalSize;
  }

  /**
   * Generate a storage key with proper path structure
   * Format: documentations/{userId}/{projectId}/{documentationId}/{fileName}
   */
  protected generateKey(userId: string, projectId: string, documentationId: string, fileName: string): string {
    return `documentations/${userId}/${projectId}/${documentationId}/${fileName}`;
  }

  /**
   * Generate a storage key for a project (backward compatibility)
   * @deprecated Use generateKey with userId instead
   */
  protected generateProjectKey(projectId: string, fileName: string, jobId?: string): string {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const basePath = `documentations/projects/${projectId}`;
    
    if (jobId) {
      return `${basePath}/${jobId}/${fileName}`;
    }
    
    return `${basePath}/${timestamp}/${fileName}`;
  }

  /**
   * Validate file key format
   */
  protected validateKey(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new Error('Storage key cannot be empty');
    }

    if (key.includes('..')) {
      throw new Error('Storage key cannot contain ".."');
    }

    if (key.startsWith('/')) {
      throw new Error('Storage key cannot start with "/"');
    }
  }

  /**
   * Sanitize file key
   */
  protected sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9._\/-]/g, '_');
  }
}
