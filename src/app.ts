import express, { Application, Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from '@/config/env';
import { database } from '@/config/database';
import { logger } from '@/utils/logger';
import { ResponseHandler } from '@/utils/response';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { 
  corsOptions, 
  rateLimitConfig, 
  helmetConfig, 
  compressionConfig 
} from '@/middleware/security';

/**
 * Express application setup and configuration
 */
export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmetConfig);
    this.app.use(cors(corsOptions));
    this.app.use(rateLimitConfig);
    this.app.use(compressionConfig);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    if (config.NODE_ENV !== 'test') {
      const morganFormat = config.NODE_ENV === 'production' 
        ? 'combined' 
        : 'dev';
      this.app.use(morgan(morganFormat));
    }

    // Request ID middleware for tracing
    this.app.use((req: Request, res: Response, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        Math.random().toString(36).substring(2, 15);
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      ResponseHandler.success(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.NODE_ENV
      }, 'Service is healthy');
    });

    // Database health check
    this.app.get('/health/db', async (req: Request, res: Response) => {
      try {
        const dbHealth = await database.healthCheck();
        
        if (dbHealth.status === 'healthy') {
          ResponseHandler.success(res, dbHealth, 'Database is healthy');
        } else {
          ResponseHandler.error(res, dbHealth.message, 503, 'DATABASE_UNHEALTHY');
        }
      } catch (error) {
        ResponseHandler.internalError(res, 'Database health check failed', error as Error);
      }
    });

    // API routes will be added here
    // this.app.use(`/api/${config.API_VERSION}/auth`, authRoutes);
    // this.app.use(`/api/${config.API_VERSION}/projects`, projectRoutes);
    // this.app.use(`/api/${config.API_VERSION}/analysis`, analysisRoutes);
    // this.app.use(`/api/${config.API_VERSION}/documentation`, documentationRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      ResponseHandler.success(res, {
        name: 'Legacy Documentation Generator API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'AI-powered platform for analyzing legacy codebases and generating documentation',
        endpoints: {
          health: '/health',
          database: '/health/db',
          api: `/api/${config.API_VERSION}`
        }
      }, 'Welcome to Legacy Documentation Generator API');
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to database
      await database.connect();

      // Start server
      this.app.listen(config.PORT, () => {
        logger.info(`🚀 Server started successfully`, {
          port: config.PORT,
          environment: config.NODE_ENV,
          apiVersion: config.API_VERSION
        });
      });

    } catch (error) {
      logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down server gracefully...');
      
      // Close database connection
      await database.disconnect();
      
      logger.info('Server shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const app = new App();
  await app.shutdown();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  const app = new App();
  await app.shutdown();
});

export default App;
