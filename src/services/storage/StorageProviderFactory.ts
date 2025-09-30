import { IStorageProvider } from './IStorageProvider';
import { LocalStorage } from './LocalStorage';
import { OracleCloudStorage } from './OracleCloudStorage';
import { storageConfig, StorageProviderType } from '@/config/storage.config';

/**
 * Storage Provider Factory
 * Creates the appropriate storage provider based on configuration
 * Supports easy switching between storage providers
 */
export class StorageProviderFactory {
  private static instance: IStorageProvider | null = null;

  /**
   * Create storage provider based on configuration
   * @param providerType Optional provider type to override config
   * @returns Storage provider instance
   */
  static create(providerType?: StorageProviderType): IStorageProvider {
    const type = providerType || storageConfig.getProviderType();

    console.log(`Creating storage provider: ${type}`);

    switch (type) {
      case StorageProviderType.ORACLE_CLOUD:
        return this.createOracleCloudProvider();

      case StorageProviderType.AWS_S3:
        throw new Error('AWS S3 storage provider not yet implemented. Use LOCAL or ORACLE_CLOUD.');

      case StorageProviderType.AZURE_BLOB:
        throw new Error('Azure Blob storage provider not yet implemented. Use LOCAL or ORACLE_CLOUD.');

      case StorageProviderType.GCP:
        throw new Error('Google Cloud storage provider not yet implemented. Use LOCAL or ORACLE_CLOUD.');

      case StorageProviderType.LOCAL:
      default:
        return this.createLocalProvider();
    }
  }

  /**
   * Get singleton instance of storage provider
   * Creates one if it doesn't exist
   */
  static getInstance(): IStorageProvider {
    if (!this.instance) {
      this.instance = this.create();
    }
    return this.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Create local storage provider
   */
  private static createLocalProvider(): IStorageProvider {
    try {
      const provider = new LocalStorage();
      console.log('Local storage provider created successfully');
      return provider;
    } catch (error: any) {
      console.error('Failed to create local storage provider:', error);
      throw new Error(`Local storage provider creation failed: ${error.message}`);
    }
  }

  /**
   * Create Oracle Cloud storage provider
   */
  private static createOracleCloudProvider(): IStorageProvider {
    try {
      // Validate configuration
      const validation = storageConfig.validateConfig();
      
      if (!validation.valid) {
        const errors = validation.errors.join(', ');
        console.error('Oracle Cloud configuration is invalid:', errors);
        throw new Error(`Oracle Cloud configuration is invalid: ${errors}`);
      }

      const config = storageConfig.getOracleCloudConfig();
      const provider = new OracleCloudStorage(config);
      
      console.log('Oracle Cloud storage provider created successfully');
      return provider;
    } catch (error: any) {
      console.error('Failed to create Oracle Cloud storage provider:', error);
      
      // Fallback to local storage if Oracle Cloud fails
      console.warn('Falling back to local storage due to Oracle Cloud initialization failure');
      return this.createLocalProvider();
    }
  }

  /**
   * Validate current provider configuration
   */
  static validateConfiguration(): { valid: boolean; errors: string[]; provider: string } {
    const providerType = storageConfig.getProviderType();
    
    if (providerType === StorageProviderType.LOCAL) {
      return {
        valid: true,
        errors: [],
        provider: providerType
      };
    }

    const validation = storageConfig.validateConfig();
    
    return {
      ...validation,
      provider: providerType
    };
  }

  /**
   * Test storage provider connectivity
   */
  static async testConnection(providerType?: StorageProviderType): Promise<{
    success: boolean;
    provider: string;
    message: string;
    details?: any;
  }> {
    try {
      const provider = this.create(providerType);
      const healthCheck = await provider.healthCheck();

      return {
        success: healthCheck.status === 'healthy',
        provider: provider.getProviderName(),
        message: healthCheck.details.message,
        details: healthCheck.details
      };
    } catch (error: any) {
      return {
        success: false,
        provider: providerType || storageConfig.getProviderType(),
        message: `Connection test failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Get information about current storage configuration
   */
  static getProviderInfo(): {
    type: string;
    isCloud: boolean;
    config: any;
  } {
    const providerType = storageConfig.getProviderType();
    const isCloud = storageConfig.isCloudProvider();
    
    let config: any = {};
    
    if (isCloud) {
      const providerConfig = storageConfig.getCurrentProviderConfig();
      
      // Remove sensitive information
      if (providerType === StorageProviderType.ORACLE_CLOUD && providerConfig) {
        const ociConfig = providerConfig as any;
        config = {
          namespace: ociConfig.namespace,
          bucketName: ociConfig.bucketName,
          region: ociConfig.region,
          urlExpirySeconds: ociConfig.urlExpirySeconds
        };
      }
    } else {
      config = {
        basePath: storageConfig.getLocalStoragePath()
      };
    }

    return {
      type: providerType,
      isCloud,
      config
    };
  }
}

// Export convenience method
export const getStorageProvider = (): IStorageProvider => {
  return StorageProviderFactory.getInstance();
};
