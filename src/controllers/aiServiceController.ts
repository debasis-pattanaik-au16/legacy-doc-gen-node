import { Request, Response } from 'express';
import { aiServiceManager } from '@/services/aiServiceManager';
import { logger } from '@/utils/logger';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { ResponseHandler } from '@/utils/response';

// Extend Request interface for authentication
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * AI Service Controller
 * Manages AI service configuration, testing, and monitoring
 */
export class AIServiceController {
  
  /**
   * Get AI service status and statistics
   * GET /api/ai-service/status
   */
  getStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const stats = aiServiceManager.getStats();
    const healthStatus = aiServiceManager.getHealthStatus();
    
    ResponseHandler.success(res, {
      stats,
      health: healthStatus
    }, 'AI service status retrieved successfully');
  });

  /**
   * Test AI service connectivity
   * POST /api/ai-service/test
   */
  testConnectivity = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    logger.info(`Testing AI service connectivity for user: ${userId}`);
    
    try {
      const connectivityResults = await aiServiceManager.testConnectivity();
      
      ResponseHandler.success(res, {
        connectivity: connectivityResults,
        timestamp: new Date().toISOString()
      }, 'AI service connectivity test completed');
    } catch (error: any) {
      logger.error('AI service connectivity test failed:', error);
      throw new AppError(`Connectivity test failed: ${error.message}`, 500);
    }
  });

  /**
   * Test code analysis with sample code
   * POST /api/ai-service/test-analysis
   */
  testCodeAnalysis = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { code, language, provider } = req.body;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!code || !language) {
      throw new AppError('Code and language are required', 400);
    }

    logger.info(`Testing code analysis for user: ${userId}, language: ${language}`);

    try {
      // Temporarily switch provider if specified
      const originalProvider = aiServiceManager.getStats().currentProvider;
      if (provider && provider !== originalProvider) {
        aiServiceManager.switchProvider(provider);
      }

      const analysisResult = await aiServiceManager.analyzeCode(
        code,
        language,
        'test-file.' + this.getFileExtension(language),
        'Test analysis request'
      );

      // Restore original provider
      if (provider && provider !== originalProvider) {
        aiServiceManager.switchProvider(originalProvider);
      }

      ResponseHandler.success(res, {
        analysis: analysisResult,
        provider: provider || originalProvider,
        timestamp: new Date().toISOString()
      }, 'Code analysis test completed successfully');

    } catch (error: any) {
      logger.error('Code analysis test failed:', error);
      throw new AppError(`Code analysis test failed: ${error.message}`, 500);
    }
  });

  /**
   * Switch AI service provider
   * POST /api/ai-service/switch-provider
   */
  switchProvider = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { provider } = req.body;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user has admin role
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    if (!provider || !['openai', 'gemini', 'both'].includes(provider)) {
      throw new AppError('Invalid provider. Must be one of: openai, gemini, both', 400);
    }

    logger.info(`Switching AI service provider to: ${provider} by user: ${userId}`);

    try {
      aiServiceManager.switchProvider(provider);
      
      ResponseHandler.success(res, {
        newProvider: provider,
        timestamp: new Date().toISOString()
      }, `AI service provider switched to ${provider}`);

    } catch (error: any) {
      logger.error('Failed to switch AI service provider:', error);
      throw new AppError(`Failed to switch provider: ${error.message}`, 500);
    }
  });

  /**
   * Toggle fallback mechanism
   * POST /api/ai-service/toggle-fallback
   */
  toggleFallback = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { enabled } = req.body;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user has admin role
    if (req.user?.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    if (typeof enabled !== 'boolean') {
      throw new AppError('Enabled must be a boolean value', 400);
    }

    logger.info(`Toggling AI service fallback to: ${enabled} by user: ${userId}`);

    try {
      aiServiceManager.setFallbackEnabled(enabled);
      
      ResponseHandler.success(res, {
        fallbackEnabled: enabled,
        timestamp: new Date().toISOString()
      }, `AI service fallback ${enabled ? 'enabled' : 'disabled'}`);

    } catch (error: any) {
      logger.error('Failed to toggle AI service fallback:', error);
      throw new AppError(`Failed to toggle fallback: ${error.message}`, 500);
    }
  });

  /**
   * Get AI service usage statistics
   * GET /api/ai-service/usage-stats
   */
  getUsageStats = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const stats = aiServiceManager.getStats();
    
    ResponseHandler.success(res, {
      usage: stats,
      timestamp: new Date().toISOString()
    }, 'AI service usage statistics retrieved successfully');
  });

  /**
   * Helper method to get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      cpp: 'cpp',
      c: 'c'
    };

    return extensions[language.toLowerCase()] || 'txt';
  }
}

export const aiServiceController = new AIServiceController();
