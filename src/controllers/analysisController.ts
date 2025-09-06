import { Request, Response } from 'express';
import { AnalysisResult } from '@/models/AnalysisResult';
import { Project } from '@/models/Project';
import { DependencyAnalyzer } from '@/services/dependencyAnalyzer';
import { logger } from '@/utils/logger';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { ResponseHandler } from '@/utils/response';
import path from 'path';
import fs from 'fs/promises';

// Extend Request interface for authentication
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Analysis Controller
 * Handles analysis results creation, retrieval, and management
 */
export class AnalysisController {
  private dependencyAnalyzer = new DependencyAnalyzer();

  /**
   * Start code analysis for a project
   * POST /api/analysis/start/:projectId
   */
  startAnalysis = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Verify project exists and user has access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { owner: userId },
        { 'team.user': userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    // Check if analysis already exists
    const existingAnalysis = await AnalysisResult.findOne({ projectId });
    if (existingAnalysis) {
      ResponseHandler.success(res, existingAnalysis, 'Analysis already exists');
      return;
    }

    // Start analysis process
    const analysisResult = await this.performCodeAnalysis(project);

    ResponseHandler.created(res, analysisResult, 'Analysis started successfully');
  });

  /**
   * Get analysis results for a project
   * GET /api/analysis/:projectId
   */
  getAnalysis = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Verify project access
    const project = await Project.findOne({ 
      _id: projectId, 
      $or: [
        { owner: userId },
        { 'team.user': userId }
      ]
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    const analysisResult = await AnalysisResult.findOne({ projectId });

    if (!analysisResult) {
      throw new AppError('Analysis not found. Please start analysis first.', 404);
    }

    ResponseHandler.success(res, analysisResult, 'Analysis retrieved successfully');
  });

  /**
   * Get analysis summary/overview
   * GET /api/analysis/:projectId/summary
   */
  getAnalysisSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const analysisResult = await AnalysisResult.findOne({ projectId });

    if (!analysisResult) {
      throw new AppError('Analysis not found', 404);
    }

    const summary = {
      projectId,
      totalComponents: analysisResult.components.length,
      totalDependencies: analysisResult.dependencies.length,
      totalApiEndpoints: analysisResult.apiEndpoints.length,
      totalDatabaseSchemas: analysisResult.databaseSchemas.length,
      architecturePatterns: analysisResult.architecturePatterns,
      complexityMetrics: analysisResult.complexityMetrics,
      componentsByType: this.groupComponentsByType(analysisResult.components),
      dependenciesByType: this.groupDependenciesByType(analysisResult.dependencies),
      apiEndpointsByMethod: this.groupApiEndpointsByMethod(analysisResult.apiEndpoints),
      lastUpdated: (analysisResult as any).updatedAt
    };

    ResponseHandler.success(res, summary, 'Analysis summary retrieved successfully');
  });

  /**
   * Delete analysis results
   * DELETE /api/analysis/:projectId
   */
  deleteAnalysis = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Verify project ownership
    const project = await Project.findOne({ 
      _id: projectId, 
      owner: userId 
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
    }

    await AnalysisResult.deleteOne({ projectId });

    ResponseHandler.success(res, null, 'Analysis deleted successfully');
  });

  /**
   * Private method to perform code analysis
   */
  private async performCodeAnalysis(project: any): Promise<any> {
    try {
      logger.info(`Starting analysis for project: ${project._id}`);

      const projectPath = path.join(process.cwd(), 'uploads', 'extracted', project._id);
      
      // Check if project files exist
      try {
        await fs.access(projectPath);
      } catch (error) {
        throw new AppError('Project files not found. Please upload project files first.', 400);
      }

      // Perform dependency analysis using existing method
      const dependencyResult = await this.dependencyAnalyzer.analyzeDependencies(projectPath);

      // Create analysis result document
      const analysisResult = new AnalysisResult({
        projectId: project._id,
        components: this.extractComponents(dependencyResult),
        dependencies: this.extractDependencies(dependencyResult),
        apiEndpoints: [], // Will be populated by specific parsers
        databaseSchemas: [], // Will be populated by specific parsers
        architecturePatterns: this.identifyArchitecturePatterns(dependencyResult),
        complexityMetrics: this.calculateComplexityMetrics(dependencyResult)
      });

      await analysisResult.save();

      logger.info(`Analysis completed for project: ${project._id}`);
      return analysisResult;

    } catch (error: any) {
      logger.error(`Analysis failed for project ${project._id}:`, error);
      throw new AppError(`Analysis failed: ${error.message}`, 500);
    }
  }

  /**
   * Helper methods for data transformation
   */
  private extractComponents(dependencyResult: any): any[] {
    const components = [];
    
    if (dependencyResult.asts) {
      for (const [filePath, ast] of dependencyResult.asts.entries()) {
        for (const component of ast.components) {
          components.push({
            name: component.name,
            type: component.type,
            filePath: filePath,
            startLine: component.startLine,
            endLine: component.endLine,
            description: component.description,
            parameters: component.parameters || [],
            returnType: component.returnType,
            dependencies: component.dependencies || []
          });
        }
      }
    }

    return components;
  }

  private extractDependencies(dependencyResult: any): any[] {
    const dependencies = [];
    
    if (dependencyResult.graph && dependencyResult.graph.edges) {
      for (const edge of dependencyResult.graph.edges) {
        dependencies.push({
          from: edge.source,
          to: edge.target,
          type: edge.type || 'import',
          filePath: edge.filePath || edge.source
        });
      }
    }

    return dependencies;
  }

  private identifyArchitecturePatterns(dependencyResult: any): string[] {
    const patterns = [];
    
    // Basic pattern detection based on dependency structure
    if (dependencyResult.insights) {
      for (const insight of dependencyResult.insights) {
        if (insight.type === 'pattern') {
          patterns.push(insight.pattern);
        }
      }
    }

    // Default patterns based on file structure
    patterns.push('Modular Architecture');
    
    return patterns;
  }

  private calculateComplexityMetrics(dependencyResult: any): any {
    return {
      cyclomaticComplexity: dependencyResult.metrics?.averageComplexity || 0,
      linesOfCode: dependencyResult.metrics?.totalLines || 0,
      maintainabilityIndex: dependencyResult.metrics?.maintainabilityIndex || 75,
      technicalDebt: dependencyResult.metrics?.technicalDebt || 0
    };
  }

  private groupComponentsByType(components: any[]): Record<string, number> {
    return components.reduce((acc, comp) => {
      acc[comp.type] = (acc[comp.type] || 0) + 1;
      return acc;
    }, {});
  }

  private groupDependenciesByType(dependencies: any[]): Record<string, number> {
    return dependencies.reduce((acc, dep) => {
      acc[dep.type] = (acc[dep.type] || 0) + 1;
      return acc;
    }, {});
  }

  private groupApiEndpointsByMethod(endpoints: any[]): Record<string, number> {
    return endpoints.reduce((acc, endpoint) => {
      acc[endpoint.method] = (acc[endpoint.method] || 0) + 1;
      return acc;
    }, {});
  }
}

export const analysisController = new AnalysisController();
