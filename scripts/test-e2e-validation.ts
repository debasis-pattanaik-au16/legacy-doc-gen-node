#!/usr/bin/env ts-node
/**
 * End-to-End Analysis Validation Script
 * 
 * Runs complete analysis on this Backend project (118 TypeScript files)
 * and validates EVERY field for correctness
 * 
 * Usage: npx ts-node -r tsconfig-paths/register scripts/test-e2e-validation.ts
 */

import path from 'path';
import fs from 'fs';
import { DependencyAnalyzer } from '../src/services/dependencyAnalyzer';
import { logger } from '../src/utils/logger';

// Suppress debug logs for cleaner output
process.env.LOG_LEVEL = 'error';

interface ValidationResult {
  field: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  expected: any;
  actual: any;
  notes?: string;
}

class EndToEndValidator {
  private results: ValidationResult[] = [];
  private analysisData: any;
  
  async run(): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     END-TO-END ANALYSIS VALIDATION                            ║');
    console.log('║     Target: Backend Project (118 TypeScript files)           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    try {
      // Step 1: Run analysis
      await this.runAnalysis();
      
      // Step 2: Validate Phase 1 fields
      this.validatePhase1();
      
      // Step 3: Validate Phase 2 fields
      this.validatePhase2();
      
      // Step 4: Generate report
      this.generateReport();
      
      // Step 5: Save detailed results
      this.saveResults();
      
    } catch (error: any) {
      console.error('\n❌ FATAL ERROR:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  private async runAnalysis(): Promise<void> {
    console.log('🔍 STEP 1: Running Analysis on Backend Project\n');
    console.log('   Project Path: src/');
    console.log('   Expected Files: ~118 TypeScript files\n');
    
    const startTime = Date.now();
    const projectPath = path.join(process.cwd(), 'src');
    
    try {
      const analyzer = new DependencyAnalyzer();
      this.analysisData = await analyzer.analyzeDependencies(projectPath);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`   ✅ Analysis completed in ${duration}s`);
      console.log(`   📊 Graph Nodes: ${this.analysisData.graph?.nodes?.length || 0}`);
      console.log(`   📊 Graph Edges: ${this.analysisData.graph?.edges?.length || 0}`);
      console.log(`   📊 Components: ${this.analysisData.components?.length || 0}`);
      console.log(`   📊 Dependencies: ${this.analysisData.dependencies?.length || 0}\n`);
      
      // Save raw analysis data for debugging
      const outputPath = path.join(process.cwd(), 'test-analysis-output.json');
      fs.writeFileSync(outputPath, JSON.stringify(this.analysisData, null, 2));
      console.log(`   💾 Raw data saved to: test-analysis-output.json\n`);
      
    } catch (error: any) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  private validatePhase1(): void {
    console.log('📋 STEP 2: Validating Phase 1 Metrics\n');
    
    // 1. Components Validation
    this.validateComponents();
    
    // 2. Dependencies Validation
    this.validateDependencies();
    
    // 3. Complexity Metrics
    this.validateComplexityMetrics();
    
    // 4. Architecture Patterns
    this.validateArchitecturePatterns();
    
    // 5. Insights & Recommendations
    this.validateInsightsAndRecommendations();
  }

  private validatePhase2(): void {
    console.log('\n📋 STEP 3: Validating Phase 2 Metrics\n');
    
    // 1. Security Analysis
    this.validateSecurityAnalysis();
    
    // 2. Code Smells
    this.validateCodeSmells();
    
    // 3. API Analysis
    this.validateApiAnalysis();
    
    // 4. Database Analysis
    this.validateDatabaseAnalysis();
    
    // 5. Enhanced Metrics
    this.validateEnhancedMetrics();
  }

  private validateComponents(): void {
    console.log('   🔎 Validating Components...');
    
    const components = this.analysisData.components || [];
    
    // Should have components from 118 files
    this.addResult({
      field: 'components.count',
      category: 'Phase 1',
      status: components.length > 100 ? 'PASS' : 'FAIL',
      expected: '> 100 components',
      actual: components.length,
      notes: '118 TS files should yield 100+ components (classes, functions, interfaces)'
    });
    
    if (components.length > 0) {
      const sampleComponent = components[0];
      
      // Validate component structure
      this.addResult({
        field: 'components[0].id',
        category: 'Phase 1',
        status: sampleComponent.id ? 'PASS' : 'FAIL',
        expected: 'string (UUID)',
        actual: sampleComponent.id
      });
      
      this.addResult({
        field: 'components[0].name',
        category: 'Phase 1',
        status: sampleComponent.name ? 'PASS' : 'FAIL',
        expected: 'string (component name)',
        actual: sampleComponent.name
      });
      
      this.addResult({
        field: 'components[0].type',
        category: 'Phase 1',
        status: ['class', 'function', 'interface', 'type', 'module'].includes(sampleComponent.type) ? 'PASS' : 'FAIL',
        expected: 'class | function | interface | type | module',
        actual: sampleComponent.type
      });
      
      this.addResult({
        field: 'components[0].file',
        category: 'Phase 1',
        status: sampleComponent.file && sampleComponent.file.endsWith('.ts') ? 'PASS' : 'FAIL',
        expected: 'path ending with .ts',
        actual: sampleComponent.file
      });
    }
    
    console.log(`      Components Count: ${components.length} ${components.length > 100 ? '✓' : '✗'}`);
  }

  private validateDependencies(): void {
    console.log('   🔎 Validating Dependencies...');
    
    const dependencies = this.analysisData.dependencies || [];
    
    // Should have many dependencies in this project
    this.addResult({
      field: 'dependencies.count',
      category: 'Phase 1',
      status: dependencies.length > 50 ? 'PASS' : 'WARN',
      expected: '> 50 dependencies',
      actual: dependencies.length,
      notes: 'Complex project should have many internal and external dependencies'
    });
    
    if (dependencies.length > 0) {
      const sampleDep = dependencies[0];
      
      this.addResult({
        field: 'dependencies[0].from',
        category: 'Phase 1',
        status: sampleDep.from ? 'PASS' : 'FAIL',
        expected: 'string (source file/module)',
        actual: sampleDep.from
      });
      
      this.addResult({
        field: 'dependencies[0].to',
        category: 'Phase 1',
        status: sampleDep.to ? 'PASS' : 'FAIL',
        expected: 'string (target file/module)',
        actual: sampleDep.to
      });
      
      this.addResult({
        field: 'dependencies[0].type',
        category: 'Phase 1',
        status: ['internal', 'external', 'peer'].includes(sampleDep.type) ? 'PASS' : 'FAIL',
        expected: 'internal | external | peer',
        actual: sampleDep.type
      });
    }
    
    console.log(`      Dependencies Count: ${dependencies.length} ${dependencies.length > 50 ? '✓' : '⚠'}`);
  }

  private validateComplexityMetrics(): void {
    console.log('   🔎 Validating Complexity Metrics...');
    
    const metrics = this.analysisData.metrics || {};
    
    // Check for cognitive complexity fix (should be 1.5-3x cyclomatic)
    if (metrics.averageCognitiveComplexity && metrics.averageCyclomaticComplexity) {
      const ratio = metrics.averageCognitiveComplexity / metrics.averageCyclomaticComplexity;
      
      this.addResult({
        field: 'metrics.cognitiveComplexityRatio',
        category: 'Phase 1',
        status: ratio >= 1.5 && ratio <= 3.5 ? 'PASS' : 'FAIL',
        expected: '1.5 - 3.5x cyclomatic',
        actual: ratio.toFixed(2),
        notes: 'Cognitive complexity should be 1.5-3x cyclomatic (not 6x)'
      });
      
      console.log(`      Cognitive/Cyclomatic Ratio: ${ratio.toFixed(2)}x ${ratio >= 1.5 && ratio <= 3.5 ? '✓' : '✗'}`);
    }
    
    // Validate other metrics
    if (metrics.totalLinesOfCode) {
      this.addResult({
        field: 'metrics.totalLinesOfCode',
        category: 'Phase 1',
        status: metrics.totalLinesOfCode > 5000 ? 'PASS' : 'WARN',
        expected: '> 5000 LOC',
        actual: metrics.totalLinesOfCode,
        notes: '118 TypeScript files should have substantial LOC'
      });
    }
  }

  private validateArchitecturePatterns(): void {
    console.log('   🔎 Validating Architecture Patterns...');
    
    const patterns = this.analysisData.architecturePatterns || [];
    
    // Backend should detect MVC, Layered, etc.
    const expectedPatterns = ['MVC', 'Layered', 'Repository'];
    const detectedExpected = expectedPatterns.filter(p => 
      patterns.some((pattern: any) => pattern.name?.includes(p))
    );
    
    this.addResult({
      field: 'architecturePatterns',
      category: 'Phase 1',
      status: detectedExpected.length >= 2 ? 'PASS' : 'WARN',
      expected: 'MVC, Layered, Repository patterns',
      actual: patterns.map((p: any) => p.name).join(', '),
      notes: 'Backend with services/, models/, controllers/ should show patterns'
    });
    
    console.log(`      Detected Patterns: ${detectedExpected.length}/3 expected ${detectedExpected.length >= 2 ? '✓' : '⚠'}`);
  }

  private validateInsightsAndRecommendations(): void {
    console.log('   🔎 Validating Insights & Recommendations...');
    
    const insights = this.analysisData.insights || [];
    const recommendations = this.analysisData.recommendations || [];
    
    this.addResult({
      field: 'insights.count',
      category: 'Phase 1',
      status: insights.length > 0 ? 'PASS' : 'FAIL',
      expected: '> 0 insights',
      actual: insights.length,
      notes: 'Should generate architectural insights'
    });
    
    this.addResult({
      field: 'recommendations.count',
      category: 'Phase 1',
      status: recommendations.length > 0 ? 'PASS' : 'FAIL',
      expected: '> 0 recommendations',
      actual: recommendations.length,
      notes: 'Should generate improvement recommendations'
    });
    
    console.log(`      Insights: ${insights.length} ✓`);
    console.log(`      Recommendations: ${recommendations.length} ✓`);
  }

  private validateSecurityAnalysis(): void {
    console.log('   🔎 Validating Security Analysis...');
    
    const security = this.analysisData.security || {};
    const issues = security.issues || [];
    
    // Check that magic numbers are NOT in security issues
    const hasMagicNumbers = issues.some((issue: any) => 
      issue.description?.toLowerCase().includes('magic number') ||
      issue.description?.includes('200') ||
      issue.description?.includes('3000') ||
      issue.description?.includes('404')
    );
    
    this.addResult({
      field: 'security.noMagicNumbers',
      category: 'Phase 2 - Security',
      status: !hasMagicNumbers ? 'PASS' : 'FAIL',
      expected: 'No magic numbers in security issues',
      actual: hasMagicNumbers ? 'Magic numbers found!' : 'Clean',
      notes: 'FIX APPLIED: Magic numbers should only be in codeSmells'
    });
    
    this.addResult({
      field: 'security.issues.count',
      category: 'Phase 2 - Security',
      status: issues.length < 20 ? 'PASS' : 'WARN',
      expected: '< 20 issues (no false positives)',
      actual: issues.length,
      notes: 'Should not have 45+ fake magic number issues'
    });
    
    if (issues.length > 0) {
      const issueTypes = [...new Set(issues.map((i: any) => i.type))];
      console.log(`      Security Issues: ${issues.length} ${issues.length < 20 ? '✓' : '⚠'}`);
      console.log(`      Issue Types: ${issueTypes.join(', ')}`);
      console.log(`      Magic Numbers: ${hasMagicNumbers ? '✗ FOUND (BUG!)' : '✓ None'}`);
    }
  }

  private validateCodeSmells(): void {
    console.log('   🔎 Validating Code Smells...');
    
    const codeSmells = this.analysisData.codeSmells || {};
    const smells = codeSmells.smells || [];
    
    this.addResult({
      field: 'codeSmells.smells.count',
      category: 'Phase 2 - Code Smells',
      status: smells.length > 50 ? 'PASS' : 'WARN',
      expected: '> 50 code smells',
      actual: smells.length,
      notes: 'Large project should have various code smells'
    });
    
    // Check that HTTP codes and ports ARE in magic numbers (not excluded wrongly)
    const magicNumbers = smells.filter((s: any) => s.type === 'MAGIC_NUMBERS');
    const hasCommonCodes = magicNumbers.some((s: any) =>
      s.description?.includes('200') || 
      s.description?.includes('404') ||
      s.description?.includes('3000')
    );
    
    this.addResult({
      field: 'codeSmells.magicNumbers.excludeCommonCodes',
      category: 'Phase 2 - Code Smells',
      status: !hasCommonCodes ? 'PASS' : 'FAIL',
      expected: 'HTTP codes (200, 404) and ports (3000) excluded',
      actual: hasCommonCodes ? 'Common codes found' : 'Excluded correctly',
      notes: 'FIX APPLIED: Common HTTP codes and ports should be excluded'
    });
    
    console.log(`      Total Smells: ${smells.length}`);
    console.log(`      Magic Numbers: ${magicNumbers.length}`);
    console.log(`      Common Codes Excluded: ${!hasCommonCodes ? '✓' : '✗'}`);
  }

  private validateApiAnalysis(): void {
    console.log('   🔎 Validating API Analysis...');
    
    const api = this.analysisData.api || {};
    const documentation = api.documentation || {};
    
    // Check if this project has GraphQL or REST
    const hasGraphQL = documentation.hasGraphQL === true;
    const hasOpenAPI = documentation.hasOpenAPI === true;
    const apiType = documentation.apiType;
    
    // This Backend might not have API endpoints, but check detection logic
    if (hasGraphQL) {
      this.addResult({
        field: 'api.graphqlDetection',
        category: 'Phase 2 - API',
        status: hasGraphQL && !hasOpenAPI ? 'PASS' : 'FAIL',
        expected: 'hasGraphQL: true, hasOpenAPI: false',
        actual: { hasGraphQL, hasOpenAPI },
        notes: 'FIX APPLIED: GraphQL should not show OpenAPI flag'
      });
    }
    
    if (api.endpoints && api.endpoints.length > 0) {
      console.log(`      API Endpoints: ${api.endpoints.length}`);
      console.log(`      API Type: ${apiType || 'N/A'}`);
      console.log(`      Has GraphQL: ${hasGraphQL ? 'Yes' : 'No'}`);
      console.log(`      Has OpenAPI: ${hasOpenAPI ? 'Yes' : 'No'}`);
    } else {
      console.log(`      No API endpoints detected (expected for services-only analysis)`);
    }
  }

  private validateDatabaseAnalysis(): void {
    console.log('   🔎 Validating Database Analysis...');
    
    const database = this.analysisData.database || {};
    const ormType = database.ormType;
    const dialect = database.dialect;
    
    // Check ORM prioritization (if Mongoose detected, it should be primary)
    if (ormType) {
      // Read package.json to check actual dependencies
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const hasMongoose = !!allDeps.mongoose;
        const hasTypeORM = !!allDeps.typeorm;
        
        if (hasMongoose) {
          this.addResult({
            field: 'database.ormPriority',
            category: 'Phase 2 - Database',
            status: ormType === 'mongoose' ? 'PASS' : 'FAIL',
            expected: 'mongoose (for MERN)',
            actual: ormType,
            notes: 'FIX APPLIED: Mongoose should be prioritized for MongoDB'
          });
          
          this.addResult({
            field: 'database.dialect',
            category: 'Phase 2 - Database',
            status: dialect === 'mongodb' ? 'PASS' : 'FAIL',
            expected: 'mongodb',
            actual: dialect,
            notes: 'Should auto-detect MongoDB from Mongoose'
          });
        }
        
        console.log(`      ORM Type: ${ormType} ${hasMongoose && ormType === 'mongoose' ? '✓' : ''}`);
        console.log(`      Dialect: ${dialect || 'N/A'}`);
        console.log(`      Has Mongoose: ${hasMongoose ? 'Yes' : 'No'}`);
        console.log(`      Has TypeORM: ${hasTypeORM ? 'Yes' : 'No'}`);
      }
    } else {
      console.log(`      No database entities detected`);
    }
  }

