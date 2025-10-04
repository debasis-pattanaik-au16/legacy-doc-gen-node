import { Router } from 'express';
import { UserController, avatarUploadMiddleware } from '@/controllers/userController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/utils/validation';
import { userValidation } from '@/utils/validation';
import { passwordChangeRateLimitConfig } from '@/middleware/security';

const router = Router();

/**
 * User Profile & Settings Routes
 * All routes require authentication
 */

// GET /api/me - Get current user profile
router.get('/me', authenticate, UserController.getProfile);

// PUT /api/me - Update user profile
router.put('/me', authenticate, validate(userValidation.updateProfileSettings), UserController.updateProfile);

// PUT /api/me/notifications - Update notification preferences
router.put('/me/notifications', authenticate, validate(userValidation.updateNotifications), UserController.updateNotifications);

// PUT /api/me/preferences - Update user preferences
router.put('/me/preferences', authenticate, validate(userValidation.updatePreferences), UserController.updatePreferences);

// PATCH /api/me/password - Change password (rate limited)
router.patch(
  '/me/password', 
  passwordChangeRateLimitConfig, // Rate limit first
  authenticate, 
  validate(userValidation.updatePassword), 
  UserController.updatePassword
);

// POST /api/me/avatar - Upload avatar with compression
router.post(
  '/me/avatar',
  authenticate,
  avatarUploadMiddleware, // Multer handles file upload
  UserController.uploadAvatar
);

export default router;
