import { Router } from 'express';
import Joi from 'joi';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  updateProjectStatus
} from '@/controllers/projectController';
import { authenticate, requireRole } from '@/middleware/auth';
import { validate } from '@/utils/validation';
import { 
  projectCreateSchema,
  projectUpdateSchema,
  projectQuerySchema,
  teamMemberSchema
} from '@/utils/validation';
import { rateLimitConfig } from '@/middleware/security';

const router = Router();

/**
 * Project Management Routes
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post(
  '/',
  rateLimitConfig,
  validate(projectCreateSchema),
  createProject
);

/**
 * @route   GET /api/v1/projects
 * @desc    Get all projects for authenticated user
 * @access  Private
 */
router.get(
  '/',
  validate(projectQuerySchema, 'query'),
  getProjects
);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
router.get(
  '/:id',
  getProjectById
);

/**
 * @route   PUT /api/v1/projects/:id
 * @desc    Update project
 * @access  Private (Write permissions required)
 */
router.put(
  '/:id',
  validate(projectUpdateSchema),
  updateProject
);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Delete project
 * @access  Private (Owner or Admin permissions required)
 */
router.delete(
  '/:id',
  deleteProject
);

/**
 * @route   POST /api/v1/projects/:id/team
 * @desc    Add team member to project
 * @access  Private (Admin permissions required)
 */
router.post(
  '/:id/team',
  validate(teamMemberSchema),
  addTeamMember
);

/**
 * @route   DELETE /api/v1/projects/:id/team/:userId
 * @desc    Remove team member from project
 * @access  Private (Admin permissions required)
 */
router.delete(
  '/:id/team/:userId',
  removeTeamMember
);

/**
 * @route   PATCH /api/v1/projects/:id/status
 * @desc    Update project status
 * @access  Private (Write permissions required)
 */
router.patch(
  '/:id/status',
  validate(Joi.object({
    status: Joi.string()
      .valid('created', 'uploading', 'uploaded', 'analyzing', 'analyzed', 'generating', 'completed', 'failed')
      .required()
      .messages({
        'any.required': 'Status is required',
        'any.only': 'Status must be one of: created, uploading, uploaded, analyzing, analyzed, generating, completed, failed'
      })
  }), 'body'),
  updateProjectStatus
);

export default router;
