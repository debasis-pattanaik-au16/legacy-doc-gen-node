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
  const { page = 1, limit = 10, status, type, search, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  // Build filter query
  const filter: any = {
    'teamMembers.user': userId
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (type && type !== 'all') {
    filter.type = type;
  }

  // Add search functionality
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }


  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sortObj: any = {};
  sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .select('name description type status progress createdAt updatedAt teamMembers')
      .populate('teamMembers.user', 'name email')
      .sort(sortObj)
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

  // Build update object
  const updateFields: any = {};
  if (name) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (type) updateFields.type = type;

  const updatedProject = await Project.findOneAndUpdate(
    {
      _id: id,
      'teamMembers.user': userId,
      'teamMembers.permissions': { $in: ['write', 'admin'] }
    },
    updateFields,
    { new: true, runValidators: true }
  );

  if (!updatedProject) {
    return ApiResponse.error(res, 'Project not found or insufficient permissions', 403);
  }

  logger.info(`Project updated: ${updatedProject.id} by user: ${userId}`);

  return ApiResponse.success(res, {
    project: {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      type: updatedProject.type,
      status: updatedProject.status,
      progress: updatedProject.progress,
      updatedAt: updatedProject.updatedAt
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

/**
 * Get project statistics for authenticated user
 */
export const getProjectStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.unauthorized(res, 'User not authenticated');
  }

  try {
    // Get all projects for the user
    const projects = await Project.find({
      'teamMembers.user': userId
    }).select('status');

    // Calculate statistics
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const failedProjects = projects.filter(p => p.status === 'failed').length;
    const activeProjects = projects.filter(p => 
      ['created', 'uploading', 'uploaded', 'analyzing', 'analyzed', 'generating'].includes(p.status)
    ).length;

    const stats = {
      totalProjects,
      completedProjects,
      activeProjects,
      failedProjects
    };

    logger.info(`Project stats retrieved for user: ${userId}`);

    return ApiResponse.success(res, stats, 'Project statistics retrieved successfully');
  } catch (error) {
    logger.error(`Error getting project stats for user ${userId}:`, error);
    return ApiResponse.error(res, 'Failed to retrieve project statistics', 500);
  }
});
