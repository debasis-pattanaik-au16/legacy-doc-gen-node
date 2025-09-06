import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/asyncHandler';
import { ResponseHandler } from '@/utils/response';
import { 
  upload, 
  extractAndAnalyzeZip, 
  initializeUploadDirectories,
  ExtractionResult 
} from '../services/fileUploadService';
import { Project } from '@/models/Project';
import { AuthenticatedRequest } from '@/types';

// Initialize upload directories on startup
initializeUploadDirectories().catch(console.error);

// Interface for upload progress tracking
interface UploadProgress {
  projectId: string;
  status: 'uploading' | 'extracting' | 'analyzing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
  result?: ExtractionResult;
}

// In-memory storage for upload progress (in production, use Redis)
const uploadProgress = new Map<string, UploadProgress>();

/**
 * Upload codebase ZIP file for a project
 * POST /api/v1/projects/:id/upload
 */
export const uploadCodebase = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id: projectId } = req.params;
  const userId = req.user?.id;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return ResponseHandler.error(res, 'Project not found', 404);
  }

  // Check if user owns the project or is a team member
  const hasAccess = project.teamMembers.some((member: any) => 
    member.user.toString() === userId && ['owner', 'admin', 'member'].includes(member.role)
  );
  
  if (!hasAccess) {
    return ResponseHandler.error(res, 'Access denied', 403);
  }

  // Initialize upload progress
  uploadProgress.set(projectId, {
    projectId,
    status: 'uploading',
    progress: 0,
    message: 'Starting upload...'
  });

  // Handle file upload with multer
  upload.single('codebase')(req, res, async (err): Promise<any> => {
    if (err) {
      uploadProgress.set(projectId, {
        projectId,
        status: 'error',
        progress: 0,
        message: 'Upload failed',
        error: err.message
      });

      if (err.code === 'LIMIT_FILE_SIZE') {
        return ResponseHandler.error(res, 'File size exceeds 500MB limit', 400);
      }
      
      return ResponseHandler.error(res, `Upload error: ${err.message}`, 400);
    }

    if (!req.file) {
      uploadProgress.set(projectId, {
        projectId,
        status: 'error',
        progress: 0,
        message: 'No file uploaded',
        error: 'No file provided'
      });
      
      return ResponseHandler.error(res, 'No file uploaded', 400);
    }

    try {
      // Update progress
      uploadProgress.set(projectId, {
        projectId,
        status: 'extracting',
        progress: 25,
        message: 'Extracting ZIP file...'
      });

      // Extract and analyze the uploaded ZIP file
      const result = await extractAndAnalyzeZip(req.file.path, projectId);

      if (!result.success) {
        uploadProgress.set(projectId, {
          projectId,
          status: 'error',
          progress: 0,
          message: 'Extraction failed',
          error: result.error
        });
        
        return ResponseHandler.error(res, `Extraction failed: ${result.error}`, 400);
      }

      // Update progress
      uploadProgress.set(projectId, {
        projectId,
        status: 'analyzing',
        progress: 75,
        message: 'Analyzing codebase...'
      });

      // Update project with codebase metadata and progress
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        {
          status: 'analyzing',
          codebaseMetadata: {
            fileCount: result.statistics.totalFiles,
            languages: Object.keys(result.statistics.languages),
            totalLines: result.files.reduce((sum, file) => sum + (file.lines || 0), 0),
            totalSize: result.statistics.totalSize,
            uploadedAt: new Date(),
            extractedPath: result.projectPath
          },
          // Update database progress to match in-memory progress
          'progress.uploadProgress': 100,
          updatedAt: new Date()
        },
        { new: true }
      );

      // Complete upload
      uploadProgress.set(projectId, {
        projectId,
        status: 'completed',
        progress: 100,
        message: 'Upload completed successfully',
        result
      });

      ResponseHandler.success(res, {
        project: updatedProject,
        analysis: {
          totalFiles: result.statistics.totalFiles,
          languages: result.statistics.languages,
          fileTypes: result.statistics.fileTypes,
          totalSize: result.statistics.totalSize
        }
      }, 'Codebase uploaded and analyzed successfully');

    } catch (error) {
      console.error('Upload processing error:', error);
      
      uploadProgress.set(projectId, {
        projectId,
        status: 'error',
        progress: 0,
        message: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      ResponseHandler.error(res, 'Failed to process uploaded file', 500);
      return;
    }
  });
});

