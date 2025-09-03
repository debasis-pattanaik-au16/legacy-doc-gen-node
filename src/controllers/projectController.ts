import { Request, Response } from 'express';
import { Project } from '@/models';
import { ResponseHandler } from '@/utils/response';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/types';
import { logger } from '@/utils/logger';

// Use ResponseHandler for all API responses
const ApiResponse = ResponseHandler;

/**
 * Project Management Controller
 * Handles CRUD operations for projects
 */

/**
 * Create a new project
 */
export const createProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, type } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  // Check if project with same name exists for this user
  const existingProject = await Project.findOne({ 
    name, 
    'teamMembers.user': userId 
  });

  if (existingProject) {
    return ApiResponse.error(res, 'Project with this name already exists', 400);
  }

  const project = new Project({
    name,
    description,
    type: type || 'web',
    teamMembers: [{
      user: userId,
      role: 'owner',
      permissions: ['read', 'write', 'admin']
    }],
    status: 'created',
    progress: {
      uploadProgress: 0,
      analysisProgress: 0,
      documentationProgress: 0
    }
  });

  await project.save();

  logger.info(`Project created: ${project.id} by user: ${userId}`);

  return ApiResponse.success(res, {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      progress: project.progress,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }
  }, 'Project created successfully', 201);
});

/**
 * Get all projects for authenticated user
 */
export const getProjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { page = 1, limit = 10, status, type } = req.query;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  // Build filter query
  const filter: any = {
    'teamMembers.user': userId
  };

  if (status) {
    filter.status = status;
  }

  if (type) {
    filter.type = type;
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .select('name description type status progress createdAt updatedAt teamMembers')
      .populate('teamMembers.user', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Project.countDocuments(filter)
  ]);

  return ApiResponse.success(res, {
    projects: projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      progress: project.progress,
      teamMembers: project.teamMembers,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  }, 'Projects retrieved successfully');
});

/**
 * Get project by ID
 */
export const getProjectById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  const project = await Project.findOne({
    _id: id,
    'teamMembers.user': userId
  }).populate('teamMembers.user', 'name email');

  if (!project) {
    return ResponseHandler.notFound(res, 'Project not found');
  }

  return ApiResponse.success(res, {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      progress: project.progress,
      teamMembers: project.teamMembers,
      uploadMetadata: project.uploadMetadata,
      analysisResults: project.analysisResults,
      errorDetails: project.errorDetails,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }
  }, 'Project retrieved successfully');
});

/**
 * Update project
 */
export const updateProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, type } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  // Check if user has write permissions
  const project = await Project.findOne({
    _id: id,
    'teamMembers.user': userId,
    'teamMembers.permissions': { $in: ['write', 'admin'] }
  });

  if (!project) {
    return ApiResponse.error(res, 'Project not found or insufficient permissions', 403);
  }

  // Check if new name conflicts with existing project
  if (name && name !== project.name) {
    const existingProject = await Project.findOne({
      name,
      'teamMembers.user': userId,
      _id: { $ne: id }
    });

    if (existingProject) {
      return ApiResponse.error(res, 'Project with this name already exists', 400);
    }
  }

  // Update project fields
  if (name) project.name = name;
  if (description !== undefined) project.description = description;
  if (type) project.type = type;

  await project.save();

  logger.info(`Project updated: ${project.id} by user: ${userId}`);

  return ApiResponse.success(res, {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      progress: project.progress,
      updatedAt: project.updatedAt
    }
  }, 'Project updated successfully');
});

/**
 * Delete project
 */
export const deleteProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  // Check if user is owner or has admin permissions
  const project = await Project.findOne({
    _id: id,
    $or: [
      { 'teamMembers.user': userId, 'teamMembers.role': 'owner' },
      { 'teamMembers.user': userId, 'teamMembers.permissions': 'admin' }
    ]
  });

  if (!project) {
    return ApiResponse.error(res, 'Project not found or insufficient permissions', 403);
  }

  await Project.findByIdAndDelete(id);

  logger.info(`Project deleted: ${id} by user: ${userId}`);

  return ApiResponse.success(res, null, 'Project deleted successfully');
});

/**
 * Add team member to project
 */
export const addTeamMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { userId: memberUserId, role = 'member', permissions = ['read'] } = req.body;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  // Check if current user has admin permissions
  const project = await Project.findOne({
    _id: id,
    'teamMembers.user': currentUserId,
    'teamMembers.permissions': 'admin'
  });

  if (!project) {
    return ApiResponse.error(res, 'Project not found or insufficient permissions', 403);
  }

  // Check if user is already a team member
  const existingMember = project.teamMembers.find(
    member => member.user.toString() === memberUserId
  );

  if (existingMember) {
    return ApiResponse.error(res, 'User is already a team member', 400);
  }

  // Add team member
  project.teamMembers.push({
    user: memberUserId,
    role,
    permissions,
    addedAt: new Date()
  });

  await project.save();

  logger.info(`Team member added to project: ${id} by user: ${currentUserId}`);

  return ApiResponse.success(res, {
    teamMember: {
      user: memberUserId,
      role,
      permissions,
      addedAt: new Date()
    }
  }, 'Team member added successfully');
});

/**
 * Remove team member from project
 */
export const removeTeamMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id, userId: memberUserId } = req.params;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  // Check if current user has admin permissions
  const project = await Project.findOne({
    _id: id,
    'teamMembers.user': currentUserId,
    'teamMembers.permissions': 'admin'
  });

  if (!project) {
    return ApiResponse.error(res, 'Project not found or insufficient permissions', 403);
  }

  // Cannot remove project owner
  const memberToRemove = project.teamMembers.find(
    member => member.user.toString() === memberUserId
  );

  if (!memberToRemove) {
    return ApiResponse.error(res, 'Team member not found', 404);
  }

  if (memberToRemove.role === 'owner') {
    return ApiResponse.error(res, 'Cannot remove project owner', 400);
  }

  // Remove team member
  project.teamMembers = project.teamMembers.filter(
    member => member.user.toString() !== memberUserId
  );

  await project.save();

  logger.info(`Team member removed from project: ${id} by user: ${currentUserId}`);

  return ApiResponse.success(res, null, 'Team member removed successfully');
});

/**
 * Update project status
 */
export const updateProjectStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  const project = await Project.findOne({
    _id: id,
    'teamMembers.user': userId,
    'teamMembers.permissions': { $in: ['write', 'admin'] }
  });

  if (!project) {
    return ApiResponse.error(res, 'Project not found or insufficient permissions', 403);
  }

  project.status = status;
  await project.save();

  logger.info(`Project status updated: ${id} to ${status} by user: ${userId}`);

  return ApiResponse.success(res, {
    project: {
      id: project.id,
      status: project.status,
      updatedAt: project.updatedAt
    }
  }, 'Project status updated successfully');
});
