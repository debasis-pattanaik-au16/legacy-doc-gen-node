import { Project, Node, SyntaxKind, CallExpression, PropertyAccessExpression, SourceFile } from 'ts-morph';
import {
  SimpleEndpoint,
  HTTPMethod,
  RouteParameter,
  MiddlewareInfo,
  WebFramework,
  ParameterType
} from '../../types/api';
import * as path from 'path';

/**
 * ExpressEndpointExtractor
 * 
 * Extracts API endpoint information from Express.js applications.
 * Analyzes source code using TypeScript AST to detect:
 * - HTTP method handlers (get, post, put, delete, patch, etc.)
 * - Route patterns and parameters
 * - Middleware functions
 * - Router configurations
 * - Authentication schemes
 * - Request/response schemas
 * 
 * @example
 * ```typescript
 * const extractor = new ExpressEndpointExtractor('/path/to/project');
 * const endpoints = await extractor.extractEndpoints();
 * ```
 */
export class ExpressEndpointExtractor {
  private project: Project;
  private endpoints: SimpleEndpoint[] = [];
  private routers: Map<string, any> = new Map();
  private expressIdentifiers: Set<string> = new Set(['express', 'app', 'router']);

  // HTTP methods supported by Express
  private readonly HTTP_METHODS: string[] = [
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
  ];

  constructor(private projectPath: string) {
    this.project = new Project({
      tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false
    });
  }

  /**
   * Main extraction method - analyzes all source files and extracts endpoints
   */
  public async extractEndpoints(): Promise<SimpleEndpoint[]> {
    const sourceFiles = this.project.getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      // Skip node_modules and test files
      if (this.shouldSkipFile(sourceFile)) {
        continue;
      }

      this.analyzeSourceFile(sourceFile);
    }

