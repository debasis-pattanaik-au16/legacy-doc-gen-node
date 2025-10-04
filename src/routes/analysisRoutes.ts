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
 * @route   GET /api/analysis/:projectId/insights
 * @desc    Get AI-generated insights (filterable by impact, category)
 * @query   impact - Filter by impact level (low, medium, high, critical)
 * @query   category - Filter by category (architecture, performance, maintainability, security)
 * @access  Private
 */
router.get('/:projectId/insights', authenticate, analysisController.getInsights);

/**
 * @route   GET /api/analysis/:projectId/recommendations
 * @desc    Get actionable recommendations (filterable by priority, type)
 * @query   priority - Filter by priority (low, medium, high, critical)
 * @query   type - Filter by type (refactor, optimize, security, architecture)
 * @access  Private
 */
router.get('/:projectId/recommendations', authenticate, analysisController.getRecommendations);

/**
 * @route   GET /api/analysis/:projectId/critical
 * @desc    Get all critical issues (critical insights + high-priority recommendations)
 * @access  Private
 */
router.get('/:projectId/critical', authenticate, analysisController.getCriticalIssues);

/**
 * @route   DELETE /api/analysis/:projectId
 * @desc    Delete analysis results (project owner only)
 * @access  Private
 */
router.delete('/:projectId', authenticate, analysisController.deleteAnalysis);

export default router;
