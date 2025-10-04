import { Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { User } from '@/models/User';
import { AuthenticatedRequest } from '@/types';
import { ResponseHandler } from '@/utils/response';
import { asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { avatarService } from '@/services/avatarService';

/**
 * User Profile & Settings Controller
 * Handles user profile management, settings, and avatar operations
 */
export class UserController {
  /**
   * GET /api/me
   * Get current user profile with all settings
   */
  public static getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!._id;

    const user = await User.findById(userId);
    
    if (!user) {
      ResponseHandler.notFound(res, 'User not found');
      return;
    }

    // Use the toProfileDTO() method to get sanitized profile
    const profileDTO = user.toProfileDTO();

    logger.info(`Profile retrieved for user: ${user.email}`);

    ResponseHandler.success(res, profileDTO, 'Profile retrieved successfully');
  });

  /**
   * PUT /api/me
   * Update user profile (name, company, timezone, avatarUrl)
   */
  public static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!._id;
    const { name, company, timezone, avatarUrl } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      ResponseHandler.notFound(res, 'User not found');
      return;
    }

    // Update fields
    user.name = name;
    user.company = company || undefined;
    user.timezone = timezone;
    
    // Only update avatarUrl if provided (avatar upload will set this)
    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl || undefined;
    }

    await user.save();

    logger.info(`Profile updated for user: ${user.email}`, {
      fields: { name, company, timezone, avatarUrl: !!avatarUrl }
    });

    ResponseHandler.success(res, user.toProfileDTO(), 'Profile updated successfully');
  });

  /**
   * PUT /api/me/notifications
   * Update notification preferences
   */
  public static updateNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!._id;
    const { productUpdates, analysisReady } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      ResponseHandler.notFound(res, 'User not found');
      return;
    }

    // Update notification preferences
    user.notifications = {
      productUpdates,
      analysisReady
    };

    await user.save();

    logger.info(`Notification preferences updated for user: ${user.email}`, {
      notifications: { productUpdates, analysisReady }
    });

    ResponseHandler.success(res, user.toProfileDTO(), 'Notification preferences updated successfully');
  });

  /**
   * PUT /api/me/preferences
   * Update user preferences (auto-save)
   */
  public static updatePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!._id;
    const { autoSave } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      ResponseHandler.notFound(res, 'User not found');
      return;
    }

    // Update preferences
    user.preferences = {
      autoSave
    };

    await user.save();

    logger.info(`Preferences updated for user: ${user.email}`, {
      preferences: { autoSave }
    });

    ResponseHandler.success(res, user.toProfileDTO(), 'Preferences updated successfully');
  });

  /**
   * PATCH /api/me/password
   * Change user password (with current password verification)
   * Rate limited to prevent brute force attacks
   */
  public static updatePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!._id;
    const { currentPassword, newPassword } = req.body;

    // Find user with password field (normally excluded)
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      ResponseHandler.notFound(res, 'User not found');
      return;
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      logger.warn(`Failed password change attempt for user: ${user.email}`);
      ResponseHandler.error(res, 'Current password is incorrect', 400, 'INVALID_PASSWORD');
      return;
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed successfully for user: ${user.email}`);

    ResponseHandler.success(res, {
      message: 'Password updated successfully'
    }, 'Password updated successfully');
  });

  /**
   * POST /api/me/avatar
   * Upload and update user avatar with compression
   * Multer middleware handles file upload to memory
   */
  public static uploadAvatar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!._id;
    
    // Check if file was uploaded
    if (!req.file) {
      ResponseHandler.fieldValidationError(res, {
        avatar: 'No avatar file provided'
      }, 'Avatar upload failed');
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      ResponseHandler.notFound(res, 'User not found');
      return;
    }

    try {
      // Validate image
      await avatarService.validateImage(req.file.buffer);

      // Delete old avatar if exists (non-blocking)
      if (user.avatarUrl) {
        avatarService.deleteAvatar(user.avatarUrl).catch(err => {
          logger.warn('Failed to delete old avatar:', err);
        });
      }

      // Upload compressed avatar
      const result = await avatarService.uploadAvatar(
        userId,
        req.file.buffer,
        req.file.mimetype
      );

      // Update user profile with new avatar URL
      user.avatarUrl = result.avatarUrl;
      await user.save();

      logger.info(`Avatar uploaded successfully for user: ${user.email}`, {
        size: result.size,
        compressed: result.compressed
      });

      ResponseHandler.success(res, {
        avatarUrl: result.avatarUrl,
        size: result.size,
        compressed: result.compressed,
        user: user.toProfileDTO()
      }, 'Avatar uploaded successfully');
    } catch (error: any) {
      logger.error(`Avatar upload failed for user ${userId}:`, error);
      ResponseHandler.error(res, error.message || 'Failed to upload avatar', 500);
    }
  });
}

/**
 * Multer configuration for avatar upload
 * Stores file in memory for processing
 */
export const avatarUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB before compression
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPEG images are allowed'));
    }
  }
}).single('avatar');
