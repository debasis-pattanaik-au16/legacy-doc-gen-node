/**
 * Dependency Analyzer Cache Integration Test
 * 
 * Demonstrates the caching system integrated into DependencyAnalyzer
 * Shows performance improvements from caching parsed AST results.
 * 
 * Run: npx ts-node --project tsconfig.json -r tsconfig-paths/register src/scripts/test-dependency-analyzer-cache.ts
 */

import { DependencyAnalyzer } from '@/services/dependencyAnalyzer';
import { ConfigLoader } from '@/config/ConfigLoader';
import * as path from 'path';

async function main() {
  console.log('\n=== DependencyAnalyzer Cache Integration Test ===\n');

  // Load configuration
  const config = await ConfigLoader.getInstance().load();
  console.log(`✓ Configuration loaded (caching: ${config.performance.caching.enabled})`);

  // Create analyzer instance
  const analyzer = new DependencyAnalyzer(config);
  console.log('✓ DependencyAnalyzer initialized\n');

  // Define test path (using current project as example)
  const testPath = path.join(process.cwd(), 'src/cache');
  
  console.log(`Analyzing: ${testPath}\n`);

  let duration1 = 0;

  // First run - should populate cache
  console.log('--- First Run (Cold Cache) ---');
  const startTime1 = Date.now();
  
  try {
    const result1 = await analyzer.analyzeDependencies(testPath);
    duration1 = Date.now() - startTime1;
    
    console.log(`✓ Analysis completed in ${duration1}ms`);
    console.log(`  Files analyzed: ${result1.graph.nodes.length}`);
    console.log(`  Dependencies found: ${result1.graph.edges.length}`);
    
    // Get cache stats after first run
    const stats1 = analyzer.getCacheStats();
    console.log(`  Cache stats - Hits: ${stats1.hits}, Misses: ${stats1.misses}, Size: ${stats1.size}`);
    console.log(`  Hit rate: ${(stats1.hitRate * 100).toFixed(2)}%`);
  } catch (error: any) {
    console.log(`✗ Analysis failed: ${error.message}`);
  }

  console.log('\n--- Second Run (Warm Cache) ---');
  const startTime2 = Date.now();
  
  try {
    const result2 = await analyzer.analyzeDependencies(testPath);
    const duration2 = Date.now() - startTime2;
    
    console.log(`✓ Analysis completed in ${duration2}ms`);
    console.log(`  Files analyzed: ${result2.graph.nodes.length}`);
    console.log(`  Dependencies found: ${result2.graph.edges.length}`);
    
    // Get cache stats after second run
    const stats2 = analyzer.getCacheStats();
    console.log(`  Cache stats - Hits: ${stats2.hits}, Misses: ${stats2.misses}, Size: ${stats2.size}`);
    console.log(`  Hit rate: ${(stats2.hitRate * 100).toFixed(2)}%`);
    
    // Calculate performance improvement
    if (duration1 > 0) {
      const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(2);
      const speedup = (duration1 / duration2).toFixed(2);
      console.log(`\n📊 Performance Improvement:`);
      console.log(`  Time saved: ${duration1 - duration2}ms (${improvement}%)`);
      console.log(`  Speedup: ${speedup}x faster`);
    }
  } catch (error: any) {
    console.log(`✗ Analysis failed: ${error.message}`);
  }

  // Test cache clearing
  console.log('\n--- Testing Cache Clear ---');
  await analyzer.clearCache();
  const stats3 = analyzer.getCacheStats();
  console.log(`✓ Cache cleared`);
  console.log(`  Cache size after clear: ${stats3.size}`);

  // Third run after clearing - should be slower again
  console.log('\n--- Third Run (After Cache Clear) ---');
  const startTime3 = Date.now();
  
  try {
    const result3 = await analyzer.analyzeDependencies(testPath);
    const duration3 = Date.now() - startTime3;
    
    console.log(`✓ Analysis completed in ${duration3}ms`);
    
    const stats4 = analyzer.getCacheStats();
    console.log(`  Cache stats - Hits: ${stats4.hits}, Misses: ${stats4.misses}, Size: ${stats4.size}`);
    console.log(`  Hit rate: ${(stats4.hitRate * 100).toFixed(2)}%`);
  } catch (error: any) {
    console.log(`✗ Analysis failed: ${error.message}`);
  }

  console.log('\n--- Test with Caching Disabled ---');
  
  // Create analyzer with caching disabled
  const configNoCaching = {
    ...config,
    performance: {
      ...config.performance,
      caching: {
        ...config.performance.caching,
        enabled: false,
      },
    },
  };
  
  const analyzerNoCache = new DependencyAnalyzer(configNoCaching);
  const startTimeNoCache = Date.now();
  
  try {
    const resultNoCache = await analyzerNoCache.analyzeDependencies(testPath);
    const durationNoCache = Date.now() - startTimeNoCache;
    
    console.log(`✓ Analysis completed in ${durationNoCache}ms (without caching)`);
    
    const statsNoCache = analyzerNoCache.getCacheStats();
    console.log(`  Cache stats - Hits: ${statsNoCache.hits}, Misses: ${statsNoCache.misses}`);
    console.log(`  (Cache is disabled - no-op cache used)`);
  } catch (error: any) {
    console.log(`✗ Analysis failed: ${error.message}`);
  }

  console.log('\n=== Test Complete ===\n');
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
