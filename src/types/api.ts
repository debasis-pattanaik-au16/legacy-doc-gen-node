/**
 * API Endpoint Extraction Type Definitions
 * 
 * Defines types for API endpoint detection, route analysis, middleware extraction,
 * and framework-specific patterns across Express, Fastify, Next.js, etc.
 * 
 * @module types/api
 */

/**
 * HTTP methods supported by web frameworks
 */
export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
  ALL = 'ALL', // Express app.all()
}

/**
 * Web framework types
 */
export enum WebFramework {
  EXPRESS = 'express',
  FASTIFY = 'fastify',
  NEXT_JS = 'next.js',
  KOA = 'koa',
  HAPI = 'hapi',
  NESTJS = 'nestjs',
  DJANGO = 'django',
  FLASK = 'flask',
  FASTAPI = 'fastapi',
  UNKNOWN = 'unknown',
}

/**
 * Route parameter types
 */
export enum ParameterType {
  PATH = 'path',           // /users/:id
  QUERY = 'query',         // ?page=1
  BODY = 'body',           // Request body
  HEADER = 'header',       // HTTP headers
  COOKIE = 'cookie',       // Cookies
}

/**
 * Authentication types
 */
export enum AuthenticationType {
  NONE = 'none',
  BASIC = 'basic',
  BEARER = 'bearer',
  JWT = 'jwt',
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  SESSION = 'session',
  CUSTOM = 'custom',
}

/**
 * Route parameter definition
 */
export interface RouteParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  dataType?: string;           // string, number, boolean, object, array
  description?: string;
  defaultValue?: any;
  validation?: ValidationRule[];
}

/**
 * Validation rule for parameters
 */
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value?: any;
  message?: string;
}

/**
 * Middleware information
 */
export interface MiddlewareInfo {
  name: string;
  type: 'authentication' | 'authorization' | 'validation' | 'logging' | 'cors' | 'rate-limit' | 'custom';
  function?: string;           // Function name
  filePath?: string;           // File where middleware is defined
  line?: number;
  order: number;               // Position in middleware chain
  isAsync: boolean;
  parameters?: string[];
  description?: string;
}

/**
 * Request body schema
 */
export interface RequestBodySchema {
  contentType: string;         // application/json, multipart/form-data, etc.
  schema?: any;                // JSON Schema or TypeScript type
  required: boolean;
  examples?: any[];
}

/**
 * Response schema
 */
export interface ResponseSchema {
  statusCode: number;
  description?: string;
  contentType: string;
  schema?: any;                // Response body schema
  headers?: Record<string, string>;
  examples?: any[];
}

/**
 * Simplified endpoint type for extractors (backward compatibility)
 * Use this for basic extraction, then transform to APIEndpoint
 */
export interface SimpleEndpoint {
  path: string;
  method: string;
  handler: {
    name: string;
    filePath: string;
    location: {
      line: number;
      column: number;
    };
  };
  parameters?: any[];
  middlewares?: any[];
  authentication?: any;
  framework: string;
  tags?: string[];
  description?: string;
  summary?: string;
  schema?: any;
  [key: string]: any;  // Allow additional properties
}

/**
 * API Endpoint definition
 */
export interface APIEndpoint {
  id: string;
  path: string;                // Route path (e.g., /api/users/:id)
  normalizedPath: string;      // Normalized path (e.g., /api/users/{id})
  method: HTTPMethod;
  framework: WebFramework;
  
  // Location
  filePath: string;
  startLine: number;
  endLine: number;
  
  // Handler
  handlerFunction?: string;    // Function name
  handlerType: 'inline' | 'reference' | 'controller';
  isAsync: boolean;
  
  // Parameters
  parameters: RouteParameter[];
  pathParameters: string[];    // Extracted from path (e.g., ['id'])
  
  // Request/Response
  requestBody?: RequestBodySchema;
  responses: ResponseSchema[];
  
  // Middleware
  middleware: MiddlewareInfo[];
  
  // Authentication
  authentication: AuthenticationType;
  authenticationMiddleware?: string[];
  requiresAuth: boolean;
  
  // Documentation
  description?: string;
  summary?: string;
  tags?: string[];
  deprecated?: boolean;
  
  // Additional metadata
  version?: string;
  rateLimit?: RateLimitInfo;
  cors?: CORSInfo;
  
  // Framework-specific
  frameworkSpecific?: Record<string, any>;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  windowMs: number;            // Time window in milliseconds
  maxRequests: number;         // Max requests per window
  message?: string;
}

