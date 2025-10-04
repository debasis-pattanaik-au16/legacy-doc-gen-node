import path from 'path';
import fs from 'fs/promises';
import * as crypto from 'crypto';
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
import { AnalysisConfiguration } from '@/types/config';
import { ConfigLoader } from '@/config/ConfigLoader';
import { AnalysisCache } from '@/types/cache';
import { CacheFactory } from '@/cache/CacheFactory';
import { SecurityAnalyzer, createDefaultSecurityOptions } from '@/services/security/SecurityAnalyzer';
import { SecurityAnalysisResult } from '@/types/security';

/**
 * Advanced Dependency Analyzer
 * Provides comprehensive dependency analysis, circular dependency detection,
 * and component relationship mapping with AI-powered insights
 * 
 * Now supports configuration system for flexible analysis options
 */
export class DependencyAnalyzer {
  public dependencyCache = new Map<string, UnifiedAST>();
  private externalLibraries = new Map<string, ExternalLibrary>();
  private packageJsonCache = new Map<string, any>();
  private config: AnalysisConfiguration;
  private cache: AnalysisCache;
  private securityAnalyzer: SecurityAnalyzer | null = null;

  /**
   * Constructor - accepts optional configuration
   * @param config Optional configuration object (uses ConfigLoader if not provided)
   */
  constructor(config?: AnalysisConfiguration) {
    // Use provided config or get from ConfigLoader (silently uses defaults if not loaded)
    this.config = config || ConfigLoader.getInstance().get(true);
    
    // Initialize cache if caching is enabled
    if (this.config.performance.caching.enabled) {
      this.cache = CacheFactory.fromConfig(this.config);
      logger.info('DependencyAnalyzer initialized with caching enabled');
    } else {
      // Use a no-op cache if caching is disabled
      this.cache = this.createNoOpCache();
      logger.info('DependencyAnalyzer initialized with caching disabled');
    }
  }

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

      // 6. Run security analysis if enabled
      let securityAnalysis: SecurityAnalysisResult | undefined;
      if (this.config.features.security?.enabled) {
        securityAnalysis = await this.runSecurityAnalysis(astResults, graph.externalLibraries);
      }

      // 7. Generate AI-powered insights
      const insights = await this.generateInsights(graph, relationships);
      const recommendations = await this.generateRecommendations(graph, insights);

      // 8. Calculate metrics
      const metrics = this.calculateDependencyMetrics(graph);

      const analysisTime = Date.now() - startTime;
      logger.info(`Dependency analysis completed in ${analysisTime}ms`);