    return this.endpoints;
  }

  /**
   * Extracts routers defined in the project
   */
  public getRouters(): any[] {
    return Array.from(this.routers.values());
  }

  /**
   * Analyzes a single source file for Express patterns
   */
  private analyzeSourceFile(sourceFile: SourceFile): void {
    const filePath = sourceFile.getFilePath();

    // Find Express app/router initializations
    this.detectExpressIdentifiers(sourceFile);

    // Find all call expressions (potential route definitions)
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      this.analyzeCallExpression(callExpr, filePath);
    }
  }

  /**
   * Detects variable names that represent Express app or router instances
   * Example: const app = express(); const router = express.Router();
   */
  private detectExpressIdentifiers(sourceFile: SourceFile): void {
    const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

    for (const varDecl of variableDeclarations) {
      const initializer = varDecl.getInitializer();
      if (!initializer) continue;

      const initText = initializer.getText();

      // Detect: const app = express()
      if (initText.includes('express()')) {
        const varName = varDecl.getName();
        this.expressIdentifiers.add(varName);
      }

      // Detect: const router = express.Router()
      if (initText.includes('express.Router()') || initText.includes('Router()')) {
        const varName = varDecl.getName();
        this.expressIdentifiers.add(varName);
        this.registerRouter(varName, sourceFile.getFilePath());
      }
    }
  }

  /**
   * Registers a router for tracking
   */
  private registerRouter(name: string, filePath: string): void {
    if (!this.routers.has(name)) {
      this.routers.set(name, {
        name,
        basePath: this.inferBasePath(name, filePath),
        endpoints: [],
        middlewares: [],
        nestedRouters: []
      });
    }
  }

  /**
   * Infers base path from router name or file structure
   * Example: userRouter -> /users, routes/api/posts.ts -> /api/posts
   */
  private inferBasePath(routerName: string, filePath: string): string {
    // Try to infer from router name (e.g., userRouter -> /users)
    const nameMatch = routerName.match(/^(\w+?)Router$/i);
    if (nameMatch) {
      return `/${nameMatch[1].toLowerCase()}s`;
    }

    // Try to infer from file path
    const pathMatch = filePath.match(/routes\/(.+?)\.ts$/);
    if (pathMatch) {
      return `/${pathMatch[1].replace(/\\/g, '/')}`;
    }

    return '/';
  }

  /**
   * Analyzes a call expression to determine if it's an Express route definition
   */
  private analyzeCallExpression(callExpr: CallExpression, filePath: string): void {
    const expression = callExpr.getExpression();

    if (Node.isPropertyAccessExpression(expression)) {
      this.analyzePropertyAccess(expression, callExpr, filePath);
    }
  }

  /**
   * Analyzes property access expressions like app.get(), router.post(), etc.
   */
  private analyzePropertyAccess(
    propAccess: PropertyAccessExpression,
    callExpr: CallExpression,
    filePath: string
  ): void {
    const objectName = propAccess.getExpression().getText();
    const methodName = propAccess.getName().toUpperCase();

    // Check if this is an Express identifier and HTTP method
    if (!this.expressIdentifiers.has(objectName)) {
      return;
    }

    // Handle HTTP method routes
    if (this.HTTP_METHODS.includes(methodName)) {
      this.extractEndpoint(callExpr, methodName, objectName, filePath);
    }

    // Handle router.use() for middleware
    if (methodName === 'USE') {
      this.extractMiddleware(callExpr, objectName, filePath);
    }

    // Handle app.use('/path', router) for nested routers
    if (methodName === 'USE' && callExpr.getArguments().length >= 2) {
      this.extractNestedRouter(callExpr, objectName);
    }
  }

  /**
   * Extracts endpoint information from route definition
   * Example: app.get('/users/:id', authMiddleware, getUserController)
   */
  private extractEndpoint(
    callExpr: CallExpression,
    method: string,
    routerName: string,
    filePath: string
  ): void {
    const args = callExpr.getArguments();
    if (args.length === 0) return;

    // First argument should be the path
    const pathArg = args[0];
    const routePath = this.extractRoutePath(pathArg);
    if (!routePath) return;

    // Extract middleware and handler
    const middlewares = this.extractMiddlewaresFromArgs(args.slice(1, -1));
    const handler = args[args.length - 1];

    // Build endpoint object
    const endpoint: SimpleEndpoint = {
      path: routePath,
      method,
      handler: {
        name: this.extractHandlerName(handler),
        filePath,
        location: {
          line: handler.getStartLineNumber(),
          column: handler.getStartLinePos()
        }
      },
      middlewares,
      parameters: this.extractRouteParameters(routePath),
      framework: 'EXPRESS',
      // Additional properties to be filled by further analysis
      authentication: this.inferAuthenticationScheme(middlewares),
      tags: this.inferTags(routePath, filePath),
      description: this.extractDescription(handler)
    };

    this.endpoints.push(endpoint);

    // Add to router if exists
    const router = this.routers.get(routerName);
    if (router) {
      router.endpoints.push(endpoint);
    }
  }

  /**
   * Extracts route path from the first argument
   * Handles string literals and template literals
   */
  private extractRoutePath(pathArg: Node): string | null {
    if (Node.isStringLiteral(pathArg)) {
      return pathArg.getLiteralValue();
    }

    if (Node.isNoSubstitutionTemplateLiteral(pathArg)) {
      return pathArg.getLiteralValue();
    }

    // Try to evaluate simple expressions
    try {
      const text = pathArg.getText();
      // Remove quotes if present
      return text.replace(/['"]/g, '');
    } catch {
      return null;
    }
  }

  /**
   * Extracts route parameters from path pattern
   * Example: /users/:id/posts/:postId -> [{name: 'id', ...}, {name: 'postId', ...}]
   */
  private extractRouteParameters(path: string): any[] {
    const params: any[] = [];
    const paramRegex = /:(\w+)(\(.*?\))?(\?)?/g;
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push({
        name: match[1],
        in: 'path',
        required: !match[3], // Not optional if no '?' suffix
        type: 'string',
        description: `Path parameter: ${match[1]}`
      });
    }

    return params;
  }

  /**
   * Extracts middleware information from route arguments
   */
  private extractMiddlewaresFromArgs(args: Node[]): any[] {
    const middlewares: any[] = [];

    for (const arg of args) {
      const name = this.extractMiddlewareName(arg);
      if (name) {
        middlewares.push({
          name,
          order: middlewares.length,
          type: this.inferMiddlewareType(name)
        });
      }
    }

    return middlewares;
  }

  /**
   * Extracts middleware name from node
   */
  private extractMiddlewareName(node: Node): string | null {
    if (Node.isIdentifier(node)) {
      return node.getText();
    }

    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      if (Node.isIdentifier(expr)) {
        return expr.getText();
      }
    }

    return null;
  }

  /**
   * Infers middleware type from its name
   */
  private inferMiddlewareType(name: string): string {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('auth')) return 'authentication';
    if (lowerName.includes('valid')) return 'validation';
    if (lowerName.includes('log')) return 'logging';
    if (lowerName.includes('cors')) return 'cors';
    if (lowerName.includes('rate') || lowerName.includes('limit')) return 'rate-limiting';
    if (lowerName.includes('error')) return 'error-handling';

    return 'custom';
  }

  /**
   * Extracts middleware from router.use() calls
   */
  private extractMiddleware(callExpr: CallExpression, routerName: string, filePath: string): void {
    const args = callExpr.getArguments();
    
    for (const arg of args) {
      const name = this.extractMiddlewareName(arg);
      if (name) {
        const middleware: any = {
          name,
          order: 0,
          type: this.inferMiddlewareType(name),
          global: true
        };

        const router = this.routers.get(routerName);
        if (router) {
          router.middlewares.push(middleware);
        }
      }
    }
  }

  /**
   * Extracts nested router usage
   * Example: app.use('/api/users', userRouter)
   */
  private extractNestedRouter(callExpr: CallExpression, parentRouterName: string): void {
    const args = callExpr.getArguments();
    if (args.length < 2) return;

    const basePath = this.extractRoutePath(args[0]);
    const routerArg = args[1];

    if (basePath && Node.isIdentifier(routerArg)) {
      const nestedRouterName = routerArg.getText();
      
      const parentRouter = this.routers.get(parentRouterName);
      const nestedRouter = this.routers.get(nestedRouterName);

      if (parentRouter && nestedRouter) {
        // Update nested router's base path
        nestedRouter.basePath = basePath;
        
        // Link routers
        if (!parentRouter.nestedRouters) {
          parentRouter.nestedRouters = [];
        }
        parentRouter.nestedRouters.push(nestedRouterName);
      }
    }
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
   * Infers authentication scheme from middleware
   */
  private inferAuthenticationScheme(middlewares: any[]): any | undefined {
    const authMiddleware = middlewares.find(m => 
      m.name.toLowerCase().includes('auth') || m.type === 'authentication'
    );

    if (!authMiddleware) return undefined;

    const name = authMiddleware.name.toLowerCase();

    if (name.includes('jwt') || name.includes('token')) {
      return {
        type: 'bearer',
        scheme: 'JWT',
        description: 'JWT Bearer Token Authentication'
      };
    }

    if (name.includes('basic')) {
      return {
        type: 'basic',
        description: 'Basic Authentication'
      };
    }

    if (name.includes('oauth')) {
      return {
        type: 'oauth2',
        description: 'OAuth 2.0 Authentication'
      };
    }

    if (name.includes('apikey') || name.includes('api_key')) {
      return {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API Key Authentication'
      };
    }

    return {
      type: 'custom',
      description: `Custom authentication: ${authMiddleware.name}`
    };
  }

  /**
   * Infers endpoint tags from path and file structure
   */
  private inferTags(routePath: string, filePath: string): string[] {
    const tags: Set<string> = new Set();

    // Extract from route path
    const pathSegments = routePath.split('/').filter(s => s && !s.startsWith(':'));
    if (pathSegments.length > 0) {
      tags.add(pathSegments[0]);
    }

    // Extract from file path
    const fileMatch = filePath.match(/routes\/(?:api\/)?(\w+)/);
    if (fileMatch) {
      tags.add(fileMatch[1]);
    }

    return Array.from(tags);
  }

  /**
   * Extracts description from JSDoc comments or inline comments
   */
  private extractDescription(handler: Node): string | undefined {
    // Try to get JSDoc comment
    const jsDocs = handler.getParent()?.getChildrenOfKind(SyntaxKind.JSDocComment);
    if (jsDocs && jsDocs.length > 0) {
      return jsDocs[0].getText().replace(/\/\*\*|\*\/|\*/g, '').trim();
    }

    // Try to get leading comments
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
   * Determines if a file should be skipped during analysis
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
   * Resolves full endpoint paths by combining router base paths
   */
  public resolveEndpointPaths(): void {
    for (const endpoint of this.endpoints) {
      // Find which router this endpoint belongs to
      for (const [routerName, router] of this.routers.entries()) {
        if (router.endpoints.includes(endpoint)) {
          endpoint.path = this.combinePaths(router.basePath, endpoint.path);
        }
      }
    }
  }

  /**
   * Combines base path and route path
   */
  private combinePaths(basePath: string, routePath: string): string {
    const cleanBase = basePath.replace(/\/$/, '');
    const cleanRoute = routePath.replace(/^\//, '');
    return `${cleanBase}/${cleanRoute}`.replace(/\/+/g, '/');
  }
}
