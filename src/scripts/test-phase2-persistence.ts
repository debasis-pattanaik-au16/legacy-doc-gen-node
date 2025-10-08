#!/usr/bin/env ts-node
/**
 * Test Script: Phase 2 Analysis Results Persistence
 * 
 * This script verifies that Phase 2 analysis results (security, codeSmells, api, database, metrics)
 * are properly transformed and persisted to the database.
 * 
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/test-phase2-persistence.ts
 */

import path from 'path';
import mongoose from 'mongoose';
import { ConfigLoader } from '@/config/ConfigLoader';
import { DependencyAnalyzer } from '@/services/dependencyAnalyzer';
import { AnalysisResultTransformer } from '@/services/transformers/AnalysisResultTransformer';
import { AnalysisResult } from '@/models/AnalysisResult';
import { logger } from '@/utils/logger';

// Configure logger to show debug messages
process.env.LOG_LEVEL = 'debug';

interface TestResult {
  phase: string;
  field: string;
  status: 'PASSED' | 'FAILED';
  details: string;
}

class Phase2PersistenceTest {
  private testResults: TestResult[] = [];
  private projectId!: mongoose.Types.ObjectId;

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   Phase 2 Analysis Results Persistence Test                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    try {
      // 1. Connect to database
      await this.connectToDatabase();

      // 2. Load configuration with Phase 2 features enabled
      await this.loadConfiguration();

      // 3. Run analysis on test project
      const analysisResult = await this.runAnalysis();

      // 4. Transform result
      const transformedData = await this.transformResult(analysisResult);

      // 5. Save to database
      const savedResult = await this.saveToDatabase(transformedData);

      // 6. Verify persistence
      await this.verifyPersistence(savedResult);

      // 7. Generate report
      this.generateReport();

    } catch (error: any) {
      console.error('❌ Test execution failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  }

  private async connectToDatabase(): Promise<void> {
    console.log('📊 Connecting to database...');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/legacy-doc-generator';
    
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ Database connected successfully\n');
    } catch (error: any) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  private async loadConfiguration(): Promise<void> {
    console.log('⚙️  Loading configuration with Phase 2 features enabled...');

    const configPath = path.join(process.cwd(), 'analysis-config.json');
    
    try {
      const configLoader = ConfigLoader.getInstance();
      // Use the public load() method instead of private loadFromFile()
      await configLoader.load(configPath);
      
      const config = configLoader.get();
      
      // Verify Phase 2 features are enabled
      console.log('   Security Analysis:', config.features.security?.enabled ? '✓' : '✗');
      console.log('   Code Smell Detection:', config.features.codeSmells?.enabled ? '✓' : '✗');
      console.log('   API Analysis:', config.features.api?.enabled ? '✓' : '✗');
      console.log('   Database Analysis:', config.features.database?.enabled ? '✓' : '✗');
      console.log('✅ Configuration loaded successfully\n');
    } catch (error: any) {
      console.warn('⚠️  Could not load config file, using defaults with Phase 2 enabled');
      // Manually enable Phase 2 features for testing
      const config = ConfigLoader.getInstance().get(true);
      config.features.security = { 
        enabled: true, 
        detectors: ['injection', 'crypto', 'auth', 'secrets'], 
        severityThreshold: 'low' 
      };
      config.features.codeSmells = { 
        enabled: true, 
        detectors: ['longMethod', 'largeClass', 'duplicateCode'], 
        thresholds: {} 
      };
      config.features.api = { 
        enabled: true, 
        types: ['rest', 'graphql'], 
        extractDocs: true, 
        detectAuth: true 
      };
      config.features.database = { 
        enabled: true, 
        types: ['sql', 'nosql', 'orm'], 
        detectNPlusOne: true, 
        detectMissingIndexes: true 
      };
      console.log('✅ Using default configuration with Phase 2 enabled\n');
    }
  }

  private async runAnalysis(): Promise<any> {
    console.log('🔍 Running dependency analysis...');

    const testProjectPath = path.join(process.cwd(), 'src/services');
    
    try {
      const analyzer = new DependencyAnalyzer();
      const result = await analyzer.analyzeDependencies(testProjectPath);

      console.log(`   Graph Nodes: ${result.graph.nodes.length}`);
      console.log(`   Graph Edges: ${result.graph.edges.length}`);
      console.log(`   Relationships: ${result.relationships.length}`);
      console.log(`   Insights: ${result.insights.length}`);
      console.log(`   Recommendations: ${result.recommendations.length}`);
      
      // Check Phase 2 results
      console.log('\n   Phase 2 Analysis Results:');
      console.log(`   - Security Issues: ${result.security?.issues?.length || 0}`);
      console.log(`   - Code Smells: ${result.codeSmells?.smells?.length || 0}`);
      console.log(`   - API Endpoints: ${result.api?.endpoints?.length || 0}`);
      console.log(`   - Database Entities: ${result.database?.entities?.length || 0}`);
      console.log(`   - Enhanced Metrics: ${result.metrics ? 'Yes' : 'No'}`);
      
      console.log('✅ Analysis completed successfully\n');
      
      return result;
    } catch (error: any) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  private async transformResult(analysisResult: any): Promise<any> {
    console.log('🔄 Transforming analysis result...');

    try {
      this.projectId = new mongoose.Types.ObjectId();
      const transformed = AnalysisResultTransformer.transform(
        analysisResult,
        this.projectId.toString()
      );

      console.log(`   Components: ${transformed.components.length}`);
      console.log(`   Dependencies: ${transformed.dependencies.length}`);
      console.log(`   Insights: ${transformed.insights.length}`);
      console.log(`   Recommendations: ${transformed.recommendations.length}`);
      
      // Check if Phase 2 fields are included
      console.log('\n   Phase 2 Fields in Transformation:');
      console.log(`   - Security: ${transformed.security ? 'Included' : 'Missing'}`);
      console.log(`   - Code Smells: ${transformed.codeSmells ? 'Included' : 'Missing'}`);
      console.log(`   - API: ${transformed.api ? 'Included' : 'Missing'}`);
      console.log(`   - Database: ${transformed.database ? 'Included' : 'Missing'}`);
      console.log(`   - Metrics: ${transformed.metrics ? 'Included' : 'Missing'}`);

      console.log('✅ Transformation completed successfully\n');
      
      return transformed;
    } catch (error: any) {
      throw new Error(`Transformation failed: ${error.message}`);
    }
  }

  private async saveToDatabase(transformedData: any): Promise<any> {
    console.log('💾 Saving to database...');

    try {
      const updateData: any = {
        projectId: transformedData.projectId,
        components: transformedData.components,
        dependencies: transformedData.dependencies,
        apiEndpoints: transformedData.apiEndpoints,
        databaseSchemas: transformedData.databaseSchemas,
        architecturePatterns: transformedData.architecturePatterns,
        complexityMetrics: transformedData.complexityMetrics,
        insights: transformedData.insights,
        recommendations: transformedData.recommendations,
        generatedAt: transformedData.generatedAt
      };

      // Include Phase 2 fields
      if (transformedData.security) {
        updateData.security = transformedData.security;
      }
      if (transformedData.codeSmells) {
        updateData.codeSmells = transformedData.codeSmells;
      }
      if (transformedData.api) {
        updateData.api = transformedData.api;
      }
      if (transformedData.database) {
        updateData.database = transformedData.database;
      }
      if (transformedData.metrics) {
        updateData.metrics = transformedData.metrics;
      }

      const result = await AnalysisResult.findOneAndUpdate(
        { projectId: this.projectId },
        updateData,
        { upsert: true, new: true, runValidators: true }
      );

      console.log('✅ Saved to database successfully\n');
      
      return result;
    } catch (error: any) {
      throw new Error(`Database save failed: ${error.message}`);
    }
  }

  private async verifyPersistence(savedResult: any): Promise<void> {
    console.log('✓ Verifying persistence...\n');

    // Retrieve from database
    const retrieved = await AnalysisResult.findOne({ projectId: this.projectId });

    if (!retrieved) {
      throw new Error('Failed to retrieve saved analysis result');
    }

    // Phase 1: Verify basic fields
    this.verifyField('Phase 1', 'components', !!retrieved.components && retrieved.components.length > 0);
    this.verifyField('Phase 1', 'dependencies', !!retrieved.dependencies && retrieved.dependencies.length > 0);
    this.verifyField('Phase 1', 'insights', !!retrieved.insights && retrieved.insights.length > 0);
    this.verifyField('Phase 1', 'recommendations', !!retrieved.recommendations && retrieved.recommendations.length > 0);

    // Phase 2: Verify advanced fields
    this.verifyField('Phase 2', 'security', !!retrieved.security);
    this.verifyField('Phase 2', 'codeSmells', !!retrieved.codeSmells);
    this.verifyField('Phase 2', 'api', !!retrieved.api);
    this.verifyField('Phase 2', 'database', !!retrieved.database);
    this.verifyField('Phase 2', 'metrics', !!retrieved.metrics);

    // Detailed Phase 2 verification
    if (retrieved.security) {
      console.log(`   Security Issues Persisted: ${retrieved.security.issues?.length || 0}`);
      console.log(`   Security Summary: ${JSON.stringify(retrieved.security.summary || {})}`);
    }

    if (retrieved.codeSmells) {
      console.log(`   Code Smells Persisted: ${retrieved.codeSmells.smells?.length || 0}`);
      console.log(`   Code Smell Summary: ${JSON.stringify(retrieved.codeSmells.summary || {})}`);
    }

    if (retrieved.api) {
      console.log(`   API Endpoints Persisted: ${retrieved.api.endpoints?.length || 0}`);
      console.log(`   API Statistics: ${JSON.stringify(retrieved.api.statistics || {})}`);
    }

    if (retrieved.database) {
      console.log(`   Database Entities Persisted: ${retrieved.database.entities?.length || 0}`);
      console.log(`   Database Statistics: ${JSON.stringify(retrieved.database.statistics || {})}`);
    }

    if (retrieved.metrics) {
      console.log(`   Enhanced Metrics Persisted:`);
      console.log(`     - Coupling Index: ${retrieved.metrics.couplingIndex}`);
      console.log(`     - Cohesion Index: ${retrieved.metrics.cohesionIndex}`);
      console.log(`     - Instability Index: ${retrieved.metrics.instabilityIndex}`);
    }

    console.log('\n✅ Persistence verification completed\n');
  }

  private verifyField(phase: string, field: string, condition: boolean): void {
    const status: 'PASSED' | 'FAILED' = condition ? 'PASSED' : 'FAILED';
    const statusSymbol = condition ? '✅' : '❌';
    const details = condition ? 'Field exists and has data' : 'Field missing or empty';

    this.testResults.push({ phase, field, status, details });
    console.log(`   ${statusSymbol} ${phase} - ${field}: ${details}`);
  }

  private generateReport(): void {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const phase1Results = this.testResults.filter(r => r.phase === 'Phase 1');
    const phase2Results = this.testResults.filter(r => r.phase === 'Phase 2');

    const phase1Passed = phase1Results.filter(r => r.status === 'PASSED').length;
    const phase2Passed = phase2Results.filter(r => r.status === 'PASSED').length;

    console.log(`Phase 1 (Basic Fields):     ${phase1Passed}/${phase1Results.length} passed`);
    console.log(`Phase 2 (Advanced Fields):  ${phase2Passed}/${phase2Results.length} passed`);
    console.log(`\nTotal:                      ${phase1Passed + phase2Passed}/${this.testResults.length} passed`);

    const allPassed = this.testResults.every(r => r.status === 'PASSED');

    if (allPassed) {
      console.log('\n🎉 All tests passed! Phase 2 fields are properly persisted.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review the details above.\n');
      
      const failedTests = this.testResults.filter(r => r.status === 'FAILED');
      console.log('Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.phase} - ${test.field}: ${test.details}`);
      });
      console.log('');
      
      process.exit(1);
    }
  }
}

// Run the test
const test = new Phase2PersistenceTest();
test.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
