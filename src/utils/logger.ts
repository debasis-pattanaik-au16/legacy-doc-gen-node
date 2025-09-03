import { config } from '@/config/env';

/**
 * Custom logger utility for structured logging
 */
export class Logger {
  private static formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(meta && { meta })
    };

    return config.NODE_ENV === 'production' 
      ? JSON.stringify(logEntry)
      : `[${timestamp}] ${level.toUpperCase()}: ${message}${meta ? ` | ${JSON.stringify(meta)}` : ''}`;
  }

  public static info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  public static error(message: string, error?: Error | any): void {
    const errorMeta = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    
    console.error(this.formatMessage('error', message, errorMeta));
  }

  public static warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  public static debug(message: string, meta?: any): void {
    if (config.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = Logger;
