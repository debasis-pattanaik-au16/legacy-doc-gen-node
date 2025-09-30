import { promises as fs } from 'fs';
import path from 'path';
import { 
  BaseStorageProvider, 
  UploadOptions, 
  UploadResult, 
  SignedUrlOptions, 
  FileMetadata,
  HealthCheckResult 
} from './IStorageProvider';
import { storageConfig } from '@/config/storage.config';
import { config } from '@/config/env';

/**
 * Local File System Storage Provider
 * Stores files in the local file system
 * Used for development and as fallback when cloud storage is not configured
 */
export class LocalStorage extends BaseStorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath?: string) {
    super('local');
    this.basePath = basePath || storageConfig.getLocalStoragePath();
    this.baseUrl = `${config.FRONTEND_URL}/api/v1/documentation`;
  }

  /**
   * Initialize local storage - create base directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      console.log(`Local storage initialized at: ${this.basePath}`);
    } catch (error: any) {
      console.error('Failed to initialize local storage:', error);
      throw new Error(`Local storage initialization failed: ${error.message}`);
    }
  }

  /**
   * Get full file path from key
   */
  private getFilePath(key: string): string {
    this.validateKey(key);
    return path.join(this.basePath, key);
  }

  /**
   * Ensure directory exists for a file path
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
  }

  /**
   * Upload file to local storage
   */
  async upload(buffer: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    try {
      const filePath = this.getFilePath(key);
      
      // Ensure directory exists
      await this.ensureDirectory(filePath);

      // Write file
      await fs.writeFile(filePath, buffer);

      // Get file stats
      const stats = await fs.stat(filePath);

      // Store metadata if provided
      if (options?.metadata) {
        const metadataPath = `${filePath}.meta.json`;
        await fs.writeFile(metadataPath, JSON.stringify({
          ...options.metadata,
          contentType: options.contentType,
          uploadedAt: new Date().toISOString()
        }));
      }

      return {
        success: true,
        key,
        url: this.getPublicUrl(key),
        size: stats.size,
        contentType: options?.contentType || 'application/octet-stream',
        metadata: options?.metadata
      };
    } catch (error: any) {
      console.error(`Failed to upload file to local storage: ${key}`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Download file from local storage
   */
  async download(key: string): Promise<Buffer> {
    try {
      const filePath = this.getFilePath(key);
      const exists = await this.exists(key);

      if (!exists) {
        throw new Error(`File not found: ${key}`);
      }

      return await fs.readFile(filePath);
    } catch (error: any) {
      console.error(`Failed to download file from local storage: ${key}`, error);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Delete file from local storage
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const metadataPath = `${filePath}.meta.json`;

      // Delete main file
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Delete metadata file if exists
      try {
        await fs.unlink(metadataPath);
      } catch (error: any) {
        // Ignore if metadata doesn't exist
      }
    } catch (error: any) {
      console.error(`Failed to delete file from local storage: ${key}`, error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Check if file exists in local storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get signed URL (for local storage, returns regular URL)
   * Note: Local storage doesn't have true signed URLs, so we return the public URL
   */
  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    // For local storage, just return the public URL
    // In production, this would be protected by authentication
    const publicUrl = this.getPublicUrl(key);
    
    if (options?.download) {
      return `${publicUrl}?download=true`;
    }
    
    return publicUrl;
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(key: string): string {
    // Extract components from key
    // Format: documentations/{userId}/{projectId}/{documentationId}/{fileName}
    const fileName = path.basename(key);
    const parts = key.split('/');
    
    // Try new format first: documentations/userId/projectId/documentationId/fileName
    if (parts.length >= 5 && parts[0] === 'documentations') {
      const projectId = parts[2];
      return `${this.baseUrl}/${projectId}/download/${fileName}`;
    }
    
    // Fallback to old format for backward compatibility
    const projectId = parts[1] || 'unknown';
    return `${this.baseUrl}/${projectId}/download/${fileName}`;
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata> {
    try {
      const filePath = this.getFilePath(key);
      const metadataPath = `${filePath}.meta.json`;

      // Get file stats
      const stats = await fs.stat(filePath);

      // Try to read stored metadata
      let storedMetadata: any = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        storedMetadata = JSON.parse(metadataContent);
      } catch {
        // No stored metadata
      }

      return {
        key,
        size: stats.size,
        contentType: storedMetadata.contentType || 'application/octet-stream',
        lastModified: stats.mtime,
        metadata: storedMetadata
      };
    } catch (error: any) {
      console.error(`Failed to get metadata for file: ${key}`, error);
      throw new Error(`Get metadata failed: ${error.message}`);
    }
  }

  /**
   * Update file metadata
   */
  async updateMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const metadataPath = `${filePath}.meta.json`;

      // Read existing metadata
      let existingMetadata: any = {};
      try {
        const content = await fs.readFile(metadataPath, 'utf-8');
        existingMetadata = JSON.parse(content);
      } catch {
        // No existing metadata
      }

      // Merge and save
      const updatedMetadata = {
        ...existingMetadata,
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));
    } catch (error: any) {
      console.error(`Failed to update metadata for file: ${key}`, error);
      throw new Error(`Update metadata failed: ${error.message}`);
    }
  }

  /**
   * List files with given prefix
   */
  async listFiles(prefix?: string, maxResults: number = 1000): Promise<string[]> {
    try {
      const searchPath = prefix ? path.join(this.basePath, prefix) : this.basePath;
      const files: string[] = [];

      const walkDir = async (dir: string): Promise<void> => {
        if (files.length >= maxResults) return;

        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            if (files.length >= maxResults) break;

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              await walkDir(fullPath);
            } else if (!entry.name.endsWith('.meta.json')) {
              // Convert absolute path to relative key
              const relativeKey = path.relative(this.basePath, fullPath);
              files.push(relativeKey);
            }
          }
        } catch (error) {
          // Directory might not exist, skip
        }
      };

      await walkDir(searchPath);
      return files;
    } catch (error: any) {
      console.error('Failed to list files in local storage:', error);
      throw new Error(`List files failed: ${error.message}`);
    }
  }

  /**
   * Health check for local storage
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Check if base path exists and is writable
      await fs.access(this.basePath, fs.constants.W_OK);

      // Try to write a test file
      const testKey = '.health-check-test';
      const testBuffer = Buffer.from('health check');
      await this.upload(testBuffer, testKey);
      await this.delete(testKey);

      return {
        status: 'healthy',
        provider: this.providerName,
        details: {
          message: 'Local storage is accessible and writable',
          basePath: this.basePath,
          timestamp: new Date()
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        provider: this.providerName,
        details: {
          message: `Local storage health check failed: ${error.message}`,
          basePath: this.basePath,
          timestamp: new Date(),
          error: error.message
        }
      };
    }
  }

  /**
   * Get base path for local storage
   */
  getBasePath(): string {
    return this.basePath;
  }
}
