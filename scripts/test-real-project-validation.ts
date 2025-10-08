#!/usr/bin/env ts-node
/**
 * Real Project End-to-End Validation
 * 
 * Analyzes: uploads/extracted/68e0f13df94ab74bc8cd4a8a
 * Project: syndication-node (GraphQL + Mongoose + 3,458 files)
 * 
 * Validates EVERY field in the analysis output:
 * - Phase 1: Components, Dependencies, Complexity, Patterns
 * - Phase 2: Security, Code Smells, API (GraphQL), Database (Mongoose), Metrics
 * 
 * Usage: npx ts-node -r tsconfig-paths/register scripts/test-real-project-validation.ts
 */

import path from 'path';
import fs from 'fs';
import { DependencyAnalyzer } from '../src/services/dependencyAnalyzer';

// Suppress debug logs
process.env.LOG_LEVEL = 'info';

interface FieldValidation {
  field: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  expected: any;
  actual: any;
  notes?: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

class RealProjectValidator {
  private validations: FieldValidation[] = [];
  private analysisData: any;
  private projectPath: string;
  private projectInfo: any = {};
  
  constructor() {
    this.projectPath = path.join(
      process.cwd(),
      'uploads/extracted/68e0f13df94ab74bc8cd4a8a'
    );
  }

  async run(): Promise<void> {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║        REAL PROJECT END-TO-END VALIDATION                        ║');
    console.log('║        Project: syndication-node (GraphQL + Mongoose)           ║');
    console.log('║        Files: ~3,458 TypeScript/JavaScript files                ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    try {
      // Step 0: Gather project info
      await this.gatherProjectInfo();
      
      // Step 1: Run full analysis
      await this.runFullAnalysis();
      
      // Step 2: Validate Phase 1 (Basic Metrics)
      this.validatePhase1BasicMetrics();
      
      // Step 3: Validate Phase 2 (Advanced Metrics)
      this.validatePhase2AdvancedMetrics();
      
      // Step 4: Validate Critical Fixes
      this.validateCriticalFixes();
      
      // Step 5: Generate comprehensive report
      this.generateDetailedReport();
      
      // Step 6: Save results
      this.saveResults();
      
    } catch (error: any) {
      console.error('\n❌ VALIDATION FAILED:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  private async gatherProjectInfo(): Promise<void> {
    console.log('📦 Gathering Project Information...\n');
    
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      this.projectInfo = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        hasGraphQL: !!(packageJson.dependencies?.['graphql'] || packageJson.dependencies?.['apollo-server']),
        hasMongoose: !!packageJson.dependencies?.['mongoose'],
        hasTypeORM: !!packageJson.dependencies?.['typeorm'],
        hasExpress: !!packageJson.dependencies?.['express'],
      };
      
      console.log(`   Name: ${this.projectInfo.name}`);
      console.log(`   Dependencies: ${this.projectInfo.dependencies}`);
      console.log(`   Has GraphQL: ${this.projectInfo.hasGraphQL ? 'Yes' : 'No'}`);
      console.log(`   Has Mongoose: ${this.projectInfo.hasMongoose ? 'Yes' : 'No'}`);
      console.log(`   Has TypeORM: ${this.projectInfo.hasTypeORM ? 'Yes' : 'No'}\n`);
    }
  }

