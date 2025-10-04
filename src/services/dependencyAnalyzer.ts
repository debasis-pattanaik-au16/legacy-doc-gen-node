import path from 'path';
import fs from 'fs/promises';
import { 
  DependencyGraph, 
  DependencyNode, 
  DependencyGraphNode, 
  DependencyEdge, 
  CircularDependency,
  ExternalLibrary,
  ComponentRelationship,
  DependencyAnalysisOptions,
  DependencyAnalysisResult,
  DependencyType,
  ImportType
} from '@/types/dependency';
import { UnifiedAST, ImportNode, ComponentNode } from '@/types/ast';
import { ParserFactory } from '@/services/parsers/ParserFactory';
import { aiServiceManager } from '@/services/aiServiceManager';
import { logger } from '@/utils/logger';

/**
 * Advanced Dependency Analyzer
 * Provides comprehensive dependency analysis, circular dependency detection,
 * and component relationship mapping with AI-powered insights
 */
export class DependencyAnalyzer {
  public dependencyCache = new Map<string, UnifiedAST>();
  private externalLibraries = new Map<string, ExternalLibrary>();
  private packageJsonCache = new Map<string, any>();

  /**
   * Analyze dependencies for a project or set of files
   */
  public async analyzeDependencies(
    rootPath: string,
    options: DependencyAnalysisOptions = this.getDefaultOptions()
  ): Promise<DependencyAnalysisResult> {
    const startTime = Date.now();
    logger.info(`Starting dependency analysis for: ${rootPath}`);

    try {
      // 1. Discover and parse all files
      const files = await this.discoverFiles(rootPath, options);
      const astResults = await this.parseAllFiles(files);

      // 2. Extract dependencies and build graph
      const dependencies = this.extractAllDependencies(astResults);
      const graph = await this.buildDependencyGraph(dependencies, astResults, options);

      // 3. Detect circular dependencies
      if (options.detectCircular) {
        graph.circularDependencies = this.detectCircularDependencies(graph);
      }

      // 4. Identify external libraries
      if (options.includeExternal) {
        graph.externalLibraries = await this.identifyExternalLibraries(dependencies, rootPath);
      }

      // 5. Analyze component relationships
      const relationships = options.analyzeComponents 
        ? await this.analyzeComponentRelationships(astResults)
        : [];

      // 6. Generate AI-powered insights
      const insights = await this.generateInsights(graph, relationships);
      const recommendations = await this.generateRecommendations(graph, insights);

      // 7. Calculate metrics
      const metrics = this.calculateDependencyMetrics(graph);

      const analysisTime = Date.now() - startTime;
      logger.info(`Dependency analysis completed in ${analysisTime}ms`);

      return {
        graph,
        relationships,
        insights,
        recommendations,
        metrics
      };

    } catch (error: any) {
      logger.error('Dependency analysis failed:', error);
      throw new Error(`Dependency analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse import/require statements from AST
   */
  public parseImportStatements(ast: UnifiedAST): DependencyNode[] {
    const dependencies: DependencyNode[] = [];

    ast.imports.forEach((importNode, index) => {
      const dependency: DependencyNode = {
        id: `import_${ast.fileName}_${index}`,
        name: importNode.source,
        type: this.mapImportTypeToDependencyType(importNode.type),
        source: ast.fileName,
        target: this.resolveImportPath(importNode.source, ast.fileName),
        importType: importNode.type,
        isExternal: this.isExternalDependency(importNode.source),
        line: importNode.line,
        column: 0
      };

      dependencies.push(dependency);
    });

    return dependencies;
  }

  /**
   * Detect circular dependencies using DFS
   */
  public detectCircularDependencies(graph: DependencyGraph): CircularDependency[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: CircularDependency[] = [];

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart).concat(nodeId);
        
        cycles.push({
          id: `cycle_${cycles.length}`,
          cycle,
          severity: this.calculateCycleSeverity(cycle, graph),
          impact: this.calculateCycleImpact(cycle, graph),
          suggestions: this.generateCycleSuggestions(cycle, graph)
        });
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        node.dependencies.forEach(depId => {
          dfs(depId, [...path, nodeId]);
        });
      }

      recursionStack.delete(nodeId);
    };

    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return cycles;
  }

  /**
   * Identify external libraries and their metadata
   */
  public async identifyExternalLibraries(
    dependencies: DependencyNode[],
    rootPath: string
  ): Promise<ExternalLibrary[]> {
    const externalDeps = dependencies.filter(dep => dep.isExternal);
    const libraries = new Map<string, ExternalLibrary>();

    // Load package.json for version information
    const packageJson = await this.loadPackageJson(rootPath);

    for (const dep of externalDeps) {
      const libName = this.extractLibraryName(dep.name);
      
      if (!libraries.has(libName)) {
        const library: ExternalLibrary = {
          name: libName,
          version: this.getLibraryVersion(libName, packageJson),
          type: this.detectLibraryType(libName),
          usageCount: 1,
          files: [dep.source],
          isDevDependency: this.isDevDependency(libName, packageJson),
          vulnerabilities: []
        };

        libraries.set(libName, library);
      } else {
        const library = libraries.get(libName)!;
        library.usageCount++;
        if (!library.files.includes(dep.source)) {
          library.files.push(dep.source);
        }
      }
    }

    return Array.from(libraries.values());
  }

  /**
   * Analyze relationships between components using AST data
   */
  public async analyzeComponentRelationships(astResults: Map<string, UnifiedAST>): Promise<ComponentRelationship[]> {
    const relationships: ComponentRelationship[] = [];

    for (const [fileName, ast] of astResults) {
      for (const component of ast.components) {
        // Find relationships with other components
        const componentRels = await this.findComponentRelationships(component, ast, astResults);
        relationships.push(...componentRels);
      }
    }

    return relationships;
  }

  // Private helper methods

  private async discoverFiles(rootPath: string, options: DependencyAnalysisOptions): Promise<string[]> {
    const files: string[] = [];
    // Get supported extensions dynamically from ParserFactory
    const supportedExtensions = ParserFactory.getSupportedExtensions();

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.shouldExcludeDirectory(entry.name, options)) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (supportedExtensions.includes(ext) && this.shouldIncludeFile(fullPath, options)) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(rootPath);
    return files;
  }

  private async parseAllFiles(files: string[]): Promise<Map<string, UnifiedAST>> {
    const results = new Map<string, UnifiedAST>();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Additional validation to catch problematic files
        if (content.includes('\u0000')) {
          logger.warn(`Skipping file with null bytes: ${file}`);
          continue;
        }
        
        // Skip empty or very small files that might be problematic
        if (content.trim().length < 10) {
          logger.debug(`Skipping empty or very small file: ${file}`);
          continue;
        }
        
        // Get parser dynamically based on file extension
        const parser = ParserFactory.getParserForFile(file);
        if (!parser) {
          logger.debug(`No parser available for file: ${file}`);
          continue;
        }
        
        // Parse using the appropriate parser
        const ast = await parser.parse(content, file);

        results.set(file, ast);
        this.dependencyCache.set(file, ast);
      } catch (error: any) {
        // Enhanced error logging for debugging
        const fileName = path.basename(file);
        if (fileName.startsWith('._')) {
          logger.warn(`Detected macOS metadata file that should have been filtered: ${file}`);
        } else if (error.message.includes('Unexpected character')) {
          logger.warn(`File contains invalid characters: ${file} - ${error.message}`);
        } else {
          logger.warn(`Failed to parse ${file}: ${error.message}`);
        }
      }
    }

    return results;
  }

  private extractAllDependencies(astResults: Map<string, UnifiedAST>): DependencyNode[] {
    const allDependencies: DependencyNode[] = [];

    for (const ast of astResults.values()) {
      const fileDependencies = this.parseImportStatements(ast);
      allDependencies.push(...fileDependencies);
    }

    return allDependencies;
  }

  private async buildDependencyGraph(
    dependencies: DependencyNode[],
    astResults: Map<string, UnifiedAST>,
    options: DependencyAnalysisOptions
  ): Promise<DependencyGraph> {
    const nodes = new Map<string, DependencyGraphNode>();
    const edges: DependencyEdge[] = [];

    // Create nodes for each file
    for (const [fileName, ast] of astResults) {
      nodes.set(fileName, {
        id: fileName,
        name: path.basename(fileName),
        type: 'file',
        path: fileName,
        size: ast.sourceCode.length,
        complexity: ast.metadata.totalLines || 0,
        dependencies: [],
        dependents: [],
        isEntry: false,
        isLeaf: false,
        layer: 0
      });
    }

    // Create edges from dependencies
    dependencies.forEach((dep, index) => {
      const sourceNode = nodes.get(dep.source);
      const targetNode = nodes.get(dep.target);

      if (sourceNode && targetNode) {
        sourceNode.dependencies.push(dep.target);
        targetNode.dependents.push(dep.source);

        edges.push({
          id: `edge_${index}`,
          source: dep.source,
          target: dep.target,
          type: dep.type,
          weight: 1,
          isCircular: false,
          metadata: {
            importedSymbols: [],
            usageFrequency: 1,
            lastModified: new Date(),
            confidence: 1.0
          }
        });
      }
    });

    // Calculate layers and identify entry/leaf nodes
    this.calculateNodeLayers(Array.from(nodes.values()));

    return {
      nodes: Array.from(nodes.values()),
      edges,
      clusters: [],
      circularDependencies: [],
      externalLibraries: [],
      metadata: {
        totalNodes: nodes.size,
        totalEdges: edges.length,
        maxDepth: Math.max(...Array.from(nodes.values()).map(n => n.layer)),
        avgDependencies: edges.length / nodes.size,
        circularCount: 0,
        externalCount: dependencies.filter(d => d.isExternal).length,
        generatedAt: new Date(),
        analysisTime: 0
      }
    };
  }

  private mapImportTypeToDependencyType(importType: ImportType): DependencyType {
    switch (importType) {
      case 'dynamic': return 'dynamic_import';
      default: return 'import';
    }
  }

  private resolveImportPath(importPath: string, fromFile: string): string {
    if (this.isExternalDependency(importPath)) {
      return importPath;
    }

    const fromDir = path.dirname(fromFile);
    return path.resolve(fromDir, importPath);
  }

  private isExternalDependency(importPath: string): boolean {
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  private calculateCycleSeverity(cycle: string[], graph: DependencyGraph): 'low' | 'medium' | 'high' | 'critical' {
    if (cycle.length <= 2) return 'critical';
    if (cycle.length <= 4) return 'high';
    if (cycle.length <= 6) return 'medium';
    return 'low';
  }

  private calculateCycleImpact(cycle: string[], graph: DependencyGraph): number {
    // Calculate impact based on cycle length and node importance
    const cycleNodes = cycle.map(id => graph.nodes.find(n => n.id === id)).filter(Boolean);
    const totalComplexity = cycleNodes.reduce((sum, node) => sum + (node?.complexity || 0), 0);
    return Math.min(100, (totalComplexity / cycle.length) * 10);
  }

  private generateCycleSuggestions(cycle: string[], graph: DependencyGraph): string[] {
    return [
      'Consider extracting shared functionality into a separate module',
      'Use dependency injection to break the circular dependency',
      'Refactor one of the modules to remove the circular reference',
      'Consider using interfaces or abstract classes to decouple dependencies'
    ];
  }

  private async loadPackageJson(rootPath: string): Promise<any> {
    try {
      const packagePath = path.join(rootPath, 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private extractLibraryName(importPath: string): string {
    const parts = importPath.split('/');
    return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  }

  private getLibraryVersion(libName: string, packageJson: any): string | undefined {
    return packageJson.dependencies?.[libName] || packageJson.devDependencies?.[libName];
  }

  private detectLibraryType(libName: string): 'npm' | 'pip' | 'gem' | 'maven' | 'nuget' | 'unknown' {
    // Simple heuristic - in a real implementation, this would be more sophisticated
    return 'npm';
  }

  private isDevDependency(libName: string, packageJson: any): boolean {
    return !!packageJson.devDependencies?.[libName];
  }

  private shouldExcludeDirectory(dirName: string, options: DependencyAnalysisOptions): boolean {
    const defaultExcludes = ['node_modules', '.git', 'dist', 'build', '__pycache__'];
    return defaultExcludes.includes(dirName) || 
           options.excludePatterns.some(pattern => dirName.match(pattern));
  }

  private shouldIncludeFile(filePath: string, options: DependencyAnalysisOptions): boolean {
    const fileName = path.basename(filePath);
    
    // Exclude macOS metadata files (._*) that cause parser errors
    if (fileName.startsWith('._')) {
      return false;
    }
    
    // Exclude other problematic files
    const problematicPatterns = [
      /\.DS_Store$/,           // macOS folder metadata
      /Thumbs\.db$/,           // Windows thumbnail cache
      /desktop\.ini$/,         // Windows folder config
      /\.(tmp|temp|bak|swp)$/, // Temporary/backup files
      /~$/,                    // Backup files
      /\.(log|pid|lock)$/      // Log/process/lock files
    ];
    
    if (problematicPatterns.some(pattern => pattern.test(fileName))) {
      return false;
    }
    
    if (options.includePatterns.length > 0) {
      return options.includePatterns.some(pattern => filePath.match(pattern));
    }
    return !options.excludePatterns.some(pattern => filePath.match(pattern));
  }

  private calculateNodeLayers(nodes: DependencyGraphNode[]): void {
    const visited = new Set<string>();
    
    const calculateLayer = (node: DependencyGraphNode): number => {
      if (visited.has(node.id)) return node.layer;
      visited.add(node.id);

      if (node.dependencies.length === 0) {
        node.layer = 0;
        node.isLeaf = true;
        return 0;
      }

      const depNodes = node.dependencies
        .map(id => nodes.find(n => n.id === id))
        .filter(Boolean) as DependencyGraphNode[];

      node.layer = Math.max(...depNodes.map(dep => calculateLayer(dep))) + 1;
      return node.layer;
    };

    nodes.forEach(node => calculateLayer(node));
    
    // Identify entry nodes (nodes with no dependents)
    nodes.forEach(node => {
      node.isEntry = node.dependents.length === 0;
    });
  }

  private async findComponentRelationships(
    component: ComponentNode,
    ast: UnifiedAST,
    allAsts: Map<string, UnifiedAST>
  ): Promise<ComponentRelationship[]> {
    // This would analyze the component's code to find relationships
    // For now, return empty array - full implementation would be more complex
    return [];
  }

  private async generateInsights(graph: DependencyGraph, relationships: ComponentRelationship[]): Promise<any[]> {
    try {
      // Try AI-powered analysis first if API service is available
      try {
        const analysis = await aiServiceManager.analyzeDependencyGraph(graph);
        return analysis.issues || [];
      } catch (aiError: any) {
        logger.warn('AI analysis failed, falling back to basic insights:', aiError.message);
      }
      
      // Fallback to basic rule-based insights
      return this.generateBasicInsights(graph);
    } catch (error: any) {
      logger.warn('Failed to generate insights:', error.message);
      return [];
    }
  }

  private generateBasicInsights(graph: DependencyGraph): any[] {
    const insights = [];
    
    if (graph.circularDependencies.length > 0) {
      insights.push({
        type: 'circular_dependency',
        severity: 'high',
        message: `Found ${graph.circularDependencies.length} circular dependencies`,
        count: graph.circularDependencies.length
      });
    }
    
    if (graph.metadata.totalNodes > 100) {
      insights.push({
        type: 'complexity',
        severity: 'medium',
        message: 'Large number of dependencies detected',
        nodeCount: graph.metadata.totalNodes
      });
    }

    if (graph.externalLibraries.length > 50) {
      insights.push({
        type: 'external_dependencies',
        severity: 'medium',
        message: 'High number of external dependencies',
        libraryCount: graph.externalLibraries.length
      });
    }

    const avgDependencies = graph.edges.length / Math.max(graph.nodes.length, 1);
    if (avgDependencies > 10) {
      insights.push({
        type: 'coupling',
        severity: 'medium',
        message: 'High coupling detected - files have many dependencies',
        averageDependencies: Math.round(avgDependencies * 100) / 100
      });
    }
    
    return insights;
  }

  private async generateRecommendations(graph: DependencyGraph, insights: any[]): Promise<any[]> {
    try {
      // Try AI-powered recommendations first if API service is available
      try {
        const analysis = await aiServiceManager.analyzeDependencyGraph(graph);
        return analysis.suggestions || [];
      } catch (aiError: any) {
        logger.warn('AI recommendations failed, falling back to basic recommendations:', aiError.message);
      }
      
      // Fallback to basic rule-based recommendations
      return this.generateBasicRecommendations(graph, insights);
    } catch (error: any) {
      logger.warn('Failed to generate recommendations:', error.message);
      return [];
    }
  }

  private generateBasicRecommendations(graph: DependencyGraph, insights: any[]): any[] {
    const recommendations = [];
    
    if (graph.circularDependencies.length > 0) {
      recommendations.push({
        type: 'refactor',
        priority: 'high',
        description: 'Break circular dependencies by extracting shared functionality',
        action: 'Create interface or base class to eliminate circular references',
        impact: 'Improves maintainability and reduces coupling'
      });
    }
    
    if (graph.externalLibraries.length > 50) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Consider reducing external dependencies',
        action: 'Audit dependencies and remove unused packages',
        impact: 'Reduces bundle size and security vulnerabilities'
      });
    }

    const avgDependencies = graph.edges.length / Math.max(graph.nodes.length, 1);
    if (avgDependencies > 10) {
      recommendations.push({
        type: 'architecture',
        priority: 'medium',
        description: 'High coupling detected - consider architectural refactoring',
        action: 'Apply dependency injection or modular architecture patterns',
        impact: 'Improves testability and code organization'
      });
    }

    if (graph.metadata.totalNodes > 100 && graph.clusters.length < 5) {
      recommendations.push({
        type: 'organization',
        priority: 'low',
        description: 'Large codebase with few logical groupings',
        action: 'Organize code into feature-based modules or layers',
        impact: 'Improves code navigation and team collaboration'
      });
    }
    
    return recommendations;
  }

  private calculateDependencyMetrics(graph: DependencyGraph): any {
    return {
      totalDependencies: graph.edges.length,
      externalDependencies: graph.externalLibraries.length,
      circularDependencies: graph.circularDependencies.length,
      avgDependenciesPerFile: graph.edges.length / graph.nodes.length,
      maxDependencyDepth: graph.metadata.maxDepth,
      couplingIndex: this.calculateCouplingIndex(graph),
      cohesionIndex: this.calculateCohesionIndex(graph),
      instabilityIndex: this.calculateInstabilityIndex(graph),
      abstractnessIndex: this.calculateAbstractnessIndex(graph)
    };
  }

  private calculateCouplingIndex(graph: DependencyGraph): number {
    // Simplified coupling calculation
    return Math.min(1.0, graph.edges.length / (graph.nodes.length * graph.nodes.length));
  }

  private calculateCohesionIndex(graph: DependencyGraph): number {
    // Simplified cohesion calculation
    return 0.8; // Placeholder
  }

  private calculateInstabilityIndex(graph: DependencyGraph): number {
    // Simplified instability calculation
    return 0.5; // Placeholder
  }

  private calculateAbstractnessIndex(graph: DependencyGraph): number {
    // Simplified abstractness calculation
    return 0.3; // Placeholder
  }

  private getDefaultOptions(): DependencyAnalysisOptions {
    return {
      includeExternal: true,
      detectCircular: true,
      analyzeComponents: true,
      includeDevDependencies: false,
      maxDepth: 10,
      excludePatterns: [
        'node_modules', 
        'dist', 
        'build', 
        '__pycache__',
        '\\.git',
        '\\.DS_Store',
        '\\._.*',  // macOS metadata files
        'Thumbs\\.db',
        'desktop\\.ini'
      ],
      includePatterns: []
    };
  }
}

export const dependencyAnalyzer = new DependencyAnalyzer();
