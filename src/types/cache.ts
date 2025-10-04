/**
 * Cache Type Definitions
 * 
 * Defines interfaces for the caching system used to store
 * parsed AST results and improve analysis performance.
 * 
 * @module types/cache
 */

/**
 * Generic cache interface for analysis results
 * 
 * Provides async operations for storing and retrieving cached data
 * with TTL support and pattern-based invalidation.
 */
export interface AnalysisCache {
  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns True if key exists and not expired
   */
  has(key: string): Promise<boolean>;

  /**
   * Delete a specific cache entry
   * @param key Cache key
   * @returns True if entry was deleted
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern Regex pattern to match keys
   * @returns Number of entries invalidated
   */
  invalidatePattern(pattern: string): Promise<number>;

  /**
   * Get cache statistics
   * @returns Current cache statistics
   */
  getStats(): CacheStats;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;

  /** Number of cache misses */
  misses: number;

  /** Current cache size (number of entries) */
  size: number;

  /** Hit rate (hits / total requests) */
  hitRate: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Time to live in seconds (default: 3600) */
  ttl?: number;

  /** Maximum cache size in entries (default: 1000) */
  maxSize?: number;

  /** Cache provider type */
  provider: 'memory' | 'file' | 'redis';

  /** Cache directory for file-based cache */
  cacheDir?: string;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Internal cache entry structure
 * @internal
 */
export interface CacheEntry<T = any> {
  /** Cached value */
  value: T;

  /** Creation timestamp */
  createdAt: number;

  /** Last access timestamp (for LRU) */
  lastAccessed: number;

  /** Expiration timestamp (undefined = no expiration) */
  expiresAt?: number;
}

/**
 * Cache error class
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly key?: string
  ) {
    super(message);
    this.name = 'CacheError';
  }
}
