/**
 * Cache Implementation Test Script
 * 
 * Tests all cache operations, TTL, LRU eviction, pattern invalidation,
 * and performance benchmarks.
 * 
 * Run: npx ts-node --project tsconfig.json -r tsconfig-paths/register src/scripts/test-cache.ts
 */

import { MemoryCache } from '@/cache/MemoryCache';
import { FileCache } from '@/cache/FileCache';
import { CacheFactory } from '@/cache/CacheFactory';
import { AnalysisCache, CacheOptions } from '@/types/cache';

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    console.log(`✓ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ name, passed: false, error: error.message, duration });
    console.log(`✗ ${name} - ${error.message} (${duration}ms)`);
  }
}

// Test Suite
async function testMemoryCacheBasicOperations(): Promise<void> {
  const cache = new MemoryCache({
    provider: 'memory',
    maxSize: 100,
    ttl: 3600,
  });

  // Test set and get
  await cache.set('key1', { data: 'value1' });
  const value1 = await cache.get<{ data: string }>('key1');
  assert(value1?.data === 'value1', 'Set and get failed');

  // Test has
  assert(await cache.has('key1'), 'Has failed for existing key');
  assert(!(await cache.has('nonexistent')), 'Has failed for non-existent key');

  // Test delete
  assert(await cache.delete('key1'), 'Delete failed');
  assert(!(await cache.has('key1')), 'Key still exists after delete');

  // Test clear
  await cache.set('key2', 'value2');
  await cache.set('key3', 'value3');
  await cache.clear();
  assert(!(await cache.has('key2')), 'Key exists after clear');
  assert(!(await cache.has('key3')), 'Key exists after clear');
}

async function testMemoryCacheTTL(): Promise<void> {
  const cache = new MemoryCache({
    provider: 'memory',
    maxSize: 100,
    ttl: 1, // 1 second
  });

  await cache.set('ttl-key', 'ttl-value');
  assert(await cache.has('ttl-key'), 'Key not found immediately after set');

  // Wait for TTL to expire
  await sleep(1100);

  const value = await cache.get('ttl-key');
  assert(value === null, 'Key still exists after TTL expiration');
}

async function testMemoryCacheLRUEviction(): Promise<void> {
  const cache = new MemoryCache({
    provider: 'memory',
    maxSize: 3,
  });

  await cache.set('key1', 'value1');
  await sleep(10);
  await cache.set('key2', 'value2');
  await sleep(10);
  await cache.set('key3', 'value3');

  // Access key1 to make it more recently used
  await cache.get('key1');

  // Add key4, should evict key2 (least recently used)
  await cache.set('key4', 'value4');

  assert(await cache.has('key1'), 'key1 should exist');
  assert(!(await cache.has('key2')), 'key2 should be evicted');
  assert(await cache.has('key3'), 'key3 should exist');
  assert(await cache.has('key4'), 'key4 should exist');
}

async function testMemoryCachePatternInvalidation(): Promise<void> {
  const cache = new MemoryCache({
    provider: 'memory',
    maxSize: 100,
  });

  await cache.set('user:1:profile', { name: 'Alice' });
  await cache.set('user:2:profile', { name: 'Bob' });
  await cache.set('user:1:settings', { theme: 'dark' });
  await cache.set('post:1', { title: 'Post 1' });

  // Invalidate all user:1 keys
  const count = await cache.invalidatePattern('^user:1:');
  assert(count === 2, `Expected 2 invalidations, got ${count}`);

  assert(!(await cache.has('user:1:profile')), 'user:1:profile should be invalidated');
  assert(!(await cache.has('user:1:settings')), 'user:1:settings should be invalidated');
  assert(await cache.has('user:2:profile'), 'user:2:profile should exist');
  assert(await cache.has('post:1'), 'post:1 should exist');
}

async function testMemoryCacheStatistics(): Promise<void> {
  const cache = new MemoryCache({
    provider: 'memory',
    maxSize: 100,
  });

  await cache.set('key1', 'value1');
  await cache.set('key2', 'value2');

  // Generate hits and misses
  await cache.get('key1'); // Hit
  await cache.get('key2'); // Hit
  await cache.get('key3'); // Miss

  const stats = cache.getStats();
  assert(stats.hits === 2, `Expected 2 hits, got ${stats.hits}`);
  assert(stats.misses === 1, `Expected 1 miss, got ${stats.misses}`);
  assert(stats.size === 2, `Expected size 2, got ${stats.size}`);
  assert(
    Math.abs(stats.hitRate - 0.666) < 0.01,
    `Expected hit rate ~0.666, got ${stats.hitRate}`
  );
}

async function testFileCacheBasicOperations(): Promise<void> {
  const cache = new FileCache({
    provider: 'file',
    cacheDir: './.test-cache',
    maxSize: 100,
    ttl: 3600,
  });

  await cache.clear(); // Clean up before test

  // Test set and get
  await cache.set('file-key1', { data: 'file-value1' });
  const value1 = await cache.get<{ data: string }>('file-key1');
  assert(value1?.data === 'file-value1', 'File cache set and get failed');

  // Test has
  assert(await cache.has('file-key1'), 'File cache has failed');

  // Test delete
  assert(await cache.delete('file-key1'), 'File cache delete failed');
  assert(!(await cache.has('file-key1')), 'File still exists after delete');

  await cache.clear(); // Clean up after test
}

async function testFileCachePersistence(): Promise<void> {
  const cacheDir = './.test-cache-persist';

  // Create first cache instance
  const cache1 = new FileCache({
    provider: 'file',
    cacheDir,
    maxSize: 100,
  });

  await sleep(100); // Wait for initialization
  await cache1.clear(); // Clean up
  await cache1.set('persist-key', { data: 'persist-value' });

  // Create second cache instance (simulating restart)
  const cache2 = new FileCache({
    provider: 'file',
    cacheDir,
    maxSize: 100,
  });

  const value = await cache2.get<{ data: string }>('persist-key');
  assert(value?.data === 'persist-value', 'File cache persistence failed');

  await cache2.clear(); // Clean up after test
}

async function testFileCacheTTL(): Promise<void> {
  const cache = new FileCache({
    provider: 'file',
    cacheDir: './.test-cache-ttl',
    maxSize: 100,
    ttl: 1, // 1 second
  });

  await sleep(100); // Wait for initialization
  await cache.clear();
  await cache.set('ttl-file-key', 'ttl-file-value');
  assert(await cache.has('ttl-file-key'), 'File cache key not found');

  // Wait for TTL to expire
  await sleep(1100);

  const value = await cache.get('ttl-file-key');
  assert(value === null, 'File cache key still exists after TTL');

  await cache.clear();
}

async function testCacheFactory(): Promise<void> {
  // Test memory cache creation
  const memCache = CacheFactory.create({
    provider: 'memory',
    maxSize: 100,
    ttl: 3600,
  });

  await memCache.set('factory-key', 'factory-value');
  const value = await memCache.get('factory-key');
  assert(value === 'factory-value', 'Factory memory cache failed');

  // Test singleton behavior
  const memCache2 = CacheFactory.create({
    provider: 'memory',
    maxSize: 100,
    ttl: 3600,
  });

  const value2 = await memCache2.get('factory-key');
  assert(value2 === 'factory-value', 'Factory singleton failed');

  // Test file cache creation
  const fileCache = CacheFactory.create({
    provider: 'file',
    cacheDir: './.test-factory-cache',
    maxSize: 100,
    ttl: 3600,
  });

  await fileCache.set('factory-file-key', 'factory-file-value');
  const fileValue = await fileCache.get('factory-file-key');
  assert(fileValue === 'factory-file-value', 'Factory file cache failed');

  await fileCache.clear();
}

async function testCachePerformance(): Promise<void> {
  const cache = new MemoryCache({
    provider: 'memory',
    maxSize: 10000,
  });

  const iterations = 1000;
  const startTime = Date.now();

  // Write performance
  for (let i = 0; i < iterations; i++) {
    await cache.set(`perf-key-${i}`, { index: i, data: `value-${i}` });
  }

  const writeTime = Date.now() - startTime;
  console.log(`  Write performance: ${iterations} items in ${writeTime}ms (${(iterations / writeTime * 1000).toFixed(0)} ops/sec)`);

  // Read performance
  const readStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    await cache.get(`perf-key-${i}`);
  }

  const readTime = Date.now() - readStart;
  console.log(`  Read performance: ${iterations} items in ${readTime}ms (${(iterations / readTime * 1000).toFixed(0)} ops/sec)`);

  const stats = cache.getStats();
  assert(stats.hits === iterations, `Expected ${iterations} hits, got ${stats.hits}`);

  await cache.clear();
}

async function testCacheWithComplexData(): Promise<void> {
  const cache = new MemoryCache({
    provider: 'memory',
    maxSize: 100,
  });

  const complexData = {
    id: 1,
    name: 'Test User',
    nested: {
      level1: {
        level2: {
          data: 'deep nested value',
        },
      },
    },
    array: [1, 2, 3, { nested: 'array object' }],
    date: new Date().toISOString(),
  };

  await cache.set('complex-key', complexData);
  const retrieved = await cache.get<typeof complexData>('complex-key');

  assert(retrieved?.id === 1, 'Complex data id mismatch');
  assert(retrieved?.name === 'Test User', 'Complex data name mismatch');
  assert(
    retrieved?.nested.level1.level2.data === 'deep nested value',
    'Complex data nested value mismatch'
  );
  assert(retrieved?.array.length === 4, 'Complex data array length mismatch');
}

// Run all tests
async function main(): Promise<void> {
  console.log('\n=== Cache Implementation Test Suite ===\n');

  console.log('MemoryCache Tests:');
  await runTest('Memory Cache - Basic Operations', testMemoryCacheBasicOperations);
  await runTest('Memory Cache - TTL Expiration', testMemoryCacheTTL);
  await runTest('Memory Cache - LRU Eviction', testMemoryCacheLRUEviction);
  await runTest('Memory Cache - Pattern Invalidation', testMemoryCachePatternInvalidation);
  await runTest('Memory Cache - Statistics', testMemoryCacheStatistics);
  await runTest('Memory Cache - Complex Data', testCacheWithComplexData);

  console.log('\nFileCache Tests:');
  await runTest('File Cache - Basic Operations', testFileCacheBasicOperations);
  await runTest('File Cache - Persistence', testFileCachePersistence);
  await runTest('File Cache - TTL Expiration', testFileCacheTTL);

  console.log('\nCacheFactory Tests:');
  await runTest('Cache Factory - Creation & Singleton', testCacheFactory);

  console.log('\nPerformance Tests:');
  await runTest('Cache Performance Benchmark', testCachePerformance);

  // Summary
  console.log('\n=== Test Summary ===\n');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const successRate = ((passed / total) * 100).toFixed(2);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${successRate}%`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log('\n=== Test Complete ===\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
