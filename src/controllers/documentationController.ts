import { Request, Response } from 'express';
import { DocumentationJob, Project, AnalysisResult } from '@/models';
import { documentationGenerator, GeneratedDocumentation } from '@/services/documentationGenerator';
import { fileStorageService, DocumentationFilePaths } from '@/services/fileStorageService';
import { StorageProviderFactory } from '@/services/storage/StorageProviderFactory';
import { storageConfig } from '@/config/storage.config';
import { logger } from '@/utils/logger';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { ResponseHandler } from '@/utils/response';
import mongoose from 'mongoose';
import { marked } from 'marked';

// Extend Request interface for authentication
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Documentation Controller
 * Handles documentation generation, retrieval, and status management
 */
export class DocumentationController {

  /**
   * Generate documentation for a project
   * POST /api/v1/documentation/generate/:projectId
   */
  generateDocumentation = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { sections = ['readme', 'api', 'architecture'] } = req.body;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Validate projectId format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    logger.info(`Documentation generation requested for project: ${projectId} by user: ${userId}`);

    // Verify project exists and user has access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Check if project has been analyzed
    if (project.status !== 'analyzed' && project.status !== 'completed') {
      throw new AppError('Project must be analyzed before generating documentation', 400);
    }

    // Check for existing active job
    const existingJob = await DocumentationJob.findOne({
      projectId,
      userId,
      status: { $in: ['queued', 'processing'] }
    });

    if (existingJob) {
      ResponseHandler.success(res, {
        jobId: existingJob._id,
        status: existingJob.status,
        progress: existingJob.progress,
        message: 'Documentation generation already in progress'
      }, 'Existing documentation job found');
      return;
    }

    // Validate sections
    const validSections = ['readme', 'api', 'architecture', 'components', 'dependencies'];
    const invalidSections = sections.filter((section: string) => !validSections.includes(section));
    
    if (invalidSections.length > 0) {
      throw new AppError(`Invalid sections: ${invalidSections.join(', ')}. Valid sections: ${validSections.join(', ')}`, 400);
    }

    // Create new documentation job
    const job = new DocumentationJob({
      projectId,
      userId,
      sections,
      status: 'queued',
      progress: 0,
      currentStep: 'Initializing documentation generation'
    });

    await job.save();

    // Start documentation generation process (async)
    this.processDocumentationGeneration(job._id.toString()).catch(error => {
      logger.error(`Documentation generation failed for job ${job._id}:`, error);
    });

