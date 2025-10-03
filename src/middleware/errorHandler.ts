import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '@/utils/response';
import { logger } from '@/utils/logger';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;

  // Handle different types of errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = 500;
    message = 'Database error';
    code = 'DATABASE_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.name === 'MulterError') {
    // Handle multer file upload errors
    statusCode = 400;
    if (error.message.includes('File too large')) {
      message = 'File size exceeds 2MB limit';
      code = 'FILE_TOO_LARGE';
    } else if (error.message.includes('Unexpected field')) {
      message = 'Unexpected file field. Use "avatar" field name';
      code = 'INVALID_FILE_FIELD';
    } else {
      message = error.message || 'File upload error';
      code = 'FILE_UPLOAD_ERROR';
    }
  } else if (error.message && error.message.includes('Only PNG and JPEG')) {
    // Custom file type validation
    statusCode = 400;
    message = error.message;
    code = 'INVALID_FILE_TYPE';
  } else if (error.message && error.message.includes('Invalid image')) {
    // Image validation errors from sharp
    statusCode = 400;
    message = error.message;
    code = 'INVALID_IMAGE';
  } else if (error.message && error.message.includes('Failed to compress')) {
    // Image compression errors
    statusCode = 500;
    message = 'Failed to process image. Please try a different image.';
    code = 'IMAGE_PROCESSING_ERROR';
  } else if (error.message && error.message.includes('storage')) {
    // Storage provider errors
    statusCode = 500;
    message = 'Failed to upload file. Please try again.';
    code = 'STORAGE_ERROR';
  }

  // Log the error
  logger.error(`Error in ${req.method} ${req.path}`, error);

  // Send error response
  ResponseHandler.error(res, message, statusCode, code);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  ResponseHandler.notFound(res, `Route ${req.method} ${req.path} not found`);
};
