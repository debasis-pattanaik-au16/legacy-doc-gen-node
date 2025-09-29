import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { logger } from '@/utils/logger';
import { config } from '@/config/env';
import archiver from 'archiver';
import { GeneratedDocumentation } from './documentationGenerator';

/**
 * File paths interface for generated documentation
 */
export interface DocumentationFilePaths {
  readme?: string;
  apiDocs?: string;
  architecture?: string;
  components?: string;
  dependencies?: string;
  zipFile?: string;
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  checksum?: string;
}

/**
 * Storage configuration interface
 */
export interface StorageConfig {
  basePath: string;
  maxFileSize: number;
  allowedExtensions: string[];
  cleanupAfterDays: number;
}

/**
 * File Storage Service
 * Handles secure file storage, organization, and management for generated documentation
 */
export class FileStorageService {
  private basePath: string;
  private config: StorageConfig;

  constructor() {
    this.basePath = path.resolve(process.cwd(), 'storage', 'documentation');
    this.config = {
      basePath: this.basePath,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.md', '.txt', '.json', '.zip'],
      cleanupAfterDays: 30
    };
  }

  /**
   * Initialize storage service - create directories if they don't exist
   */
  public async initialize(): Promise<void> {
    try {
      await this.ensureDirectoryExists(this.basePath);
      logger.info(`File storage service initialized at: ${this.basePath}`);
    } catch (error: any) {
      logger.error('Failed to initialize file storage service:', error);
      throw new Error(`File storage initialization failed: ${error.message}`);
    }
  }

  /**
   * Save generated documentation files
   */
  public async saveDocumentation(
    projectId: string, 
    projectName: string,
    docs: GeneratedDocumentation,
    jobId?: string
  ): Promise<DocumentationFilePaths> {
    try {
      logger.info(`Saving documentation for project: ${projectId}`);

      // Create project directory
      const projectDir = await this.createProjectDirectory(projectId, projectName);
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const sessionDir = path.join(projectDir, `generation_${timestamp}${jobId ? `_${jobId}` : ''}`);
      
      await this.ensureDirectoryExists(sessionDir);

      const filePaths: DocumentationFilePaths = {};
      const savedFiles: FileMetadata[] = [];

      // Save README if generated
      if (docs.readme) {
        const readmePath = path.join(sessionDir, 'README.md');
        await this.saveTextFile(readmePath, docs.readme);
        filePaths.readme = readmePath;
        savedFiles.push({
          fileName: 'README.md',
          filePath: readmePath,
          size: Buffer.byteLength(docs.readme, 'utf8'),
          mimeType: 'text/markdown',
          createdAt: new Date()
        });
      }

      // Save API documentation if generated
      if (docs.apiDocs) {
        const apiDocsPath = path.join(sessionDir, 'API_DOCUMENTATION.md');
        await this.saveTextFile(apiDocsPath, docs.apiDocs);
        filePaths.apiDocs = apiDocsPath;
        savedFiles.push({
          fileName: 'API_DOCUMENTATION.md',
          filePath: apiDocsPath,
          size: Buffer.byteLength(docs.apiDocs, 'utf8'),
          mimeType: 'text/markdown',
          createdAt: new Date()
        });
      }

      // Save architecture documentation if generated
      if (docs.architecture) {
        const archPath = path.join(sessionDir, 'ARCHITECTURE.md');
        await this.saveTextFile(archPath, docs.architecture);
        filePaths.architecture = archPath;
        savedFiles.push({
          fileName: 'ARCHITECTURE.md',
          filePath: archPath,
          size: Buffer.byteLength(docs.architecture, 'utf8'),
          mimeType: 'text/markdown',
          createdAt: new Date()
        });
      }

      // Save components documentation if generated
      if (docs.components) {
        const componentsPath = path.join(sessionDir, 'COMPONENTS.md');
        await this.saveTextFile(componentsPath, docs.components);
        filePaths.components = componentsPath;
        savedFiles.push({
          fileName: 'COMPONENTS.md',
          filePath: componentsPath,
          size: Buffer.byteLength(docs.components, 'utf8'),
          mimeType: 'text/markdown',
          createdAt: new Date()
        });
      }

      // Save dependencies documentation if generated
      if (docs.dependencies) {
        const depsPath = path.join(sessionDir, 'DEPENDENCIES.md');
        await this.saveTextFile(depsPath, docs.dependencies);
        filePaths.dependencies = depsPath;
        savedFiles.push({
          fileName: 'DEPENDENCIES.md',
          filePath: depsPath,
          size: Buffer.byteLength(docs.dependencies, 'utf8'),
          mimeType: 'text/markdown',
          createdAt: new Date()
        });
      }

      // Create a zip file with all documentation
      if (savedFiles.length > 0) {
        const zipPath = path.join(sessionDir, `${this.sanitizeFileName(projectName)}_documentation.zip`);
        await this.createZipFile(savedFiles, zipPath);
        filePaths.zipFile = zipPath;
      }

      // Save metadata file
      await this.saveMetadata(sessionDir, {
        projectId,
        projectName,
        jobId,
        generatedAt: new Date(),
        files: savedFiles,
        totalSize: savedFiles.reduce((sum, file) => sum + file.size, 0)
      });

      logger.info(`Documentation saved successfully for project ${projectId}. Files: ${savedFiles.length}`);
      return filePaths;

    } catch (error: any) {
      logger.error(`Failed to save documentation for project ${projectId}:`, error);
      throw new Error(`Documentation save failed: ${error.message}`);
    }
  }

