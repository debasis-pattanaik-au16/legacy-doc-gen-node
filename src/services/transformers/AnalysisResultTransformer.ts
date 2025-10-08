import mongoose from 'mongoose';
import { 
  DependencyAnalysisResult,
  DependencyGraph,
  ComponentRelationship,
  DependencyMetrics,
  RelationshipType
} from '@/types/dependency';
import { 
  Component, 
  Dependency, 
  ComplexityMetrics,
  AnalysisInsight,
  Recommendation
} from '@/types';
import { logger } from '@/utils/logger';

/**
 * Transforms DependencyAnalyzer results into database-compatible format
 * 
 * This transformer bridges the gap between the rich DependencyAnalysisResult
 * (graph, relationships, insights, recommendations, metrics) and the database schema
 * which expects simpler structures (components[], dependencies[], etc.)
 * 
 * Design Decision: Store insights and recommendations directly in AnalysisResult
 * - Simpler data model (single collection)
 * - Easier retrieval (one query)
 * - Better for Phase 1 development
 * - Flexible for Phase 2 enhancements
 */
export class AnalysisResultTransformer {
  /**
   * Transform DependencyAnalysisResult to database-compatible IAnalysisResult
   * 
   * @param analysisResult - Result from DependencyAnalyzer.analyzeDependencies()
   * @param projectId - Project ID to associate with the result
   * @returns Database-compatible analysis result
   */
  static transform(
    analysisResult: DependencyAnalysisResult,
    projectId: string
  ): {
    projectId: mongoose.Types.ObjectId;
    components: Component[];
    dependencies: Dependency[];
    architecturePatterns: string[];
    complexityMetrics: ComplexityMetrics;
    insights: AnalysisInsight[];
    recommendations: Recommendation[];
    security?: any;
    codeSmells?: any;
    metrics?: any;
    api?: any;
    database?: any;
    generatedAt: Date;
  } {
    logger.info('Transforming DependencyAnalysisResult to database format');

    try {
      const transformedResult: any = {
        projectId: new mongoose.Types.ObjectId(projectId),
        components: this.extractComponents(analysisResult.graph),
        dependencies: this.extractDependencies(
          analysisResult.graph, 
          analysisResult.relationships
        ),
        architecturePatterns: this.detectPatterns(analysisResult),
        complexityMetrics: this.mapMetrics(
          analysisResult.metrics, 
          analysisResult.graph
        ),
        insights: this.transformInsights(analysisResult.insights),
        recommendations: this.transformRecommendations(analysisResult.recommendations),
        generatedAt: new Date()
      };

      // Phase 2: Include advanced analysis results if available
      if (analysisResult.security) {
        transformedResult.security = analysisResult.security;
        logger.info('Including security analysis results in transformation');
      }

      if (analysisResult.codeSmells) {
        transformedResult.codeSmells = analysisResult.codeSmells;
        logger.info('Including code smell analysis results in transformation');
      }

      if (analysisResult.api) {
        transformedResult.api = analysisResult.api;
        logger.info('Including API analysis results in transformation');
      }

      if (analysisResult.database) {
        transformedResult.database = analysisResult.database;
        logger.info('Including database analysis results in transformation');
      }

      // Phase 2.3: Include enhanced metrics if available
      if (analysisResult.metrics) {
        transformedResult.metrics = {
          couplingIndex: analysisResult.metrics.couplingIndex,
          cohesionIndex: analysisResult.metrics.cohesionIndex,
          instabilityIndex: analysisResult.metrics.instabilityIndex,
          abstractnessIndex: analysisResult.metrics.abstractnessIndex,
          totalDependencies: analysisResult.metrics.totalDependencies,
          circularDependencies: analysisResult.metrics.circularDependencies,
          externalDependencies: analysisResult.metrics.externalDependencies,
          avgDependenciesPerFile: analysisResult.metrics.avgDependenciesPerFile,
          maxDependencyDepth: analysisResult.metrics.maxDependencyDepth
        };
        logger.info('Including enhanced metrics in transformation');
      }

      return transformedResult;
    } catch (error: any) {
      logger.error('Error transforming analysis result:', error);
      throw new Error(`Analysis result transformation failed: ${error.message}`);
    }
  }

  /**
   * Extract Component[] from DependencyGraph nodes
   * 
   * Each node in the graph represents a file. We extract component-level
   * information from the AST metadata stored in each node.
   */
  private static extractComponents(graph: DependencyGraph): Component[] {
    const components: Component[] = [];

    graph.nodes.forEach(node => {
      // Create a module-level component for each file/node
      // DependencyGraphNode represents files, so we map each to a module component
      components.push({
        name: node.name,
        type: this.normalizeNodeTypeToComponentType(node.type),
        filePath: node.path,
        startLine: 1, // Changed from 0 to 1 (MongoDB validation requires min 1)
        endLine: Math.max(node.size || 1, 1), // Ensure at least 1
        description: `${node.type}: ${node.name}`,
        dependencies: node.dependencies || []
      });
    });

    logger.info(`Extracted ${components.length} components from dependency graph`);
    return components;
  }

