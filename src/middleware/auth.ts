import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { AuthenticatedRequest, JwtPayload } from '@/types';
import { ResponseHandler } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { config } from '@/config/env';

/**
 * JWT Authentication Middleware
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHandler.unauthorized(res, 'Access token required');
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    
    // Find user by ID
    const user = await User.findById(decoded.userId).select('+lastLogin');
    
    if (!user) {
      ResponseHandler.unauthorized(res, 'Invalid token - user not found');
      return;
    }

    // Check if user is active (not deleted/suspended)
    if (!user.isEmailVerified && config.NODE_ENV === 'production') {
      ResponseHandler.unauthorized(res, 'Email verification required');
      return;
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      ResponseHandler.unauthorized(res, 'Invalid token');
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      ResponseHandler.unauthorized(res, 'Token expired');
      return;
    }
    
    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      ResponseHandler.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);
    
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Refresh token validation middleware
 */
export const validateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      ResponseHandler.validationError(res, 'Refresh token required');
      return;
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as JwtPayload;
    
    if ((decoded as any).type !== 'refresh') {
      ResponseHandler.unauthorized(res, 'Invalid refresh token');
      return;
    }

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      ResponseHandler.unauthorized(res, 'Invalid refresh token - user not found');
      return;
    }

    (req as AuthenticatedRequest).user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      ResponseHandler.unauthorized(res, 'Invalid refresh token');
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      ResponseHandler.unauthorized(res, 'Refresh token expired');
      return;
    }
    
    next(new AppError('Refresh token validation failed', 401));
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      ResponseHandler.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

/**
 * Project ownership/membership middleware
 */
export const checkProjectAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Authentication required');
      return;
    }

    const projectId = req.params.projectId || req.params.id;
    
    if (!projectId) {
      ResponseHandler.validationError(res, 'Project ID required');
      return;
    }

    // Import Project model here to avoid circular dependency
    const { Project } = await import('@/models/Project');
    const project = await Project.findById(projectId);
    
    if (!project) {
      ResponseHandler.notFound(res, 'Project not found');
      return;
    }

    // Check if user is owner or team member
    const isOwner = project.ownerId.toString() === req.user._id.toString();
    const isTeamMember = project.teamMembers.some(
      (memberId: any) => memberId.toString() === req.user!._id.toString()
    );
    
    if (!isOwner && !isTeamMember && req.user.role !== 'admin') {
      ResponseHandler.forbidden(res, 'Access denied to this project');
      return;
    }

    // Attach project to request for use in route handlers
    (req as any).project = project;
    next();

  } catch (error) {
    next(new AppError('Project access check failed', 500));
  }
};
