/**
 * Test Script: AnalysisResultTransformer Integration
 * 
 * This script tests the complete integration of:
 * 1. DependencyAnalyzer - Analyze a codebase
 * 2. AnalysisResultTransformer - Transform results to database format
 * 3. Database persistence - Save to MongoDB
 * 
 * Usage:
 *   npm run ts-node scripts/test-transformer-integration.ts <project-path>
 * 
 * Example:
 *   npm run ts-node scripts/test-transformer-integration.ts ./test-project
 */

import path from 'path';
import mongoose from 'mongoose';
import { DependencyAnalyzer } from '../src/services/dependencyAnalyzer';
import { AnalysisResultTransformer } from '../src/services/transformers/AnalysisResultTransformer';
import { AnalysisResult } from '../src/models/AnalysisResult';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/legacy-doc-generator';

/**
 * Test the transformer integration
 */
async function testTransformerIntegration() {
  const testProjectPath = process.argv[2] || path.join(__dirname, '../src');
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing AnalysisResultTransformer Integration');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 2: Run dependency analysis
    console.log('📊 Step 1: Running Dependency Analysis');
    console.log('-'.repeat(80));
    console.log(`Project path: ${testProjectPath}\n`);

    const analyzer = new DependencyAnalyzer();
    const startTime = Date.now();
    
    const analysisResult = await analyzer.analyzeDependencies(testProjectPath);
    
    const analysisTime = Date.now() - startTime;
    console.log(`✅ Analysis completed in ${analysisTime}ms\n`);

    // Display analysis results summary
    console.log('📈 Analysis Results Summary:');
    console.log(`  - Graph Nodes: ${analysisResult.graph.nodes.length}`);
    console.log(`  - Graph Edges: ${analysisResult.graph.edges.length}`);
    console.log(`  - Relationships: ${analysisResult.relationships.length}`);
    console.log(`  - Insights: ${analysisResult.insights.length}`);
    console.log(`  - Recommendations: ${analysisResult.recommendations.length}`);
    console.log(`  - Circular Dependencies: ${analysisResult.metrics.circularDependencies}`);
    console.log(`  - External Libraries: ${analysisResult.graph.externalLibraries?.length || 0}\n`);

    // Display metrics
    console.log('📊 Dependency Metrics:');
    console.log(`  - Coupling Index: ${analysisResult.metrics.couplingIndex.toFixed(2)}`);
    console.log(`  - Cohesion Index: ${analysisResult.metrics.cohesionIndex.toFixed(2)}`);
    console.log(`  - Instability Index: ${analysisResult.metrics.instabilityIndex.toFixed(2)}`);
    console.log(`  - Abstractness Index: ${analysisResult.metrics.abstractnessIndex.toFixed(2)}\n`);

    // Display insights breakdown
    if (analysisResult.insights.length > 0) {
      console.log('💡 Insights Breakdown:');
      const insightsByImpact = groupBy(analysisResult.insights, 'impact');
      Object.entries(insightsByImpact).forEach(([impact, items]) => {
        console.log(`  - ${impact}: ${items.length}`);
      });
      
      const insightsByCategory = groupBy(analysisResult.insights, 'category');
      console.log('\n  By Category:');
      Object.entries(insightsByCategory).forEach(([category, items]) => {
        console.log(`  - ${category}: ${items.length}`);
      });
      console.log('');
    }

    // Display recommendations breakdown
    if (analysisResult.recommendations.length > 0) {
      console.log('🎯 Recommendations Breakdown:');
      const recsByPriority = groupBy(analysisResult.recommendations, 'priority');
      Object.entries(recsByPriority).forEach(([priority, items]) => {
        console.log(`  - ${priority}: ${items.length}`);
      });
      
      const recsByType = groupBy(analysisResult.recommendations, 'type');
      console.log('\n  By Type:');
      Object.entries(recsByType).forEach(([type, items]) => {
        console.log(`  - ${type}: ${items.length}`);
      });
      console.log('');
    }

    // Step 3: Transform to database format
    console.log('🔄 Step 2: Transforming to Database Format');
    console.log('-'.repeat(80));

    const testProjectId = new mongoose.Types.ObjectId().toString();
    const transformStartTime = Date.now();
    
    const transformedData = AnalysisResultTransformer.transform(
      analysisResult,
      testProjectId
    );
    
    const transformTime = Date.now() - transformStartTime;
    console.log(`✅ Transformation completed in ${transformTime}ms\n`);

    // Display transformed data summary
    console.log('📄 Transformed Data Summary:');
    console.log(`  - Project ID: ${transformedData.projectId}`);
    console.log(`  - Components: ${transformedData.components.length}`);
    console.log(`  - Dependencies: ${transformedData.dependencies.length}`);
    console.log(`  - Architecture Patterns: ${transformedData.architecturePatterns.length}`);
    console.log(`  - Insights: ${transformedData.insights.length}`);
    console.log(`  - Recommendations: ${transformedData.recommendations.length}\n`);

    // Display complexity metrics
    console.log('🔢 Complexity Metrics:');
    console.log(`  - Cyclomatic Complexity: ${transformedData.complexityMetrics.cyclomaticComplexity}`);
    console.log(`  - Lines of Code: ${transformedData.complexityMetrics.linesOfCode}`);
    console.log(`  - Maintainability Index: ${transformedData.complexityMetrics.maintainabilityIndex}/100`);
    console.log(`  - Technical Debt: ${transformedData.complexityMetrics.technicalDebt}\n`);

    // Display architecture patterns
    if (transformedData.architecturePatterns.length > 0) {
      console.log('🏗️  Architecture Patterns:');
      transformedData.architecturePatterns.forEach(pattern => {
        console.log(`  - ${pattern}`);
      });
      console.log('');
    }

    // Sample insights
    if (transformedData.insights.length > 0) {
      console.log('💡 Sample Insights (first 3):');
      transformedData.insights.slice(0, 3).forEach((insight, i) => {
        console.log(`  ${i + 1}. [${insight.impact.toUpperCase()}] ${insight.title}`);
        console.log(`     Category: ${insight.category}`);
        console.log(`     Files affected: ${insight.affectedFiles.length}`);
      });
      console.log('');
    }

    // Sample recommendations
    if (transformedData.recommendations.length > 0) {
      console.log('🎯 Sample Recommendations (first 3):');
      transformedData.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`     Type: ${rec.type} | Effort: ${rec.effort}`);
        console.log(`     Benefits: ${rec.benefits.length}`);
      });
      console.log('');
    }

    // Step 4: Save to database
    console.log('💾 Step 3: Saving to Database');
    console.log('-'.repeat(80));

    const saveStartTime = Date.now();
    
    // Use upsert to avoid duplicates
    const savedResult = await AnalysisResult.findOneAndUpdate(
      { projectId: transformedData.projectId },
      transformedData,
      { upsert: true, new: true }
    );
    
    const saveTime = Date.now() - saveStartTime;
    console.log(`✅ Saved to database in ${saveTime}ms\n`);

    console.log('✅ Database Document Summary:');
    console.log(`  - Document ID: ${savedResult._id}`);
    console.log(`  - Project ID: ${savedResult.projectId}`);
    console.log(`  - Components: ${savedResult.components.length}`);
    console.log(`  - Dependencies: ${savedResult.dependencies.length}`);
    console.log(`  - Insights: ${savedResult.insights?.length || 0}`);
    console.log(`  - Recommendations: ${savedResult.recommendations?.length || 0}`);
    console.log(`  - Created: ${(savedResult as any).createdAt}`);
    console.log(`  - Updated: ${(savedResult as any).updatedAt}\n`);

    // Step 5: Verify retrieval
    console.log('🔍 Step 4: Verifying Data Retrieval');
    console.log('-'.repeat(80));

    const retrievedResult = await AnalysisResult.findOne({ projectId: transformedData.projectId });
    
    if (!retrievedResult) {
      throw new Error('Failed to retrieve saved analysis result');
    }

    console.log('✅ Successfully retrieved from database\n');

    // Test helper methods
    console.log('🧪 Testing Helper Methods:');
    
    if (retrievedResult.insights && retrievedResult.insights.length > 0) {
      const criticalInsights = retrievedResult.insights.filter((i: any) => i.impact === 'critical');
      console.log(`  - Critical insights: ${criticalInsights.length}`);
    }
    
    if (retrievedResult.recommendations && retrievedResult.recommendations.length > 0) {
      const highPriorityRecs = retrievedResult.recommendations.filter(
        (r: any) => r.priority === 'critical' || r.priority === 'high'
      );
      console.log(`  - High-priority recommendations: ${highPriorityRecs.length}`);
    }

    // Cache statistics
    console.log('\n📊 Cache Statistics:');
    const cacheStats = analyzer.getCacheStats();
    console.log(`  - Cache hits: ${cacheStats.hits}`);
    console.log(`  - Cache misses: ${cacheStats.misses}`);
    console.log(`  - Cache size: ${cacheStats.size}`);
    console.log(`  - Hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%\n`);

    // Final summary
    console.log('='.repeat(80));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log('\n📊 Performance Summary:');
    console.log(`  - Analysis time: ${analysisTime}ms`);
    console.log(`  - Transformation time: ${transformTime}ms`);
    console.log(`  - Database save time: ${saveTime}ms`);
    console.log(`  - Total time: ${analysisTime + transformTime + saveTime}ms\n`);

    console.log('✅ Integration test completed successfully!\n');
    console.log(`💡 Test project ID: ${testProjectId}`);
    console.log(`💾 Document ID: ${savedResult._id}\n`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup: Close MongoDB connection
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

/**
 * Helper function to group array by property
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// Run the test
if (require.main === module) {
  testTransformerIntegration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testTransformerIntegration };
