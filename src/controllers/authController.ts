import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { AuthenticatedRequest } from '@/types';
import { ResponseHandler } from '@/utils/response';
import { AppError, asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { emailService } from '@/services/emailService';

/**
 * Authentication Controller based on PRD specifications
 */
export class AuthController {
  /**
   * Register new user
   */
  public static register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      ResponseHandler.validationError(res, 'User with this email already exists');
      return;
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user'
    });

    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Generate email verification token (if needed)
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await emailService.sendEmailVerificationEmail(email, verificationToken, name);
      logger.info(`Verification email sent to: ${email}`);
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}:`, error);
      // Don't fail registration if email fails
    }

    logger.info(`New user registered: ${email}`);

    ResponseHandler.success(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isEmailVerified: user.isEmailVerified
      },
      tokens: {
        accessToken: authToken,
        refreshToken,
        expiresIn: '7d'
      },
      ...(process.env.NODE_ENV === 'development' && { verificationToken })
    }, 'User registered successfully. Please check your email to verify your account.', 201);
  });

  /**
   * Login user
   */
  public static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      ResponseHandler.unauthorized(res, 'Invalid email or password');
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    logger.info(`User logged in: ${email}`);

    ResponseHandler.success(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      },
      tokens: {
        accessToken: authToken,
        refreshToken,
        expiresIn: '7d'
      }
    }, 'Login successful');
  });

  /**
   * Refresh access token
   */
  public static refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    // Generate new access token
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    ResponseHandler.success(res, {
      tokens: {
        accessToken: authToken,
        refreshToken,
        expiresIn: '7d'
      }
    }, 'Token refreshed successfully');
  });

  /**
   * Get current user profile
   */
  public static getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    ResponseHandler.success(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    }, 'Profile retrieved successfully');
  });

  /**
   * Update user profile
   */
  public static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { name, subscriptionPlan } = req.body;

    if (name) user.name = name;
    if (subscriptionPlan) user.subscriptionPlan = subscriptionPlan;

    await user.save();

    logger.info(`User profile updated: ${user.email}`);

    ResponseHandler.success(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isEmailVerified: user.isEmailVerified
      }
    }, 'Profile updated successfully');
  });

  /**
   * Forgot password
   */
  public static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      ResponseHandler.success(res, {}, 'If the email exists, a reset link has been sent');
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user.name);
      logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      // Don't reveal if email exists, but log the error
    }

    ResponseHandler.success(res, {
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    }, 'If the email exists, a reset link has been sent');
  });

  /**
   * Reset password
   */
  public static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    const user = await User.findByResetToken(token);
    if (!user) {
      ResponseHandler.validationError(res, 'Invalid or expired reset token');
      return;
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset completed for: ${user.email}`);

    ResponseHandler.success(res, {}, 'Password reset successful');
  });

  /**
   * Verify email
   */
  public static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const user = await User.findByVerificationToken(token);
    if (!user) {
      ResponseHandler.validationError(res, 'Invalid or expired verification token');
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    // Send welcome email after verification
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
      logger.info(`Welcome email sent to: ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${user.email}:`, error);
      // Don't fail verification if welcome email fails
    }

    logger.info(`Email verified for: ${user.email}`);

    ResponseHandler.success(res, {}, 'Email verified successfully');
  });

  /**
   * Logout (client-side token invalidation)
   */
  public static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // In a more sophisticated setup, you might maintain a token blacklist
    // For now, we rely on client-side token removal
    
    logger.info(`User logged out: ${req.user!.email}`);

    ResponseHandler.success(res, {}, 'Logout successful');
  });
}
