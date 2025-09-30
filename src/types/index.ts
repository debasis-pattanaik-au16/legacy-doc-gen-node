import { Request } from 'express';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
  lastLogin: Date;
  subscriptionPlan: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
}

// User Model with static methods
export interface IUserModel extends mongoose.Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByResetToken(token: string): Promise<IUser | null>;
  findByVerificationToken(token: string): Promise<IUser | null>;
}

// Project Types
export interface ITeamMember {
  user: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: ('read' | 'write' | 'admin')[];
  addedAt: Date;
}

export interface IProject extends Document {
  _id: string;
  name: string;
  description?: string;
  type: 'web' | 'mobile' | 'desktop' | 'api' | 'library' | 'other';
  ownerId: string;
  teamMembers: ITeamMember[];
  status: 'created' | 'uploading' | 'uploaded' | 'analyzing' | 'analyzed' | 'generating' | 'completed' | 'failed';
  progress: {
    uploadProgress: number;
    analysisProgress: number;
    documentationProgress: number;
  };
  codebaseMetadata: {
    fileCount: number;
    languages: string[];
    totalLines: number;
    complexity: number;
  };
  uploadMetadata?: {
    originalFileName?: string;
    fileSize?: number;
    uploadPath?: string;
    extractedPath?: string;
    uploadProgress: number;
    analysisProgress: number;
  };
  analysisResults?: any;
  errorDetails?: {
    message: string;
    code: string;
    timestamp: Date;
    stack?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Analysis Types
export interface Component {
  name: string;
  type: 'function' | 'class' | 'module' | 'component';
  filePath: string;
  startLine: number;
  endLine: number;
  description?: string;
  parameters?: Parameter[];
  returnType?: string;
  dependencies: string[];
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface Dependency {
  from: string;
  to: string;
  type: 'import' | 'require' | 'call' | 'inheritance';
  filePath: string;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  filePath: string;
  handler: string;
  parameters?: Parameter[];
  responses?: ApiResponseSchema[];
}

export interface ApiResponseSchema {
  statusCode: number;
  description: string;
  schema?: any;
}

export interface DatabaseSchema {
  name: string;
  type: 'table' | 'collection';
  fields: DatabaseField[];
  relationships: DatabaseRelationship[];
}

export interface DatabaseField {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  index?: boolean;
}

export interface DatabaseRelationship {
  type: 'oneToOne' | 'oneToMany' | 'manyToMany';
  target: string;
  foreignKey?: string;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  technicalDebt: number;
}

export interface IAnalysisResult extends Document {
  _id: string;
  projectId: mongoose.Types.ObjectId;
  components: Component[];
  dependencies: Dependency[];
  apiEndpoints: ApiEndpoint[];
  databaseSchemas: DatabaseSchema[];
  architecturePatterns: string[];
  complexityMetrics: ComplexityMetrics;
  generatedAt: Date;
}

// Documentation Types
export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'diagram' | 'code';
  order: number;
}

export interface Diagram {
  id: string;
  title: string;
  type: 'architecture' | 'database' | 'flow' | 'sequence';
  mermaidCode: string;
  description?: string;
}

export interface IDocumentation extends Document {
  _id: string;
  projectId: string;
  sections: DocumentSection[];
  diagrams: Diagram[];
  version: number;
  lastEditedBy: string;
  lastEditedAt: Date;
  isPublished: boolean;
  publishedAt?: Date;
  exportFormats: string[];
}

// Documentation Job Types
export interface IDocumentationJob extends Document {
  _id: string;
  projectId: mongoose.Types.ObjectId;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  sections: string[];
  generatedFiles: {
    readme?: string;
    apiDocs?: string;
    architecture?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  errorDetails?: {
    step: string;
    message: string;
    stack?: string;
    timestamp: Date;
  };
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  updateProgress(progress: number, step: string): Promise<IDocumentationJob>;
  markCompleted(files: { readme?: string; apiDocs?: string; architecture?: string }): Promise<IDocumentationJob>;
  markFailed(error: string, step?: string, stack?: string): Promise<IDocumentationJob>;
  getExecutionTime(): number;
}

// Express Request Extensions
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// API Response Types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// File Upload Types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Environment Variables
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRE: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  OPENAI_MAX_TOKENS: number;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  GEMINI_MAX_TOKENS: number;
  AI_SERVICE_PROVIDER: string;
  AI_SERVICE_FALLBACK: boolean;
  MAX_FILE_SIZE: number;
  UPLOAD_PATH: string;
  TEMP_PATH: string;
  STORAGE_PATH: string;
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  CORS_ORIGIN: string;
  CORS_CREDENTIALS: boolean;
  SENDGRID_API_KEY: string;
  SENDGRID_FROM_EMAIL: string;
  SENDGRID_FROM_NAME: string;
  FRONTEND_URL: string;
  
  // Cloud Storage Configuration
  STORAGE_PROVIDER: string;
  
  // Oracle Cloud Object Storage
  OCI_NAMESPACE: string;
  OCI_BUCKET_NAME: string;
  OCI_REGION: string;
  OCI_TENANCY_ID: string;
  OCI_USER_ID: string;
  OCI_FINGERPRINT: string;
  OCI_PRIVATE_KEY_PATH: string;
  OCI_PUBLIC_URL_EXPIRY: number;
  
  // AWS S3
  AWS_S3_BUCKET: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_URL_EXPIRY: number;
  
  // Azure Blob Storage
  AZURE_STORAGE_ACCOUNT: string;
  AZURE_STORAGE_KEY: string;
  AZURE_CONTAINER_NAME: string;
  AZURE_URL_EXPIRY: number;
  
  // Google Cloud Storage
  GCP_PROJECT_ID: string;
  GCP_BUCKET_NAME: string;
  GCP_KEY_FILE_PATH: string;
  GCP_URL_EXPIRY: number;
}