  private async runFullAnalysis(): Promise<void> {
    console.log('🔍 Running Full Analysis...\n');
    console.log(`   Project Path: ${this.projectPath}`);
    console.log(`   Expected to analyze ~3,458 files\n`);
    
    const startTime = Date.now();
    
    try {
      const analyzer = new DependencyAnalyzer();
      this.analysisData = await analyzer.analyzeDependencies(this.projectPath);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`   ✅ Analysis completed in ${duration}s`);
      console.log(`   📊 Components: ${this.analysisData.components?.length || 0}`);
      console.log(`   📊 Dependencies: ${this.analysisData.dependencies?.length || 0}`);
      console.log(`   📊 Security Issues: ${this.analysisData.security?.issues?.length || 0}`);
      console.log(`   📊 Code Smells: ${this.analysisData.codeSmells?.smells?.length || 0}`);
      console.log(`   📊 API Endpoints: ${this.analysisData.api?.endpoints?.length || 0}`);
      console.log(`   📊 Database Entities: ${this.analysisData.database?.entities?.length || 0}\n`);
      
      // Save raw data
      const outputPath = path.join(process.cwd(), 'real-project-analysis.json');
      fs.writeFileSync(outputPath, JSON.stringify(this.analysisData, null, 2));
      console.log(`   💾 Raw data saved to: real-project-analysis.json\n`);
      
    } catch (error: any) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  private validatePhase1BasicMetrics(): void {
    console.log('═'.repeat(68));
    console.log('PHASE 1: BASIC METRICS VALIDATION');
    console.log('═'.repeat(68) + '\n');
    
    // 1. Components
    this.validateField({
      field: 'components.count',
      category: 'Phase 1 - Components',
      expected: '> 1000 (3,458 files should yield many components)',
      actual: this.analysisData.components?.length || 0,
      status: (this.analysisData.components?.length || 0) > 1000 ? 'PASS' : 'WARN',
      importance: 'HIGH',
      notes: 'Large project with 3,458 files should have 1000+ components'
    });
    
    if (this.analysisData.components?.length > 0) {
      const sample = this.analysisData.components[0];
      
      this.validateField({
        field: 'components[0].id',
        category: 'Phase 1 - Components',
        expected: 'UUID string',
        actual: sample.id,
        status: sample.id ? 'PASS' : 'FAIL',
        importance: 'CRITICAL'
      });
      
      this.validateField({
        field: 'components[0].name',
        category: 'Phase 1 - Components',
        expected: 'Non-empty string',
        actual: sample.name,
        status: sample.name ? 'PASS' : 'FAIL',
        importance: 'CRITICAL'
      });
      
      this.validateField({
        field: 'components[0].type',
        category: 'Phase 1 - Components',
        expected: 'class|function|interface|type|module',
        actual: sample.type,
        status: ['class', 'function', 'interface', 'type', 'module'].includes(sample.type) ? 'PASS' : 'FAIL',
        importance: 'HIGH'
      });
    }
    
    // 2. Dependencies
    this.validateField({
      field: 'dependencies.count',
      category: 'Phase 1 - Dependencies',
      expected: '> 500 (large project)',
      actual: this.analysisData.dependencies?.length || 0,
      status: (this.analysisData.dependencies?.length || 0) > 500 ? 'PASS' : 'WARN',
      importance: 'HIGH',
      notes: 'GraphQL + Mongoose project should have many dependencies'
    });
    
    // 3. Complexity Metrics
    const metrics = this.analysisData.metrics || {};
    
    if (metrics.averageCognitiveComplexity && metrics.averageCyclomaticComplexity) {
      const ratio = metrics.averageCognitiveComplexity / metrics.averageCyclomaticComplexity;
      
      this.validateField({
        field: 'metrics.cognitiveComplexityRatio',
        category: 'Phase 1 - Complexity',
        expected: '1.5 - 3.5x cyclomatic',
        actual: ratio.toFixed(2) + 'x',
        status: ratio >= 1.5 && ratio <= 3.5 ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'FIX VALIDATION: Cognitive should be 1.5-3x cyclomatic (not 6x)'
      });
    }
    
    if (metrics.totalLinesOfCode) {
      this.validateField({
        field: 'metrics.totalLinesOfCode',
        category: 'Phase 1 - Complexity',
        expected: '> 50,000 LOC',
        actual: metrics.totalLinesOfCode,
        status: metrics.totalLinesOfCode > 50000 ? 'PASS' : 'INFO',
        importance: 'MEDIUM',
        notes: '3,458 files should have substantial LOC'
      });
    }
    
    // 4. Architecture Patterns
    const patterns = this.analysisData.architecturePatterns || [];
    
    this.validateField({
      field: 'architecturePatterns.detected',
      category: 'Phase 1 - Architecture',
      expected: 'At least 2 patterns (MVC, Layered, etc.)',
      actual: patterns.map((p: any) => p.name).join(', ') || 'None',
      status: patterns.length >= 2 ? 'PASS' : 'WARN',
      importance: 'MEDIUM',
      notes: 'GraphQL backend should show architectural patterns'
    });
    
    // 5. Insights
    const insights = this.analysisData.insights || [];
    
    this.validateField({
      field: 'insights.count',
      category: 'Phase 1 - Insights',
      expected: '> 5 insights',
      actual: insights.length,
      status: insights.length > 5 ? 'PASS' : 'WARN',
      importance: 'MEDIUM',
      notes: 'Large project should generate multiple insights'
    });
    
    console.log('');
  }

