import { Request, Response } from 'express';
import { dependencyAnalyzer } from '@/services/dependencyAnalyzer';
import { ResponseHandler } from '@/utils/response';
import { asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types';
import { DependencyAnalysisOptions } from '@/types/dependency';

/**
 * Dependency Analysis Controller
 * Handles dependency graph generation, circular dependency detection,
 * and AI-powered architectural insights
 */
export class DependencyController {

  /**
   * Analyze project dependencies
   * POST /api/v1/dependencies/analyze
   */
  public static analyzeDependencies = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectPath, options } = req.body;

    if (!projectPath) {
      return ResponseHandler.validationError(res, 'Project path is required');
    }

    logger.info(`Starting dependency analysis for project: ${projectPath}`);

    try {
      const analysisOptions: DependencyAnalysisOptions = {
        includeExternal: options?.includeExternal ?? true,
        detectCircular: options?.detectCircular ?? true,
        analyzeComponents: options?.analyzeComponents ?? true,
        includeDevDependencies: options?.includeDevDependencies ?? false,
        maxDepth: options?.maxDepth ?? 10,
        excludePatterns: options?.excludePatterns ?? ['node_modules', 'dist', 'build'],
        includePatterns: options?.includePatterns ?? []
      };

      const result = await dependencyAnalyzer.analyzeDependencies(projectPath, analysisOptions);

      return ResponseHandler.success(res, {
        analysis: result,
        projectPath,
        options: analysisOptions,
        timestamp: new Date().toISOString()
      }, 'Dependency analysis completed successfully');

    } catch (error: any) {
      logger.error('Dependency analysis failed:', error);
      return ResponseHandler.error(res, `Dependency analysis failed: ${error.message}`, 500);
    }
  });

  /**
   * Get dependency graph for visualization
   * GET /api/v1/dependencies/graph/:projectId
   */
  public static getDependencyGraph = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;
    const { format = 'json', includeExternal = true } = req.query;

    try {
      // In a real implementation, this would fetch from database
      // For now, we'll return a sample response structure
      const sampleGraph = {
        nodes: [],
        edges: [],
        clusters: [],
        circularDependencies: [],
        externalLibraries: [],
        metadata: {
          totalNodes: 0,
          totalEdges: 0,
          maxDepth: 0,
          avgDependencies: 0,
          circularCount: 0,
          externalCount: 0,
          generatedAt: new Date(),
          analysisTime: 0
        }
      };

      return ResponseHandler.success(res, {
        graph: sampleGraph,
        format,
        projectId
      }, 'Dependency graph retrieved successfully');

    } catch (error: any) {
      logger.error('Failed to get dependency graph:', error);
      return ResponseHandler.error(res, `Failed to get dependency graph: ${error.message}`, 500);
    }
  });

  /**
   * Detect circular dependencies
   * POST /api/v1/dependencies/circular
   */
  public static detectCircularDependencies = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectPath, options } = req.body;

    if (!projectPath) {
      return ResponseHandler.validationError(res, 'Project path is required');
    }

    try {
      const analysisOptions: DependencyAnalysisOptions = {
        ...dependencyAnalyzer['getDefaultOptions'](),
        detectCircular: true,
        ...options
      };

      const result = await dependencyAnalyzer.analyzeDependencies(projectPath, analysisOptions);
      const circularDependencies = result.graph.circularDependencies;

      return ResponseHandler.success(res, {
        circularDependencies,
        count: circularDependencies.length,
        severity: this.calculateOverallSeverity(circularDependencies),
        suggestions: this.generateCircularDependencySuggestions(circularDependencies)
      }, `Found ${circularDependencies.length} circular dependencies`);

    } catch (error: any) {
      logger.error('Circular dependency detection failed:', error);
      return ResponseHandler.error(res, `Circular dependency detection failed: ${error.message}`, 500);
    }
  });

  /**
   * Get external library analysis
   * POST /api/v1/dependencies/external
   */
  public static analyzeExternalLibraries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectPath, includeDevDependencies = false } = req.body;

    if (!projectPath) {
      return ResponseHandler.validationError(res, 'Project path is required');
    }

    try {
      const analysisOptions: DependencyAnalysisOptions = {
        ...dependencyAnalyzer['getDefaultOptions'](),
        includeExternal: true,
        includeDevDependencies,
        analyzeComponents: false,
        detectCircular: false
      };

      const result = await dependencyAnalyzer.analyzeDependencies(projectPath, analysisOptions);
      const externalLibraries = result.graph.externalLibraries;

      const analysis = {
        libraries: externalLibraries,
        summary: {
          total: externalLibraries.length,
          production: externalLibraries.filter(lib => !lib.isDevDependency).length,
          development: externalLibraries.filter(lib => lib.isDevDependency).length,
          withVulnerabilities: externalLibraries.filter(lib => lib.vulnerabilities.length > 0).length
        },
        recommendations: this.generateLibraryRecommendations(externalLibraries)
      };

      return ResponseHandler.success(res, analysis, 'External library analysis completed');

    } catch (error: any) {
      logger.error('External library analysis failed:', error);
      return ResponseHandler.error(res, `External library analysis failed: ${error.message}`, 500);
    }
  });

  /**
   * Get component relationship analysis
   * POST /api/v1/dependencies/relationships
   */
  public static analyzeComponentRelationships = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectPath, options } = req.body;

    if (!projectPath) {
      return ResponseHandler.validationError(res, 'Project path is required');
    }

    try {
      const analysisOptions: DependencyAnalysisOptions = {
        ...dependencyAnalyzer['getDefaultOptions'](),
        analyzeComponents: true,
        ...options
      };

      const result = await dependencyAnalyzer.analyzeDependencies(projectPath, analysisOptions);

      return ResponseHandler.success(res, {
        relationships: result.relationships,
        insights: result.insights,
        recommendations: result.recommendations,
        metrics: result.metrics
      }, 'Component relationship analysis completed');

    } catch (error: any) {
      logger.error('Component relationship analysis failed:', error);
      return ResponseHandler.error(res, `Component relationship analysis failed: ${error.message}`, 500);
    }
  });

  // Private helper methods

  private static calculateOverallSeverity(circularDependencies: any[]): string {
    if (circularDependencies.length === 0) return 'none';
    
    const severities = circularDependencies.map(dep => dep.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  private static generateCircularDependencySuggestions(circularDependencies: any[]): string[] {
    const suggestions = [
      'Extract shared functionality into separate modules',
      'Use dependency injection to break circular references',
      'Consider using interfaces to decouple dependencies',
      'Refactor modules to follow single responsibility principle'
    ];

    return suggestions.slice(0, Math.min(3, circularDependencies.length));
  }

  private static generateLibraryRecommendations(libraries: any[]): string[] {
    const recommendations = [];

    const outdatedLibs = libraries.filter(lib => lib.version && lib.version.includes('old'));
    if (outdatedLibs.length > 0) {
      recommendations.push(`Update ${outdatedLibs.length} outdated libraries`);
    }

    const vulnerableLibs = libraries.filter(lib => lib.vulnerabilities.length > 0);
    if (vulnerableLibs.length > 0) {
      recommendations.push(`Address security vulnerabilities in ${vulnerableLibs.length} libraries`);
    }

    const heavyLibs = libraries.filter(lib => lib.usageCount > 10);
    if (heavyLibs.length > 0) {
      recommendations.push(`Consider optimizing heavily used libraries: ${heavyLibs.map(lib => lib.name).join(', ')}`);
    }

    return recommendations;
  }
}