    ResponseHandler.created(res, {
      jobId: job._id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      sections: job.sections,
      estimatedTime: this.estimateGenerationTime(sections.length)
    }, 'Documentation generation started');
  });

  /**
   * Get generated documentation
   * GET /api/v1/documentation/:projectId
   */
  getDocumentation = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const { section } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    logger.info(`Documentation retrieval requested for project: ${projectId} by user: ${userId}`);

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Find the most recent completed job
    const job = await DocumentationJob.findOne({
      projectId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    if (!job) {
      throw new AppError('No completed documentation found for this project', 404);
    }

    // Return specific section or all documentation
    if (section && typeof section === 'string') {
      const validSections = ['readme', 'apiDocs', 'architecture'];
      if (!validSections.includes(section)) {
        throw new AppError(`Invalid section. Valid sections: ${validSections.join(', ')}`, 400);
      }

      const sectionContent = job.generatedFiles[section as keyof typeof job.generatedFiles];
      if (!sectionContent) {
        throw new AppError(`Section '${section}' not found in generated documentation`, 404);
      }

      ResponseHandler.success(res, {
        projectId,
        projectName: project.name,
        section,
        content: sectionContent,
        generatedAt: job.completedAt,
        jobId: job._id
      }, `${section} documentation retrieved`);
    } else {
      ResponseHandler.success(res, {
        projectId,
        projectName: project.name,
        documentation: job.generatedFiles,
        generatedAt: job.completedAt,
        executionTime: job.getExecutionTime(),
        sections: job.sections,
        jobId: job._id
      }, 'Complete documentation retrieved');
    }
  });

  /**
   * Get documentation generation status
   * GET /api/v1/documentation/:projectId/status
   */
  getGenerationStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Find the most recent job for this project and user
    const job = await DocumentationJob.findOne({
      projectId,
      userId
    }).sort({ createdAt: -1 });

    if (!job) {
      throw new AppError('No documentation generation job found for this project', 404);
    }

    const response = {
      jobId: job._id,
      projectId,
      projectName: project.name,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      sections: job.sections,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      executionTime: job.getExecutionTime(),
      errorMessage: job.errorMessage,
      errorDetails: job.errorDetails
    };

    ResponseHandler.success(res, response, 'Generation status retrieved');
  });

  /**
   * Get documentation generation status by job ID
   * GET /api/v1/documentation/job/:jobId/status
   */
  getJobStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new AppError('Invalid job ID format', 400);
    }

    // Find the job by ID and verify user ownership
    const job = await DocumentationJob.findOne({
      _id: jobId,
      userId
    }).populate('projectId', 'name');

    if (!job) {
      throw new AppError('Job not found or access denied', 404);
    }

    const project = job.projectId as any;
    const response = {
      jobId: job._id,
      projectId: project._id,
      projectName: project.name,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      sections: job.sections,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      executionTime: job.getExecutionTime(),
      errorMessage: job.errorMessage,
      errorDetails: job.errorDetails
    };

    ResponseHandler.success(res, response, 'Job status retrieved');
  });

  /**
   * Get documentation job history for a project
   * GET /api/v1/documentation/:projectId/history
   */
  getDocumentationHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { limit = 10, offset = 0 } = req.query;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    const jobs = await DocumentationJob.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .select('-generatedFiles'); // Exclude large content fields

    const totalJobs = await DocumentationJob.countDocuments({ projectId });

    ResponseHandler.success(res, {
      projectId,
      projectName: project.name,
      jobs: jobs.map(job => ({
        jobId: job._id,
        status: job.status,
        progress: job.progress,
        sections: job.sections,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        executionTime: job.getExecutionTime(),
        errorMessage: job.errorMessage
      })),
      pagination: {
        total: totalJobs,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: totalJobs > Number(offset) + Number(limit)
      }
    }, 'Documentation history retrieved');
  });

  /**
   * Cancel documentation generation
   * POST /api/v1/documentation/:projectId/cancel
   */
  cancelDocumentationGeneration = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    // Find active job
    const job = await DocumentationJob.findOne({
      projectId,
      userId,
      status: { $in: ['queued', 'processing'] }
    });

    if (!job) {
      throw new AppError('No active documentation generation job found', 404);
    }

    // Mark as failed with cancellation message
    await job.markFailed('Generation cancelled by user', job.currentStep);

    ResponseHandler.success(res, {
      jobId: job._id,
      status: job.status,
      message: 'Documentation generation cancelled'
    }, 'Documentation generation cancelled');
  });

  /**
   * Download documentation file
   * GET /api/v1/documentation/:projectId/download/:fileName
   */
  downloadDocumentationFile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId, fileName } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    logger.info(`File download requested: ${fileName} for project: ${projectId} by user: ${userId}`);

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Validate file name
    const allowedFiles = ['README.md', 'API_DOCUMENTATION.md', 'ARCHITECTURE.md', 'COMPONENTS.md', 'DEPENDENCIES.md'];
    const zipPattern = /^.+_documentation\.zip$/;
    
    if (!allowedFiles.includes(fileName) && !zipPattern.test(fileName)) {
      throw new AppError('Invalid file name', 400);
    }

    // Get file path
    const filePath = await fileStorageService.getDocumentationPath(projectId, fileName);
    if (!filePath) {
      throw new AppError('File not found', 404);
    }

    // Check if file exists
    const fileExists = await fileStorageService.fileExists(filePath);
    if (!fileExists) {
      throw new AppError('File not found on disk', 404);
    }

    // Get file metadata
    const metadata = await fileStorageService.getFileMetadata(filePath);
    if (!metadata) {
      throw new AppError('Unable to read file metadata', 500);
    }

    // Set response headers
    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Length', metadata.size);
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Stream file to response
    const fileStream = fileStorageService.getFileStream(filePath);
    
    fileStream.on('error', (error) => {
      logger.error(`File stream error for ${filePath}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            message: 'Error reading file',
            code: 'FILE_READ_ERROR'
          }
        });
      }
    });

    fileStream.pipe(res);
    
    logger.info(`File download started: ${fileName} (${metadata.size} bytes) for project: ${projectId}`);
  });

  /**
   * Download all documentation as ZIP
   * GET /api/v1/documentation/:projectId/download-zip
   */
  downloadDocumentationZip = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    logger.info(`ZIP download requested for project: ${projectId} by user: ${userId}`);

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Find the most recent completed job to get ZIP file
    const job = await DocumentationJob.findOne({
      projectId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    if (!job) {
      throw new AppError('No completed documentation found for this project', 404);
    }

    // Look for ZIP file
    const projectDir = await fileStorageService.getDocumentationPath(projectId);
    if (!projectDir) {
      throw new AppError('Documentation directory not found', 404);
    }

    // Find ZIP file in the latest generation directory
    const zipPattern = new RegExp(`${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_documentation\\.zip$`, 'i');
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const files = await fs.readdir(projectDir);
      const zipFile = files.find(file => zipPattern.test(file));
      
      if (!zipFile) {
        throw new AppError('ZIP file not found', 404);
      }

      const zipPath = path.join(projectDir, zipFile);
      const fileExists = await fileStorageService.fileExists(zipPath);
      
      if (!fileExists) {
        throw new AppError('ZIP file not found on disk', 404);
      }

      // Get file metadata
      const metadata = await fileStorageService.getFileMetadata(zipPath);
      if (!metadata) {
        throw new AppError('Unable to read ZIP file metadata', 500);
      }

      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      // Stream ZIP file to response
      const fileStream = fileStorageService.getFileStream(zipPath);
      
      fileStream.on('error', (error) => {
        logger.error(`ZIP stream error for ${zipPath}:`, error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: {
              message: 'Error reading ZIP file',
              code: 'ZIP_READ_ERROR'
            }
          });
        }
      });

      fileStream.pipe(res);
      
      logger.info(`ZIP download started: ${metadata.fileName} (${metadata.size} bytes) for project: ${projectId}`);
      
    } catch (error: any) {
      logger.error(`ZIP download failed for project ${projectId}:`, error);
      throw new AppError('Failed to process ZIP download', 500);
    }
  });

  /**
   * Get downloadable files list for a project
   * GET /api/v1/documentation/:projectId/files
   */
  getAvailableFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Get latest generation directory
    const projectDir = await fileStorageService.getDocumentationPath(projectId);
    if (!projectDir) {
      ResponseHandler.success(res, {
        projectId,
        projectName: project.name,
        files: [],
        message: 'No documentation files found'
      }, 'Available files retrieved');
      return;
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const files = await fs.readdir(projectDir);
      
      const fileDetails = [];
      
      for (const file of files) {
        const filePath = path.join(projectDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile() && (file.endsWith('.md') || file.endsWith('.zip'))) {
          const metadata = await fileStorageService.getFileMetadata(filePath);
          if (metadata) {
            fileDetails.push({
              fileName: metadata.fileName,
              size: metadata.size,
              mimeType: metadata.mimeType,
              createdAt: metadata.createdAt,
              downloadUrl: `/api/v1/documentation/${projectId}/download/${metadata.fileName}`
            });
          }
        }
      }

      ResponseHandler.success(res, {
        projectId,
        projectName: project.name,
        files: fileDetails,
        totalFiles: fileDetails.length,
        totalSize: fileDetails.reduce((sum, file) => sum + file.size, 0)
      }, 'Available files retrieved');
      
    } catch (error: any) {
      logger.error(`Failed to get available files for project ${projectId}:`, error);
      throw new AppError('Failed to retrieve file list', 500);
    }
  });

  /**
   * View documentation in browser as HTML
   * GET /api/v1/documentation/:projectId/view/:section?
   */
  viewDocumentation = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId, section } = req.params;
    const userId = req.user?.id;
    
    // Get token from query params to pass along to navigation links
    const token = req.query.token as string | undefined;
    
    // Default to 'readme' if section not specified
    const requestedSection = section || 'readme';

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    logger.info(`Documentation view requested: ${requestedSection} for project: ${projectId} by user: ${userId}`);

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { 'teamMembers.user': userId },
        { ownerId: userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Find the most recent completed job
    const job = await DocumentationJob.findOne({
      projectId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    if (!job) {
      // Return a message page if no documentation is found
      const html = this.generateNoDocumentationPage(project.name);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }

    // Get the requested section content
    const validSections = ['readme', 'api', 'architecture'];
    const finalSection = validSections.includes(requestedSection) ? requestedSection : 'readme';
    
    let markdownContent = '';
    let sectionTitle = '';
    
    switch (finalSection) {
      case 'readme':
        markdownContent = job.generatedFiles.readme || '';
        sectionTitle = 'README';
        break;
      case 'api':
        markdownContent = job.generatedFiles.apiDocs || '';
        sectionTitle = 'API Documentation';
        break;
      case 'architecture':
        markdownContent = job.generatedFiles.architecture || '';
        sectionTitle = 'Architecture Documentation';
        break;
    }

    if (!markdownContent) {
      const html = this.generateSectionNotFoundPage(project.name, sectionTitle);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }

    try {
      // Configure marked options for better HTML output
      marked.setOptions({
        breaks: true,
        gfm: true // GitHub Flavored Markdown
      });

      // Convert markdown to HTML
      const htmlContent = await marked.parse(markdownContent);
      
      // Generate complete HTML page
      const fullHtml = this.generateDocumentationPage(
        project.name,
        sectionTitle,
        htmlContent,
        validSections,
        finalSection,
        projectId,
        job.completedAt || new Date(),
        token
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
      res.send(fullHtml);
      
      logger.info(`Documentation view served: ${finalSection} for project: ${projectId}`);

    } catch (error: any) {
      logger.error(`Failed to render documentation view for project ${projectId}:`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        projectId,
        section: finalSection,
        hasMarkdown: !!markdownContent,
        markdownLength: markdownContent?.length
      });
      throw new AppError('Failed to render documentation', 500);
    }
  });

  /**
   * Generate complete HTML page for documentation viewing
   */
  private generateDocumentationPage(
    projectName: string,
    sectionTitle: string,
    htmlContent: string,
    availableSections: string[],
    currentSection: string,
    projectId: string,
    generatedAt: Date,
    token?: string
  ): string {
    // Add token to URLs if present
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    
    const navigation = availableSections
      .map(section => {
        const isActive = section === currentSection;
        const sectionName = section === 'api' ? 'API Docs' : 
                           section === 'architecture' ? 'Architecture' : 'README';
        return `
          <a href="/api/v1/documentation/${projectId}/view/${section}${tokenParam}" 
             class="nav-link ${isActive ? 'active' : ''}">
            ${sectionName}
          </a>`;
      })
      .join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sectionTitle} - ${projectName}</title>
    <style>
        ${this.getDocumentationCSS()}
    </style>
</head>
<body>
    <div class="container">
        <header class="doc-header">
            <h1>${projectName}</h1>
            <p class="subtitle">${sectionTitle}</p>
            <p class="generated-info">Generated on ${generatedAt.toLocaleString()}</p>
        </header>
        
        <nav class="doc-navigation">
            <h3>Documentation Sections</h3>
            ${navigation}
            <div class="nav-actions">
                <a href="/api/v1/documentation/${projectId}/download-zip${tokenParam}" class="download-btn">
                    📥 Download All (ZIP)
                </a>
            </div>
        </nav>
        
        <main class="doc-content">
            ${htmlContent}
        </main>
        
        <footer class="doc-footer">
            <p>Auto-generated documentation by Legacy Doc Generator</p>
            <p><a href="#top">Back to top</a></p>
        </footer>
    </div>
    
    <script>
        ${this.getDocumentationJS()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate CSS styles for documentation pages
   */
  private getDocumentationCSS(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            display: grid;
            grid-template-columns: 250px 1fr;
            grid-template-rows: auto 1fr auto;
            min-height: 100vh;
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .doc-header {
            grid-column: 1 / -1;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }
        
        .doc-header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 0.5rem;
        }
        
        .generated-info {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .doc-navigation {
            padding: 2rem 1.5rem;
            background: #f8f9fa;
            border-right: 1px solid #e9ecef;
        }
        
        .doc-navigation h3 {
            margin-bottom: 1rem;
            color: #495057;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .nav-link {
            display: block;
            padding: 0.75rem 1rem;
            color: #6c757d;
            text-decoration: none;
            border-radius: 4px;
            margin-bottom: 0.25rem;
            transition: all 0.2s;
        }
        
        .nav-link:hover {
            background-color: #e9ecef;
            color: #495057;
        }
        
        .nav-link.active {
            background-color: #667eea;
            color: white;
        }
        
        .nav-actions {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #e9ecef;
        }
        
        .download-btn {
            display: block;
            padding: 0.75rem 1rem;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            text-align: center;
            transition: background-color 0.2s;
        }
        
        .download-btn:hover {
            background-color: #218838;
        }
        
        .doc-content {
            padding: 2rem;
            overflow-y: auto;
        }
        
        .doc-content h1, .doc-content h2, .doc-content h3, 
        .doc-content h4, .doc-content h5, .doc-content h6 {
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: #2c3e50;
        }
        
        .doc-content h1 { font-size: 2.2rem; }
        .doc-content h2 { font-size: 1.8rem; border-bottom: 2px solid #e9ecef; padding-bottom: 0.5rem; }
        .doc-content h3 { font-size: 1.5rem; }
        .doc-content h4 { font-size: 1.3rem; }
        
        .doc-content p {
            margin-bottom: 1rem;
        }
        
        .doc-content ul, .doc-content ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
        }
        
        .doc-content li {
            margin-bottom: 0.25rem;
        }
        
        .doc-content code {
            background-color: #f1f3f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9rem;
        }
        
        .doc-content pre {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 1rem;
            overflow-x: auto;
            margin-bottom: 1rem;
        }
        
        .doc-content pre code {
            background: none;
            padding: 0;
        }
        
        .doc-content table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
        }
        
        .doc-content th, .doc-content td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        
        .doc-content th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        
        .doc-content blockquote {
            border-left: 4px solid #667eea;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #6c757d;
            font-style: italic;
        }
        
        .doc-content img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
            margin: 1rem 0;
        }
        
        .doc-footer {
            grid-column: 1 / -1;
            padding: 1rem 2rem;
            background-color: #f8f9fa;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .doc-footer a {
            color: #667eea;
            text-decoration: none;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
                grid-template-rows: auto auto 1fr auto;
            }
            
            .doc-navigation {
                padding: 1rem;
            }
            
            .nav-link {
                display: inline-block;
                margin-right: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .doc-content {
                padding: 1rem;
            }
        }
        
        /* Print styles */
        @media print {
            .doc-navigation, .doc-footer {
                display: none;
            }
            
            .container {
                grid-template-columns: 1fr;
                box-shadow: none;
            }
            
            .doc-content {
                padding: 0;
            }
        }
    `;
  }

  /**
   * Generate JavaScript for documentation pages
   */
  private getDocumentationJS(): string {
    return `
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Add copy buttons to code blocks
        document.querySelectorAll('pre code').forEach((codeBlock) => {
            const button = document.createElement('button');
            button.textContent = 'Copy';
            button.style.cssText = '
                position: absolute;
                top: 5px;
                right: 5px;
                background: #667eea;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 12px;
                cursor: pointer;
            ';
            
            const pre = codeBlock.parentElement;
            pre.style.position = 'relative';
            pre.appendChild(button);
            
            button.addEventListener('click', () => {
                navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                });
            });
        });
        
        // Add scroll-to-top functionality
        let scrollToTopBtn = document.createElement('button');
        scrollToTopBtn.innerHTML = '↑';
        scrollToTopBtn.style.cssText = '
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 20px;
            cursor: pointer;
            display: none;
            z-index: 1000;
        ';
        document.body.appendChild(scrollToTopBtn);
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    `;
  }

  /**
   * Generate page for when no documentation is found
   */
  private generateNoDocumentationPage(projectName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>No Documentation - ${projectName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f8f9fa;
        }
        .message {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .message h1 {
            color: #6c757d;
            margin-bottom: 1rem;
        }
        .message p {
            color: #868e96;
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>📄 No Documentation Available</h1>
        <p>No completed documentation found for <strong>${projectName}</strong>.</p>
        <p>Please generate documentation first using the API.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate page for when requested section is not found
   */
  private generateSectionNotFoundPage(projectName: string, sectionTitle: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Section Not Found - ${projectName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f8f9fa;
        }
        .message {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .message h1 {
            color: #6c757d;
            margin-bottom: 1rem;
        }
        .message p {
            color: #868e96;
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>📄 Section Not Available</h1>
        <p>The <strong>${sectionTitle}</strong> section was not generated for <strong>${projectName}</strong>.</p>
        <p>This section might not have been included during documentation generation.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Delete generated documentation
   * DELETE /api/v1/documentation/:projectId
   */
  deleteDocumentation = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new AppError('Invalid project ID format', 400);
    }

    // Verify project ownership or admin access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { ownerId: userId },
        { 'teamMembers.user': userId, 'teamMembers.role': { $in: ['owner', 'admin'] } }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or insufficient permissions', 404);
    }

    // Delete all documentation jobs for this project
    const deleteResult = await DocumentationJob.deleteMany({ projectId });

    ResponseHandler.success(res, {
      projectId,
      deletedJobs: deleteResult.deletedCount,
      message: 'All documentation data deleted'
    }, 'Documentation deleted successfully');
  });

  /**
   * Process documentation generation (async background task)
   */
  private async processDocumentationGeneration(jobId: string): Promise<void> {
    let job;
    
    try {
      // Get job details
      job = await DocumentationJob.findById(jobId).populate('projectId');
      if (!job) {
        logger.error(`Documentation job ${jobId} not found`);
        return;
      }

      const project = job.projectId as any;
      logger.info(`Starting documentation generation for job: ${jobId}, project: ${project.name}`);

      // Update job status
      await job.updateProgress(10, 'Loading project analysis data');

      // Get analysis results
      const analysisResult = await AnalysisResult.findOne({ projectId: project._id });
      if (!analysisResult) {
        await job.markFailed('No analysis results found for project', 'Loading analysis data');
        return;
      }

      await job.updateProgress(25, 'Analysis data loaded successfully');

      // Generate documentation sections
      const generatedDocs: GeneratedDocumentation = {};

      // Generate README if requested
      if (job.sections.includes('readme')) {
        await job.updateProgress(40, 'Generating README documentation');
        try {
          generatedDocs.readme = documentationGenerator.generateReadme(analysisResult, project);
          logger.info(`README generated for job: ${jobId}`);
        } catch (error: any) {
          logger.error(`README generation failed for job ${jobId}:`, error);
          await job.markFailed(`README generation failed: ${error.message}`, 'Generating README');
          return;
        }
      }

      // Generate API documentation if requested
      if (job.sections.includes('api')) {
        await job.updateProgress(60, 'Generating API documentation');
        try {
          generatedDocs.apiDocs = documentationGenerator.generateApiDocs(analysisResult, project);
          logger.info(`API docs generated for job: ${jobId}`);
        } catch (error: any) {
          logger.error(`API documentation generation failed for job ${jobId}:`, error);
          await job.markFailed(`API documentation generation failed: ${error.message}`, 'Generating API documentation');
          return;
        }
      }

      // Generate architecture documentation if requested
      if (job.sections.includes('architecture')) {
        await job.updateProgress(80, 'Generating architecture documentation');
        try {
          generatedDocs.architecture = documentationGenerator.generateArchitecture(analysisResult, project);
          logger.info(`Architecture docs generated for job: ${jobId}`);
        } catch (error: any) {
          logger.error(`Architecture documentation generation failed for job ${jobId}:`, error);
          await job.markFailed(`Architecture documentation generation failed: ${error.message}`, 'Generating architecture documentation');
          return;
        }
      }

      // Save files to local storage first
      await job.updateProgress(88, 'Saving documentation files locally');
      let savedFilePaths: DocumentationFilePaths | null = null;
      
      try {
        savedFilePaths = await fileStorageService.saveDocumentation(
          project._id.toString(),
          project.name,
          generatedDocs,
          jobId
        );
        logger.info(`Documentation files saved locally for job: ${jobId}`);
      } catch (error: any) {
        logger.error(`Local file saving failed for job ${jobId}:`, error);
        await job.markFailed(`File saving failed: ${error.message}`, 'Saving files');
        return;
      }

      // Upload to cloud storage if enabled
      const isCloudEnabled = storageConfig.isCloudProvider();
      if (isCloudEnabled) {
        await job.updateProgress(92, 'Uploading documentation to cloud storage');
        
        try {
          await this.uploadToCloudStorage(job, project, generatedDocs, savedFilePaths, jobId);
          logger.info(`Documentation uploaded to cloud storage for job: ${jobId}`);
        } catch (error: any) {
          logger.error(`Cloud upload failed for job ${jobId}:`, error);
          // Don't fail the job - files are saved locally
          logger.warn(`Continuing with local storage for job ${jobId}`);
        }
      }

      // Update job with file paths and complete
      await job.updateProgress(95, 'Finalizing documentation generation');
      
      // Brief delay to ensure progress update is persisted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Final progress update before completion
      await job.updateProgress(99, 'Documentation generation complete');
      
      // Store file paths in the job for easy access
      const jobData = {
        readme: generatedDocs.readme,
        apiDocs: generatedDocs.apiDocs, 
        architecture: generatedDocs.architecture,
        filePaths: savedFilePaths
      };
      
      // Mark as completed (this will set progress to 100)
      await job.markCompleted(jobData);
      
      // Log the final state for debugging
      logger.info(`Job ${jobId} marked as completed with progress: ${job.progress}%, status: ${job.status}`);

      logger.info(`Documentation generation completed successfully for job: ${jobId}`);
      logger.info(`Files saved: ${Object.keys(savedFilePaths || {}).length} files`);

    } catch (error: any) {
      logger.error(`Documentation generation process failed for job ${jobId}:`, error);
      
      if (job) {
        await job.markFailed(`Unexpected error: ${error.message}`, 'Processing documentation', error.stack);
      }
    }
  }

  /**
   * Upload generated documentation to cloud storage
   */
  private async uploadToCloudStorage(
    job: any,
    project: any,
    generatedDocs: GeneratedDocumentation,
    savedFilePaths: DocumentationFilePaths | null,
    jobId: string
  ): Promise<void> {
    try {
      const storageProvider = StorageProviderFactory.getInstance();
      const userId = job.userId;
      const projectId = project._id.toString();
      
      logger.info(`Uploading documentation to cloud storage for job: ${jobId}`);
      
      const cloudUrls: any = {};
      const cloudKeys: any = {};
      let totalSize = 0;

      // Upload README
      if (generatedDocs.readme && savedFilePaths?.readme) {
        const readmeBuffer = Buffer.from(generatedDocs.readme, 'utf8');
        const readmeKey = `documentations/${userId}/${projectId}/${jobId}/README.md`;
        
        const uploadResult = await storageProvider.upload(readmeBuffer, readmeKey, {
          contentType: 'text/markdown',
          metadata: {
            projectId,
            projectName: project.name,
            jobId,
            documentType: 'readme'
          }
        });
        
        cloudUrls.readme = uploadResult.url;
        cloudKeys.readme = uploadResult.key;
        totalSize += uploadResult.size;
        logger.info(`README uploaded to cloud: ${uploadResult.key}`);
      }

      // Upload API Documentation
      if (generatedDocs.apiDocs && savedFilePaths?.apiDocs) {
        const apiDocsBuffer = Buffer.from(generatedDocs.apiDocs, 'utf8');
        const apiDocsKey = `documentations/${userId}/${projectId}/${jobId}/API_DOCUMENTATION.md`;
        
        const uploadResult = await storageProvider.upload(apiDocsBuffer, apiDocsKey, {
          contentType: 'text/markdown',
          metadata: {
            projectId,
            projectName: project.name,
            jobId,
            documentType: 'api-docs'
          }
        });
        
        cloudUrls.apiDocs = uploadResult.url;
        cloudKeys.apiDocs = uploadResult.key;
        totalSize += uploadResult.size;
        logger.info(`API Documentation uploaded to cloud: ${uploadResult.key}`);
      }

      // Upload Architecture Documentation
      if (generatedDocs.architecture && savedFilePaths?.architecture) {
        const architectureBuffer = Buffer.from(generatedDocs.architecture, 'utf8');
        const architectureKey = `documentations/${userId}/${projectId}/${jobId}/ARCHITECTURE.md`;
        
        const uploadResult = await storageProvider.upload(architectureBuffer, architectureKey, {
          contentType: 'text/markdown',
          metadata: {
            projectId,
            projectName: project.name,
            jobId,
            documentType: 'architecture'
          }
        });
        
        cloudUrls.architecture = uploadResult.url;
        cloudKeys.architecture = uploadResult.key;
        totalSize += uploadResult.size;
        logger.info(`Architecture Documentation uploaded to cloud: ${uploadResult.key}`);
      }

      // Upload Components Documentation
      if (generatedDocs.components && savedFilePaths?.components) {
        const componentsBuffer = Buffer.from(generatedDocs.components, 'utf8');
        const componentsKey = `documentations/${userId}/${projectId}/${jobId}/COMPONENTS.md`;
        
        const uploadResult = await storageProvider.upload(componentsBuffer, componentsKey, {
          contentType: 'text/markdown',
          metadata: {
            projectId,
            projectName: project.name,
            jobId,
            documentType: 'components'
          }
        });
        
        cloudUrls.components = uploadResult.url;
        cloudKeys.components = uploadResult.key;
        totalSize += uploadResult.size;
        logger.info(`Components Documentation uploaded to cloud: ${uploadResult.key}`);
      }

      // Upload Dependencies Documentation
      if (generatedDocs.dependencies && savedFilePaths?.dependencies) {
        const dependenciesBuffer = Buffer.from(generatedDocs.dependencies, 'utf8');
        const dependenciesKey = `documentations/${userId}/${projectId}/${jobId}/DEPENDENCIES.md`;
        
        const uploadResult = await storageProvider.upload(dependenciesBuffer, dependenciesKey, {
          contentType: 'text/markdown',
          metadata: {
            projectId,
            projectName: project.name,
            jobId,
            documentType: 'dependencies'
          }
        });
        
        cloudUrls.dependencies = uploadResult.url;
        cloudKeys.dependencies = uploadResult.key;
        totalSize += uploadResult.size;
        logger.info(`Dependencies Documentation uploaded to cloud: ${uploadResult.key}`);
      }

      // Upload ZIP file
      if (savedFilePaths?.zipFile) {
        const fs = await import('fs/promises');
        const zipBuffer = await fs.readFile(savedFilePaths.zipFile);
        const zipFileName = savedFilePaths.zipFile.split('/').pop() || 'documentation.zip';
        const zipKey = `documentations/${userId}/${projectId}/${jobId}/${zipFileName}`;
        
        const uploadResult = await storageProvider.upload(zipBuffer, zipKey, {
          contentType: 'application/zip',
          metadata: {
            projectId,
            projectName: project.name,
            jobId,
            documentType: 'archive'
          }
        });
        
        cloudUrls.zipArchive = uploadResult.url;
        cloudKeys.zipArchive = uploadResult.key;
        totalSize += uploadResult.size;
        logger.info(`ZIP archive uploaded to cloud: ${uploadResult.key}`);
      }

      // Get storage provider config for metadata
      const providerInfo = StorageProviderFactory.getProviderInfo();
      const providerConfig = providerInfo.config;
      
      // Calculate URL expiry time
      const urlExpirySeconds = storageConfig.getBaseConfig().urlExpirySeconds;
      const urlExpiresAt = new Date(Date.now() + urlExpirySeconds * 1000);

      // Update job with cloud storage information
      await job.updateCloudStorage(
        cloudUrls,
        cloudKeys,
        providerInfo.type,
        {
          totalSize,
          region: providerConfig.region,
          bucket: providerConfig.bucketName || providerConfig.bucket,
          urlExpiresAt
        }
      );

      logger.info(`Cloud storage metadata saved for job: ${jobId}`);
      logger.info(`Total uploaded size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      logger.info(`Cloud storage provider: ${providerInfo.type}`);
      logger.info(`URLs expire at: ${urlExpiresAt.toISOString()}`);

    } catch (error: any) {
      logger.error(`Cloud upload failed for job ${jobId}:`, error);
      throw new Error(`Failed to upload to cloud storage: ${error.message}`);
    }
  }

  /**
   * Estimate documentation generation time based on sections
   */
  private estimateGenerationTime(sectionCount: number): string {
    const baseTimePerSection = 30; // seconds
    const totalSeconds = sectionCount * baseTimePerSection;
    
    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    } else {
      const minutes = Math.ceil(totalSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
}

// Export controller instance
export const documentationController = new DocumentationController();