  private validatePhase2AdvancedMetrics(): void {
    console.log('═'.repeat(68));
    console.log('PHASE 2: ADVANCED METRICS VALIDATION');
    console.log('═'.repeat(68) + '\n');
    
    // 1. Security Analysis
    const security = this.analysisData.security || {};
    const securityIssues = security.issues || [];
    
    this.validateField({
      field: 'security.issues.count',
      category: 'Phase 2 - Security',
      expected: '< 500 issues (no fake magic numbers)',
      actual: securityIssues.length,
      status: securityIssues.length < 500 ? 'PASS' : 'WARN',
      importance: 'HIGH',
      notes: 'Should not have thousands of false magic number issues'
    });
    
    if (securityIssues.length > 0) {
      const issueTypes = [...new Set(securityIssues.map((i: any) => i.type))];
      
      this.validateField({
        field: 'security.issueTypes',
        category: 'Phase 2 - Security',
        expected: 'Real vulnerabilities only',
        actual: issueTypes.join(', '),
        status: 'INFO',
        importance: 'HIGH',
        notes: 'Issue types should be legitimate security concerns'
      });
    }
    
    // 2. Code Smells
    const codeSmells = this.analysisData.codeSmells || {};
    const smells = codeSmells.smells || [];
    
    this.validateField({
      field: 'codeSmells.count',
      category: 'Phase 2 - Code Smells',
      expected: '> 200 smells',
      actual: smells.length,
      status: smells.length > 200 ? 'PASS' : 'WARN',
      importance: 'MEDIUM',
      notes: 'Large project (3,458 files) should have many code smells'
    });
    
    const smellTypes = [...new Set(smells.map((s: any) => s.type))];
    
    this.validateField({
      field: 'codeSmells.types',
      category: 'Phase 2 - Code Smells',
      expected: 'Multiple types (bloaters, dispensables, etc.)',
      actual: smellTypes.join(', '),
      status: smellTypes.length >= 3 ? 'PASS' : 'WARN',
      importance: 'MEDIUM',
      notes: 'Should detect various code smell categories'
    });
    
    // 3. API Analysis (GraphQL)
    const api = this.analysisData.api || {};
    const documentation = api.documentation || {};
    
    if (this.projectInfo.hasGraphQL) {
      this.validateField({
        field: 'api.hasGraphQL',
        category: 'Phase 2 - API (GraphQL)',
        expected: 'true (project uses Apollo/GraphQL)',
        actual: documentation.hasGraphQL,
        status: documentation.hasGraphQL === true ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'FIX VALIDATION: Should detect GraphQL from package.json'
      });
      
      this.validateField({
        field: 'api.hasOpenAPI',
        category: 'Phase 2 - API (GraphQL)',
        expected: 'false (GraphQL not OpenAPI)',
        actual: documentation.hasOpenAPI,
        status: documentation.hasOpenAPI === false ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'FIX VALIDATION: GraphQL should NOT show OpenAPI flag'
      });
      
      this.validateField({
        field: 'api.apiType',
        category: 'Phase 2 - API (GraphQL)',
        expected: 'GraphQL',
        actual: documentation.apiType,
        status: documentation.apiType === 'GraphQL' ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'FIX VALIDATION: API type should be GraphQL'
      });
    }
    
    const endpoints = api.endpoints || [];
    
    this.validateField({
      field: 'api.endpoints.count',
      category: 'Phase 2 - API',
      expected: '> 0 endpoints (if detected)',
      actual: endpoints.length,
      status: endpoints.length > 0 ? 'PASS' : 'INFO',
      importance: 'MEDIUM',
      notes: 'GraphQL may not have REST endpoints'
    });
    
    // 4. Database Analysis (Mongoose)
    const database = this.analysisData.database || {};
    
    if (this.projectInfo.hasMongoose) {
      this.validateField({
        field: 'database.ormType',
        category: 'Phase 2 - Database (Mongoose)',
        expected: 'mongoose (not typeorm)',
        actual: database.ormType,
        status: database.ormType === 'mongoose' ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'FIX VALIDATION: Mongoose should be prioritized for MongoDB'
      });
      
      this.validateField({
        field: 'database.dialect',
        category: 'Phase 2 - Database (Mongoose)',
        expected: 'mongodb',
        actual: database.dialect,
        status: database.dialect === 'mongodb' ? 'PASS' : 'FAIL',
        importance: 'HIGH',
        notes: 'FIX VALIDATION: Should auto-detect MongoDB from Mongoose'
      });
    }
    
    const entities = database.entities || [];
    
    this.validateField({
      field: 'database.entities.count',
      category: 'Phase 2 - Database',
      expected: '> 10 entities (MongoDB models)',
      actual: entities.length,
      status: entities.length > 10 ? 'PASS' : 'WARN',
      importance: 'MEDIUM',
      notes: 'Large project should have multiple database entities'
    });
    
    // 5. Enhanced Metrics
    const enhancedMetrics = this.analysisData.metrics || {};
    
    this.validateField({
      field: 'metrics.halstead',
      category: 'Phase 2 - Metrics',
      expected: 'Present',
      actual: enhancedMetrics.halstead ? 'Present' : 'Missing',
      status: enhancedMetrics.halstead ? 'PASS' : 'WARN',
      importance: 'MEDIUM',
      notes: 'Phase 2 should include Halstead metrics'
    });
    
    this.validateField({
      field: 'metrics.coupling',
      category: 'Phase 2 - Metrics',
      expected: 'Present',
      actual: enhancedMetrics.coupling ? 'Present' : 'Missing',
      status: enhancedMetrics.coupling ? 'PASS' : 'WARN',
      importance: 'MEDIUM',
      notes: 'Phase 2 should include coupling metrics'
    });
    
    console.log('');
  }