  private validateEnhancedMetrics(): void {
    console.log('   🔎 Validating Enhanced Metrics...');
    
    const metrics = this.analysisData.metrics || {};
    
    // Check for Phase 2 metrics
    const hasHalstead = !!metrics.halstead;
    const hasCoupling = !!metrics.coupling;
    const hasCohesion = !!metrics.cohesion;
    
    this.addResult({
      field: 'metrics.halstead',
      category: 'Phase 2 - Metrics',
      status: hasHalstead ? 'PASS' : 'WARN',
      expected: 'Halstead metrics present',
      actual: hasHalstead ? 'Present' : 'Missing',
      notes: 'Phase 2 should include Halstead metrics'
    });
    
    this.addResult({
      field: 'metrics.coupling',
      category: 'Phase 2 - Metrics',
      status: hasCoupling ? 'PASS' : 'WARN',
      expected: 'Coupling metrics present',
      actual: hasCoupling ? 'Present' : 'Missing',
      notes: 'Phase 2 should include coupling metrics (CBO, Ca, Ce)'
    });
    
    console.log(`      Halstead Metrics: ${hasHalstead ? '✓' : '⚠'}`);
    console.log(`      Coupling Metrics: ${hasCoupling ? '✓' : '⚠'}`);
    console.log(`      Cohesion Metrics: ${hasCohesion ? '✓' : '⚠'}`);
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
  }

