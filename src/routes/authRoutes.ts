import { Router } from 'express';
import { AuthController } from '@/controllers/authController';
import { authenticate, validateRefreshToken } from '@/middleware/auth';
import { validate, userValidation } from '@/utils/validation';
import { authRateLimitConfig } from '@/middleware/security';

/**
 * Authentication routes based on PRD specifications
 */
const router = Router();

// Apply stricter rate limiting to auth routes
router.use(authRateLimitConfig);

// Public routes
router.post('/register', 
  validate(userValidation.register),
  AuthController.register
);

router.post('/login',
  validate(userValidation.login),
  AuthController.login
);

router.post('/forgot-password',
  validate(userValidation.forgotPassword),
  AuthController.forgotPassword
);

router.post('/reset-password',
  validate(userValidation.resetPassword),
  AuthController.resetPassword
);

router.get('/verify-email/:token',
  AuthController.verifyEmail
);

// Protected routes
router.post('/refresh',
  validateRefreshToken,
  AuthController.refreshToken
);

router.get('/profile',
  authenticate,
  AuthController.getProfile
);

router.put('/profile',
  authenticate,
  validate(userValidation.updateProfile),
  AuthController.updateProfile
);

router.post('/logout',
  authenticate,
  AuthController.logout
);

export { router as authRoutes };
export default router;
