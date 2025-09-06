import { Router } from 'express';
import { analysisController } from '@/controllers/analysisController';
import { authenticate } from '@/middleware/auth';

const router = Router();

/**
 * Analysis Routes
 * All routes require authentication
 */

/**
 * @route   POST /api/analysis/start/:projectId
 * @desc    Start code analysis for a project
 * @access  Private
 */
router.post('/start/:projectId', authenticate, analysisController.startAnalysis);

/**
 * @route   GET /api/analysis/:projectId
 * @desc    Get complete analysis results for a project
 * @access  Private
 */
router.get('/:projectId', authenticate, analysisController.getAnalysis);

/**
 * @route   GET /api/analysis/:projectId/summary
 * @desc    Get analysis summary/overview
 * @access  Private
 */
router.get('/:projectId/summary', authenticate, analysisController.getAnalysisSummary);

/**
 * @route   DELETE /api/analysis/:projectId
 * @desc    Delete analysis results (project owner only)
 * @access  Private
 */
router.delete('/:projectId', authenticate, analysisController.deleteAnalysis);

export default router;