  /**
   * Extract Dependency[] from graph edges and component relationships
   * 
   * Combines file-level dependencies (edges) with component-level relationships
   * into a unified dependency list.
   */
  private static extractDependencies(
    graph: DependencyGraph,
    relationships: ComponentRelationship[]
  ): Dependency[] {
    const dependencies: Dependency[] = [];
    const seen = new Set<string>(); // Avoid duplicates

    // Convert graph edges (file-level dependencies)
    graph.edges.forEach(edge => {
      const sourceNode = graph.nodes.find(n => n.id === edge.source);
      const targetNode = graph.nodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        const key = `${sourceNode.path}->${targetNode.path}-${edge.type}`;
        if (!seen.has(key)) {
          dependencies.push({
            from: sourceNode.path,
            to: targetNode.path,
            type: this.mapDependencyType(edge.type),
            filePath: sourceNode.path
          });
          seen.add(key);
        }
      }
    });

    // Add component-level relationships
    relationships.forEach(rel => {
      const key = `${rel.source.file}->${rel.target.file}-${rel.type}`;
      if (!seen.has(key)) {
        dependencies.push({
          from: rel.source.file,
          to: rel.target.file,
          type: this.mapRelationshipType(rel.type),
          filePath: rel.source.file
        });
        seen.add(key);
      }
    });