/**
 * Get upload progress for a project
 * GET /api/v1/projects/:id/upload/status
 */
export const getUploadStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id: projectId } = req.params;
  const userId = req.user?.id;

  // Verify project access
  const project = await Project.findById(projectId);
  if (!project) {
    return ResponseHandler.error(res, 'Project not found', 404);
  }

  const hasAccess = project.teamMembers.some((member: any) => 
    member.user.toString() === userId && ['owner', 'admin', 'member'].includes(member.role)
  );
  
  if (!hasAccess) {
    return ResponseHandler.error(res, 'Access denied', 403);
  }

  // Get upload progress
  const progress = uploadProgress.get(projectId);
  
  if (!progress) {
    // If no progress found, check project status
    const status = project.status === 'created' ? 'pending' : project.status;
    return ResponseHandler.success(res, {
      projectId,
      status,
      progress: project.status === 'completed' ? 100 : 0,
      message: `Project is ${status}`
    });
  }

  ResponseHandler.success(res, progress);
});

/**
 * Get project file structure
 * GET /api/v1/projects/:id/files
 */
export const getProjectFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id: projectId } = req.params;
  const userId = req.user?.id;

  // Verify project access
  const project = await Project.findById(projectId);
  if (!project) {
    return ResponseHandler.error(res, 'Project not found', 404);
  }

  const hasAccess = project.teamMembers.some((member: any) => 
    member.user.toString() === userId && ['owner', 'admin', 'member'].includes(member.role)
  );
  
  if (!hasAccess) {
    return ResponseHandler.error(res, 'Access denied', 403);
  }

  // Get cached analysis result
  const progress = uploadProgress.get(projectId);
  
  if (!progress || !progress.result) {
    return ResponseHandler.error(res, 'No file analysis available', 404);
  }

  ResponseHandler.success(res, {
    files: progress.result.files,
    statistics: progress.result.statistics,
    projectPath: progress.result.projectPath
  });
});

/**
 * Retry failed upload
 * POST /api/v1/projects/:id/upload/retry
 */
export const retryUpload = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id: projectId } = req.params;
  const userId = req.user?.id;

  // Verify project access
  const project = await Project.findById(projectId);
  if (!project) {
    return ResponseHandler.error(res, 'Project not found', 404);
  }

  const hasAccess = project.teamMembers.some((member: any) => 
    member.user.toString() === userId && ['owner', 'admin', 'member'].includes(member.role)
  );
  
  if (!hasAccess) {
    return ResponseHandler.error(res, 'Access denied', 403);
  }

  // Clear previous upload progress
  uploadProgress.delete(projectId);

  // Reset project status
  await Project.findByIdAndUpdate(projectId, {
    status: 'created',
    codebaseMetadata: undefined,
    updatedAt: new Date()
  });

  ResponseHandler.success(res, { message: 'Upload reset. You can now upload a new file.' });
});

/**
 * Cancel ongoing upload
 * DELETE /api/v1/projects/:id/upload
 */
export const cancelUpload = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { id: projectId } = req.params;
  const userId = req.user?.id;

  // Verify project access
  const project = await Project.findById(projectId);
  if (!project) {
    return ResponseHandler.error(res, 'Project not found', 404);
  }

  const hasAccess = project.teamMembers.some((member: any) => 
    member.user.toString() === userId && ['owner', 'admin', 'member'].includes(member.role)
  );
  
  if (!hasAccess) {
    return ResponseHandler.error(res, 'Access denied', 403);
  }

  // Clear upload progress
  uploadProgress.delete(projectId);

  // Reset project status
  await Project.findByIdAndUpdate(projectId, {
    status: 'created',
    updatedAt: new Date()
  });

  ResponseHandler.success(res, { message: 'Upload cancelled successfully' });
});