/**
 * CORS information
 */
export interface CORSInfo {
  enabled: boolean;
  origins: string[];
  methods: HTTPMethod[];
  allowCredentials: boolean;
  maxAge?: number;
}

/**
 * API Router (for nested routes)
 */
export interface APIRouter {
  id: string;
  basePath: string;            // Base path for all routes in this router
  filePath: string;
  routerVariable: string;      // Variable name (e.g., 'userRouter')
  endpoints: APIEndpoint[];
  middleware: MiddlewareInfo[];
  mountedAt?: string;          // Where the router is mounted
}

/**
 * API Group (logical grouping of endpoints)
 */
export interface APIGroup {
  name: string;
  description?: string;
  basePath: string;
  endpoints: APIEndpoint[];
  tags: string[];
}

/**
 * API Analysis Result
 */
export interface APIAnalysisResult {
  framework: WebFramework;
  endpoints: APIEndpoint[];
  routers: APIRouter[];
  groups: APIGroup[];
  
  // Statistics
  statistics: APIStatistics;
  
  // Middleware
  globalMiddleware: MiddlewareInfo[];
  
  // Security
  securitySchemes: SecurityScheme[];
  
  // Documentation
  apiDocumentation?: APIDocumentation;
}

/**
 * API Statistics
 */
export interface APIStatistics {
  totalEndpoints: number;
  endpointsByMethod: Record<string, number>;
  endpointsByPath: Record<string, number>;
  authenticatedEndpoints: number;
  publicEndpoints: number;
  deprecatedEndpoints: number;
  averageMiddlewareCount: number;
  uniquePaths: number;
  apiVersions: string[];
}

/**
 * Security scheme definition
 */
export interface SecurityScheme {
  id: string;
  type: AuthenticationType;
  name: string;
  description?: string;
  in?: 'header' | 'query' | 'cookie';
  scheme?: string;             // For HTTP auth
  bearerFormat?: string;       // For Bearer tokens
  flows?: OAuthFlows;          // For OAuth2
}

/**
 * OAuth flows
 */
export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

/**
 * OAuth flow
 */
export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

/**
 * API Documentation (OpenAPI/Swagger compatible)
 */
export interface APIDocumentation {
  openapi?: string;
  info?: APIInfo;
  servers?: APIServer[];
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

/**
 * API Info
 */
export interface APIInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * API Server
 */
export interface APIServer {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

/**
 * Server variable
 */
export interface ServerVariable {
  default: string;
  enum?: string[];
  description?: string;
}

/**
 * API Extraction Options
 */
export interface APIExtractionOptions {
  frameworks?: WebFramework[];      // Specific frameworks to detect
  includeMiddleware?: boolean;      // Extract middleware info
  includeParameters?: boolean;      // Extract parameter info
  includeResponses?: boolean;       // Extract response schemas
  includeAuth?: boolean;            // Detect authentication
  followRouters?: boolean;          // Follow router references
  maxDepth?: number;                // Max depth for nested routers
  excludePatterns?: string[];       // Exclude certain paths
}

/**
 * Framework detection result
 */
export interface FrameworkDetectionResult {
  framework: WebFramework;
  confidence: number;              // 0-1 confidence score
  version?: string;
  indicators: string[];            // What indicated this framework
  packageJson?: {
    name: string;
    version: string;
  };
}

/**
 * Route pattern matching result
 */
export interface RouteMatch {
  matched: boolean;
  method?: HTTPMethod;
  path?: string;
  handlerNode?: any;              // AST node
  middlewareNodes?: any[];        // Middleware AST nodes
}

/**
 * Endpoint validation issue
 */
export interface EndpointIssue {
  endpoint: string;
  method: HTTPMethod;
  severity: 'error' | 'warning' | 'info';
  type: 'missing-auth' | 'missing-validation' | 'missing-docs' | 'security' | 'performance' | 'other';
  message: string;
  recommendation?: string;
  line?: number;
}

/**
 * API Quality Metrics
 */
export interface APIQualityMetrics {
  documentationCoverage: number;   // % of endpoints with docs
  authenticationCoverage: number;  // % of endpoints with auth
  validationCoverage: number;      // % of endpoints with validation
  testCoverage: number;            // % of endpoints with tests
  consistencyScore: number;        // Naming, structure consistency
  securityScore: number;           // Overall security rating
  issues: EndpointIssue[];
}