  private validateCriticalFixes(): void {
    console.log('═'.repeat(68));
    console.log('CRITICAL FIXES VALIDATION');
    console.log('═'.repeat(68) + '\n');
    
    // FIX 1: Magic Numbers NOT in Security Issues
    const securityIssues = this.analysisData.security?.issues || [];
    const hasMagicNumbersInSecurity = securityIssues.some((issue: any) =>
      issue.description?.toLowerCase().includes('magic number') ||
      issue.type?.toLowerCase().includes('magic')
    );
    
    this.validateField({
      field: 'FIX_1: security.noMagicNumbers',
      category: 'Critical Fix Validation',
      expected: 'No magic numbers in security issues',
      actual: hasMagicNumbersInSecurity ? 'FOUND MAGIC NUMBERS!' : 'Clean',
      status: !hasMagicNumbersInSecurity ? 'PASS' : 'FAIL',
      importance: 'CRITICAL',
      notes: 'Magic numbers should ONLY be in codeSmells, not security'
    });
    
    // FIX 2: HTTP Codes Excluded from Magic Numbers
    const smells = this.analysisData.codeSmells?.smells || [];
    const magicNumbers = smells.filter((s: any) => s.type === 'MAGIC_NUMBERS');
    const hasCommonHttpCodes = magicNumbers.some((s: any) =>
      s.description?.includes('200') ||
      s.description?.includes('404') ||
      s.description?.includes('500') ||
      s.description?.includes('3000') ||
      s.description?.includes('8080')
    );
    
    this.validateField({
      field: 'FIX_2: codeSmells.excludeCommonCodes',
      category: 'Critical Fix Validation',
      expected: 'HTTP codes (200, 404, 500) and ports (3000, 8080) excluded',
      actual: hasCommonHttpCodes ? 'Common codes found' : 'Excluded correctly',
      status: !hasCommonHttpCodes ? 'PASS' : 'FAIL',
      importance: 'CRITICAL',
      notes: 'Common HTTP codes and ports should be excluded from magic numbers'
    });
    
    // FIX 3: GraphQL Detection (if applicable)
    if (this.projectInfo.hasGraphQL) {
      const hasGraphQL = this.analysisData.api?.documentation?.hasGraphQL === true;
      const hasOpenAPI = this.analysisData.api?.documentation?.hasOpenAPI === true;
      
      this.validateField({
        field: 'FIX_3: api.graphqlDetection',
        category: 'Critical Fix Validation',
        expected: 'hasGraphQL: true, hasOpenAPI: false',
        actual: { hasGraphQL, hasOpenAPI },
        status: hasGraphQL && !hasOpenAPI ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'GraphQL projects should NOT show OpenAPI flag'
      });
    }
    
    // FIX 4: Mongoose Prioritization (if applicable)
    if (this.projectInfo.hasMongoose) {
      const ormType = this.analysisData.database?.ormType;
      const dialect = this.analysisData.database?.dialect;
      
      this.validateField({
        field: 'FIX_4: database.mongoosePriority',
        category: 'Critical Fix Validation',
        expected: 'orm: mongoose, dialect: mongodb',
        actual: { ormType, dialect },
        status: ormType === 'mongoose' && dialect === 'mongodb' ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'Mongoose should be prioritized for MongoDB (not TypeORM)'
      });
    }
    
    // FIX 5: Cognitive Complexity Ratio
    const metrics = this.analysisData.metrics || {};
    if (metrics.averageCognitiveComplexity && metrics.averageCyclomaticComplexity) {
      const ratio = metrics.averageCognitiveComplexity / metrics.averageCyclomaticComplexity;
      
      this.validateField({
        field: 'FIX_5: metrics.cognitiveComplexityRatio',
        category: 'Critical Fix Validation',
        expected: '1.5 - 3.5x cyclomatic (not 6x)',
        actual: ratio.toFixed(2) + 'x',
        status: ratio >= 1.5 && ratio <= 3.5 ? 'PASS' : 'FAIL',
        importance: 'CRITICAL',
        notes: 'Cognitive complexity should be within reasonable ratio'
      });
    }
    
    console.log('');
  }

