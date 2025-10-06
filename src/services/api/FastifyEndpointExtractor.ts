import { Project, Node, SyntaxKind, CallExpression, SourceFile } from 'ts-morph';
import { SimpleEndpoint } from '../../types/api';
import * as path from 'path';

/**
 * FastifyEndpointExtractor
 * 
 * Extracts API endpoint information from Fastify applications.
 * Fastify uses a different pattern than Express:
 * - fastify.get('/route', handler)
 * - fastify.post('/route', { schema }, handler)
 * - fastify.route({ method: 'GET', url: '/route', handler })
 * - Supports schema validation and serialization
 * - Plugin-based architecture
 * 
 * @example
 * ```typescript
 * const extractor = new FastifyEndpointExtractor('/path/to/project');
 * const endpoints = await extractor.extractEndpoints();
 * ```
 */
export class FastifyEndpointExtractor {
  private project: Project;
  private endpoints: SimpleEndpoint[] = [];
  private plugins: Map<string, any> = new Map();
  private fastifyIdentifiers: Set<string> = new Set(['fastify', 'app', 'server']);

  // HTTP methods supported by Fastify
  private readonly HTTP_METHODS = [
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'ALL'
  ];

  constructor(private projectPath: string) {
    this.project = new Project({
      tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false
    });
  }

  /**
   * Main extraction method
   */
  public async extractEndpoints(): Promise<SimpleEndpoint[]> {
    const sourceFiles = this.project.getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      if (this.shouldSkipFile(sourceFile)) {
        continue;
      }

      this.analyzeSourceFile(sourceFile);
    }

