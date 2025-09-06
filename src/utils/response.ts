import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Standardized API Response Handler
 */
export class ResponseHandler {
  /**
   * Send success response
   */
  public static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): Response<ApiSuccessResponse<T>> {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message })
    };

    logger.info(`API Success: ${res.req.method} ${res.req.path}`, {
      statusCode,
      message
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  public static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ): Response<ApiErrorResponse> {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        message,
        ...(code && { code }),
        ...(details && { details })
      }
    };

    logger.error(`API Error: ${res.req.method} ${res.req.path}`, {
      statusCode,
      message,
      code,
      details
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  public static validationError(
    res: Response,
    message: string = 'Validation failed',
    details?: any
  ): Response<ApiErrorResponse> {
    return this.error(res, message, 400, 'VALIDATION_ERROR', details);
  }

  /**
   * Send unauthorized error response
   */
  public static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response<ApiErrorResponse> {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Send forbidden error response
   */
  public static forbidden(
    res: Response,
    message: string = 'Forbidden access'
  ): Response<ApiErrorResponse> {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Send not found error response
   */
  public static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response<ApiErrorResponse> {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * Send created response
   */
  public static created<T>(
    res: Response,
    data: T,
    message?: string
  ): Response<ApiSuccessResponse<T>> {
    return this.success(res, data, message, 201);
  }

  /**
   * Send internal server error response
   */
  public static internalError(
    res: Response,
    message: string = 'Internal server error',
    error?: Error
  ): Response<ApiErrorResponse> {
    const details = error ? {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    } : undefined;

    return this.error(res, message, 500, 'INTERNAL_ERROR', details);
  }
}
