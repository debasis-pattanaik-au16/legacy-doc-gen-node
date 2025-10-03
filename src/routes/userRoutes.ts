import { Router } from 'express';
import { UserController } from '@/controllers/userController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/utils/validation';
import { userValidation } from '@/utils/validation';

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

// PATCH /api/me/password - Change password (coming in next task)
// router.patch('/me/password', authenticate, validate(userValidation.updatePassword), UserController.updatePassword);

// POST /api/me/avatar - Upload avatar (coming in next task)
// router.post('/me/avatar', authenticate, UserController.uploadAvatar);

export default router;
