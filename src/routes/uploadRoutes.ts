import express from 'express';
import { authenticate } from '../middleware/auth';
import { 
  uploadCodebase, 
  getUploadStatus, 
  getProjectFiles, 
  retryUpload, 
  cancelUpload 
} from '../controllers/uploadController';

const router = express.Router();

// All upload routes require authentication
router.use(authenticate);

// Upload codebase ZIP file
router.post('/:id/upload', uploadCodebase);

// Get upload progress/status
router.get('/:id/upload/status', getUploadStatus);

// Get project file structure
router.get('/:id/files', getProjectFiles);

// Retry failed upload
router.post('/:id/upload/retry', retryUpload);

// Cancel ongoing upload
router.delete('/:id/upload', cancelUpload);

export default router;
