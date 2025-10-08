import { ExpressEndpointExtractor } from './ExpressEndpointExtractor';
import {
  SimpleEndpoint,
  WebFramework
} from '../../types/api';
import * as path from 'path';
import * as fs from 'fs';

/**
 * APIAnalyzer
 * 
 * Orchestrates the extraction and analysis of API endpoints across different frameworks.
 * This class provides a unified interface for:
 * - Automatic framework detection
 * - Multi-framework endpoint extraction
 * - API documentation generation
 * - Security scheme analysis
 * - Endpoint aggregation and deduplication
 * 
 * The analyzer integrates with DependencyAnalyzer to detect which frameworks
 * are being used and automatically selects the appropriate extractors.
 * 
 * @example
 * ```typescript
 * const analyzer = new APIAnalyzer('/path/to/project');
 * const result = await analyzer.analyze();
 * console.log(`Found ${result.endpoints.length} endpoints`);
 * console.log(`Frameworks: ${result.frameworks.join(', ')}`);
 * ```
 */
export class APIAnalyzer {
  private projectPath: string;
  private detectedFrameworks: Set<string> = new Set();
  private endpoints: SimpleEndpoint[] = [];
  private routers: Map<string, any> = new Map();

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
    
    // Validate project path exists
    if (!fs.existsSync(this.projectPath)) {
      throw new Error(`Project path does not exist: ${this.projectPath}`);
    }
  }

  /**
   * Main analysis method - orchestrates the complete API analysis workflow
   * 
   * Process:
   * 1. Detect which web frameworks are being used
   * 2. Extract endpoints using framework-specific extractors
   * 3. Aggregate and deduplicate results
   * 4. Analyze security schemes
   * 5. Generate API documentation structure
   * 
   * @returns Complete API analysis result with endpoints, routers, and documentation
   */
  public async analyze(): Promise<any> {
    try {
      // Step 1: Detect frameworks
      await this.detectFrameworks();

      // Step 2: Extract endpoints based on detected frameworks
      await this.extractEndpoints();

      // Step 3: Analyze security schemes
      const securitySchemes = this.analyzeSecuritySchemes();

      // Step 4: Generate API documentation structure
      const documentation = this.generateDocumentation();

      // Step 5: Calculate statistics
      const statistics = this.calculateStatistics();

      // Build final result
      const result: any = {
        endpoints: this.endpoints,
        routers: Array.from(this.routers.values()),
        frameworks: Array.from(this.detectedFrameworks),
        documentation,
        securitySchemes,
        statistics,
        metadata: {
          projectPath: this.projectPath,
          analyzedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      return result;
    } catch (error) {
      throw new Error(`API analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detects which web frameworks are being used in the project
   * 
   * Detection strategy:
   * 1. Check package.json dependencies
   * 2. Scan source files for framework imports
   * 3. Detect framework-specific patterns in code
   * 
   * Supports: Express, Fastify, Next.js, Koa, Hapi, GraphQL
   */
  private async detectFrameworks(): Promise<void> {
    // Check package.json for framework dependencies
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        // Detect Express
        if (allDeps['express']) {
          this.detectedFrameworks.add('EXPRESS');
        }

        // Detect Fastify
        if (allDeps['fastify']) {
          this.detectedFrameworks.add('FASTIFY');
        }

        // Detect Next.js (API routes)
        if (allDeps['next']) {
          this.detectedFrameworks.add('NEXTJS');
        }

        // Detect Koa
        if (allDeps['koa']) {
          this.detectedFrameworks.add('KOA');
        }

        // Detect Hapi
        if (allDeps['@hapi/hapi'] || allDeps['hapi']) {
          this.detectedFrameworks.add('HAPI');
        }

        // Detect NestJS
        if (allDeps['@nestjs/core']) {
          this.detectedFrameworks.add('NESTJS');
        }

        // Detect GraphQL
        if (allDeps['graphql'] || allDeps['apollo-server'] || allDeps['apollo-server-express'] || 
            allDeps['@apollo/server'] || allDeps['express-graphql'] || allDeps['graphql-yoga']) {
          this.detectedFrameworks.add('GRAPHQL');
        }
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    // If no frameworks detected, scan for imports
    if (this.detectedFrameworks.size === 0) {
      await this.detectFrameworksFromImports();
    }

    // Default to Express if nothing detected (common scenario)
    if (this.detectedFrameworks.size === 0) {
      console.warn('No frameworks detected, defaulting to Express');
      this.detectedFrameworks.add('EXPRESS');
    }
  }

  /**
   * Detects frameworks by scanning source files for import statements
   */
  private async detectFrameworksFromImports(): Promise<void> {
    const srcPath = path.join(this.projectPath, 'src');
    if (!fs.existsSync(srcPath)) {
      return;
    }

    const scanDirectory = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and test files
        if (entry.name === 'node_modules' || entry.name.includes('.test.') || entry.name.includes('.spec.')) {
          continue;
        }

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          this.detectFrameworkFromFile(fullPath);
        }
      }
    };

    scanDirectory(srcPath);
  }

  /**
   * Detects framework from a single file by analyzing import statements
   */
  private detectFrameworkFromFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 50); // Only check first 50 lines

      for (const line of lines) {
        if (line.includes('from \'express\'') || line.includes('from "express"') || 
            line.includes('require(\'express\')') || line.includes('require("express")')) {
          this.detectedFrameworks.add('EXPRESS');
        }
        
        if (line.includes('from \'fastify\'') || line.includes('from "fastify"')) {
          this.detectedFrameworks.add('FASTIFY');
        }
        
        if (line.includes('from \'next\'') || line.includes('from "next"')) {
          this.detectedFrameworks.add('NEXTJS');
        }
        
        if (line.includes('from \'koa\'') || line.includes('from "koa"')) {
          this.detectedFrameworks.add('KOA');
        }
        
        if (line.includes('from \'@hapi/hapi\'') || line.includes('from "hapi"')) {
          this.detectedFrameworks.add('HAPI');
        }
        
        if (line.includes('from \'@nestjs/core\'') || line.includes('from "@nestjs/')) {
          this.detectedFrameworks.add('NESTJS');
        }
      }
    } catch (error) {
      // Silently skip files that can't be read
    }
  }

  /**
   * Extracts endpoints using framework-specific extractors
   */
  private async extractEndpoints(): Promise<void> {
    const extractionPromises: Promise<void>[] = [];

    // Extract from each detected framework
    for (const framework of this.detectedFrameworks) {
      switch (framework) {
        case 'EXPRESS':
          extractionPromises.push(this.extractExpressEndpoints());
          break;
        
        case 'FASTIFY':
          // TODO: Implement Fastify extractor in next task
          console.log('Fastify extraction not yet implemented');
          break;
        
        case 'NEXTJS':
          // TODO: Implement Next.js extractor in next task
          console.log('Next.js API routes extraction not yet implemented');
          break;
        
        case 'KOA':
        case 'HAPI':
        case 'NESTJS':
          console.log(`${framework} extraction not yet implemented`);
          break;
      }
    }

    await Promise.all(extractionPromises);

    // Deduplicate endpoints (same path + method)
    this.deduplicateEndpoints();
  }

  /**
   * Extracts endpoints using ExpressEndpointExtractor
   */
  private async extractExpressEndpoints(): Promise<void> {
    try {
      const extractor = new ExpressEndpointExtractor(this.projectPath);
      const endpoints = await extractor.extractEndpoints();
      
      // Resolve full paths
      extractor.resolveEndpointPaths();
      
      // Get routers
      const routers = extractor.getRouters();
      
      // Add to our collections
      this.endpoints.push(...endpoints);
      
      for (const router of routers) {
        this.routers.set(router.name, router);
      }
    } catch (error) {
      console.error('Express endpoint extraction failed:', error);
      throw error;
    }
  }

  /**
   * Removes duplicate endpoints based on path and method
   */
  private deduplicateEndpoints(): void {
    const seen = new Set<string>();
    const uniqueEndpoints: SimpleEndpoint[] = [];

    for (const endpoint of this.endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEndpoints.push(endpoint);
      }
    }

    this.endpoints = uniqueEndpoints;
  }

  /**
   * Analyzes and aggregates security schemes from all endpoints
   */
  private analyzeSecuritySchemes(): any[] {
    const schemes = new Map<string, any>();

    for (const endpoint of this.endpoints) {
      if (endpoint.authentication) {
        const auth = endpoint.authentication;
        const key = `${auth.type}-${auth.scheme || 'default'}`;

        if (!schemes.has(key)) {
          schemes.set(key, {
            type: auth.type,
            scheme: auth.scheme,
            name: auth.name,
            in: auth.in,
            description: auth.description,
            flows: auth.flows
          });
        }
      }
    }

    return Array.from(schemes.values());
  }

  /**
   * Generates API documentation structure
   */
  private generateDocumentation(): any {
    // Group endpoints by tags
    const endpointsByTag = new Map<string, SimpleEndpoint[]>();

    for (const endpoint of this.endpoints) {
      const tags = endpoint.tags || ['default'];
      
      for (const tag of tags) {
        if (!endpointsByTag.has(tag)) {
          endpointsByTag.set(tag, []);
        }
        endpointsByTag.get(tag)!.push(endpoint);
      }
    }

    // Build tag documentation
    const tags = Array.from(endpointsByTag.entries()).map(([name, endpoints]) => ({
      name,
      description: this.generateTagDescription(name, endpoints),
      endpoints: endpoints.length
    }));

    // Detect API version from paths
    const versions = this.detectApiVersions();

    // Detect if GraphQL is being used
    const hasGraphQL = this.detectedFrameworks.has('GRAPHQL');
    const hasOpenAPI = !hasGraphQL && this.endpoints.length > 0; // Only REST APIs use OpenAPI

    return {
      title: this.generateApiTitle(),
      description: this.generateApiDescription(),
      version: versions.length > 0 ? versions[0] : '1.0.0',
      baseUrl: this.inferBaseUrl(),
      tags,
      servers: this.generateServerList(),
      hasGraphQL,
      hasOpenAPI,
      apiType: hasGraphQL ? 'GraphQL' : 'REST'
    };
  }

  /**
   * Generates a description for an endpoint tag
   */
  private generateTagDescription(tag: string, endpoints: SimpleEndpoint[]): string {
    const methods = new Set(endpoints.map(e => e.method));
    const methodList = Array.from(methods).join(', ');
    
    return `${tag.charAt(0).toUpperCase() + tag.slice(1)} related endpoints (${methodList})`;
  }

  /**
   * Detects API versions from endpoint paths
   */
  private detectApiVersions(): string[] {
    const versions = new Set<string>();
    const versionRegex = /\/(v\d+)/i;

    for (const endpoint of this.endpoints) {
      const match = endpoint.path.match(versionRegex);
      if (match) {
        versions.add(match[1]);
      }
    }

    return Array.from(versions);
  }

  /**
   * Generates API title from project name or structure
   */
  private generateApiTitle(): string {
    // Try to get from package.json
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.name) {
          return `${packageJson.name} API`;
        }
      } catch (error) {
        // Continue to fallback
      }
    }

    // Use project directory name
    const projectName = path.basename(this.projectPath);
    return `${projectName} API`;
  }

  /**
   * Generates API description
   */
  private generateApiDescription(): string {
    const endpointCount = this.endpoints.length;
    const frameworkList = Array.from(this.detectedFrameworks).join(', ');
    
    return `API with ${endpointCount} endpoints. Built with ${frameworkList}.`;
  }

  /**
   * Infers base URL from environment or configuration
   */
  private inferBaseUrl(): string {
    // Try to read from .env or config files
    const envPath = path.join(this.projectPath, '.env');
    
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const portMatch = envContent.match(/PORT=(\d+)/);
        const hostMatch = envContent.match(/HOST=([^\s]+)/);
        
        const port = portMatch ? portMatch[1] : '3000';
        const host = hostMatch ? hostMatch[1] : 'localhost';
        
        return `http://${host}:${port}`;
      } catch (error) {
        // Use default
      }
    }

    return 'http://localhost:3000';
  }

  /**
   * Generates server list for documentation
   */
  private generateServerList(): Array<{ url: string; description: string }> {
    const baseUrl = this.inferBaseUrl();
    
    return [
      {
        url: baseUrl,
        description: 'Development server'
      },
      {
        url: baseUrl.replace('localhost', 'api.example.com'),
        description: 'Production server'
      }
    ];
  }

  /**
   * Calculates statistics about the API
   */
  private calculateStatistics() {
    const methodCounts = new Map<string, number>();
    const authenticatedCount = this.endpoints.filter(e => e.authentication).length;
    const pathsWithParameters = this.endpoints.filter(e => e.parameters && e.parameters.length > 0).length;

    for (const endpoint of this.endpoints) {
      const count = methodCounts.get(endpoint.method) || 0;
      methodCounts.set(endpoint.method, count + 1);
    }

    return {
      totalEndpoints: this.endpoints.length,
      totalRouters: this.routers.size,
      byMethod: Object.fromEntries(methodCounts),
      authenticatedEndpoints: authenticatedCount,
      endpointsWithParameters: pathsWithParameters,
      frameworks: Array.from(this.detectedFrameworks)
    };
  }

  /**
   * Exports endpoints to a specific format
   */
  public exportToFormat(format: 'json' | 'openapi' | 'postman'): string {
    switch (format) {
      case 'json':
        return this.exportToJson();
      
      case 'openapi':
        return this.exportToOpenAPI();
      
      case 'postman':
        return this.exportToPostman();
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Exports to JSON format
   */
  private exportToJson(): string {
    const result = {
      endpoints: this.endpoints,
      routers: Array.from(this.routers.values()),
      frameworks: Array.from(this.detectedFrameworks),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(result, null, 2);
  }

  /**
   * Exports to OpenAPI 3.0 specification
   */
  private exportToOpenAPI(): string {
    const documentation = this.generateDocumentation();
    const securitySchemes = this.analyzeSecuritySchemes();

    const openapi = {
      openapi: '3.0.0',
      info: {
        title: documentation.title,
        description: documentation.description,
        version: documentation.version
      },
      servers: documentation.servers,
      paths: this.buildOpenAPIPaths(),
      components: {
        securitySchemes: this.buildOpenAPISecuritySchemes(securitySchemes)
      },
      tags: documentation.tags
    };

    return JSON.stringify(openapi, null, 2);
  }

  /**
   * Builds OpenAPI paths object
   */
  private buildOpenAPIPaths(): Record<string, any> {
    const paths: Record<string, any> = {};

    for (const endpoint of this.endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const method = endpoint.method.toLowerCase();
      paths[endpoint.path][method] = {
        summary: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
        description: endpoint.description,
        tags: endpoint.tags || [],
        parameters: this.buildOpenAPIParameters(endpoint),
        responses: this.buildOpenAPIResponses(endpoint),
        ...(endpoint.authentication && { security: [{ [endpoint.authentication.type]: [] }] })
      };
    }

    return paths;
  }

  /**
   * Builds OpenAPI parameters array
   */
  private buildOpenAPIParameters(endpoint: SimpleEndpoint): any[] {
    if (!endpoint.parameters) {
      return [];
    }

    return endpoint.parameters.map(param => ({
      name: param.name,
      in: param.in,
      required: param.required,
      description: param.description,
      schema: {
        type: param.type || 'string'
      }
    }));
  }

  /**
   * Builds OpenAPI responses object
   */
  private buildOpenAPIResponses(endpoint: SimpleEndpoint): Record<string, any> {
    const responses: Record<string, any> = {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: endpoint.responseSchema || { type: 'object' }
          }
        }
      }
    };

    if (endpoint.authentication) {
      responses['401'] = {
        description: 'Unauthorized'
      };
    }

    responses['500'] = {
      description: 'Internal server error'
    };

    return responses;
  }

  /**
   * Builds OpenAPI security schemes
   */
  private buildOpenAPISecuritySchemes(schemes: any[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const scheme of schemes) {
      const name = scheme.scheme || scheme.type;
      
      if (scheme.type === 'bearer') {
        result[name] = {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: scheme.scheme || 'JWT'
        };
      } else if (scheme.type === 'apiKey') {
        result[name] = {
          type: 'apiKey',
          in: scheme.in || 'header',
          name: scheme.name || 'x-api-key'
        };
      } else if (scheme.type === 'oauth2') {
        result[name] = {
          type: 'oauth2',
          flows: scheme.flows || {}
        };
      } else if (scheme.type === 'basic') {
        result[name] = {
          type: 'http',
          scheme: 'basic'
        };
      }
    }

    return result;
  }

  /**
   * Exports to Postman collection format
   */
  private exportToPostman(): string {
    const documentation = this.generateDocumentation();

    const collection = {
      info: {
        name: documentation.title,
        description: documentation.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: this.buildPostmanItems(),
      variable: [
        {
          key: 'baseUrl',
          value: documentation.baseUrl,
          type: 'string'
        }
      ]
    };

    return JSON.stringify(collection, null, 2);
  }

  /**
   * Builds Postman items (requests)
   */
  private buildPostmanItems(): any[] {
    // Group by tags
    const itemsByTag = new Map<string, any[]>();

    for (const endpoint of this.endpoints) {
      const tags = endpoint.tags || ['default'];
      
      for (const tag of tags) {
        if (!itemsByTag.has(tag)) {
          itemsByTag.set(tag, []);
        }

        itemsByTag.get(tag)!.push({
          name: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
          request: {
            method: endpoint.method,
            header: this.buildPostmanHeaders(endpoint),
            url: {
              raw: `{{baseUrl}}${endpoint.path}`,
              host: ['{{baseUrl}}'],
              path: endpoint.path.split('/').filter(p => p)
            },
            description: endpoint.description
          }
        });
      }
    }

    // Convert to folder structure
    return Array.from(itemsByTag.entries()).map(([tag, items]) => ({
      name: tag,
      item: items
    }));
  }

  /**
   * Builds Postman headers
   */
  private buildPostmanHeaders(endpoint: SimpleEndpoint): any[] {
    const headers = [];

    if (endpoint.authentication) {
      if (endpoint.authentication.type === 'bearer') {
        headers.push({
          key: 'Authorization',
          value: 'Bearer {{token}}',
          type: 'text'
        });
      } else if (endpoint.authentication.type === 'apiKey') {
        headers.push({
          key: endpoint.authentication.name || 'x-api-key',
          value: '{{apiKey}}',
          type: 'text'
        });
      }
    }

    return headers;
  }

  /**
   * Gets detected frameworks
   */
  public getDetectedFrameworks(): string[] {
    return Array.from(this.detectedFrameworks);
  }

  /**
   * Gets all extracted endpoints
   */
  public getEndpoints(): SimpleEndpoint[] {
    return this.endpoints;
  }

  /**
   * Gets all routers
   */
  public getRouters(): any[] {
    return Array.from(this.routers.values());
  }

  /**
   * Filters endpoints by criteria
   */
  public filterEndpoints(criteria: {
    method?: string;
    path?: string;
    authenticated?: boolean;
    tag?: string;
  }): SimpleEndpoint[] {
    return this.endpoints.filter(endpoint => {
      if (criteria.method && endpoint.method !== criteria.method) {
        return false;
      }

      if (criteria.path && !endpoint.path.includes(criteria.path)) {
        return false;
      }

      if (criteria.authenticated !== undefined && 
          (!!endpoint.authentication) !== criteria.authenticated) {
        return false;
      }

      if (criteria.tag && (!endpoint.tags || !endpoint.tags.includes(criteria.tag))) {
        return false;
      }

      return true;
    });
  }
}