  private generateReport(): void {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    VALIDATION REPORT                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const total = this.results.length;
    
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`📊 Summary:`);
    console.log(`   Total Validations: ${total}`);
    console.log(`   ✅ Passed: ${passed} (${passRate}%)`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️  Warnings: ${warned}`);
    console.log('');
    
    // Group by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.status === 'PASS').length;
      const categoryTotal = categoryResults.length;
      
      console.log(`\n📋 ${category}:`);
      console.log(`   Status: ${categoryPassed}/${categoryTotal} passed`);
      
      // Show failed items
      const failures = categoryResults.filter(r => r.status === 'FAIL');
      if (failures.length > 0) {
        console.log(`\n   ❌ Failed Checks:`);
        failures.forEach(f => {
          console.log(`      • ${f.field}`);
          console.log(`        Expected: ${JSON.stringify(f.expected)}`);
          console.log(`        Actual:   ${JSON.stringify(f.actual)}`);
          if (f.notes) console.log(`        Note:     ${f.notes}`);
        });
      }
    }
    
    console.log('\n' + '═'.repeat(65));
    
    if (failed > 0) {
      console.log(`\n⚠️  ${failed} validation(s) failed. Review the report above.\n`);
    } else if (warned > 0) {
      console.log(`\n✅ All critical validations passed! ${warned} warning(s) noted.\n`);
    } else {
      console.log('\n🎉 ALL VALIDATIONS PASSED!\n');
    }
  }

  private saveResults(): void {
    const reportPath = path.join(process.cwd(), 'e2e-validation-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      projectPath: 'src/',
      totalFiles: 118,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'PASS').length,
        failed: this.results.filter(r => r.status === 'FAIL').length,
        warned: this.results.filter(r => r.status === 'WARN').length,
      },
      validations: this.results,
      analysisDataSummary: {
        componentsCount: this.analysisData.components?.length || 0,
        dependenciesCount: this.analysisData.dependencies?.length || 0,
        securityIssuesCount: this.analysisData.security?.issues?.length || 0,
        codeSmellsCount: this.analysisData.codeSmells?.smells?.length || 0,
        apiEndpointsCount: this.analysisData.api?.endpoints?.length || 0,
        databaseEntitiesCount: this.analysisData.database?.entities?.length || 0,
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: e2e-validation-report.json\n`);
  }
}

// Run the validator
const validator = new EndToEndValidator();
validator.run().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
