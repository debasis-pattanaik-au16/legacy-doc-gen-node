/**
 * Storage Interface Types
 * Defines abstractions for file storage that can support local, S3, and other cloud providers
 */

export interface StorageProvider {
  name: 'local' | 's3' | 'azure' | 'gcp';
  config: any;
}

export interface StorageFile {
  key: string;          // Unique identifier for the file
  originalName: string; // Original filename
  mimeType: string;
  size: number;
  url?: string;         // Public URL (for cloud storage)
  path?: string;        // Local path (for local storage)
  metadata?: Record<string, any>;
}

export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, any>;
  isPublic?: boolean;
  expiresIn?: number; // Seconds
}

export interface StorageListOptions {
  prefix?: string;
  limit?: number;
  continuationToken?: string;
}

export interface StorageListResult {
  files: StorageFile[];
  continuationToken?: string;
  hasMore: boolean;
}

/**
 * Abstract storage interface that all storage providers must implement
 */
export interface IStorageService {
  provider: StorageProvider;
  
  // Core operations
  upload(key: string, content: Buffer | string, options?: StorageUploadOptions): Promise<StorageFile>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  
  // Metadata operations
  getMetadata(key: string): Promise<StorageFile>;
  updateMetadata(key: string, metadata: Record<string, any>): Promise<void>;
  
  // List operations
  list(options?: StorageListOptions): Promise<StorageListResult>;
  
  // URL operations
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getPublicUrl(key: string): string;
  
  // Batch operations
  uploadMultiple(files: Array<{ key: string; content: Buffer | string; options?: StorageUploadOptions }>): Promise<StorageFile[]>;
  deleteMultiple(keys: string[]): Promise<void>;
  
  // Utility operations
  generateKey(prefix?: string, extension?: string): string;
  validateKey(key: string): boolean;
  
  // Health check
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }>;
}

/**
 * Documentation-specific storage interface
 */
export interface IDocumentationStorage {
  // Project-level operations
  saveProjectDocumentation(projectId: string, jobId: string, docs: DocumentationFiles): Promise<DocumentationStorageResult>;
  getProjectDocumentation(projectId: string, jobId?: string): Promise<DocumentationFiles | null>;
  deleteProjectDocumentation(projectId: string, jobId?: string): Promise<void>;
  listProjectDocumentations(projectId: string): Promise<DocumentationStorageResult[]>;
  
  // File-level operations  
  getDocumentationFile(projectId: string, fileName: string, jobId?: string): Promise<Buffer>;
  getDocumentationUrl(projectId: string, fileName: string, jobId?: string): Promise<string>;
  
  // Archive operations
  createDocumentationArchive(projectId: string, jobId: string): Promise<string>;
  getArchiveUrl(projectId: string, jobId: string): Promise<string>;
}

export interface DocumentationFiles {
  readme?: string;
  apiDocs?: string;
  architecture?: string;
  components?: string;
  dependencies?: string;
  [key: string]: string | undefined;
}

export interface DocumentationStorageResult {
  projectId: string;
  jobId: string;
  files: Array<{
    type: keyof DocumentationFiles;
    key: string;
    url: string;
    size: number;
    createdAt: Date;
  }>;
  archiveKey?: string;
  archiveUrl?: string;
  totalSize: number;
  createdAt: Date;
}