import { config } from './env';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Storage Provider Types
 */
export enum StorageProviderType {
  LOCAL = 'local',
  ORACLE_CLOUD = 'oracle_cloud',
  AWS_S3 = 'aws_s3',
  AZURE_BLOB = 'azure_blob',
  GCP = 'gcp'
}

/**
 * Base Storage Configuration
 */
export interface BaseStorageConfig {
  provider: StorageProviderType;
  maxFileSize: number;
  allowedExtensions: string[];
  urlExpirySeconds: number;
}

/**
 * Oracle Cloud Storage Configuration
 */
export interface OracleCloudConfig {
  namespace: string;
  bucketName: string;
  region: string;
  tenancyId: string;
  userId: string;
  fingerprint: string;
  privateKey: string; // The actual key content, not path
  urlExpirySeconds: number;
}

/**
 * AWS S3 Storage Configuration
 */
export interface AWSS3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  urlExpirySeconds: number;
}

/**
 * Azure Blob Storage Configuration
 */
export interface AzureBlobConfig {
  account: string;
  key: string;
  containerName: string;
  urlExpirySeconds: number;
}

/**
 * Google Cloud Storage Configuration
 */
export interface GCPConfig {
  projectId: string;
  bucketName: string;
  keyFilePath: string;
  urlExpirySeconds: number;
}

/**
 * Storage Configuration Class
 * Centralized configuration for all storage providers
 */
class StorageConfiguration {
  private static instance: StorageConfiguration;

  private constructor() {}

  public static getInstance(): StorageConfiguration {
    if (!StorageConfiguration.instance) {
      StorageConfiguration.instance = new StorageConfiguration();
    }
    return StorageConfiguration.instance;
  }

  /**
   * Get base storage configuration
   */
  public getBaseConfig(): BaseStorageConfig {
    return {
      provider: this.getProviderType(),
      maxFileSize: config.MAX_FILE_SIZE,
      allowedExtensions: ['.md', '.txt', '.json', '.zip', '.html', '.pdf'],
      urlExpirySeconds: this.getUrlExpiryForProvider()
    };
  }

  /**
   * Get current storage provider type
   */
  public getProviderType(): StorageProviderType {
    const provider = config.STORAGE_PROVIDER.toLowerCase();
    
    if (Object.values(StorageProviderType).includes(provider as StorageProviderType)) {
      return provider as StorageProviderType;
    }
    
    console.warn(`Invalid storage provider "${provider}", falling back to local storage`);
    return StorageProviderType.LOCAL;
  }

  /**
   * Get Oracle Cloud configuration
   */
  public getOracleCloudConfig(): OracleCloudConfig {
    // Read private key from file
    let privateKey = '';
    
    if (config.OCI_PRIVATE_KEY_PATH) {
      try {
        const keyPath = resolve(config.OCI_PRIVATE_KEY_PATH);
        privateKey = readFileSync(keyPath, 'utf-8');
      } catch (error: any) {
        console.error(`Failed to read Oracle Cloud private key: ${error.message}`);
        throw new Error(`Oracle Cloud private key not found at: ${config.OCI_PRIVATE_KEY_PATH}`);
      }
    }

    return {
      namespace: config.OCI_NAMESPACE,
      bucketName: config.OCI_BUCKET_NAME,
      region: config.OCI_REGION,
      tenancyId: config.OCI_TENANCY_ID,
      userId: config.OCI_USER_ID,
      fingerprint: config.OCI_FINGERPRINT,
      privateKey,
      urlExpirySeconds: config.OCI_PUBLIC_URL_EXPIRY
    };
  }

  /**
   * Get AWS S3 configuration
   */
  public getAWSS3Config(): AWSS3Config {
    return {
      bucket: config.AWS_S3_BUCKET,
      region: config.AWS_REGION,
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      urlExpirySeconds: config.AWS_URL_EXPIRY
    };
  }

  /**
   * Get Azure Blob configuration
   */
  public getAzureBlobConfig(): AzureBlobConfig {
    return {
      account: config.AZURE_STORAGE_ACCOUNT,
      key: config.AZURE_STORAGE_KEY,
      containerName: config.AZURE_CONTAINER_NAME,
      urlExpirySeconds: config.AZURE_URL_EXPIRY
    };
  }

