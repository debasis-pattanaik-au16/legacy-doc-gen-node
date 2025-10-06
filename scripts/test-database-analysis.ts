/**
 * Database Analysis Integration Test
 * 
 * Tests the complete database schema analysis pipeline:
 * 1. Extract schema from TypeORM entities
 * 2. Detect schema issues
 * 3. Generate analysis report
 * 
 * Run with: ts-node scripts/test-database-analysis.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TypeORMExtractor } from '../src/analyzers/database/typeorm-extractor';
import { SchemaIssueDetector } from '../src/analyzers/database/schema-issue-detector';
import { DatabaseEntity, SchemaIssue, SchemaIssueType } from '../src/types/database';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Create temporary test directory
 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'db-analysis-test-'));
}

/**
 * Clean up temporary directory
 */
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create test file
 */
function createTestFile(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Print section header
 */
function printHeader(title: string): void {
  console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Print subsection
 */
function printSubsection(title: string): void {
  console.log(`\n${colors.blue}${colors.bright}${title}${colors.reset}`);
  console.log(`${colors.blue}${'-'.repeat(40)}${colors.reset}`);
}

/**
 * Print entity summary
 */
function printEntitySummary(entities: DatabaseEntity[]): void {
  printSubsection('Extracted Entities');
  
  entities.forEach(entity => {
    console.log(`\n${colors.green}${colors.bright}Table: ${entity.name}${colors.reset}`);
    console.log(`  Schema: ${entity.schema || 'default'}`);
    console.log(`  Columns: ${entity.columns.length}`);
    console.log(`  Indexes: ${entity.indexes.length}`);
    console.log(`  Relationships: ${entity.relationships.length}`);
    console.log(`  Constraints: ${entity.constraints.length}`);
    
    // Show some columns
    if (entity.columns.length > 0) {
      console.log(`\n  ${colors.cyan}Columns:${colors.reset}`);
      entity.columns.slice(0, 5).forEach(col => {
        const flags: string[] = [];
        if (col.primary) flags.push('PK');
        if (col.unique) flags.push('UNIQUE');
        if (!col.nullable) flags.push('NOT NULL');
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        console.log(`    - ${col.name}: ${col.type}${flagStr}`);
      });
      if (entity.columns.length > 5) {
        console.log(`    ... and ${entity.columns.length - 5} more`);
      }
    }
    
    // Show relationships
    if (entity.relationships.length > 0) {
      console.log(`\n  ${colors.cyan}Relationships:${colors.reset}`);
      entity.relationships.forEach(rel => {
        console.log(`    - ${rel.type} with ${rel.targetEntity}`);
      });
    }
  });
}

/**
 * Print issues by severity
 */
function printIssues(issues: SchemaIssue[]): void {
  printSubsection('Detected Issues');
  
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };
  
  console.log(`\nTotal Issues: ${colors.bright}${issues.length}${colors.reset}`);
  console.log(`  ${colors.red}Critical: ${bySeverity.critical.length}${colors.reset}`);
  console.log(`  ${colors.red}High: ${bySeverity.high.length}${colors.reset}`);
  console.log(`  ${colors.yellow}Medium: ${bySeverity.medium.length}${colors.reset}`);
  console.log(`  ${colors.blue}Low: ${bySeverity.low.length}${colors.reset}`);
  
  // Print critical and high issues in detail
  const importantIssues = [...bySeverity.critical, ...bySeverity.high];
  if (importantIssues.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Critical & High Severity Issues:${colors.reset}`);
    importantIssues.forEach((issue, index) => {
      const severityColor = issue.severity === 'critical' ? colors.red : colors.yellow;
      console.log(`\n${index + 1}. [${severityColor}${issue.severity.toUpperCase()}${colors.reset}] ${issue.message}`);
      console.log(`   Entity: ${colors.cyan}${issue.entity}${colors.reset}${issue.column ? ` → ${issue.column}` : ''}`);
      console.log(`   ${colors.blue}Recommendation:${colors.reset} ${issue.recommendation}`);
    });
  }
  
  // Print summary by type
  const byType: Record<string, number> = {};
  issues.forEach(issue => {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  });
  
  console.log(`\n${colors.cyan}Issues by Type:${colors.reset}`);
  Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
}

/**
 * Print statistics
 */
function printStatistics(entities: DatabaseEntity[], issues: SchemaIssue[]): void {
  printSubsection('Analysis Statistics');
  
  const totalColumns = entities.reduce((sum, e) => sum + e.columns.length, 0);
  const totalIndexes = entities.reduce((sum, e) => sum + e.indexes.length, 0);
  const totalRelationships = entities.reduce((sum, e) => sum + e.relationships.length, 0);
  const avgColumnsPerTable = entities.length > 0 ? (totalColumns / entities.length).toFixed(1) : 0;
  
  const entitiesWithoutPK = entities.filter(e => !e.columns.some(c => c.primary)).length;
  const entitiesWithoutTimestamps = entities.filter(e => 
    !e.metadata?.timestamps?.createdAt && !e.metadata?.timestamps?.updatedAt
  ).length;
  const entitiesWithSoftDelete = entities.filter(e => e.metadata?.softDelete).length;
  
  console.log(`\n${colors.bright}Schema Overview:${colors.reset}`);
  console.log(`  Total Tables: ${entities.length}`);
  console.log(`  Total Columns: ${totalColumns}`);
  console.log(`  Total Indexes: ${totalIndexes}`);
  console.log(`  Total Relationships: ${totalRelationships}`);
  console.log(`  Average Columns per Table: ${avgColumnsPerTable}`);
  
  console.log(`\n${colors.bright}Schema Health:${colors.reset}`);
  console.log(`  Tables without Primary Key: ${entitiesWithoutPK}`);
  console.log(`  Tables without Timestamps: ${entitiesWithoutTimestamps}`);
  console.log(`  Tables with Soft Delete: ${entitiesWithSoftDelete}`);
  
  const issueRate = entities.length > 0 ? (issues.length / entities.length).toFixed(1) : 0;
  console.log(`  Issues per Table: ${issueRate}`);
}

/**
 * Create sample entities for testing
 */
function createSampleEntities(tempDir: string): string[] {
  // Good entity with best practices
  const userFile = createTestFile(
    tempDir,
    'User.entity.ts',
    `
    import { 
      Entity, 
      PrimaryGeneratedColumn, 
      Column,
      CreateDateColumn,
      UpdateDateColumn,
      DeleteDateColumn,
      OneToMany,
      Index
    } from 'typeorm';
    import { Post } from './Post.entity';

    /**
     * User entity for authentication and user management
     */
    @Entity({ name: 'users', schema: 'public' })
    @Index(['email'], { unique: true })
    export class User {
      @PrimaryGeneratedColumn()
      id: number;

      @Column({ length: 255 })
      username: string;

      @Column({ unique: true })
      email: string;

      @Column()
      password: string;

      @Column({ default: true })
      is_active: boolean;

      @CreateDateColumn()
      created_at: Date;

      @UpdateDateColumn()
      updated_at: Date;

      @DeleteDateColumn()
      deleted_at: Date;

      @OneToMany(() => Post, post => post.author)
      posts: Post[];
    }
    `
  );

  // Entity with issues
  const postFile = createTestFile(
    tempDir,
    'Post.entity.ts',
    `
    import { 
      Entity, 
      Column,
      ManyToOne,
      JoinColumn
    } from 'typeorm';
    import { User } from './User.entity';

    /**
     * Post entity - intentionally has issues for testing
     */
    @Entity()  // No custom table name
    export class Post {
      // No primary key!
      
      @Column()
      title: string;

      @Column('varchar', { length: 5000 })  // Very large VARCHAR
      content: string;

      @Column()
      status: string;

      @ManyToOne(() => User, user => user.posts, { nullable: true })
      @JoinColumn({ name: 'author_id' })
      author: User;
      
      // No timestamps!
      // No indexes on foreign key!
    }
    `
  );

  // Entity with anti-patterns
  const settingsFile = createTestFile(
    tempDir,
    'Settings.entity.ts',
    `
    import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

    /**
     * Settings entity - EAV anti-pattern
     */
    @Entity()
    export class Settings {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      key: string;

      @Column()
      value: string;
    }
    `
  );

  // Entity with numbered columns (multi-column attribute)
  const contactFile = createTestFile(
    tempDir,
    'Contact.entity.ts',
    `
    import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

    /**
     * Contact entity - multi-column attribute anti-pattern
     */
    @Entity()
    export class Contact {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      name: string;

      @Column()
      phone1: string;

      @Column()
      phone2: string;

      @Column()
      phone3: string;

      @Column()
      email1: string;

      @Column()
      email2: string;

      @Column()
      email3: string;
    }
    `
  );

  // Entity with security issues
  const accountFile = createTestFile(
    tempDir,
    'Account.entity.ts',
    `
    import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

    /**
     * Account entity - has sensitive data
     */
    @Entity()
    export class Account {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      username: string;

      @Column()
      api_key: string;  // Sensitive, should be encrypted

      @Column()
      credit_card_number: string;  // Very sensitive!

      @Column()
      ssn: string;  // Social security number - extremely sensitive
    }
    `
  );

  // Entity with cascading delete risk
  const orderFile = createTestFile(
    tempDir,
    'Order.entity.ts',
    `
    import { 
      Entity, 
      PrimaryGeneratedColumn, 
      Column,
      OneToMany,
      CreateDateColumn
    } from 'typeorm';
    import { OrderItem } from './OrderItem.entity';

    @Entity()
    export class Order {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      order_number: string;

      @CreateDateColumn()
      created_at: Date;

      @OneToMany(() => OrderItem, item => item.order, { 
        cascade: ['remove']  // Dangerous cascading delete!
      })
      items: OrderItem[];
    }
    `
  );

  const orderItemFile = createTestFile(
    tempDir,
    'OrderItem.entity.ts',
    `
    import { 
      Entity, 
      PrimaryGeneratedColumn, 
      Column,
      ManyToOne,
      JoinColumn
    } from 'typeorm';
    import { Order } from './Order.entity';

    @Entity()
    export class OrderItem {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      product_name: string;

      @Column()
      quantity: number;

      @ManyToOne(() => Order, order => order.items)
      @JoinColumn({ name: 'order_id' })
      order: Order;
    }
    `
  );

  return [userFile, postFile, settingsFile, contactFile, accountFile, orderFile, orderItemFile];
}

/**
 * Main test function
 */
async function main(): Promise<void> {
  printHeader('Database Schema Analysis - Integration Test');

  let tempDir: string = '';

  try {
    // Setup
    tempDir = createTempDir();
    console.log(`${colors.blue}Test directory: ${tempDir}${colors.reset}`);
    
    // Step 1: Create sample entities
    printHeader('Step 1: Creating Sample Entities');
    const entityFiles = createSampleEntities(tempDir);
    console.log(`${colors.green}✓${colors.reset} Created ${entityFiles.length} sample entity files`);
    console.log(`  - User (good practices)`);
    console.log(`  - Post (missing primary key, timestamps, indexes)`);
    console.log(`  - Settings (EAV anti-pattern)`);
    console.log(`  - Contact (multi-column attribute anti-pattern)`);
    console.log(`  - Account (unencrypted sensitive data)`);
    console.log(`  - Order/OrderItem (cascading delete risk)`);

    // Step 2: Extract schema
    printHeader('Step 2: Extracting Database Schema');
    const extractor = new TypeORMExtractor();
    const entities = await extractor.extract(entityFiles);
    console.log(`${colors.green}✓${colors.reset} Extracted ${entities.length} entities`);
    
    printEntitySummary(entities);

    // Step 3: Detect issues
    printHeader('Step 3: Detecting Schema Issues');
    const detector = new SchemaIssueDetector({
      checkNaming: true,
      checkDesign: true,
      checkPerformance: true,
      checkIntegrity: true,
      checkAntiPatterns: true,
      checkSecurity: true,
      maxColumnsPerTable: 20,
      maxVarcharLength: 1000,
    });
    
    const issues = detector.detect(entities);
    console.log(`${colors.green}✓${colors.reset} Detected ${issues.length} issues`);
    
    printIssues(issues);

    // Step 4: Print statistics
    printHeader('Step 4: Analysis Statistics');
    printStatistics(entities, issues);

    // Step 5: Verify expected issues are found
    printHeader('Step 5: Validation');
    
    const validationResults: Array<{ test: string; passed: boolean; message?: string }> = [];
    
    // Check if we found critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    validationResults.push({
      test: 'Found critical issues',
      passed: criticalIssues.length > 0,
      message: `Found ${criticalIssues.length} critical issues`,
    });
    
    // Check for missing primary key detection
    const missingPKIssues = issues.filter(i => i.type === SchemaIssueType.MISSING_PRIMARY_KEY);
    validationResults.push({
      test: 'Detected missing primary key',
      passed: missingPKIssues.length > 0,
      message: `Found ${missingPKIssues.length} tables without primary key`,
    });
    
    // Check for timestamp issues
    const timestampIssues = issues.filter(
      i => i.type === SchemaIssueType.MISSING_CREATED_AT || i.type === SchemaIssueType.MISSING_UPDATED_AT
    );
    validationResults.push({
      test: 'Detected missing timestamps',
      passed: timestampIssues.length > 0,
      message: `Found ${timestampIssues.length} timestamp issues`,
    });
    
    // Check for sensitive data issues
    const sensitiveDataIssues = issues.filter(i => i.type === SchemaIssueType.SENSITIVE_DATA_NOT_ENCRYPTED);
    validationResults.push({
      test: 'Detected unencrypted sensitive data',
      passed: sensitiveDataIssues.length > 0,
      message: `Found ${sensitiveDataIssues.length} sensitive data issues`,
    });
    
    // Check for anti-patterns
    const antiPatternIssues = issues.filter(
      i => i.type === SchemaIssueType.EAV_PATTERN || i.type === SchemaIssueType.MULTI_COLUMN_ATTRIBUTE
    );
    validationResults.push({
      test: 'Detected anti-patterns',
      passed: antiPatternIssues.length > 0,
      message: `Found ${antiPatternIssues.length} anti-patterns`,
    });
    
    // Check for cascading delete risks
    const cascadeIssues = issues.filter(i => i.type === SchemaIssueType.CASCADING_DELETE_RISK);
    validationResults.push({
      test: 'Detected cascading delete risks',
      passed: cascadeIssues.length > 0,
      message: `Found ${cascadeIssues.length} cascading delete risks`,
    });
    
    // Print validation results
    console.log(`\n${colors.bright}Validation Results:${colors.reset}\n`);
    let allPassed = true;
    validationResults.forEach(result => {
      const icon = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      console.log(`  ${icon} ${result.test}`);
      if (result.message) {
        console.log(`     ${colors.blue}→${colors.reset} ${result.message}`);
      }
      if (!result.passed) allPassed = false;
    });
    
    // Final summary
    printHeader('Test Summary');
    
    const passed = validationResults.filter(r => r.passed).length;
    const total = validationResults.length;
    
    console.log(`\n${colors.bright}Results:${colors.reset}`);
    console.log(`  Validations Passed: ${colors.green}${passed}/${total}${colors.reset}`);
    console.log(`  Entities Extracted: ${colors.cyan}${entities.length}${colors.reset}`);
    console.log(`  Issues Detected: ${colors.yellow}${issues.length}${colors.reset}`);
    
    if (allPassed) {
      console.log(`\n${colors.green}${colors.bright}✓ All validations passed!${colors.reset}`);
      console.log(`${colors.green}Database analysis pipeline is working correctly.${colors.reset}\n`);
    } else {
      console.log(`\n${colors.red}${colors.bright}✗ Some validations failed!${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Fatal Error:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Cleanup
    if (tempDir) {
      cleanupTempDir(tempDir);
      console.log(`${colors.blue}Cleaned up test directory${colors.reset}\n`);
    }
  }
}

// Run the test
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
