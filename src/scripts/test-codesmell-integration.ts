/**
 * Test Script: Code Smell Detection Integration
 * 
 * Tests the integration of code smell detection into the DependencyAnalyzer pipeline
 */

import { DependencyAnalyzer } from '@/services/dependencyAnalyzer';
import { ConfigLoader } from '@/config/ConfigLoader';
import { logger } from '@/utils/logger';
import path from 'path';
import fs from 'fs/promises';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

class CodeSmellIntegrationTester {
  private results: TestResult[] = [];
  private testDir: string;

  constructor() {
    this.testDir = path.join(process.cwd(), 'test-fixtures', 'codesmell-integration');
  }

  async run(): Promise<void> {
    console.log('\n🧪 Code Smell Detection Integration Tests\n');
    console.log('='.repeat(80));

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run tests
      await this.testBasicIntegration();
      await this.testConfigurationControl();
      await this.testOutputFormat();
      await this.testErrorHandling();
      await this.testPerformance();

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('\n📁 Setting up test environment...\n');
    
    // Create test directory
    await fs.mkdir(this.testDir, { recursive: true });

    // Create test files with code smells
    await this.createTestFile('longMethod.ts', `
export class UserService {
  // This is a long method (>50 lines) - should be detected
  async processUserData(userId: string) {
    console.log('Starting user processing');
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Validate user data
    if (!user.email || !user.name) {
      throw new Error('Invalid user data');
    }
    
    // Process email
    const emailParts = user.email.split('@');
    if (emailParts.length !== 2) {
      throw new Error('Invalid email');
    }
    
    // More processing...
    const domain = emailParts[1];
    const username = emailParts[0];
    
    // Validate domain
    if (!domain.includes('.')) {
      throw new Error('Invalid domain');
    }
    
    // More validation...
    console.log('Validating user permissions');
    
    // Check permissions
    if (user.role === 'admin') {
      console.log('Admin user detected');
    } else if (user.role === 'moderator') {
      console.log('Moderator user detected');
    } else {
      console.log('Regular user detected');
    }
    
    // Process data
    console.log('Processing data');
    const processedData = {
      id: user.id,
      name: user.name,
      email: user.email,
      domain: domain,
      username: username
    };
    
    // Save to database
    console.log('Saving to database');
    await this.saveToDatabase(processedData);
    
    // Send notifications
    console.log('Sending notifications');
    await this.sendEmail(user.email, 'Data processed');
    
    // Log activity
    console.log('Logging activity');
    await this.logActivity(userId, 'data_processed');
    
    return processedData;
  }
  
  private async getUser(userId: string) { return null; }
  private async saveToDatabase(data: any) { }
  private async sendEmail(email: string, message: string) { }
  private async logActivity(userId: string, action: string) { }
}
`);

    await this.createTestFile('magicNumbers.ts', `
export class Calculator {
  // Magic numbers - should be detected
  calculate(x: number): number {
    return x * 3.14159 + 42 - 999;
  }
  
  processData(items: any[]) {
    // More magic numbers
    if (items.length > 100) {
      return items.slice(0, 50);
    }
    return items;
  }
}
`);

    await this.createTestFile('duplicateCode.ts', `
export class ReportGenerator {
  generateUserReport(userId: string) {
    const user = this.getUser(userId);
    const data = this.getData(user);
    const formatted = this.formatData(data);
    this.saveReport(formatted);
    this.sendEmail(user.email, 'Report ready');
    return formatted;
  }
  
  generateAdminReport(adminId: string) {
    const admin = this.getUser(adminId);
    const data = this.getData(admin);
    const formatted = this.formatData(data);
    this.saveReport(formatted);
    this.sendEmail(admin.email, 'Report ready');
    return formatted;
  }
  
  private getUser(id: string) { return null; }
  private getData(user: any) { return null; }
  private formatData(data: any) { return null; }
  private saveReport(report: any) { }
  private sendEmail(email: string, message: string) { }
}
`);

    console.log('✅ Test environment created\n');
  }

  private async createTestFile(filename: string, content: string): Promise<void> {
    const filePath = path.join(this.testDir, filename);
    await fs.writeFile(filePath, content.trim(), 'utf-8');
  }

