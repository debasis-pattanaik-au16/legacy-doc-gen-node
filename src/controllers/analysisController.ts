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
      'teamMembers.user': userId
    });

    if (!project) {
      throw new AppError('Project not found or access denied', 404);
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
      'teamMembers.user': userId
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
      'teamMembers.user': userId,
      'teamMembers.role': 'owner'
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

      const projectPath = path.join(process.cwd(), 'uploads', 'extracted', project._id.toString());
      
      // Check if project files exist
      try {
        await fs.access(projectPath);
      } catch (error) {
        throw new AppError('Project files not found. Please upload project files first.', 400);
      }

      // Perform dependency analysis using existing method
      logger.info(`Starting dependency analysis for path: ${projectPath}`);
      const dependencyResult = await this.dependencyAnalyzer.analyzeDependencies(projectPath);
      logger.info(`Dependency analysis completed. Cache size: ${this.dependencyAnalyzer.dependencyCache.size}`);

      // Extract data from analysis results
      const components = this.extractComponents(dependencyResult);
      const dependencies = this.extractDependencies(dependencyResult);
      const architecturePatterns = this.identifyArchitecturePatterns(dependencyResult);
      const complexityMetrics = this.calculateComplexityMetrics(dependencyResult);

      logger.info(`Extracted ${components.length} components, ${dependencies.length} dependencies`);

      // Create or update analysis result document using upsert
      const analysisResult = await AnalysisResult.findOneAndUpdate(
        { projectId: project._id },
        {
          projectId: project._id,
          components,
          dependencies,
          apiEndpoints: [], // Will be populated by specific parsers
          databaseSchemas: [], // Will be populated by specific parsers
          architecturePatterns,
          complexityMetrics
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true 
        }
      );

      // Update project status to analyzed
      await Project.findByIdAndUpdate(project._id, {
        status: 'analyzed',
        'uploadMetadata.analysisProgress': 100,
        'progress.analysisProgress': 100
      });

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
    
    // The dependency analyzer returns parsed ASTs in the cache
    // We need to access them through the analyzer instance
    if (this.dependencyAnalyzer.dependencyCache) {
      for (const [filePath, ast] of this.dependencyAnalyzer.dependencyCache.entries()) {
        for (const component of ast.components) {
          const componentData: any = {
            name: component.name,
            type: this.mapComponentType(component.type),
            filePath: filePath,
            startLine: component.startLine,
            endLine: component.endLine,
            description: component.description || '',
            parameters: this.extractParametersAsStrings(component),
            returnType: this.extractReturnTypeAsString(component),
            dependencies: []
          };

          components.push(componentData);
        }
      }
    }

    return components;
  }

  /**
   * Map parser component types to valid MongoDB enum values
   */
  private mapComponentType(type: string): string {
    const typeMapping: Record<string, string> = {
      'function': 'function',
      'class': 'class',
      'interface': 'module',
      'type': 'module',
      'enum': 'module',
      'variable': 'component',
      'constant': 'component',
      'method': 'function',
      'constructor': 'function',
      'property': 'component'
    };

    return typeMapping[type] || 'component';
  }

  /**
   * Extract parameters as string array for MongoDB storage
   */
  private extractParametersAsStrings(component: any): string[] {
    if (!component.parameters || !Array.isArray(component.parameters)) {
      return [];
    }

    return component.parameters.map((param: any) => {
      if (typeof param === 'string') return param;
      if (param.name) return param.name;
      return 'param';
    });
  }

  /**
   * Extract return type as string for MongoDB storage
   */
  private extractReturnTypeAsString(component: any): string {
    if (!component.returnType) return 'void';
    
    if (typeof component.returnType === 'string') {
      return component.returnType;
    }
    
    if (typeof component.returnType === 'object' && component.returnType.name) {
      return component.returnType.name;
    }
    
    return 'any';
  }

  private extractDependencies(dependencyResult: any): any[] {
    const dependencies = [];
    
    // Extract dependencies from the dependency graph
    if (dependencyResult.graph && dependencyResult.graph.edges) {
      for (const edge of dependencyResult.graph.edges) {
        dependencies.push({
          from: edge.source,
          to: edge.target,
          type: this.mapDependencyType(edge.type || 'import'),
          filePath: edge.source
        });
      }
    }

    // Also extract dependencies from AST imports
    if (this.dependencyAnalyzer.dependencyCache) {
      for (const [filePath, ast] of this.dependencyAnalyzer.dependencyCache.entries()) {
        for (const dependency of ast.dependencies) {
          dependencies.push({
            from: filePath,
            to: dependency.name,
            type: this.mapDependencyType(dependency.type),
            filePath: filePath
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Map dependency types to valid MongoDB enum values
   */
  private mapDependencyType(type: string): string {
    const typeMapping: Record<string, string> = {
      'import': 'import',
      'require': 'require',
      'call': 'call',
      'inheritance': 'inheritance',
      'runtime': 'import',
      'development': 'import',
      'dynamic_import': 'import'
    };

    return typeMapping[type] || 'import';
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
    let totalComplexity = 0;
    let totalLinesOfCode = 0;
    let fileCount = 0;

    // Calculate metrics from parsed ASTs
    if (this.dependencyAnalyzer.dependencyCache) {
      for (const [filePath, ast] of this.dependencyAnalyzer.dependencyCache.entries()) {
        fileCount++;
        totalLinesOfCode += ast.metadata.codeLines || 0;
        
        // Sum up component complexities
        for (const component of ast.components) {
          if (component.complexity) {
            totalComplexity += component.complexity.cyclomaticComplexity || 1;
          }
        }
      }
    }

    const avgComplexity = fileCount > 0 ? totalComplexity / fileCount : 0;
    const maintainabilityIndex = Math.max(0, Math.min(100, 171 - 5.2 * Math.log(totalLinesOfCode || 1) - 0.23 * avgComplexity));

    return {
      cyclomaticComplexity: totalComplexity,
      linesOfCode: totalLinesOfCode,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      technicalDebt: Math.max(0, 100 - maintainabilityIndex)
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
