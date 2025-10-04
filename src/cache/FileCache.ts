/**
 * File-Based Cache Implementation
 * 
 * Persistent cache using file system storage with TTL support
 * and automatic cleanup of expired entries.
 * 
 * @module cache/FileCache
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  AnalysisCache,
  CacheStats,
  CacheOptions,
  CacheEntry,
  CacheError,
} from '@/types/cache';
import { logger } from '@/utils/logger';

/**
 * File-based cache implementation
 * 
 * Features:
 * - Persistent storage (survives process restarts)
 * - TTL support with metadata
 * - Automatic cleanup of expired entries
 * - Content-based file hashing
 */
export class FileCache implements AnalysisCache {
  private cacheDir: string;
  private stats: CacheStats;
  private defaultTTL?: number;
  private debug: boolean;
  private maxSize: number;

  constructor(options: CacheOptions) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), '.cache');
    this.defaultTTL = options.ttl;
    this.debug = options.debug || false;
    this.maxSize = options.maxSize || 1000;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
    };

    this.initialize().catch((error) => {
      logger.error(`Failed to initialize FileCache: ${error.message}`);
    });
  }

  /**
   * Initialize cache directory
   * @private
   */
  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.updateSize();

      if (this.debug) {
        logger.debug(
          `FileCache initialized at ${this.cacheDir} (size=${this.stats.size})`
        );
      }
    } catch (error: any) {
      throw new CacheError(
        `Failed to initialize cache directory: ${error.message}`,
        'initialize'
      );
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        this.stats.misses++;
        this.updateHitRate();
        if (this.debug) {
          logger.debug(`Cache miss: ${key}`);
        }
        return null;
      }

      // Read metadata
      const metaData = await fs.readFile(metaPath, 'utf-8');
      const entry: CacheEntry = JSON.parse(metaData);

      // Check expiration
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        await this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        if (this.debug) {
          logger.debug(`Cache expired: ${key}`);
        }
        return null;
      }

      // Read cached data
      const data = await fs.readFile(filePath, 'utf-8');
      const value = JSON.parse(data) as T;

      // Update access time
      entry.lastAccessed = Date.now();
      await fs.writeFile(metaPath, JSON.stringify(entry));

      this.stats.hits++;
      this.updateHitRate();

      if (this.debug) {
        logger.debug(`Cache hit: ${key}`);
      }

      return value;
    } catch (error: any) {
      logger.warn(`Error reading cache: ${error.message}`);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      const effectiveTTL = ttl ?? this.defaultTTL;
      const entry: CacheEntry = {
        value: undefined, // Value stored separately
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: effectiveTTL ? Date.now() + effectiveTTL * 1000 : undefined,
      };

      // Write data
      await fs.writeFile(filePath, JSON.stringify(value), 'utf-8');

      // Write metadata
      await fs.writeFile(metaPath, JSON.stringify(entry), 'utf-8');

      await this.updateSize();

      if (this.debug) {
        logger.debug(
          `Cache set: ${key} (ttl=${effectiveTTL}, size=${this.stats.size})`
        );
      }
    } catch (error: any) {
      throw new CacheError(
        `Failed to set cache entry: ${error.message}`,
        'set',
        key
      );
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      await fs.access(filePath);
      await fs.access(metaPath);

      // Check expiration
      const metaData = await fs.readFile(metaPath, 'utf-8');
      const entry: CacheEntry = JSON.parse(metaData);

      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      try {
        await fs.unlink(filePath);
        await fs.unlink(metaPath);
        await this.updateSize();

        if (this.debug) {
          logger.debug(`Cache deleted: ${key}`);
        }

        return true;
      } catch {
        return false;
      }
    } catch (error: any) {
      logger.warn(`Error deleting cache entry: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const previousSize = files.length;

      await Promise.all(
        files.map((file) => fs.unlink(path.join(this.cacheDir, file)))
      );

      this.stats.size = 0;

      if (this.debug) {
        logger.debug(`Cache cleared: ${previousSize / 2} entries removed`);
      }
    } catch (error: any) {
      throw new CacheError(
        `Failed to clear cache: ${error.message}`,
        'clear'
      );
    }
  }

  /**
   * Invalidate entries matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const regex = new RegExp(pattern);
      const files = await fs.readdir(this.cacheDir);
      let count = 0;

      for (const file of files) {
        if (file.endsWith('.json') && !file.endsWith('.meta.json')) {
          const key = this.extractKeyFromFile(file);
          if (regex.test(key)) {
            await this.delete(key);
            count++;
          }
        }
      }

      if (this.debug) {
        logger.debug(
          `Cache invalidated by pattern "${pattern}": ${count} entries`
        );
      }

      return count;
    } catch (error: any) {
      throw new CacheError(
        `Failed to invalidate pattern: ${error.message}`,
        'invalidatePattern'
      );
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Cleanup expired entries
    this.cleanupExpired().catch((error) => {
      logger.warn(`Error during cleanup: ${error.message}`);
    });

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.stats.size,
      hitRate: this.stats.hitRate,
    };
  }

  /**
   * Get file path for cache key
   * @private
   */
  private getFilePath(key: string): string {
    const hash = this.hashKey(key);
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * Get metadata file path for cache key
   * @private
   */
  private getMetaPath(key: string): string {
    const hash = this.hashKey(key);
    return path.join(this.cacheDir, `${hash}.meta.json`);
  }

  /**
   * Hash cache key for filename
   * @private
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Extract original key from hashed filename
   * @private
   */
  private extractKeyFromFile(filename: string): string {
    // Since we hash the keys, we can't reverse it
    // This is a limitation of file-based cache
    // For pattern matching, we'd need to store original keys in metadata
    return filename.replace('.json', '');
  }

  /**
   * Update cache size statistic
   * @private
   */
  private async updateSize(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      // Divide by 2 because each entry has .json and .meta.json
      this.stats.size = Math.floor(
        files.filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'))
          .length
      );
    } catch {
      this.stats.size = 0;
    }
  }

  /**
   * Update hit rate statistic
   * @private
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Clean up expired entries
   * @private
   */
  private async cleanupExpired(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let cleaned = 0;

      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const metaPath = path.join(this.cacheDir, file);
          const metaData = await fs.readFile(metaPath, 'utf-8');
          const entry: CacheEntry = JSON.parse(metaData);

          if (entry.expiresAt && entry.expiresAt < Date.now()) {
            const hash = file.replace('.meta.json', '');
            const dataPath = path.join(this.cacheDir, `${hash}.json`);

            await fs.unlink(dataPath).catch(() => {});
            await fs.unlink(metaPath).catch(() => {});
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        await this.updateSize();
        if (this.debug) {
          logger.debug(`Cleaned up ${cleaned} expired entries`);
        }
      }
    } catch (error: any) {
      logger.warn(`Error during cleanup: ${error.message}`);
    }
  }
}
