/**
 * Cache Factory
 * 
 * Factory for creating cache instances based on configuration.
 * Implements singleton pattern per provider type.
 * 
 * @module cache/CacheFactory
 */

import { AnalysisCache, CacheOptions, CacheError } from '@/types/cache';
import { AnalysisConfiguration } from '@/types/config';
import { MemoryCache } from './MemoryCache';
import { FileCache } from './FileCache';
import { logger } from '@/utils/logger';

/**
 * Factory for creating cache instances
 * 
 * Provides:
 * - Configuration-based cache creation
 * - Singleton pattern per provider type
 * - Support for multiple cache providers
 */
export class CacheFactory {
  private static instances: Map<string, AnalysisCache> = new Map();

  /**
   * Create a cache instance based on options
   * 
   * @param options Cache configuration options
   * @returns Cache instance
   */
  static create(options: CacheOptions): AnalysisCache {
    const key = this.getCacheKey(options);

    // Return existing instance if available
    if (this.instances.has(key)) {
      logger.debug(`Reusing existing cache instance: ${key}`);
      return this.instances.get(key)!;
    }

    // Create new instance based on provider
    let cache: AnalysisCache;

    switch (options.provider) {
      case 'memory':
        cache = new MemoryCache(options);
        logger.info(
          `Created MemoryCache (maxSize=${options.maxSize}, ttl=${options.ttl})`
        );
        break;

      case 'file':
        cache = new FileCache(options);
        logger.info(
          `Created FileCache (cacheDir=${options.cacheDir}, ttl=${options.ttl})`
        );
        break;

      case 'redis':
        // Future implementation
        throw new CacheError(
          'Redis cache provider not yet implemented',
          'create'
        );

      default:
        throw new CacheError(
          `Unknown cache provider: ${options.provider}`,
          'create'
        );
    }

    // Store instance for reuse
    this.instances.set(key, cache);

    return cache;
  }

  /**
   * Create cache from analysis configuration
   * 
   * @param config Analysis configuration
   * @returns Cache instance
   */
  static fromConfig(config: AnalysisConfiguration): AnalysisCache {
    const options: CacheOptions = {
      provider: config.performance.caching.provider,
      ttl: config.performance.caching.ttl,
      maxSize: config.performance.caching.maxSize,
      cacheDir: config.performance.caching.cacheDir,
      debug: config.output.verbosity === 'debug',
    };

    return this.create(options);
  }

  /**
   * Get or create the default cache instance
   * 
   * Uses memory cache with default settings if no config provided
   * 
   * @returns Default cache instance
   */
  static getDefault(): AnalysisCache {
    const key = 'default-memory';

    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    const cache = new MemoryCache({
      provider: 'memory',
      maxSize: 1000,
      ttl: 3600,
      debug: false,
    });

    this.instances.set(key, cache);
    logger.info('Created default MemoryCache');

    return cache;
  }

  /**
   * Clear all cached instances
   * 
   * Useful for testing or when configuration changes
   */
  static async clearAll(): Promise<void> {
    logger.info(`Clearing ${this.instances.size} cache instances`);

    for (const [key, cache] of this.instances.entries()) {
      try {
        await cache.clear();
        logger.debug(`Cleared cache instance: ${key}`);
      } catch (error: any) {
        logger.warn(`Failed to clear cache ${key}: ${error.message}`);
      }
    }

    this.instances.clear();
  }

  /**
   * Remove a specific cache instance
   * 
   * @param options Cache options identifying the instance
   */
  static async remove(options: CacheOptions): Promise<boolean> {
    const key = this.getCacheKey(options);

    if (this.instances.has(key)) {
      const cache = this.instances.get(key)!;
      await cache.clear();
      this.instances.delete(key);
      logger.debug(`Removed cache instance: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * Get cache statistics for all instances
   * 
   * @returns Map of cache keys to statistics
   */
  static getAllStats(): Map<string, any> {
    const stats = new Map();

    for (const [key, cache] of this.instances.entries()) {
      stats.set(key, cache.getStats());
    }

    return stats;
  }

  /**
   * Generate cache key for instance lookup
   * 
   * @private
   * @param options Cache options
   * @returns Unique cache key
   */
  private static getCacheKey(options: CacheOptions): string {
    const parts = [
      options.provider,
      options.maxSize || 'default',
      options.ttl || 'default',
    ];

    if (options.provider === 'file' && options.cacheDir) {
      parts.push(options.cacheDir);
    }

    return parts.join('-');
  }
}

/**
 * Convenience function to create cache from config
 * 
 * @param config Analysis configuration
 * @returns Cache instance
 */
export function createCache(config: AnalysisConfiguration): AnalysisCache {
  return CacheFactory.fromConfig(config);
}

/**
 * Convenience function to get default cache
 * 
 * @returns Default cache instance
 */
export function getDefaultCache(): AnalysisCache {
  return CacheFactory.getDefault();
}
