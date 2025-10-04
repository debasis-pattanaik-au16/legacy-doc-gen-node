/**
 * Memory Cache Implementation
 * 
 * Fast in-memory cache using Map with LRU eviction,
 * TTL support, and statistics tracking.
 * 
 * @module cache/MemoryCache
 */

import {
  AnalysisCache,
  CacheStats,
  CacheOptions,
  CacheEntry,
  CacheError,
} from '@/types/cache';
import { logger } from '@/utils/logger';

/**
 * In-memory cache implementation
 * 
 * Features:
 * - Map-based storage for O(1) access
 * - LRU eviction when max size reached
 * - TTL support with automatic expiration
 * - Statistics tracking
 */
export class MemoryCache implements AnalysisCache {
  private cache: Map<string, CacheEntry>;
  private stats: CacheStats;
  private maxSize: number;
  private defaultTTL?: number;
  private debug: boolean;

  constructor(options: CacheOptions) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl;
    this.debug = options.debug || false;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
    };

    if (this.debug) {
      logger.debug(
        `MemoryCache initialized with maxSize=${this.maxSize}, ttl=${this.defaultTTL}`
      );
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      if (this.debug) {
        logger.debug(`Cache miss: ${key}`);
      }
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      this.updateHitRate();
      if (this.debug) {
        logger.debug(`Cache expired: ${key}`);
      }
      return null;
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    if (this.debug) {
      logger.debug(`Cache hit: ${key}`);
    }

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      // Evict LRU entry if at max size and key doesn't exist
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }

      const effectiveTTL = ttl ?? this.defaultTTL;
      const expiresAt = effectiveTTL
        ? Date.now() + effectiveTTL * 1000
        : undefined;

      this.cache.set(key, {
        value,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        expiresAt,
      });

      this.stats.size = this.cache.size;

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
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
      if (this.debug) {
        logger.debug(`Cache deleted: ${key}`);
      }
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;

    if (this.debug) {
      logger.debug(`Cache cleared: ${previousSize} entries removed`);
    }
  }

  /**
   * Invalidate entries matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const regex = new RegExp(pattern);
      let count = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          count++;
        }
      }

      this.stats.size = this.cache.size;

      if (this.debug) {
        logger.debug(
          `Cache invalidated by pattern "${pattern}": ${count} entries`
        );
      }

      return count;
    } catch (error: any) {
      throw new CacheError(
        `Invalid regex pattern: ${error.message}`,
        'invalidatePattern'
      );
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Clean up expired entries before returning stats
    this.cleanupExpired();

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hitRate,
    };
  }

  /**
   * Evict least recently used entry
   * @private
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.debug) {
        logger.debug(`LRU evicted: ${oldestKey}`);
      }
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
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size = this.cache.size;
      if (this.debug) {
        logger.debug(`Cleaned up ${cleaned} expired entries`);
      }
    }
  }
}
