import express from 'express';
import { aiServiceController } from '@/controllers/aiServiceController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/utils/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const testAnalysisSchema = Joi.object({
  code: Joi.string().required().min(1).max(10000),
  language: Joi.string().required().valid(
    'javascript', 'typescript', 'python', 'java', 'csharp', 
    'php', 'ruby', 'go', 'rust', 'cpp', 'c'
  ),
  provider: Joi.string().optional().valid('openai', 'gemini')
});

const switchProviderSchema = Joi.object({
  provider: Joi.string().required().valid('openai', 'gemini', 'both')
});

const toggleFallbackSchema = Joi.object({
  enabled: Joi.boolean().required()
});

// Routes
router.get('/status', authenticate, aiServiceController.getStatus);
router.post('/test', authenticate, aiServiceController.testConnectivity);
router.post('/test-analysis', authenticate, validate(testAnalysisSchema), aiServiceController.testCodeAnalysis);
router.post('/switch-provider', authenticate, validate(switchProviderSchema), aiServiceController.switchProvider);
router.post('/toggle-fallback', authenticate, validate(toggleFallbackSchema), aiServiceController.toggleFallback);
router.get('/usage-stats', authenticate, aiServiceController.getUsageStats);

export default router;