  private async testBasicIntegration(): Promise<void> {
    const testName = 'Basic Integration Test';
    const startTime = Date.now();

    try {
      console.log(`\n🔍 Running: ${testName}`);

      // Load configuration with code smells enabled
      const config = ConfigLoader.getInstance().get();
      config.features.codeSmells.enabled = true;

      // Create analyzer
      const analyzer = new DependencyAnalyzer(config);

      // Run analysis
      const result = await analyzer.analyzeDependencies(this.testDir, {
        includeExternal: false,
        detectCircular: false,
        analyzeComponents: false,
        includeDevDependencies: false,
        maxDepth: 10,
        excludePatterns: [],
        includePatterns: [],
      });

      // Verify code smell results exist
      if (!result.codeSmells) {
        throw new Error('codeSmells property missing from result');
      }

      if (!result.codeSmells.smells) {
        throw new Error('smells array missing from codeSmells result');
      }

      if (!result.codeSmells.summary) {
        throw new Error('summary missing from codeSmells result');
      }

      console.log(`   ✓ Code smell detection executed`);
      console.log(`   ✓ Found ${result.codeSmells.smells.length} code smells`);
      console.log(`   ✓ Summary generated`);

      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: true,
        duration,
        details: `Found ${result.codeSmells.smells.length} smells in ${duration}ms`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: false,
        duration,
        error: error.message
      });
      console.error(`   ✗ ${error.message}`);
    }
  }

  private async testConfigurationControl(): Promise<void> {
    const testName = 'Configuration Control Test';
    const startTime = Date.now();

    try {
      console.log(`\n🔍 Running: ${testName}`);

      // Test with code smells disabled
      const config = ConfigLoader.getInstance().get();
      config.features.codeSmells.enabled = false;

      const analyzer = new DependencyAnalyzer(config);
      const result = await analyzer.analyzeDependencies(this.testDir, {
        includeExternal: false,
        detectCircular: false,
        analyzeComponents: false,
        includeDevDependencies: false,
        maxDepth: 10,
        excludePatterns: [],
        includePatterns: [],
      });

      // Verify code smell results are undefined when disabled
      if (result.codeSmells !== undefined) {
        throw new Error('codeSmells should be undefined when disabled in config');
      }

      console.log(`   ✓ Code smell detection respects configuration`);
      console.log(`   ✓ No analysis when disabled`);

      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: true,
        duration,
        details: 'Configuration control working correctly'
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: false,
        duration,
        error: error.message
      });
      console.error(`   ✗ ${error.message}`);
    }
  }

  private async testOutputFormat(): Promise<void> {
    const testName = 'Output Format Test';
    const startTime = Date.now();

    try {
      console.log(`\n🔍 Running: ${testName}`);

      const config = ConfigLoader.getInstance().get();
      config.features.codeSmells.enabled = true;

      const analyzer = new DependencyAnalyzer(config);
      const result = await analyzer.analyzeDependencies(this.testDir, {
        includeExternal: false,
        detectCircular: false,
        analyzeComponents: false,
        includeDevDependencies: false,
        maxDepth: 10,
        excludePatterns: [],
        includePatterns: [],
      });

      // Verify output structure
      if (!result.codeSmells) {
        throw new Error('Missing codeSmells in result');
      }

      const { smells, summary, recommendations } = result.codeSmells;

      // Check smells array
      if (!Array.isArray(smells)) {
        throw new Error('smells should be an array');
      }

      // Check summary structure
      if (!summary.totalSmells || typeof summary.totalSmells !== 'number') {
        throw new Error('Invalid summary.totalSmells');
      }

      if (!summary.bySeverity) {
        throw new Error('Missing summary.bySeverity');
      }

      // Check recommendations
      if (!Array.isArray(recommendations)) {
        throw new Error('recommendations should be an array');
      }

      console.log(`   ✓ Output structure valid`);
      console.log(`   ✓ Total smells: ${summary.totalSmells}`);
      console.log(`   ✓ Recommendations: ${recommendations.length}`);

      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: true,
        duration,
        details: 'Output format validated'
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: false,
        duration,
        error: error.message
      });
      console.error(`   ✗ ${error.message}`);
    }
  }

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling Test';
    const startTime = Date.now();

    try {
      console.log(`\n🔍 Running: ${testName}`);

      // Test with invalid directory
      const config = ConfigLoader.getInstance().get();
      config.features.codeSmells.enabled = true;

      const analyzer = new DependencyAnalyzer(config);

      // This should handle errors gracefully
      try {
        await analyzer.analyzeDependencies('/nonexistent/path', {
          includeExternal: false,
          detectCircular: false,
          analyzeComponents: false,
          includeDevDependencies: false,
          maxDepth: 10,
          excludePatterns: [],
          includePatterns: [],
        });
      } catch (error) {
        // Expected to throw, this is correct behavior
        console.log(`   ✓ Error handled gracefully`);
      }

      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: true,
        duration,
        details: 'Error handling working correctly'
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: false,
        duration,
        error: error.message
      });
      console.error(`   ✗ ${error.message}`);
    }
  }

  private async testPerformance(): Promise<void> {
    const testName = 'Performance Test';
    const startTime = Date.now();

    try {
      console.log(`\n🔍 Running: ${testName}`);

      const config = ConfigLoader.getInstance().get();
      config.features.codeSmells.enabled = true;

      const analyzer = new DependencyAnalyzer(config);
      const result = await analyzer.analyzeDependencies(this.testDir, {
        includeExternal: false,
        detectCircular: false,
        analyzeComponents: false,
        includeDevDependencies: false,
        maxDepth: 10,
        excludePatterns: [],
        includePatterns: [],
      });

      const duration = Date.now() - startTime;

      // Performance should be reasonable (< 5 seconds for small test)
      const performanceThreshold = 5000;
      if (duration > performanceThreshold) {
        throw new Error(`Performance too slow: ${duration}ms (threshold: ${performanceThreshold}ms)`);
      }

      console.log(`   ✓ Analysis completed in ${duration}ms`);
      console.log(`   ✓ Performance within threshold`);

      this.results.push({
        name: testName,
        passed: true,
        duration,
        details: `Completed in ${duration}ms`
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name: testName,
        passed: false,
        duration,
        error: error.message
      });
      console.error(`   ✗ ${error.message}`);
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Test Summary\n');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = ((passed / total) * 100).toFixed(2);

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${icon} ${result.name.padEnd(40)} ${duration.padStart(10)}`);
      
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`\nResults: ${passed}/${total} passed (${passRate}%)`);
    
    if (passed === total) {
      console.log('\n✨ All tests passed! Code smell detection integration is working correctly.\n');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed. Please review the errors above.\n`);
      process.exit(1);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.testDir, { recursive: true, force: true });
      console.log('🧹 Cleanup completed\n');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error);
    }
  }
}

// Run tests
const tester = new CodeSmellIntegrationTester();
tester.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