      return {
        graph,
        relationships,
        insights,
        recommendations,
        metrics,
        security: securityAnalysis
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
    let cacheHits = 0;
    let cacheMisses = 0;

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
        
        // Generate cache key from file path and content hash
        const cacheKey = this.getCacheKey(file, content);
        
        // Check cache first
        const cached = await this.cache.get<UnifiedAST>(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for ${path.basename(file)}`);
          results.set(file, cached);
          this.dependencyCache.set(file, cached);
          cacheHits++;
          continue;
        }
        
        cacheMisses++;
        
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
        
        // Store in cache for future use
        await this.cache.set(cacheKey, ast, this.config.performance.caching.ttl);
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

    // Log cache statistics
    if (this.config.performance.caching.enabled) {
      const stats = this.cache.getStats();
      const totalRequests = cacheHits + cacheMisses;
      const hitRate = totalRequests > 0 ? (cacheHits / totalRequests * 100).toFixed(2) : '0.00';
      logger.info(
        `Cache statistics - Hits: ${cacheHits}, Misses: ${cacheMisses}, ` +
        `Hit rate: ${hitRate}%, Total cache size: ${stats.size}`
      );
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
    let resolved = path.resolve(fromDir, importPath);
    
    // If path already has extension, return it
    if (path.extname(resolved)) {
      return resolved;
    }
    
    // Try to resolve with common file extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (this.dependencyCache.has(withExt)) {
        return withExt;
      }
    }
    
    // Also try index files
    for (const ext of extensions) {
      const indexPath = path.join(resolved, 'index' + ext);
      if (this.dependencyCache.has(indexPath)) {
        return indexPath;
      }
    }
    
    // As fallback, try with .ts extension (most common in TypeScript projects)
    return resolved + '.ts';
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
    // Merge config exclusions with options
    const configExcludes = this.config.exclude.directories || [];
    const defaultExcludes = ['node_modules', '.git', 'dist', 'build', '__pycache__'];
    const allExcludes = [...new Set([...defaultExcludes, ...configExcludes])];
    
    // Check exact matches first
    if (allExcludes.includes(dirName)) {
      return true;
    }
    
    // Check pattern matches (convert glob patterns to regex)
    return options.excludePatterns.some(pattern => this.matchPattern(dirName, pattern));
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
    
    // Check against config exclusion patterns
    const configPatterns = this.config.exclude.patterns || [];
    for (const pattern of configPatterns) {
      if (this.matchPattern(filePath, pattern)) {
        return false;
      }
    }
    
    if (options.includePatterns.length > 0) {
      return options.includePatterns.some(pattern => this.matchPattern(filePath, pattern));
    }
    return !options.excludePatterns.some(pattern => this.matchPattern(filePath, pattern));
  }

  /**
   * Match file path against glob pattern
   * Safely converts glob patterns to regex
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    try {
      // Escape special regex characters except glob wildcards
      let regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
        .replace(/\\\*/g, '___ESCAPED_STAR___')  // Temporarily protect escaped stars
        .replace(/\*\*/g, '.*')                   // ** matches any path
        .replace(/\*/g, '[^/]*')                  // * matches anything except /
        .replace(/___ESCAPED_STAR___/g, '\\*')   // Restore escaped stars
        .replace(/\?/g, '.');                     // ? matches single char
      
      const regex = new RegExp(regexPattern);
      return regex.test(filePath);
    } catch (error: any) {
      // If pattern is invalid, log warning and return false
      logger.warn(`Invalid pattern "${pattern}": ${error.message}`);
      return false;
    }
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
        const aiInsights = analysis.issues || [];
        
        // Transform AI insights to enhanced schema if needed
        return this.transformInsightsToSchema(aiInsights, graph);
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
  
  /**
   * Transform AI-generated insights to match the enhanced schema
   */
  private transformInsightsToSchema(aiInsights: any[], graph: DependencyGraph): any[] {
    return aiInsights.map(insight => {
      // Check if insight already has enhanced fields
      if (insight.affectedFiles && Array.isArray(insight.affectedFiles)) {
        return insight; // Already in correct format
      }
      
      // Transform old AI format to new schema
      const transformed: any = {
        type: this.mapInsightTypeToEnum(insight.type || insight.severity),
        severity: insight.severity || 'medium',
        message: insight.message || insight.description || 'Insight detected',
        description: insight.description || insight.message || '',
        affectedFiles: [] // Will be populated below
      };
      
      // Try to extract affected files based on insight type
      if (insight.type === 'Dependency' || insight.type === 'circular_dependency') {
        // For circular dependencies, extract from graph
        if (graph.circularDependencies.length > 0) {
          const files: string[] = [];
          graph.circularDependencies.forEach(circ => {
            circ.cycle.forEach(nodeId => {
              const node = graph.nodes.find(n => n.id === nodeId);
              if (node && !files.includes(node.path)) {
                files.push(node.path);
              }
            });
          });
          transformed.affectedFiles = files.slice(0, 10);
        }
      } else if (insight.type === 'Complexity') {
        // For complexity, find highly coupled files
        transformed.affectedFiles = graph.nodes
          .filter(n => n.dependencies.length > 10)
          .map(n => n.path)
          .slice(0, 10);
      } else if (insight.type === 'Orphan Nodes') {
        // For orphan nodes, find leaf nodes
        transformed.affectedFiles = graph.nodes
          .filter(n => n.isLeaf && n.isEntry)
          .map(n => n.path)
          .slice(0, 10);
      }
      
      // Preserve any additional properties from AI
      Object.keys(insight).forEach(key => {
        if (!transformed.hasOwnProperty(key)) {
          transformed[key] = insight[key];
        }
      });
      
      return transformed;
    });
  }
  
  /**
   * Map AI insight types to valid enum values
   */
  private mapInsightTypeToEnum(type: string): string {
    const typeMap: Record<string, string> = {
      'Dependency': 'circular_dependency',
      'dependency': 'circular_dependency',
      'Complexity': 'complexity',
      'complexity': 'complexity',
      'Orphan Nodes': 'orphan_code',
      'orphan': 'orphan_code',
      'external': 'external_dependencies',
      'External': 'external_dependencies',
      'coupling': 'coupling',
      'Coupling': 'coupling',
      'security': 'security',
      'Security': 'security'
    };
    
    return typeMap[type] || type.toLowerCase().replace(/\s+/g, '_');
  }

  private generateBasicInsights(graph: DependencyGraph): any[] {
    const insights = [];
    
    // Circular dependencies insight
    if (graph.circularDependencies.length > 0) {
      const affectedFiles: string[] = [];
      graph.circularDependencies.forEach(circ => {
        circ.cycle.forEach(nodeId => {
          const node = graph.nodes.find(n => n.id === nodeId);
          if (node && !affectedFiles.includes(node.path)) {
            affectedFiles.push(node.path);
          }
        });
      });
      
      insights.push({
        type: 'circular_dependency',
        severity: 'high',
        message: `Found ${graph.circularDependencies.length} circular ${graph.circularDependencies.length === 1 ? 'dependency' : 'dependencies'}`,
        description: `Circular dependencies can cause runtime errors, make code hard to test, and indicate design issues. ${graph.circularDependencies.length} circular ${graph.circularDependencies.length === 1 ? 'dependency was' : 'dependencies were'} detected affecting ${affectedFiles.length} files.`,
        count: graph.circularDependencies.length,
        affectedFiles: affectedFiles.slice(0, 10) // Limit to 10 files
      });
    }
    
    // Complexity insight
    if (graph.metadata.totalNodes > 100) {
      const highComplexityFiles = graph.nodes
        .filter(n => n.dependencies.length > 10)
        .map(n => n.path)
        .slice(0, 10);
      
      insights.push({
        type: 'complexity',
        severity: graph.metadata.totalNodes > 200 ? 'high' : 'medium',
        message: `Large codebase with ${graph.metadata.totalNodes} files`,
        description: `Large codebases with ${graph.metadata.totalNodes} files can be difficult to maintain and navigate. Consider modular architecture patterns and better code organization.`,
        nodeCount: graph.metadata.totalNodes,
        affectedFiles: highComplexityFiles
      });
    }

    // External dependencies insight
    if (graph.externalLibraries.length > 50) {
      const topLibraries = graph.externalLibraries
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(lib => lib.name);
      
      insights.push({
        type: 'external_dependencies',
        severity: graph.externalLibraries.length > 100 ? 'high' : 'medium',
        message: `High number of external dependencies (${graph.externalLibraries.length})`,
        description: `Your project depends on ${graph.externalLibraries.length} external libraries. Too many dependencies can increase bundle size, security risks, and maintenance burden. Top libraries: ${topLibraries.join(', ')}.`,
        libraryCount: graph.externalLibraries.length,
        affectedFiles: [] // External deps don't have specific affected files
      });
    }

    // High coupling insight
    const avgDependencies = graph.edges.length / Math.max(graph.nodes.length, 1);
    if (avgDependencies > 5) {
      const highCouplingFiles = graph.nodes
        .filter(n => n.dependencies.length > avgDependencies * 1.5)
        .sort((a, b) => b.dependencies.length - a.dependencies.length)
        .map(n => n.path)
        .slice(0, 10);
      
      insights.push({
        type: 'coupling',
        severity: avgDependencies > 10 ? 'high' : 'medium',
        message: `High coupling detected (avg ${Math.round(avgDependencies * 10) / 10} dependencies per file)`,
        description: `Files have an average of ${Math.round(avgDependencies * 10) / 10} dependencies each. High coupling makes code harder to test, maintain, and refactor. Consider applying dependency injection or modular patterns.`,
        averageDependencies: Math.round(avgDependencies * 100) / 100,
        affectedFiles: highCouplingFiles
      });
    }
    
    // Deep dependency hierarchy insight
    if (graph.metadata.maxDepth > 8) {
      const deepFiles = graph.nodes
        .filter(n => n.layer > graph.metadata.maxDepth * 0.7)
        .map(n => n.path)
        .slice(0, 10);
      
      insights.push({
        type: 'complexity',
        severity: 'medium',
        message: `Deep dependency hierarchy (${graph.metadata.maxDepth} levels)`,
        description: `Your codebase has a dependency hierarchy ${graph.metadata.maxDepth} levels deep. Deep hierarchies can make code harder to understand and change. Consider flattening the structure.`,
        affectedFiles: deepFiles
      });
    }
    
    return insights;
  }

  private async generateRecommendations(graph: DependencyGraph, insights: any[]): Promise<any[]> {
    try {
      // Try AI-powered recommendations first if API service is available
      try {
        const analysis = await aiServiceManager.analyzeDependencyGraph(graph);
        const aiRecommendations = analysis.suggestions || [];
        
        // Transform AI recommendations to enhanced schema if needed
        return this.transformRecommendationsToSchema(aiRecommendations, graph);
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
  
  /**
   * Transform AI-generated recommendations to match the enhanced schema
   */
  private transformRecommendationsToSchema(aiRecommendations: any[], graph: DependencyGraph): any[] {
    return aiRecommendations.map((rec, index) => {
      // Check if recommendation already has enhanced fields
      if (rec.id && rec.benefits && rec.implementation) {
        return rec; // Already in correct format
      }
      
      // Transform old AI format to new schema
      const transformed: any = {
        id: rec.id || `rec_ai_${Date.now()}_${index}`,
        type: this.mapRecommendationTypeToEnum(rec.category || rec.type || 'refactor'),
        priority: rec.priority || 'medium',
        title: rec.title || rec.description?.substring(0, 50) || 'Recommendation',
        description: rec.description || '',
        benefits: [],
        effort: rec.effort || 'medium',
        implementation: []
      };
      
      // Generate benefits based on recommendation category
      if (!rec.benefits || rec.benefits.length === 0) {
        transformed.benefits = this.generateBenefitsForRecommendation(transformed.type, transformed.description);
      } else {
        transformed.benefits = Array.isArray(rec.benefits) ? rec.benefits : [rec.benefits];
      }
      
      // Generate implementation steps if missing
      if (!rec.implementation || rec.implementation.length === 0) {
        transformed.implementation = this.generateImplementationSteps(transformed.type, transformed.description);
      } else {
        transformed.implementation = Array.isArray(rec.implementation) ? rec.implementation : [rec.implementation];
      }
      
      // Preserve any additional properties from AI
      Object.keys(rec).forEach(key => {
        if (!transformed.hasOwnProperty(key)) {
          transformed[key] = rec[key];
        }
      });
      
      return transformed;
    });
  }
  
  /**
   * Map AI recommendation types to valid enum values
   */
  private mapRecommendationTypeToEnum(type: string): string {
    const typeMap: Record<string, string> = {
      'Refactoring': 'refactor',
      'refactoring': 'refactor',
      'Dependency Management': 'optimize',
      'dependency': 'optimize',
      'Graph Generation': 'architecture',
      'architecture': 'architecture',
      'security': 'security',
      'Security': 'security',
      'performance': 'optimize',
      'Performance': 'optimize'
    };
    
    return typeMap[type] || 'refactor';
  }
  
  /**
   * Generate generic benefits based on recommendation type
   */
  private generateBenefitsForRecommendation(type: string, description: string): string[] {
    const benefitTemplates: Record<string, string[]> = {
      'refactor': [
        'Improves code maintainability',
        'Makes code easier to understand',
        'Reduces technical debt',
        'Enables safer refactoring',
        'Improves code reusability'
      ],
      'optimize': [
        'Improves application performance',
        'Reduces resource consumption',
        'Speeds up development workflow',
        'Lowers operational costs',
        'Enhances user experience'
      ],
      'architecture': [
        'Improves system scalability',
        'Enables better team collaboration',
        'Reduces coupling between components',
        'Makes system easier to extend',
        'Improves testability'
      ],
      'security': [
        'Reduces security vulnerabilities',
        'Protects user data',
        'Ensures compliance',
        'Prevents security breaches',
        'Builds user trust'
      ]
    };
    
    return benefitTemplates[type] || benefitTemplates['refactor'];
  }
  
  /**
   * Generate generic implementation steps based on recommendation type
   */
  private generateImplementationSteps(type: string, description: string): string[] {
    const stepTemplates: Record<string, string[]> = {
      'refactor': [
        'Identify the code sections that need refactoring',
        'Write tests to cover existing functionality',
        'Refactor code incrementally',
        'Run tests to verify behavior',
        'Review and document changes',
        'Deploy and monitor'
      ],
      'optimize': [
        'Profile the application to identify bottlenecks',
        'Analyze the optimization opportunities',
        'Implement performance improvements',
        'Measure performance gains',
        'Document the optimizations',
        'Monitor in production'
      ],
      'architecture': [
        'Review current architecture',
        'Design improved architecture',
        'Plan migration strategy',
        'Implement changes incrementally',
        'Update documentation',
        'Train team on new patterns'
      ],
      'security': [
        'Conduct security audit',
        'Identify vulnerabilities',
        'Implement security fixes',
        'Add security tests',
        'Document security measures',
        'Schedule regular reviews'
      ]
    };
    
    return stepTemplates[type] || stepTemplates['refactor'];
  }

  private generateBasicRecommendations(graph: DependencyGraph, insights: any[]): any[] {
    const recommendations = [];
    
    // Circular dependencies recommendation
    if (graph.circularDependencies.length > 0) {
      recommendations.push({
        id: `rec_circular_${Date.now()}`,
        type: 'refactor',
        priority: 'high',
        title: 'Break Circular Dependencies',
        description: `Your codebase has ${graph.circularDependencies.length} circular ${graph.circularDependencies.length === 1 ? 'dependency' : 'dependencies'}. These can cause runtime errors, make testing difficult, and indicate design problems that should be addressed.`,
        benefits: [
          'Eliminates potential runtime initialization errors',
          'Makes code easier to test in isolation',
          'Improves code maintainability and readability',
          'Enables better build optimization',
          'Reduces cognitive complexity for developers'
        ],
        effort: graph.circularDependencies.length > 5 ? 'high' : 'medium',
        implementation: [
          'Identify the circular dependency chain using dependency visualization tools',
          'Extract shared functionality into a separate module or service',
          'Use dependency injection to break direct dependencies',
          'Consider applying the Dependency Inversion Principle',
          'Create interfaces or abstract classes to decouple modules',
          'Refactor imports to use indirect references where appropriate',
          'Add unit tests to verify the refactored modules work correctly'
        ]
      });
    }
    
    // External dependencies recommendation
    if (graph.externalLibraries.length > 50) {
      recommendations.push({
        id: `rec_extdeps_${Date.now()}`,
        type: 'optimize',
        priority: graph.externalLibraries.length > 100 ? 'high' : 'medium',
        title: 'Reduce External Dependencies',
        description: `Your project depends on ${graph.externalLibraries.length} external libraries. Excessive dependencies increase bundle size, attack surface, and maintenance burden.`,
        benefits: [
          `Reduces bundle size (potentially by 20-40%)`,
          'Decreases security vulnerabilities',
          'Speeds up installation and build times',
          'Reduces maintenance complexity',
          'Lowers risk of supply chain attacks'
        ],
        effort: 'medium',
        implementation: [
          'Run dependency audit: npm list --all or yarn list',
          'Identify unused dependencies with tools like depcheck',
          'Remove dev dependencies from production builds',
          'Replace large libraries with lighter alternatives',
          'Consider tree-shaking to eliminate unused code',
          'Use dynamic imports for non-critical features',
          'Document why each dependency is needed'
        ]
      });
    }

    // High coupling recommendation
    const avgDependencies = graph.edges.length / Math.max(graph.nodes.length, 1);
    if (avgDependencies > 10) {
      recommendations.push({
        id: `rec_coupling_${Date.now()}`,
        type: 'architecture',
        priority: 'medium',
        title: 'Reduce Code Coupling',
        description: `Files have an average of ${Math.round(avgDependencies * 10) / 10} dependencies each. High coupling makes the codebase brittle and difficult to change safely.`,
        benefits: [
          'Makes individual modules easier to test',
          'Enables safe refactoring and changes',
          'Improves code reusability',
          'Reduces ripple effects when making changes',
          'Facilitates team collaboration with clear boundaries'
        ],
        effort: 'high',
        implementation: [
          'Apply Single Responsibility Principle to each module',
          'Introduce dependency injection patterns',
          'Use interfaces to define contracts between modules',
          'Apply the Facade pattern to simplify complex subsystems',
          'Extract service layers for shared functionality',
          'Use event-driven architecture for loose coupling',
          'Refactor one high-coupling module at a time'
        ]
      });
    }

    // Code organization recommendation
    if (graph.metadata.totalNodes > 100 && graph.clusters.length < 5) {
      recommendations.push({
        id: `rec_organization_${Date.now()}`,
        type: 'architecture',
        priority: 'low',
        title: 'Improve Code Organization',
        description: `With ${graph.metadata.totalNodes} files but only ${graph.clusters.length} logical groupings, your codebase could benefit from better organization.`,
        benefits: [
          'Makes codebase easier to navigate',
          'Helps new developers onboard faster',
          'Enables better code ownership and team structure',
          'Improves IDE performance and code search',
          'Facilitates micro-frontend or modular architectures'
        ],
        effort: 'medium',
        implementation: [
          'Group files by feature rather than by type',
          'Create clear module boundaries with index files',
          'Use folder structure to represent architecture layers',
          'Apply Domain-Driven Design principles',
          'Document the organizational structure in README',
          'Use linting rules to enforce architectural boundaries',
          'Consider monorepo tools if managing multiple packages'
        ]
      });
    }

    // Deep hierarchy recommendation
    if (graph.metadata.maxDepth > 8) {
      recommendations.push({
        id: `rec_hierarchy_${Date.now()}`,
        type: 'refactor',
        priority: 'medium',
        title: 'Flatten Dependency Hierarchy',
        description: `Your codebase has a ${graph.metadata.maxDepth}-level deep dependency hierarchy. Deep hierarchies increase complexity and make changes riskier.`,
        benefits: [
          'Reduces cognitive load when understanding code',
          'Makes dependencies easier to track',
          'Speeds up build and compilation times',
          'Reduces cascade effects of breaking changes',
          'Improves code testability'
        ],
        effort: 'medium',
        implementation: [
          'Identify the deepest dependency chains',
          'Extract common utilities to a shared module',
          'Invert dependencies where appropriate',
          'Use dependency injection to flatten imports',
          'Consider creating platform/core layers',
          'Refactor deep chains into sibling relationships',
          'Add architecture decision records (ADRs)'
        ]
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

  /**
   * Run security analysis on parsed files and dependencies
   * @private
   */
  private async runSecurityAnalysis(
    astResults: Map<string, UnifiedAST>,
    externalLibraries: ExternalLibrary[]
  ): Promise<SecurityAnalysisResult> {
    try {
      logger.info('Starting security analysis...');

      // Initialize security analyzer if not already done
      if (!this.securityAnalyzer) {
        this.securityAnalyzer = new SecurityAnalyzer();
      }

      // Get security options from config or use defaults
      const securityOptions = this.config.features.security?.detectors
        ? {
            ...createDefaultSecurityOptions(),
            enabledDetectors: this.config.features.security.detectors || [
              'injection',
              'cryptography',
              'authentication',
              'dependencies'
            ],
            severityThreshold: this.config.features.security.severityThreshold || 'low'
          }
        : createDefaultSecurityOptions();

      // Run security analysis
      const result = await this.securityAnalyzer.analyze(
        astResults,
        externalLibraries,
        securityOptions as any
      );

      logger.info(
        `Security analysis complete. Found ${result.issues.length} issues ` +
        `(Critical: ${result.summary.issuesBySeverity.critical}, ` +
        `High: ${result.summary.issuesBySeverity.high})`
      );

      return result;
    } catch (error: any) {
      logger.error(`Security analysis failed: ${error.message}`);
      // Return empty result on error rather than failing the entire analysis
      return {
        issues: [],
        summary: {
          totalIssues: 0,
          issuesBySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0
          },
          issuesByCategory: {} as any,
          issuesByType: {} as any,
          criticalRiskScore: 0,
          mostCommonCategory: 'injection' as any,
          totalFilesScanned: astResults.size,
          filesWithIssues: 0,
          detectionTime: 0,
          confidenceScore: 0
        },
        recommendations: [],
        analysisDate: new Date(),
        analysisVersion: '1.0.0',
        configUsed: createDefaultSecurityOptions() as any
      };
    }
  }

  /**
   * Generate cache key from file path and content
   * Uses SHA-256 hash of content to detect changes
   * @private
   */
  private getCacheKey(file: string, content: string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const relativePath = path.relative(process.cwd(), file);
    return `ast:${relativePath}:${hash}`;
  }

  /**
   * Create a no-op cache that doesn't store anything
   * Used when caching is disabled in configuration
   * @private
   */
  private createNoOpCache(): AnalysisCache {
    return {
      async get<T>(key: string): Promise<T | null> {
        return null;
      },
      async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        // No-op
      },
      async has(key: string): Promise<boolean> {
        return false;
      },
      async delete(key: string): Promise<boolean> {
        return false;
      },
      async clear(): Promise<void> {
        // No-op
      },
      async invalidatePattern(pattern: string): Promise<number> {
        return 0;
      },
      getStats() {
        return {
          hits: 0,
          misses: 0,
          size: 0,
          hitRate: 0,
        };
      },
    };
  }

  /**
   * Clear the analysis cache
   * Useful for forcing a fresh analysis
   */
  public async clearCache(): Promise<void> {
    await this.cache.clear();
    logger.info('Analysis cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get default options merged with configuration
   * Respects configuration settings while allowing runtime overrides
   */
  private getDefaultOptions(): DependencyAnalysisOptions {
    // Use configuration values with fallbacks
    const depConfig = this.config.features.dependencies;
    
    return {
      includeExternal: depConfig?.includeExternal ?? true,
      detectCircular: depConfig?.detectCircular ?? true,
      analyzeComponents: true,
      includeDevDependencies: false,
      maxDepth: depConfig?.maxDepth ?? 10,
      excludePatterns: [
        ...this.config.exclude.patterns,
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

  /**
   * Update configuration at runtime
   * @param config New configuration to use
   */
  public setConfiguration(config: AnalysisConfiguration): void {
    this.config = config;
    logger.info('DependencyAnalyzer configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): AnalysisConfiguration {
    return this.config;
  }
}

/**
 * Singleton instance for backward compatibility
 * Uses default configuration from ConfigLoader
 */
export const dependencyAnalyzer = new DependencyAnalyzer();