  /**
   * Get documentation file paths for a project
   */
  public async getDocumentationPath(projectId: string, fileName?: string): Promise<string | null> {
    try {
      const projectDir = this.getProjectDirectoryPath(projectId);
      
      // Check if project directory exists
      const exists = await this.directoryExists(projectDir);
      if (!exists) {
        return null;
      }

      if (fileName) {
        // Return specific file path
        const filePath = await this.findLatestFile(projectDir, fileName);
        return filePath;
      } else {
        // Return latest generation directory
        const latestDir = await this.getLatestGenerationDirectory(projectDir);
        return latestDir;
      }
    } catch (error: any) {
      logger.error(`Failed to get documentation path for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get file stream for reading
   */
  public getFileStream(filePath: string): NodeJS.ReadableStream {
    return createReadStream(filePath);
  }

  /**
   * Check if file exists and is accessible
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  public async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      const mimeTypes: Record<string, string> = {
        '.md': 'text/markdown',
        '.txt': 'text/plain',
        '.json': 'application/json',
        '.zip': 'application/zip'
      };

      return {
        fileName,
        filePath,
        size: stats.size,
        mimeType: mimeTypes[ext] || 'application/octet-stream',
        createdAt: stats.birthtime
      };
    } catch (error) {
      logger.error(`Failed to get file metadata for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Delete documentation files for a project
   */
  public async deleteProjectDocumentation(projectId: string): Promise<boolean> {
    try {
      const projectDir = this.getProjectDirectoryPath(projectId);
      const exists = await this.directoryExists(projectDir);
      
      if (exists) {
        await fs.rm(projectDir, { recursive: true, force: true });
        logger.info(`Deleted all documentation for project: ${projectId}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.error(`Failed to delete documentation for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Delete specific generation session
   */
  public async deleteGenerationSession(projectId: string, sessionId: string): Promise<boolean> {
    try {
      const projectDir = this.getProjectDirectoryPath(projectId);
      const sessionDir = path.join(projectDir, sessionId);
      const exists = await this.directoryExists(sessionDir);
      
      if (exists) {
        await fs.rm(sessionDir, { recursive: true, force: true });
        logger.info(`Deleted generation session ${sessionId} for project: ${projectId}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.error(`Failed to delete generation session ${sessionId} for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Clean up old documentation files
   */
  public async cleanupOldFiles(): Promise<{ deletedFiles: number; freedSpace: number }> {
    try {
      logger.info('Starting cleanup of old documentation files');
      
      let deletedFiles = 0;
      let freedSpace = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupAfterDays);

      const projects = await fs.readdir(this.basePath);
      
      for (const project of projects) {
        const projectPath = path.join(this.basePath, project);
        const stat = await fs.stat(projectPath);
        
        if (stat.isDirectory()) {
          const sessions = await fs.readdir(projectPath);
          
          for (const session of sessions) {
            const sessionPath = path.join(projectPath, session);
            const sessionStat = await fs.stat(sessionPath);
            
            if (sessionStat.isDirectory() && sessionStat.mtime < cutoffDate) {
              // Calculate directory size before deletion
              const dirSize = await this.getDirectorySize(sessionPath);
              
              await fs.rm(sessionPath, { recursive: true, force: true });
              deletedFiles++;
              freedSpace += dirSize;
              
              logger.info(`Cleaned up old session: ${session} from project: ${project}`);
            }
          }
          
          // Remove empty project directories
          const remainingSessions = await fs.readdir(projectPath);
          if (remainingSessions.length === 0) {
            await fs.rmdir(projectPath);
            logger.info(`Removed empty project directory: ${project}`);
          }
        }
      }

      logger.info(`Cleanup completed. Deleted ${deletedFiles} sessions, freed ${this.formatBytes(freedSpace)}`);
      return { deletedFiles, freedSpace };

    } catch (error: any) {
      logger.error('Cleanup failed:', error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    projectCount: number;
    oldestFile: Date;
    newestFile: Date;
  }> {
    try {
      let totalSize = 0;
      let fileCount = 0;
      let projectCount = 0;
      let oldestFile = new Date();
      let newestFile = new Date(0);

      const exists = await this.directoryExists(this.basePath);
      if (!exists) {
        return { totalSize: 0, fileCount: 0, projectCount: 0, oldestFile: new Date(), newestFile: new Date() };
      }

      const projects = await fs.readdir(this.basePath);
      projectCount = projects.length;

      for (const project of projects) {
        const projectPath = path.join(this.basePath, project);
        const stat = await fs.stat(projectPath);
        
        if (stat.isDirectory()) {
          const projectSize = await this.getDirectorySize(projectPath);
          const projectFileCount = await this.getFileCount(projectPath);
          
          totalSize += projectSize;
          fileCount += projectFileCount;
          
          if (stat.birthtime < oldestFile) oldestFile = stat.birthtime;
          if (stat.mtime > newestFile) newestFile = stat.mtime;
        }
      }

      return { totalSize, fileCount, projectCount, oldestFile, newestFile };

    } catch (error: any) {
      logger.error('Failed to get storage stats:', error);
      throw new Error(`Storage stats failed: ${error.message}`);
    }
  }

  // Private helper methods

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private getProjectDirectoryPath(projectId: string): string {
    return path.join(this.basePath, this.sanitizeFileName(projectId));
  }

  private async createProjectDirectory(projectId: string, projectName: string): Promise<string> {
    const sanitizedProjectId = this.sanitizeFileName(projectId);
    const projectDir = path.join(this.basePath, sanitizedProjectId);
    
    await this.ensureDirectoryExists(projectDir);
    
    // Create a project info file if it doesn't exist
    const infoFile = path.join(projectDir, '.project-info.json');
    const infoExists = await this.fileExists(infoFile);
    
    if (!infoExists) {
      const projectInfo = {
        projectId,
        projectName,
        createdAt: new Date(),
        directory: sanitizedProjectId
      };
      await fs.writeFile(infoFile, JSON.stringify(projectInfo, null, 2));
    }
    
    return projectDir;
  }

  private async saveTextFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf8');
  }

  private async saveMetadata(sessionDir: string, metadata: any): Promise<void> {
    const metadataPath = path.join(sessionDir, '.metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async createZipFile(files: FileMetadata[], zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`Zip file created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', (err) => {
        logger.error('Zip creation failed:', err);
        reject(err);
      });

      archive.pipe(output);

      files.forEach(file => {
        archive.file(file.filePath, { name: file.fileName });
      });

      archive.finalize();
    });
  }

  private async findLatestFile(projectDir: string, fileName: string): Promise<string | null> {
    try {
      const sessions = await fs.readdir(projectDir);
      const sessionDirs = [];

      for (const session of sessions) {
        if (session.startsWith('generation_')) {
          const sessionPath = path.join(projectDir, session);
          const stat = await fs.stat(sessionPath);
          if (stat.isDirectory()) {
            sessionDirs.push({ path: sessionPath, mtime: stat.mtime });
          }
        }
      }

      // Sort by modification time (newest first)
      sessionDirs.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      for (const sessionDir of sessionDirs) {
        const filePath = path.join(sessionDir.path, fileName);
        const exists = await this.fileExists(filePath);
        if (exists) {
          return filePath;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async getLatestGenerationDirectory(projectDir: string): Promise<string | null> {
    try {
      const sessions = await fs.readdir(projectDir);
      const sessionDirs = [];

      for (const session of sessions) {
        if (session.startsWith('generation_')) {
          const sessionPath = path.join(projectDir, session);
          const stat = await fs.stat(sessionPath);
          if (stat.isDirectory()) {
            sessionDirs.push({ path: sessionPath, mtime: stat.mtime });
          }
        }
      }

      if (sessionDirs.length === 0) return null;

      // Sort by modification time (newest first)
      sessionDirs.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      return sessionDirs[0].path;
    } catch {
      return null;
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          size += await this.getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      }
    } catch {
      // Directory might not exist or be inaccessible
    }
    
    return size;
  }

  private async getFileCount(dirPath: string): Promise<number> {
    let count = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          count += await this.getFileCount(filePath);
        } else {
          count++;
        }
      }
    } catch {
      // Directory might not exist or be inaccessible
    }
    
    return count;
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 255);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Singleton instance
export const fileStorageService = new FileStorageService();