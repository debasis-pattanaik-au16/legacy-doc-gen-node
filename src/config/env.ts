import dotenv from 'dotenv';
import { EnvConfig } from '@/types';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration with validation and type safety
 */
class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private _config: EnvConfig;

  private constructor() {
    this._config = this.validateAndParseConfig();
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private validateAndParseConfig(): EnvConfig {
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    // Check for required environment variables
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: parseInt(process.env.PORT || '5000', 10),
      API_VERSION: process.env.API_VERSION || 'v1',
      
      // Database
      MONGODB_URI: process.env.MONGODB_URI!,
      
      // JWT Configuration
      JWT_SECRET: process.env.JWT_SECRET!,
      JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
      JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
      
      // OpenAI Configuration
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4',
      OPENAI_MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
      
      // Gemini Configuration
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      GEMINI_MAX_TOKENS: parseInt(process.env.GEMINI_MAX_TOKENS || '4000', 10),
      
      // AI Service Configuration
      AI_SERVICE_PROVIDER: process.env.AI_SERVICE_PROVIDER || 'openai', // 'openai' | 'gemini' | 'both'
      AI_SERVICE_FALLBACK: process.env.AI_SERVICE_FALLBACK === 'true',
      
      // File Upload Configuration
      MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '524288000', 10), // 500MB
      UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
      TEMP_PATH: process.env.TEMP_PATH || './temp',
      STORAGE_PATH: process.env.STORAGE_PATH || './storage',
      
      // Security Configuration
      BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
      RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      
      // CORS Configuration
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
      CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
      
      // SendGrid Configuration
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@legacydocgenerator.com',
      SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'Legacy Doc Generator',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
      
      // Cloud Storage Configuration
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local', // 'local' | 'oracle_cloud' | 'aws_s3' | 'azure_blob' | 'gcp'
      
      // Oracle Cloud Object Storage
      OCI_NAMESPACE: process.env.OCI_NAMESPACE || '',
      OCI_BUCKET_NAME: process.env.OCI_BUCKET_NAME || '',
      OCI_REGION: process.env.OCI_REGION || '',
      OCI_TENANCY_ID: process.env.OCI_TENANCY_ID || '',
      OCI_USER_ID: process.env.OCI_USER_ID || '',
      OCI_FINGERPRINT: process.env.OCI_FINGERPRINT || '',
      OCI_PRIVATE_KEY_PATH: process.env.OCI_PRIVATE_KEY_PATH || '',
      OCI_PUBLIC_URL_EXPIRY: parseInt(process.env.OCI_PUBLIC_URL_EXPIRY || '3600', 10),
      
      // AWS S3
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || '',
      AWS_REGION: process.env.AWS_REGION || '',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
      AWS_URL_EXPIRY: parseInt(process.env.AWS_URL_EXPIRY || '3600', 10),
      
      // Azure Blob Storage
      AZURE_STORAGE_ACCOUNT: process.env.AZURE_STORAGE_ACCOUNT || '',
      AZURE_STORAGE_KEY: process.env.AZURE_STORAGE_KEY || '',
      AZURE_CONTAINER_NAME: process.env.AZURE_CONTAINER_NAME || '',
      AZURE_URL_EXPIRY: parseInt(process.env.AZURE_URL_EXPIRY || '3600', 10),
      
      // Google Cloud Storage
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || '',
      GCP_BUCKET_NAME: process.env.GCP_BUCKET_NAME || '',
      GCP_KEY_FILE_PATH: process.env.GCP_KEY_FILE_PATH || '',
      GCP_URL_EXPIRY: parseInt(process.env.GCP_URL_EXPIRY || '3600', 10)
    };
  }

  public get config(): EnvConfig {
    return this._config;
  }

  public isDevelopment(): boolean {
    return this._config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this._config.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return this._config.NODE_ENV === 'test';
  }
}

export const config = EnvironmentConfig.getInstance().config;
export const envConfig = EnvironmentConfig.getInstance();