  private validateField(validation: FieldValidation): void {
    this.validations.push(validation);
  }

  private generateDetailedReport(): void {
    console.log('═'.repeat(68));
    console.log('VALIDATION REPORT');
    console.log('═'.repeat(68) + '\n');
    
    const critical = this.validations.filter(v => v.importance === 'CRITICAL');
    const high = this.validations.filter(v => v.importance === 'HIGH');
    const medium = this.validations.filter(v => v.importance === 'MEDIUM');
    const low = this.validations.filter(v => v.importance === 'LOW');
    
    const passed = this.validations.filter(v => v.status === 'PASS').length;
    const failed = this.validations.filter(v => v.status === 'FAIL').length;
    const warned = this.validations.filter(v => v.status === 'WARN').length;
    const info = this.validations.filter(v => v.status === 'INFO').length;
    const total = this.validations.length;
    
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log('📊 Overall Summary:');
    console.log(`   Total Validations: ${total}`);
    console.log(`   ✅ Passed: ${passed} (${passRate}%)`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️  Warnings: ${warned}`);
    console.log(`   ℹ️  Info: ${info}`);
    console.log('');
    
    console.log('📋 By Importance:');
    console.log(`   🔴 Critical: ${critical.filter(v => v.status === 'PASS').length}/${critical.length} passed`);
    console.log(`   🟠 High: ${high.filter(v => v.status === 'PASS').length}/${high.length} passed`);
    console.log(`   🟡 Medium: ${medium.filter(v => v.status === 'PASS').length}/${medium.length} passed`);
    console.log('');
    
    // Critical Failures
    const criticalFailures = critical.filter(v => v.status === 'FAIL');
    if (criticalFailures.length > 0) {
      console.log('🔴 CRITICAL FAILURES:');
      criticalFailures.forEach(f => {
        console.log(`\n   ❌ ${f.field}`);
        console.log(`      Expected: ${JSON.stringify(f.expected)}`);
        console.log(`      Actual:   ${JSON.stringify(f.actual)}`);
        if (f.notes) console.log(`      Note:     ${f.notes}`);
      });
      console.log('');
    }
    
    // Show all Critical Fix validations
    const fixValidations = this.validations.filter(v => v.field.startsWith('FIX_'));
    if (fixValidations.length > 0) {
      console.log('✅ CRITICAL FIXES STATUS:');
      fixValidations.forEach(f => {
        const icon = f.status === 'PASS' ? '✅' : '❌';
        console.log(`   ${icon} ${f.field.replace('FIX_', 'Fix ')}: ${f.status}`);
        console.log(`      ${f.notes}`);
      });
      console.log('');
    }
    
    console.log('═'.repeat(68));
    
    if (failed > 0) {
      console.log(`\n⚠️  ${failed} validation(s) failed. Review details above.\n`);
    } else if (warned > 0) {
      console.log(`\n✅ All critical validations passed! ${warned} warning(s) noted.\n`);
    } else {
      console.log('\n🎉 ALL VALIDATIONS PASSED PERFECTLY!\n');
    }
  }

  private saveResults(): void {
    const reportPath = path.join(process.cwd(), 'real-project-validation-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      project: this.projectInfo,
      projectPath: this.projectPath,
      summary: {
        total: this.validations.length,
        passed: this.validations.filter(v => v.status === 'PASS').length,
        failed: this.validations.filter(v => v.status === 'FAIL').length,
        warned: this.validations.filter(v => v.status === 'WARN').length,
        info: this.validations.filter(v => v.status === 'INFO').length,
      },
      criticalFixes: {
        magicNumbersInSecurity: this.validations.find(v => v.field === 'FIX_1: security.noMagicNumbers')?.status,
        httpCodesExcluded: this.validations.find(v => v.field === 'FIX_2: codeSmells.excludeCommonCodes')?.status,
        graphqlDetection: this.validations.find(v => v.field === 'FIX_3: api.graphqlDetection')?.status,
        mongoosePriority: this.validations.find(v => v.field === 'FIX_4: database.mongoosePriority')?.status,
        cognitiveComplexityRatio: this.validations.find(v => v.field === 'FIX_5: metrics.cognitiveComplexityRatio')?.status,
      },
      validations: this.validations,
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
    console.log(`📄 Detailed report saved to: real-project-validation-report.json\n`);
  }
}

// Run validation
const validator = new RealProjectValidator();
validator.run().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
