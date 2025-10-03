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
   * Coming in next task...
   */

  /**
   * PUT /api/me/notifications
   * Update notification preferences
   * Coming in next task...
   */

  /**
   * PUT /api/me/preferences
   * Update user preferences (auto-save)
   * Coming in next task...
   */

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