  /**
   * Get Google Cloud Storage configuration
   */
  public getGCPConfig(): GCPConfig {
    return {
      projectId: config.GCP_PROJECT_ID,
      bucketName: config.GCP_BUCKET_NAME,
      keyFilePath: config.GCP_KEY_FILE_PATH,
      urlExpirySeconds: config.GCP_URL_EXPIRY
    };
  }

  /**
   * Get URL expiry for current provider
   */
  private getUrlExpiryForProvider(): number {
    const provider = this.getProviderType();
    
    switch (provider) {
      case StorageProviderType.ORACLE_CLOUD:
        return config.OCI_PUBLIC_URL_EXPIRY;
      case StorageProviderType.AWS_S3:
        return config.AWS_URL_EXPIRY;
      case StorageProviderType.AZURE_BLOB:
        return config.AZURE_URL_EXPIRY;
      case StorageProviderType.GCP:
        return config.GCP_URL_EXPIRY;
      default:
        return 3600; // 1 hour default
    }
  }

  /**
   * Validate storage configuration for current provider
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const provider = this.getProviderType();

    switch (provider) {
      case StorageProviderType.ORACLE_CLOUD:
        if (!config.OCI_NAMESPACE) errors.push('OCI_NAMESPACE is required');
        if (!config.OCI_BUCKET_NAME) errors.push('OCI_BUCKET_NAME is required');
        if (!config.OCI_REGION) errors.push('OCI_REGION is required');
        if (!config.OCI_TENANCY_ID) errors.push('OCI_TENANCY_ID is required');
        if (!config.OCI_USER_ID) errors.push('OCI_USER_ID is required');
        if (!config.OCI_FINGERPRINT) errors.push('OCI_FINGERPRINT is required');
        if (!config.OCI_PRIVATE_KEY_PATH) errors.push('OCI_PRIVATE_KEY_PATH is required');
        break;

      case StorageProviderType.AWS_S3:
        if (!config.AWS_S3_BUCKET) errors.push('AWS_S3_BUCKET is required');
        if (!config.AWS_REGION) errors.push('AWS_REGION is required');
        if (!config.AWS_ACCESS_KEY_ID) errors.push('AWS_ACCESS_KEY_ID is required');
        if (!config.AWS_SECRET_ACCESS_KEY) errors.push('AWS_SECRET_ACCESS_KEY is required');
        break;

      case StorageProviderType.AZURE_BLOB:
        if (!config.AZURE_STORAGE_ACCOUNT) errors.push('AZURE_STORAGE_ACCOUNT is required');
        if (!config.AZURE_STORAGE_KEY) errors.push('AZURE_STORAGE_KEY is required');
        if (!config.AZURE_CONTAINER_NAME) errors.push('AZURE_CONTAINER_NAME is required');
        break;

      case StorageProviderType.GCP:
        if (!config.GCP_PROJECT_ID) errors.push('GCP_PROJECT_ID is required');
        if (!config.GCP_BUCKET_NAME) errors.push('GCP_BUCKET_NAME is required');
        if (!config.GCP_KEY_FILE_PATH) errors.push('GCP_KEY_FILE_PATH is required');
        break;

      case StorageProviderType.LOCAL:
        // No validation needed for local storage
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration for current provider
   */
  public getCurrentProviderConfig(): OracleCloudConfig | AWSS3Config | AzureBlobConfig | GCPConfig | null {
    const provider = this.getProviderType();

    switch (provider) {
      case StorageProviderType.ORACLE_CLOUD:
        return this.getOracleCloudConfig();
      case StorageProviderType.AWS_S3:
        return this.getAWSS3Config();
      case StorageProviderType.AZURE_BLOB:
        return this.getAzureBlobConfig();
      case StorageProviderType.GCP:
        return this.getGCPConfig();
      default:
        return null; // Local storage doesn't need config
    }
  }

  /**
   * Check if provider is cloud-based
   */
  public isCloudProvider(): boolean {
    return this.getProviderType() !== StorageProviderType.LOCAL;
  }

  /**
   * Get storage path for local storage
   */
  public getLocalStoragePath(): string {
    return config.STORAGE_PATH || './storage';
  }
}

// Export singleton instance
export const storageConfig = StorageConfiguration.getInstance();

// Export types
export type StorageProviderConfig = OracleCloudConfig | AWSS3Config | AzureBlobConfig | GCPConfig;
