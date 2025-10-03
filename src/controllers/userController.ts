import { Response } from 'express';
import { User } from '@/models/User';
import { AuthenticatedRequest } from '@/types';
import { ResponseHandler } from '@/utils/response';
import { asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

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
    const userId = req.user!.userId || req.user!.id || req.user!._id;

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
    const userId = req.user!.userId || req.user!.id || req.user!._id;
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
    const userId = req.user!.userId || req.user!.id || req.user!._id;
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
    const userId = req.user!.userId || req.user!.id || req.user!._id;
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
   * Change user password
   * Coming in next task...
   */

  /**
   * POST /api/me/avatar
   * Upload and update user avatar
   * Coming in next task...
   */
}
