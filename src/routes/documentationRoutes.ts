import { Router } from 'express';
import Joi from 'joi';
import { documentationController } from '@/controllers/documentationController';
import { authenticate, requireRole, authenticateFlexible } from '@/middleware/auth';
import { validate } from '@/utils/validation';
import { rateLimitConfig } from '@/middleware/security';

const router = Router();

/**
 * Documentation Management Routes
 * Routes have individual authentication based on their needs
 * - Most routes use standard authenticate middleware
 * - View/download routes use authenticateFlexible for direct browser access
 */

/**
 * Request body validation schemas
 */
const generateDocumentationSchema = Joi.object({
  sections: Joi.array()
    .items(
      Joi.string().valid('readme', 'api', 'architecture', 'components', 'dependencies')
    )
    .min(1)
    .max(5)
    .default(['readme', 'api', 'architecture'])
    .messages({
      'array.min': 'At least one section must be specified',
      'array.max': 'Maximum 5 sections allowed',
      'any.only': 'Invalid section. Valid sections: readme, api, architecture, components, dependencies'
    })
}).options({ stripUnknown: true });

const paginationSchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Offset cannot be negative'
    })
}).options({ stripUnknown: true });

const sectionQuerySchema = Joi.object({
  section: Joi.string()
    .valid('readme', 'apiDocs', 'architecture')
    .optional()
    .messages({
      'any.only': 'Invalid section. Valid sections: readme, apiDocs, architecture'
    })
}).options({ stripUnknown: true });

/**
 * @route   POST /api/v1/documentation/generate/:projectId
 * @desc    Generate documentation for a project
 * @access  Private (Project team members)
 */
router.post(
  '/generate/:projectId',
  authenticate,
  rateLimitConfig,
  validate(generateDocumentationSchema, 'body'),
  documentationController.generateDocumentation
);

/**
 * @route   GET /api/v1/documentation/:projectId
 * @desc    Get generated documentation for a project
 * @access  Private (Project team members)
 * @query   section - Optional specific section to retrieve
 */
router.get(
  '/:projectId',
  authenticate,
  validate(sectionQuerySchema, 'query'),
  documentationController.getDocumentation
);

/**
 * @route   GET /api/v1/documentation/:projectId/status
 * @desc    Get documentation generation status
 * @access  Private (Project team members)
 */
router.get(
  '/:projectId/status',
  authenticate,
  documentationController.getGenerationStatus
);

/**
 * @route   GET /api/v1/documentation/job/:jobId/status
 * @desc    Get documentation generation status by job ID
 * @access  Private (Job owner)
 */
router.get(
  '/job/:jobId/status',
  authenticate,
  documentationController.getJobStatus
);

/**
 * @route   GET /api/v1/documentation/:projectId/history
 * @desc    Get documentation generation history for a project
 * @access  Private (Project team members)
 */
router.get(
  '/:projectId/history',
  authenticate,
  validate(paginationSchema, 'query'),
  documentationController.getDocumentationHistory
);

/**
 * @route   POST /api/v1/documentation/:projectId/cancel
 * @desc    Cancel active documentation generation
 * @access  Private (Job owner)
 */
router.post(
  '/:projectId/cancel',
  authenticate,
  rateLimitConfig,
  documentationController.cancelDocumentationGeneration
);

/**
 * @route   GET /api/v1/documentation/:projectId/files
 * @desc    Get list of available downloadable files
 * @access  Private (Project team members)
 */
router.get(
  '/:projectId/files',
  authenticate,
  documentationController.getAvailableFiles
);

/**
 * @route   GET /api/v1/documentation/:projectId/download/:fileName
 * @desc    Download specific documentation file
 * @access  Private (Project team members) - accepts token in header or query
 */
router.get(
  '/:projectId/download/:fileName',
  authenticateFlexible,
  documentationController.downloadDocumentationFile
);

/**
 * @route   GET /api/v1/documentation/:projectId/download-zip
 * @desc    Download all documentation as ZIP file
 * @access  Private (Project team members) - accepts token in header or query
 */
router.get(
  '/:projectId/download-zip',
  authenticateFlexible,
  documentationController.downloadDocumentationZip
);

/**
 * @route   GET /api/v1/documentation/:projectId/view/:section?
 * @desc    View documentation as HTML in browser
 * @access  Private (Project team members) - accepts token in header or query
 */
router.get(
  '/:projectId/view/:section?',
  authenticateFlexible,
  documentationController.viewDocumentation
);

/**
 * @route   DELETE /api/v1/documentation/:projectId
 * @desc    Delete all generated documentation for a project
 * @access  Private (Project owner or admin)
 */
router.delete(
  '/:projectId',
  authenticate,
  rateLimitConfig,
  documentationController.deleteDocumentation
);

/**
 * Health check endpoints for documentation service
 */

/**
 * @route   GET /api/v1/documentation/health
 * @desc    Documentation service health check
 * @access  Private
 */
router.get('/health', authenticate, (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Documentation Service',
    timestamp: new Date().toISOString(),
    endpoints: {
      generate: 'POST /generate/:projectId',
      retrieve: 'GET /:projectId',
      status: 'GET /:projectId/status',
      history: 'GET /:projectId/history',
      files: 'GET /:projectId/files',
      download: 'GET /:projectId/download/:fileName',
      downloadZip: 'GET /:projectId/download-zip',
      view: 'GET /:projectId/view/:section?',
      cancel: 'POST /:projectId/cancel',
      delete: 'DELETE /:projectId'
    }
  });
});

/**
 * @route   GET /api/v1/documentation/stats
 * @desc    Get documentation service statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { DocumentationJob } = await import('@/models');
    
    // Get basic stats
    const stats = await DocumentationJob.getJobStats();
    const activeJobs = await DocumentationJob.getActiveJobs();
    
    res.status(200).json({
      status: 'OK',
      statistics: {
        totalJobs: stats.reduce((sum: number, stat: any) => sum + stat.count, 0),
        activeJobs: activeJobs.length,
        jobsByStatus: stats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        averageExecutionTime: stats.find((s: any) => s._id === 'completed')?.avgExecutionTime || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to retrieve statistics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;