    logger.info(`Extracted ${dependencies.length} dependencies from graph and relationships`);
    return dependencies;
  }

  /**
   * Map DependencyMetrics to ComplexityMetrics
   * 
   * Converts advanced metrics (coupling, cohesion, instability) to
   * simpler complexity metrics expected by the database.
   */
  private static mapMetrics(
    depMetrics: DependencyMetrics,
    graph: DependencyGraph
  ): ComplexityMetrics {
    // Calculate total lines of code from all nodes (using size as proxy)
    const totalLOC = graph.nodes.reduce((sum, node) => 
      sum + (node.size || 0), 0
    );

    // Estimate cyclomatic complexity from coupling and node count
    // Higher coupling + more nodes = higher complexity
    const cyclomaticComplexity = Math.round(
      depMetrics.couplingIndex * 100 * Math.log10(Math.max(graph.nodes.length, 10))
    );

    // Estimate maintainability index (0-100, higher is better)
    // Based on coupling, cohesion, and circular dependencies
    const maintainabilityIndex = Math.max(0, Math.min(100,
      100 - 
      (depMetrics.couplingIndex * 40) -           // High coupling reduces maintainability
      (depMetrics.circularDependencies * 5) +     // Circular deps reduce maintainability
      (depMetrics.cohesionIndex * 20) -           // High cohesion improves maintainability
      (depMetrics.instabilityIndex * 10)          // High instability reduces maintainability
    ));

    // Estimate technical debt (in arbitrary units)
    // Higher values = more debt
    const technicalDebt = 
      depMetrics.circularDependencies * 10 +      // Each circular dep = 10 units
      Math.round(depMetrics.couplingIndex * 30) + // Coupling contributes to debt
      Math.round((1 - depMetrics.cohesionIndex) * 20); // Low cohesion = debt

    return {
      cyclomaticComplexity: Math.max(cyclomaticComplexity, 1),
      linesOfCode: totalLOC,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      technicalDebt: Math.max(technicalDebt, 0)
    };
  }

  /**
   * Detect architecture patterns from analysis results
   * 
   * Extracts patterns from insights and derives patterns from metrics.
   */
  private static detectPatterns(result: DependencyAnalysisResult): string[] {
    const patterns = new Set<string>();

    // Extract patterns from architecture insights
    result.insights.forEach(insight => {
      if (insight.category === 'architecture') {
        patterns.add(insight.title);
      }
    });

    // Derive patterns from metrics
    if (result.metrics.cohesionIndex > 0.7) {
      patterns.add('High Cohesion');
    }
    if (result.metrics.couplingIndex < 0.3) {
      patterns.add('Loose Coupling');
    }
    if (result.metrics.couplingIndex > 0.7) {
      patterns.add('Tight Coupling');
    }
    if (result.metrics.circularDependencies > 0) {
      patterns.add('Circular Dependencies Detected');
    }
    if (result.graph.externalLibraries?.length > 0) {
      patterns.add(`External Dependencies (${result.graph.externalLibraries.length})`);
    }

    // Derive patterns from graph structure
    if (result.graph.metadata) {
      const { maxDepth, avgDependencies } = result.graph.metadata;
      if (maxDepth > 5) {
        patterns.add('Deep Dependency Hierarchy');
      }
      if (avgDependencies > 10) {
        patterns.add('High Fan-out');
      }
    }

    logger.info(`Detected ${patterns.size} architecture patterns`);
    return Array.from(patterns);
  }

  /**
   * Transform insights to database format
   * 
   * Ensures all required fields are present with defaults if missing.
   * Maps various insight formats (AI-generated or basic) to database schema.
   */
  private static transformInsights(insights: any[]): AnalysisInsight[] {
    return insights
      .filter(insight => insight && typeof insight === 'object') // Filter out invalid entries
      .map(insight => {
        // Map insight type to valid enum value
        let type: 'warning' | 'info' | 'suggestion' | 'error' = 'info';
        if (insight.type) {
          // Handle AI-generated types (warning, info, suggestion, error)
          if (['warning', 'info', 'suggestion', 'error'].includes(insight.type)) {
            type = insight.type;
          } 
          // Handle basic insight types (circular_dependency, complexity, etc.)
          else if (['circular_dependency', 'coupling'].includes(insight.type)) {
            type = 'warning';
          }
          else if (['complexity', 'external_dependencies'].includes(insight.type)) {
            type = 'suggestion';
          }
        }
        
        // Map severity to impact
        let impact: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        if (insight.impact) {
          impact = insight.impact;
        } else if (insight.severity) {
          // Map severity to impact
          const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'critical'
          };
          impact = severityMap[insight.severity] || 'medium';
        }
        
        // Map category
        const category = insight.category || this.mapInsightTypeToCategory(insight.type);
        
        // Use title or message as title
        const title = insight.title || insight.message || 'Code Analysis Insight';
        
        // Use description or message as description
        const description = insight.description || insight.message || 'Analysis found areas for potential improvement';
        
        return {
          type,
          category,
          title,
          description,
          impact,
          affectedFiles: insight.affectedFiles || [],
          codeExamples: insight.codeExamples || []
        };
      });
  }
  
  /**
   * Map basic insight type to category
   */
  private static mapInsightTypeToCategory(type: string): 'architecture' | 'performance' | 'maintainability' | 'security' {
    const categoryMap: Record<string, 'architecture' | 'performance' | 'maintainability' | 'security'> = {
      'circular_dependency': 'architecture',
      'coupling': 'architecture',
      'complexity': 'maintainability',
      'external_dependencies': 'maintainability',
      'organization': 'architecture',
      'security': 'security',
      'performance': 'performance'
    };
    return categoryMap[type] || 'maintainability';
  }

  /**
   * Transform recommendations to database format
   * 
   * Ensures all required fields are present with defaults if missing.
   */
  private static transformRecommendations(recommendations: any[]): Recommendation[] {
    return recommendations
      .filter(rec => rec && typeof rec === 'object') // Filter out invalid entries
      .map((rec, index) => ({
        id: rec.id || `rec_${Date.now()}_${index}`, // Generate ID if missing
        type: rec.type || 'refactor', // Default to 'refactor'
        priority: rec.priority || 'medium', // Default to 'medium'
        title: rec.title || 'Code Improvement', // Default title
        description: rec.description || 'Consider refactoring this code for better maintainability',
        benefits: rec.benefits || [],
        effort: rec.effort || 'medium', // Default to 'medium'
        implementation: rec.implementation || []
      }));
  }

  /**
   * Normalize DependencyGraphNode type to Component type
   */
  private static normalizeNodeTypeToComponentType(
    type: 'file' | 'module' | 'component' | 'function' | 'class'
  ): 'function' | 'class' | 'module' | 'component' {
    // Direct mapping from DependencyGraphNode types to Component types
    switch (type) {
      case 'function':
        return 'function';
      case 'class':
        return 'class';
      case 'component':
        return 'component';
      case 'module':
      case 'file':
      default:
        return 'module';
    }
  }

  /**
   * Map DependencyType to database dependency type enum
   */
  private static mapDependencyType(type: string): 'import' | 'require' | 'call' | 'inheritance' {
    const typeMap: Record<string, 'import' | 'require' | 'call' | 'inheritance'> = {
      'static': 'import',
      'dynamic': 'require',
      'runtime': 'call',
      'import': 'import',
      'require': 'require',
      'call': 'call',
      'inheritance': 'inheritance'
    };
    return typeMap[type] || 'import';
  }

  /**
   * Map RelationshipType to database dependency type enum
   */
  private static mapRelationshipType(type: RelationshipType): 'import' | 'require' | 'call' | 'inheritance' {
    const typeMap: Record<RelationshipType, 'import' | 'require' | 'call' | 'inheritance'> = {
      'extends': 'inheritance',
      'implements': 'inheritance',
      'uses': 'import',
      'calls': 'call',
      'instantiates': 'call',
      'composes': 'import',
      'aggregates': 'import',
      'depends_on': 'import',
      'similar_to': 'import',
      'overrides': 'inheritance'
    };
    return typeMap[type] || 'import';
  }
}