    return this.endpoints;
  }

  /**
   * Analyzes a single source file for Fastify patterns
   */
  private analyzeSourceFile(sourceFile: SourceFile): void {
    const filePath = sourceFile.getFilePath();

    // Detect Fastify instance identifiers
    this.detectFastifyIdentifiers(sourceFile);

    // Find all call expressions
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      this.analyzeCallExpression(callExpr, filePath);
    }
  }

  /**
   * Detects variable names that represent Fastify instances
   * Example: const fastify = Fastify(); const app = fastify();
   */
  private detectFastifyIdentifiers(sourceFile: SourceFile): void {
    const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

    for (const varDecl of variableDeclarations) {
      const initializer = varDecl.getInitializer();
      if (!initializer) continue;

      const initText = initializer.getText();

      // Detect: const app = fastify() or const app = Fastify()
      if (initText.includes('fastify(') || initText.includes('Fastify(')) {
        const varName = varDecl.getName();
        this.fastifyIdentifiers.add(varName);
      }
    }
  }

  /**
   * Analyzes a call expression for Fastify route definitions
   */
  private analyzeCallExpression(callExpr: CallExpression, filePath: string): void {
    const expression = callExpr.getExpression();

    if (Node.isPropertyAccessExpression(expression)) {
      const objectName = expression.getExpression().getText();
      const methodName = expression.getName().toUpperCase();

      // Check if this is a Fastify identifier
      if (!this.fastifyIdentifiers.has(objectName)) {
        return;
      }

      // Handle HTTP method routes: fastify.get(), fastify.post(), etc.
      if (this.HTTP_METHODS.includes(methodName)) {
        this.extractEndpoint(callExpr, methodName, filePath);
      }

      // Handle fastify.route() method
      if (methodName === 'ROUTE') {
        this.extractRouteConfig(callExpr, filePath);
      }

      // Handle fastify.register() for plugins
      if (methodName === 'REGISTER') {
        this.extractPlugin(callExpr, filePath);
      }
    }
  }

  /**
   * Extracts endpoint from method call: fastify.get('/path', handler)
   */
  private extractEndpoint(
    callExpr: CallExpression,
    method: string,
    filePath: string
  ): void {
    const args = callExpr.getArguments();
    if (args.length === 0) return;

    // First argument should be the path
    const pathArg = args[0];
    const routePath = this.extractRoutePath(pathArg);
    if (!routePath) return;

    // Fastify can have: (path, handler) or (path, opts, handler)
    let schema: any = undefined;
    let handler: Node;

    if (args.length === 2) {
      handler = args[1];
    } else if (args.length >= 3) {
      // Check if second arg is options/schema
      const secondArg = args[1];
      if (Node.isObjectLiteralExpression(secondArg)) {
        schema = this.extractSchema(secondArg);
      }
      handler = args[args.length - 1];
    } else {
      return;
    }

    const endpoint = {
      path: routePath,
      method,
      handler: {
        name: this.extractHandlerName(handler!),
        filePath,
        location: {
          line: handler!.getStartLineNumber(),
          column: handler!.getStartLinePos()
        }
      },
      parameters: this.extractRouteParameters(routePath),
      schema,
      framework: 'FASTIFY',
      description: this.extractDescription(handler!)
    };

    this.endpoints.push(endpoint);
  }

  /**
   * Extracts endpoint from fastify.route() configuration object
   * Example: fastify.route({ method: 'GET', url: '/users', handler: fn })
   */
  private extractRouteConfig(callExpr: CallExpression, filePath: string): void {
    const args = callExpr.getArguments();
    if (args.length === 0) return;

    const configArg = args[0];
    if (!Node.isObjectLiteralExpression(configArg)) return;

    const properties = configArg.getProperties();
    
    let method: string | undefined;
    let url: string | undefined;
    let handler: Node | undefined;
    let schema: any = undefined;

    for (const prop of properties) {
      if (Node.isPropertyAssignment(prop)) {
        const propName = prop.getName();
        const initializer = prop.getInitializer();

        if (propName === 'method' && initializer && Node.isStringLiteral(initializer)) {
          method = initializer.getLiteralValue().toUpperCase();
        } else if (propName === 'url' && initializer && Node.isStringLiteral(initializer)) {
          url = initializer.getLiteralValue();
        } else if (propName === 'handler' && initializer) {
          handler = initializer;
        } else if (propName === 'schema' && initializer && Node.isObjectLiteralExpression(initializer)) {
          schema = this.extractSchema(initializer);
        }
      }
    }

    if (method && url && handler) {
      const endpoint = {
        path: url,
        method,
        handler: {
          name: this.extractHandlerName(handler),
          filePath,
          location: {
            line: handler.getStartLineNumber(),
            column: handler.getStartLinePos()
          }
        },
        parameters: this.extractRouteParameters(url),
        schema,
        framework: 'FASTIFY',
        description: this.extractDescription(handler)
      };

      this.endpoints.push(endpoint);
    }
  }

  /**
   * Extracts Fastify schema from options object
   */
  private extractSchema(objectLiteral: any): any {
    const schema: any = {};
    const properties = objectLiteral.getProperties();

    for (const prop of properties) {
      if (Node.isPropertyAssignment(prop)) {
        const propName = prop.getName();
        
        // Common Fastify schema properties
        if (['body', 'querystring', 'params', 'headers', 'response'].includes(propName)) {
          try {
            const text = prop.getInitializer()?.getText();
            if (text) {
              schema[propName] = text; // Store as string for now
            }
          } catch (error) {
            // Skip if can't extract
          }
        }
      }
    }

    return Object.keys(schema).length > 0 ? schema : undefined;
  }

  /**
   * Extracts plugin registration
   */
  private extractPlugin(callExpr: CallExpression, filePath: string): void {
    const args = callExpr.getArguments();
    if (args.length === 0) return;

    const pluginArg = args[0];
    const pluginName = pluginArg.getText();

    // Track plugin for context
    this.plugins.set(pluginName, {
      name: pluginName,
      filePath,
      line: pluginArg.getStartLineNumber()
    });
  }

  /**
   * Extracts route path from argument
   */
  private extractRoutePath(pathArg: Node): string | null {
    if (Node.isStringLiteral(pathArg)) {
      return pathArg.getLiteralValue();
    }

    if (Node.isNoSubstitutionTemplateLiteral(pathArg)) {
      return pathArg.getLiteralValue();
    }

    try {
      const text = pathArg.getText();
      return text.replace(/['"]/g, '');
    } catch {
      return null;
    }
  }

  /**
   * Extracts route parameters from path pattern
   * Fastify uses :param and also supports wildcards and regex
   */
  private extractRouteParameters(path: string): any[] {
    const params: any[] = [];
    
    // Standard parameters: :paramName
    const paramRegex = /:(\w+)/g;
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push({
        name: match[1],
        in: 'path',
        required: true,
        type: 'string',
        description: `Path parameter: ${match[1]}`
      });
    }

    // Wildcard parameters: *
    if (path.includes('*')) {
      params.push({
        name: 'wildcard',
        in: 'path',
        required: false,
        type: 'string',
        description: 'Wildcard parameter'
      });
    }

    return params;
  }

  /**
   * Extracts handler function name
   */
  private extractHandlerName(handler: Node): string {
    if (Node.isIdentifier(handler)) {
      return handler.getText();
    }

    if (Node.isPropertyAccessExpression(handler)) {
      return handler.getName();
    }

    if (Node.isArrowFunction(handler) || Node.isFunctionExpression(handler)) {
      return '(anonymous)';
    }

    return 'unknown';
  }

  /**
   * Extracts description from comments
   */
  private extractDescription(handler: Node): string | undefined {
    const leadingComments = handler.getLeadingCommentRanges();
    if (leadingComments.length > 0) {
      const sourceFile = handler.getSourceFile();
      return leadingComments
        .map(range => sourceFile.getFullText().substring(range.getPos(), range.getEnd()))
        .join('\n')
        .replace(/\/\/|\/\*|\*\//g, '')
        .trim();
    }

    return undefined;
  }

  /**
   * Determines if a file should be skipped
   */
  private shouldSkipFile(sourceFile: SourceFile): boolean {
    const filePath = sourceFile.getFilePath();
    
    return (
      filePath.includes('node_modules') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('__tests__') ||
      filePath.includes('__mocks__')
    );
  }

  /**
   * Gets all extracted endpoints
   */
  public getEndpoints(): SimpleEndpoint[] {
    return this.endpoints;
  }

  /**
   * Gets all registered plugins
   */
  public getPlugins(): any[] {
    return Array.from(this.plugins.values());
  }
}
