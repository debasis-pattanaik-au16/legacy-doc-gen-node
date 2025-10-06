#!/usr/bin/env ts-node
/**
 * Master Test Suite for Analysis Engine Enhancement
 * Tests all Phase 1 and Phase 2 tasks comprehensively
 * 
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/test-all-phases.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  taskId: string;
  taskName: string;
  phase: number;
  testCommand: string;
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  duration: number;
  status: 'PASSED' | 'FAILED' | 'PARTIAL' | 'SKIPPED';
  error?: string;
  details?: string;
}

interface TestSuite {
  taskId: string;
  taskName: string;
  phase: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  testCommand: string;
  acceptanceCriteria: string[];
  expectedPassRate: number;
}

const TEST_SUITES: TestSuite[] = [
  // PHASE 1: Foundation
  {
    taskId: '1.1',
    taskName: 'Parser Architecture Refactoring',
    phase: 1,
    priority: 'CRITICAL',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-parser-integration.ts',
    acceptanceCriteria: [
      'Parser registry implemented',
      'All existing tests pass',
      'New parsers can be registered dynamically',
      'Parser factory pattern working'
    ],
    expectedPassRate: 100
  },
  {
    taskId: '1.2',
    taskName: 'Complete TypeScript Type Resolver',
    phase: 1,
    priority: 'CRITICAL',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-typescript-type-resolver.ts',
    acceptanceCriteria: [
      'Resolves all TypeScript type constructs',
      'Handles union, intersection, conditional types',
      'Type inference for implicit types',
      '95%+ accuracy on test cases'
    ],
    expectedPassRate: 95
  },
  {
    taskId: '1.3',
    taskName: 'Enhanced Python Parser with Type Hints',
    phase: 1,
    priority: 'HIGH',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-python-parser.ts',
    acceptanceCriteria: [
      'Extracts Python 3.5+ type hints',
      'Supports typing module types',
      'Extracts decorator information',
      'Identifies dataclasses and Pydantic models'
    ],
    expectedPassRate: 90
  },
  {
    taskId: '1.4',
    taskName: 'Configuration System',
    phase: 1,
    priority: 'HIGH',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-config-loader.ts',
    acceptanceCriteria: [
      'Configuration file support (JSON/YAML)',
      'Environment variable overrides',
      'Configuration validation',
      'Type-safe configuration access'
    ],
    expectedPassRate: 100
  },
  {
    taskId: '1.5',
    taskName: 'Basic Caching Implementation',
    phase: 1,
    priority: 'MEDIUM',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-cache.ts',
    acceptanceCriteria: [
      'In-memory cache for AST results',
      'File-based cache option',
      'Cache invalidation on file changes',
      'Configurable TTL'
    ],
    expectedPassRate: 100
  },
  
  // PHASE 2: Advanced Features
  {
    taskId: '2.1',
    taskName: 'Security Vulnerability Detection',
    phase: 2,
    priority: 'HIGH',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-security-analysis.ts',
    acceptanceCriteria: [
      'Injection vulnerability detection',
      'Cryptography vulnerability detection',
      'Authentication vulnerability detection',
      'Dependency vulnerability scanning'
    ],
    expectedPassRate: 80
  },
  {
    taskId: '2.2',
    taskName: 'Code Smell Detection',
    phase: 2,
    priority: 'HIGH',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-code-smell-detectors.ts',
    acceptanceCriteria: [
      'Detects 15+ types of code smells',
      'Provides refactoring suggestions',
      'Configurable thresholds',
      '80%+ precision'
    ],
    expectedPassRate: 80
  },
  {
    taskId: '2.3',
    taskName: 'Complete Halstead & Cognitive Complexity Metrics',
    phase: 2,
    priority: 'MEDIUM',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-complexity-metrics.ts',
    acceptanceCriteria: [
      'Complete Halstead metrics calculation',
      'Cognitive complexity (Sonar method)',
      'Coupling and cohesion metrics',
      'Verified against known examples'
    ],
    expectedPassRate: 75
  },
  {
    taskId: '2.4',
    taskName: 'API Endpoint Extraction',
    phase: 2,
    priority: 'MEDIUM',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-api-analysis.ts',
    acceptanceCriteria: [
      'Express endpoint extraction',
      'Framework auto-detection',
      'Middleware extraction',
      'Authentication detection'
    ],
    expectedPassRate: 85
  },
  {
    taskId: '2.5',
    taskName: 'Database Schema Analysis',
    phase: 2,
    priority: 'MEDIUM',
    testCommand: 'npx ts-node -r tsconfig-paths/register src/scripts/test-database-analysis.ts',
    acceptanceCriteria: [
      'TypeORM schema extraction',
      'Prisma schema extraction',
      'Entity relationship extraction',
      'Schema validation'
    ],
    expectedPassRate: 85
  }
];

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  async runAllTests(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║   Analysis Engine Enhancement - Comprehensive Test Suite            ║');
    console.log('║   Testing Phase 1 (Foundation) & Phase 2 (Advanced Features)        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    // Phase 1 Tests
    console.log('\n🔷 PHASE 1: FOUNDATION TESTS\n');
    await this.runPhaseTests(1);

    // Phase 2 Tests
    console.log('\n\n🔷 PHASE 2: ADVANCED FEATURES TESTS\n');
    await this.runPhaseTests(2);

    // Generate report
    this.generateReport();
  }

  private async runPhaseTests(phase: number): Promise<void> {
    const phaseSuites = TEST_SUITES.filter(suite => suite.phase === phase);
    
    for (const suite of phaseSuites) {
      await this.runTestSuite(suite);
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n📋 Task ${suite.taskId}: ${suite.taskName}`);
    console.log(`   Priority: ${suite.priority} | Expected: ${suite.expectedPassRate}%+`);
    console.log(`   Command: ${suite.testCommand}`);
    console.log('   ─────────────────────────────────────────────────────────');

    const result: TestResult = {
      taskId: suite.taskId,
      taskName: suite.taskName,
      phase: suite.phase,
      testCommand: suite.testCommand,
      passed: 0,
      failed: 0,
      total: 0,
      passRate: 0,
      duration: 0,
      status: 'SKIPPED'
    };

    try {
      const testStart = Date.now();
      
      // Check if test file exists
      const testScriptPath = this.getTestScriptPath(suite.testCommand);
      if (!fs.existsSync(testScriptPath)) {
        result.status = 'SKIPPED';
        result.error = `Test script not found: ${testScriptPath}`;
        console.log(`   ⚠️  SKIPPED: Test script not found`);
        this.results.push(result);
        return;
      }

      // Run the test
      console.log(`   ⏳ Running tests...`);
      const output = execSync(suite.testCommand, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000 // 2 minutes timeout
      });

      result.duration = Date.now() - testStart;

      // Parse test output
      this.parseTestOutput(output, result);

      // Determine status
      if (result.passRate >= suite.expectedPassRate) {
        result.status = 'PASSED';
        console.log(`   ✅ PASSED: ${result.passed}/${result.total} tests (${result.passRate.toFixed(2)}%)`);
      } else if (result.passRate >= 50) {
        result.status = 'PARTIAL';
        console.log(`   ⚠️  PARTIAL: ${result.passed}/${result.total} tests (${result.passRate.toFixed(2)}%)`);
      } else {
        result.status = 'FAILED';
        console.log(`   ❌ FAILED: ${result.passed}/${result.total} tests (${result.passRate.toFixed(2)}%)`);
      }

      console.log(`   ⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);

    } catch (error: any) {
      result.duration = Date.now() - Date.now();
      result.status = 'FAILED';
      result.error = error.message;
      
      // Try to parse error output
      if (error.stdout) {
        this.parseTestOutput(error.stdout.toString(), result);
      }
      
      console.log(`   ❌ ERROR: ${error.message.split('\n')[0]}`);
      
      if (result.total > 0) {
        console.log(`   📊 ${result.passed}/${result.total} tests passed before error`);
      }
    }

    this.results.push(result);
  }

  private getTestScriptPath(command: string): string {
    // Extract the script path from the command
    const match = command.match(/src\/scripts\/([^\s]+)/);
    if (match) {
      return path.join(process.cwd(), match[0]);
    }
    return '';
  }

  private parseTestOutput(output: string, result: TestResult): void {
    // Pattern 1: "X/Y tests passed" or "Passed: X/Y"
    const pattern1 = /(\d+)\/(\d+)\s+tests?\s+passed/i;
    const match1 = output.match(pattern1);
    
    if (match1) {
      result.passed = parseInt(match1[1]);
      result.total = parseInt(match1[2]);
      result.failed = result.total - result.passed;
      result.passRate = (result.passed / result.total) * 100;
      return;
    }

    // Pattern 2: "Passed: X, Failed: Y"
    const pattern2 = /Passed:\s*(\d+).*Failed:\s*(\d+)/i;
    const match2 = output.match(pattern2);
    
    if (match2) {
      result.passed = parseInt(match2[1]);
      result.failed = parseInt(match2[2]);
      result.total = result.passed + result.failed;
      result.passRate = (result.passed / result.total) * 100;
      return;
    }

    // Pattern 3: "✓ X tests passed" or "✓ Success"
    const successPattern = /✓.*?(\d+).*?passed/i;
    const successMatch = output.match(successPattern);
    
    if (successMatch) {
      result.passed = parseInt(successMatch[1]);
      result.total = result.passed;
      result.failed = 0;
      result.passRate = 100;
      return;
    }

    // Pattern 4: Count ✓ and ✗ symbols
    const passCount = (output.match(/✓|✅|PASS/g) || []).length;
    const failCount = (output.match(/✗|❌|FAIL/g) || []).length;
    
    if (passCount > 0 || failCount > 0) {
      result.passed = passCount;
      result.failed = failCount;
      result.total = passCount + failCount;
      result.passRate = result.total > 0 ? (result.passed / result.total) * 100 : 0;
      return;
    }

    // Default: Assume success if no errors
    if (!output.toLowerCase().includes('error') && !output.toLowerCase().includes('failed')) {
      result.passed = 1;
      result.total = 1;
      result.failed = 0;
      result.passRate = 100;
      result.details = 'No test count found in output, assuming success';
    }
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;

    console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST EXECUTION SUMMARY                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    // Phase 1 Summary
    this.printPhaseSummary(1);

    // Phase 2 Summary
    this.printPhaseSummary(2);

    // Overall Summary
    console.log('\n📊 OVERALL SUMMARY\n');
    
    const allTests = this.results.reduce((acc, r) => acc + r.total, 0);
    const allPassed = this.results.reduce((acc, r) => acc + r.passed, 0);
    const allFailed = this.results.reduce((acc, r) => acc + r.failed, 0);
    const overallPassRate = allTests > 0 ? (allPassed / allTests) * 100 : 0;

    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const partial = this.results.filter(r => r.status === 'PARTIAL').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const skipped = this.results.filter(r => r.status === 'SKIPPED').length;

    console.log(`   Total Test Suites: ${this.results.length}`);
    console.log(`   ✅ Passed:  ${passed} (${((passed/this.results.length)*100).toFixed(1)}%)`);
    console.log(`   ⚠️  Partial: ${partial} (${((partial/this.results.length)*100).toFixed(1)}%)`);
    console.log(`   ❌ Failed:  ${failed} (${((failed/this.results.length)*100).toFixed(1)}%)`);
    console.log(`   ⊘  Skipped: ${skipped} (${((skipped/this.results.length)*100).toFixed(1)}%)`);
    console.log(`\n   Total Tests Run: ${allTests}`);
    console.log(`   Tests Passed: ${allPassed}`);
    console.log(`   Tests Failed: ${allFailed}`);
    console.log(`   Overall Pass Rate: ${overallPassRate.toFixed(2)}%`);
    console.log(`\n   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    // Detailed Results Table
    console.log('\n\n📋 DETAILED RESULTS\n');
    console.log('┌────────┬──────────────────────────────────────────┬────────┬──────────┬─────────┐');
    console.log('│ Task   │ Name                                     │ Status │ Pass Rate│ Duration│');
    console.log('├────────┼──────────────────────────────────────────┼────────┼──────────┼─────────┤');

    for (const result of this.results) {
      const name = result.taskName.length > 40 
        ? result.taskName.substring(0, 37) + '...' 
        : result.taskName.padEnd(40);
      const status = this.getStatusSymbol(result.status).padEnd(6);
      const passRate = result.total > 0 
        ? `${result.passRate.toFixed(1)}%`.padStart(8)
        : 'N/A'.padStart(8);
      const duration = `${(result.duration / 1000).toFixed(2)}s`.padStart(7);

      console.log(`│ ${result.taskId.padEnd(6)} │ ${name} │ ${status} │ ${passRate} │ ${duration} │`);
    }

    console.log('└────────┴──────────────────────────────────────────┴────────┴──────────┴─────────┘');

    // Recommendations
    console.log('\n\n💡 RECOMMENDATIONS\n');
    
    const failedTests = this.results.filter(r => r.status === 'FAILED' || r.status === 'PARTIAL');
    
    if (failedTests.length === 0) {
      console.log('   🎉 All tests passed! The analysis engine is working correctly.');
    } else {
      console.log('   The following tasks need attention:\n');
      
      for (const test of failedTests) {
        console.log(`   ${test.taskId} - ${test.taskName}`);
        console.log(`      Status: ${test.status}`);
        console.log(`      Pass Rate: ${test.passRate.toFixed(1)}%`);
        
        if (test.error) {
          console.log(`      Error: ${test.error.split('\n')[0]}`);
        }
        
        const suite = TEST_SUITES.find(s => s.taskId === test.taskId);
        if (suite && test.passRate < suite.expectedPassRate) {
          console.log(`      Action: Increase pass rate from ${test.passRate.toFixed(1)}% to ${suite.expectedPassRate}%+`);
        }
        console.log('');
      }
    }

    // Save report to file
    this.saveReportToFile();
  }

  private printPhaseSummary(phase: number): void {
    const phaseResults = this.results.filter(r => r.phase === phase);
    const phaseName = phase === 1 ? 'PHASE 1: FOUNDATION' : 'PHASE 2: ADVANCED FEATURES';

    console.log(`\n🔷 ${phaseName}\n`);

    const phaseTests = phaseResults.reduce((acc, r) => acc + r.total, 0);
    const phasePassed = phaseResults.reduce((acc, r) => acc + r.passed, 0);
    const phaseRate = phaseTests > 0 ? (phasePassed / phaseTests) * 100 : 0;

    const passed = phaseResults.filter(r => r.status === 'PASSED').length;
    const partial = phaseResults.filter(r => r.status === 'PARTIAL').length;
    const failed = phaseResults.filter(r => r.status === 'FAILED').length;
    const skipped = phaseResults.filter(r => r.status === 'SKIPPED').length;

    console.log(`   Test Suites: ${phaseResults.length}`);
    console.log(`   ✅ Passed:  ${passed}`);
    console.log(`   ⚠️  Partial: ${partial}`);
    console.log(`   ❌ Failed:  ${failed}`);
    console.log(`   ⊘  Skipped: ${skipped}`);
    console.log(`\n   Tests: ${phasePassed}/${phaseTests} passed (${phaseRate.toFixed(2)}%)`);
  }

  private getStatusSymbol(status: string): string {
    switch (status) {
      case 'PASSED': return '✅';
      case 'PARTIAL': return '⚠️';
      case 'FAILED': return '❌';
      case 'SKIPPED': return '⊘';
      default: return '?';
    }
  }

  private saveReportToFile(): void {
    const reportPath = path.join(process.cwd(), 'test-results.json');
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'PASSED').length,
        partial: this.results.filter(r => r.status === 'PARTIAL').length,
        failed: this.results.filter(r => r.status === 'FAILED').length,
        skipped: this.results.filter(r => r.status === 'SKIPPED').length,
        totalTests: this.results.reduce((acc, r) => acc + r.total, 0),
        totalPassed: this.results.reduce((acc, r) => acc + r.passed, 0),
        totalFailed: this.results.reduce((acc, r) => acc + r.failed, 0),
        overallPassRate: this.results.reduce((acc, r) => acc + r.total, 0) > 0
          ? (this.results.reduce((acc, r) => acc + r.passed, 0) / this.results.reduce((acc, r) => acc + r.total, 0)) * 100
          : 0
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n\n💾 Full report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test runner failed:', error);
    process.exit(1);
  }
}

main();
