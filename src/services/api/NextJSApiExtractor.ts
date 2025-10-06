import { Project, Node, SyntaxKind, SourceFile, FunctionDeclaration, VariableDeclaration } from 'ts-morph';
import { SimpleEndpoint } from '../../types/api';
import * as path from 'path';
import * as fs from 'fs';

/**
 * NextJSApiExtractor
 * 
 * Extracts API routes from Next.js applications.
 * Next.js uses file-based routing in the `pages/api` or `app/api` directories:
 * - pages/api/users.ts -> /api/users
 * - pages/api/users/[id].ts -> /api/users/:id
 * - app/api/users/route.ts -> /api/users
 * 
 * Next.js 13+ App Router:
 * - export async function GET(request) {}
 * - export async function POST(request) {}
 * 
 * Next.js Pages Router:
 * - export default function handler(req, res) {}
 * - HTTP method determined by req.method checks
 * 
 * @example
 * ```typescript
 * const extractor = new NextJSApiExtractor('/path/to/project');
 * const endpoints = await extractor.extractEndpoints();
 * ```
 */
export class NextJSApiExtractor {
  private project: Project;
  private endpoints: SimpleEndpoint[] = [];
  private projectPath: string;

  // HTTP methods for App Router
  private readonly HTTP_METHODS = [
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
  ];

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
    this.project = new Project({
      tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false
    });
  }

  /**
   * Main extraction method
   */
  public async extractEndpoints(): Promise<SimpleEndpoint[]> {
    // Detect routing type (Pages Router or App Router)
    const routingType = this.detectRoutingType();

    if (routingType === 'app') {
      await this.extractAppRouterEndpoints();
    } else if (routingType === 'pages') {
      await this.extractPagesRouterEndpoints();
    }

    return this.endpoints;
  }

  /**
   * Detects which Next.js routing system is being used
   */
  private detectRoutingType(): 'pages' | 'app' | 'unknown' {
    const pagesApiDir = path.join(this.projectPath, 'pages', 'api');
    const appApiDir = path.join(this.projectPath, 'app', 'api');
    const srcPagesApiDir = path.join(this.projectPath, 'src', 'pages', 'api');
    const srcAppApiDir = path.join(this.projectPath, 'src', 'app', 'api');

    // Check for App Router first (newer)
    if (fs.existsSync(appApiDir) || fs.existsSync(srcAppApiDir)) {
      return 'app';
    }

    // Check for Pages Router
    if (fs.existsSync(pagesApiDir) || fs.existsSync(srcPagesApiDir)) {
      return 'pages';
    }

    return 'unknown';
  }

  /**
   * Extracts endpoints from App Router (Next.js 13+)
   * Pattern: app/api/{path}/route.ts with named exports (GET, POST, etc.)
   */
  private async extractAppRouterEndpoints(): Promise<void> {
    const appApiDirs = [
      path.join(this.projectPath, 'app', 'api'),
      path.join(this.projectPath, 'src', 'app', 'api')
    ];

    for (const apiDir of appApiDirs) {
      if (fs.existsSync(apiDir)) {
        await this.scanAppRouterDirectory(apiDir, '/api');
      }
    }
  }

  /**
   * Recursively scans App Router directory
   */
  private async scanAppRouterDirectory(dir: string, basePath: string): Promise<void> {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Handle dynamic routes: [id], [slug], etc.
        const isDynamic = entry.name.startsWith('[') && entry.name.endsWith(']');
        const pathSegment = isDynamic 
          ? `:${entry.name.slice(1, -1)}`  // [id] -> :id
          : entry.name;

        await this.scanAppRouterDirectory(fullPath, `${basePath}/${pathSegment}`);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        await this.extractAppRouterFile(fullPath, basePath);
      }
    }
  }

  /**
   * Extracts endpoints from an App Router route file
   */
  private async extractAppRouterFile(filePath: string, routePath: string): Promise<void> {
    const sourceFile = this.project.addSourceFileAtPath(filePath);

    // Look for exported functions matching HTTP methods
    const exportedFunctions = sourceFile.getExportedDeclarations();

    for (const [name, declarations] of exportedFunctions) {
      const method = name.toUpperCase();
      
      if (this.HTTP_METHODS.includes(method)) {
        for (const declaration of declarations) {
          if (Node.isFunctionDeclaration(declaration) || 
              Node.isVariableDeclaration(declaration)) {
            
            const endpoint = {
              path: routePath,
              method,
              handler: {
                name: name,
                filePath,
                location: {
                  line: declaration.getStartLineNumber(),
                  column: declaration.getStartLinePos()
                }
              },
              parameters: this.extractParametersFromPath(routePath),
              framework: 'NEXTJS',
              routerType: 'app',
              isAsync: this.isAsyncFunction(declaration),
              description: this.extractDescription(declaration)
            };

            this.endpoints.push(endpoint);
          }
        }
      }
    }
  }

  /**
   * Extracts endpoints from Pages Router (Next.js 12 and earlier)
   * Pattern: pages/api/*.ts with default export handler
   */
  private async extractPagesRouterEndpoints(): Promise<void> {
    const pagesApiDirs = [
      path.join(this.projectPath, 'pages', 'api'),
      path.join(this.projectPath, 'src', 'pages', 'api')
    ];

    for (const apiDir of pagesApiDirs) {
      if (fs.existsSync(apiDir)) {
        await this.scanPagesRouterDirectory(apiDir, '/api');
      }
    }
  }

  /**
   * Recursively scans Pages Router directory
   */
  private async scanPagesRouterDirectory(dir: string, basePath: string): Promise<void> {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.scanPagesRouterDirectory(fullPath, `${basePath}/${entry.name}`);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        const fileName = entry.name.replace(/\.(ts|js)$/, '');
        
        // Handle dynamic routes: [id].ts -> :id
        const isDynamic = fileName.startsWith('[') && fileName.endsWith(']');
        const routeSegment = isDynamic 
          ? `:${fileName.slice(1, -1)}`
          : fileName === 'index' ? '' : `/${fileName}`;

        const routePath = `${basePath}${routeSegment}`;
        await this.extractPagesRouterFile(fullPath, routePath);
      }
    }
  }

  /**
   * Extracts endpoints from a Pages Router file
   */
  private async extractPagesRouterFile(filePath: string, routePath: string): Promise<void> {
    const sourceFile = this.project.addSourceFileAtPath(filePath);

    // Look for default export (the handler function)
    const defaultExport = sourceFile.getDefaultExportSymbol();
    
    if (!defaultExport) return;

    const declarations = defaultExport.getDeclarations();
    
    for (const declaration of declarations) {
      // The handler might check req.method to determine HTTP method
      const methods = this.extractHttpMethodsFromHandler(declaration);

      if (methods.length === 0) {
        // If no specific methods detected, assume it handles all
        methods.push('ALL');
      }

      for (const method of methods) {
        const endpoint = {
          path: routePath,
          method,
          handler: {
            name: 'handler',
            filePath,
            location: {
              line: declaration.getStartLineNumber(),
              column: declaration.getStartLinePos()
            }
          },
          parameters: this.extractParametersFromPath(routePath),
          framework: 'NEXTJS',
          routerType: 'pages',
          description: this.extractDescription(declaration)
        };

        this.endpoints.push(endpoint);
      }
    }
  }

  /**
   * Extracts HTTP methods from req.method checks in handler
   * Example: if (req.method === 'GET') { ... }
   */
  private extractHttpMethodsFromHandler(declaration: Node): string[] {
    const methods: Set<string> = new Set();

    // Try to find the function body
    let functionBody: Node | undefined;

    if (Node.isFunctionDeclaration(declaration)) {
      functionBody = declaration.getBody();
    } else if (Node.isVariableDeclaration(declaration)) {
      const initializer = declaration.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
        functionBody = initializer.getBody();
      }
    }

    if (!functionBody) return Array.from(methods);

    // Look for req.method === 'METHOD' patterns
    const binaryExpressions = functionBody.getDescendantsOfKind(SyntaxKind.BinaryExpression);

    for (const binExpr of binaryExpressions) {
      const left = binExpr.getLeft();
      const right = binExpr.getRight();

      // Check if it's comparing req.method
      const leftText = left.getText();
      if (leftText.includes('req.method') || leftText.includes('request.method')) {
        // Extract the method from the right side
        if (Node.isStringLiteral(right)) {
          const method = right.getLiteralValue().toUpperCase();
          if (this.HTTP_METHODS.includes(method)) {
            methods.add(method);
          }
        }
      }
    }

    // Look for switch cases on req.method
    const switchStatements = functionBody.getDescendantsOfKind(SyntaxKind.SwitchStatement);

    for (const switchStmt of switchStatements) {
      const expr = switchStmt.getExpression();
      if (expr.getText().includes('req.method') || expr.getText().includes('request.method')) {
        const caseBlocks = switchStmt.getCaseBlock().getClauses();
        
        for (const caseClause of caseBlocks) {
          if (Node.isCaseClause(caseClause)) {
            const caseExpr = caseClause.getExpression();
            if (Node.isStringLiteral(caseExpr)) {
              const method = caseExpr.getLiteralValue().toUpperCase();
              if (this.HTTP_METHODS.includes(method)) {
                methods.add(method);
              }
            }
          }
        }
      }
    }

    return Array.from(methods);
  }

  /**
   * Extracts route parameters from path
   * Example: /api/users/:id -> [{name: 'id', ...}]
   */
  private extractParametersFromPath(path: string): any[] {
    const params: any[] = [];
    const segments = path.split('/').filter(s => s);

    for (const segment of segments) {
      if (segment.startsWith(':')) {
        params.push({
          name: segment.slice(1),
          in: 'path',
          required: true,
          type: 'string',
          description: `Path parameter: ${segment.slice(1)}`
        });
      }
    }

    return params;
  }

  /**
   * Checks if a function is async
   */
  private isAsyncFunction(declaration: Node): boolean {
    if (Node.isFunctionDeclaration(declaration)) {
      return declaration.isAsync();
    }

    if (Node.isVariableDeclaration(declaration)) {
      const initializer = declaration.getInitializer();
      if (initializer && Node.isArrowFunction(initializer)) {
        return initializer.isAsync();
      }
    }

    return false;
  }

  /**
   * Extracts description from JSDoc or comments
   */
  private extractDescription(declaration: Node): string | undefined {
    // Try JSDoc first - only available on certain node types
    if (Node.isJSDocable(declaration)) {
      const jsDocs = declaration.getJsDocs();
      if (jsDocs.length > 0) {
        const comment = jsDocs[0].getComment();
        if (typeof comment === 'string') {
          return comment.trim();
        }
      }
    }

    // Try leading comments
    const leadingComments = declaration.getLeadingCommentRanges();
    if (leadingComments.length > 0) {
      const sourceFile = declaration.getSourceFile();
      return leadingComments
        .map(range => sourceFile.getFullText().substring(range.getPos(), range.getEnd()))
        .join('\n')
        .replace(/\/\/|\/\*|\*\//g, '')
        .trim();
    }

    return undefined;
  }

  /**
   * Gets all extracted endpoints
   */
  public getEndpoints(): SimpleEndpoint[] {
    return this.endpoints;
  }

  /**
   * Gets routing type detected
   */
  public getRoutingType(): 'pages' | 'app' | 'unknown' {
    return this.detectRoutingType();
  }
}
