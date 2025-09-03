import App from './app';
import { logger } from '@/utils/logger';

/**
 * Server entry point
 */
async function startServer(): Promise<void> {
  try {
    const app = new App();
    await app.start();
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer();
