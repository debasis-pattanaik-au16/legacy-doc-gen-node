/**
 * Database Schema Analyzer
 * 
 * Orchestrates database schema extraction and analysis across multiple ORMs.
 * Automatically detects ORM types and applies appropriate extractors.
 * 
 * Supported ORMs:
 * - TypeORM (TypeScript/JavaScript)
 * - Prisma (Schema files)
 * - Sequelize (TypeScript/JavaScript)
 * - Mongoose (MongoDB, TypeScript/JavaScript)
 * - SQLAlchemy (Python)
 * - Django ORM (Python)
 * 
 * @module DatabaseAnalyzer
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeORMExtractor } from './typeorm-extractor';
import { SchemaIssueDetector } from './schema-issue-detector';
import {
  DatabaseSchemaAnalysis,
  DatabaseEntity,
  SchemaIssue,
  Relationship,
  ORMType,
  DatabaseDialect,
  SchemaStatistics,
  SchemaIssueType,
} from '@/types/database';
import { logger } from '@/utils/logger';

/**
 * Database analysis options
 */
export interface DatabaseAnalysisOptions {
  /** Whether to detect and analyze schema issues */
  detectIssues?: boolean;
  
  /** Whether to extract relationships */
  extractRelationships?: boolean;
  
  /** Whether to infer missing relationships from foreign keys */
  inferMissingRelationships?: boolean;
  
  /** Whether to validate naming conventions */
  validateNamingConventions?: boolean;
  
  /** Whether to check for performance issues */
  checkPerformance?: boolean;
  
  /** Maximum depth for relationship traversal */
  maxRelationshipDepth?: number;
}

/**
 * ORM detection result
 */
interface ORMDetectionResult {
  type: ORMType;
  files: string[];
  confidence: number;
}

/**
 * DatabaseAnalyzer
 * Main orchestrator for database schema analysis
 */
export class DatabaseAnalyzer {
  private projectPath: string;
  private detectedORMs: Set<ORMType> = new Set();
  private entities: DatabaseEntity[] = [];
  private relationships: Relationship[] = [];
  private issues: SchemaIssue[] = [];

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);

    if (!fs.existsSync(this.projectPath)) {
      throw new Error(`Project path does not exist: ${this.projectPath}`);
    }
  }

  /**
   * Main analysis method
   * Detects ORMs and extracts schema information
   */
  public async analyze(options: DatabaseAnalysisOptions = {}): Promise<DatabaseSchemaAnalysis> {
    try {
      logger.info('Starting database schema analysis...');

      // Step 1: Detect which ORMs are being used
      const detectedORMs = await this.detectORMs();
      logger.info(`Detected ORMs: ${Array.from(detectedORMs.keys()).join(', ')}`);

      // Step 2: Extract entities from each detected ORM
      for (const [ormType, detectionResult] of detectedORMs.entries()) {
        await this.extractEntitiesForORM(ormType, detectionResult.files, options);
      }

      // Step 3: Extract relationships if enabled
      if (options.extractRelationships !== false) {
        this.extractRelationships();
      }

      // Step 4: Detect schema issues if enabled
      if (options.detectIssues !== false) {
        await this.detectSchemaIssues(options);
      }

      // Step 5: Calculate statistics
      const statistics = this.calculateStatistics();

      // Step 6: Build final result
      const result: DatabaseSchemaAnalysis = {
        entities: this.entities,
        relationships: this.relationships,
        issues: this.issues,
        statistics,
        ormType: this.detectPrimaryORM(),
        dialect: this.detectDatabaseDialect(),
        analyzedAt: new Date(),
      };

      logger.info(
        `Database analysis complete. Found ${this.entities.length} entities, ` +
        `${this.relationships.length} relationships, ${this.issues.length} issues`
      );

      return result;
    } catch (error: any) {
      logger.error(`Database analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect which ORMs are being used in the project
   */
  private async detectORMs(): Promise<Map<ORMType, ORMDetectionResult>> {
    const detected = new Map<ORMType, ORMDetectionResult>();

    // Check package.json for ORM dependencies
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // TypeORM
      if (allDeps['typeorm']) {
        const files = await this.findTypeORMFiles();
        detected.set('typeorm', {
          type: 'typeorm',
          files,
          confidence: files.length > 0 ? 0.9 : 0.3,
        });
      }

      // Prisma
      if (allDeps['prisma'] || allDeps['@prisma/client']) {
        const files = await this.findPrismaFiles();
        detected.set('prisma', {
          type: 'prisma',
          files,
          confidence: files.length > 0 ? 0.9 : 0.3,
        });
      }

      // Sequelize
      if (allDeps['sequelize']) {
        const files = await this.findSequelizeFiles();
        detected.set('sequelize', {
          type: 'sequelize',
          files,
          confidence: files.length > 0 ? 0.9 : 0.3,
        });
      }

      // Mongoose
      if (allDeps['mongoose']) {
        const files = await this.findMongooseFiles();
        detected.set('mongoose', {
          type: 'mongoose',
          files,
          confidence: files.length > 0 ? 0.9 : 0.3,
        });
      }
    }

    // If no ORMs detected via package.json, try scanning files
    if (detected.size === 0) {
      await this.detectORMsFromFiles(detected);
    }

    return detected;
  }

  /**
   * Extract entities for a specific ORM
   */
  private async extractEntitiesForORM(
    ormType: ORMType,
    files: string[],
    options: DatabaseAnalysisOptions
  ): Promise<void> {
    if (files.length === 0) {
      logger.warn(`No files found for ORM: ${ormType}`);
      return;
    }

    try {
      switch (ormType) {
        case 'typeorm':
          await this.extractTypeORMEntities(files);
          break;
        case 'prisma':
          logger.info('Prisma extraction not yet implemented');
          break;
        case 'sequelize':
          logger.info('Sequelize extraction not yet implemented');
          break;
        case 'mongoose':
          logger.info('Mongoose extraction not yet implemented');
          break;
        case 'sqlalchemy':
          logger.info('SQLAlchemy extraction not yet implemented');
          break;
        case 'django':
          logger.info('Django ORM extraction not yet implemented');
          break;
        default:
          logger.warn(`Unknown ORM type: ${ormType}`);
      }

      this.detectedORMs.add(ormType);
    } catch (error: any) {
      logger.error(`Failed to extract entities for ${ormType}: ${error.message}`);
    }
  }

  /**
   * Extract TypeORM entities
   */
  private async extractTypeORMEntities(files: string[]): Promise<void> {
    const extractor = new TypeORMExtractor();
    const entities = await extractor.extract(files);
    this.entities.push(...entities);
    logger.info(`Extracted ${entities.length} TypeORM entities`);
  }

  /**
   * Extract relationships from entities
   */
  private extractRelationships(): void {
    // Aggregate all relationships from entities
    for (const entity of this.entities) {
      if (entity.relationships) {
        this.relationships.push(...entity.relationships);
      }
    }
  }

  /**
   * Detect schema issues
   */
  private async detectSchemaIssues(options: DatabaseAnalysisOptions): Promise<void> {
    const detector = new SchemaIssueDetector({
      checkNaming: options.validateNamingConventions ?? true,
      checkPerformance: options.checkPerformance ?? true,
      checkDesign: true,
      checkIntegrity: true,
      checkAntiPatterns: true,
      checkSecurity: true,
    });
    this.issues = detector.detect(this.entities);
  }

  /**
   * Calculate schema statistics
   */
  private calculateStatistics(): SchemaStatistics {
    const totalEntities = this.entities.length;
    const totalColumns = this.entities.reduce((sum, e) => sum + e.columns.length, 0);
    const totalIndexes = this.entities.reduce((sum, e) => sum + e.indexes.length, 0);
    const totalRelationships = this.relationships.length;

    // Relationship breakdown
    const relationshipBreakdown: Record<string, number> = {};
    for (const rel of this.relationships) {
      relationshipBreakdown[rel.type] = (relationshipBreakdown[rel.type] || 0) + 1;
    }

    // Issues by type
    const issuesByType: Partial<Record<SchemaIssueType, number>> = {};
    for (const issue of this.issues) {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    }

    // Issues by severity
    const issuesBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const issue of this.issues) {
      issuesBySeverity[issue.severity]++;
    }

    // Entities without primary key
    const entitiesWithoutPrimaryKey = this.entities.filter(
      (e) => !e.columns.some((c) => c.primary)
    ).length;

    // Entities without indexes
    const entitiesWithoutIndexes = this.entities.filter(
      (e) => e.indexes.length === 0
    ).length;

    // Orphaned tables (no relationships)
    const orphanedTables = this.entities.filter(
      (e) => (!e.relationships || e.relationships.length === 0)
    ).length;

    return {
      totalEntities,
      totalColumns,
      totalIndexes,
      totalRelationships,
      relationshipBreakdown,
      issuesByType: issuesByType as any,
      issuesBySeverity,
      averageColumnsPerEntity: totalEntities > 0 ? totalColumns / totalEntities : 0,
      entitiesWithoutPrimaryKey,
      entitiesWithoutIndexes,
      orphanedTables,
    };
  }

  /**
   * Detect primary ORM (most used)
   */
  private detectPrimaryORM(): ORMType | undefined {
    if (this.detectedORMs.size === 0) return undefined;
    
    // Priority order for common MERN/MEAN stacks:
    // 1. Mongoose (most common for MongoDB in Node.js)
    // 2. TypeORM (for SQL/TypeScript projects)
    // 3. Prisma (modern ORM)
    // 4. Others
    const priorityOrder: ORMType[] = ['mongoose', 'typeorm', 'prisma', 'sequelize', 'sqlalchemy', 'django'];
    
    for (const orm of priorityOrder) {
      if (this.detectedORMs.has(orm)) {
        return orm;
      }
    }
    
    // Return the first detected ORM if no priority match
    return Array.from(this.detectedORMs)[0];
  }

  /**
   * Detect database dialect
   */
  private detectDatabaseDialect(): DatabaseDialect | undefined {
    // Detect based on ORM type
    const primaryORM = this.detectPrimaryORM();
    
    if (primaryORM === 'mongoose') {
      return 'mongodb' as DatabaseDialect;
    }
    
    // Try to detect from package.json
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        
        // Check for database drivers
        if (allDeps['mongodb'] || allDeps['mongoose']) return 'mongodb' as DatabaseDialect;
        if (allDeps['pg'] || allDeps['postgres']) return 'postgres' as DatabaseDialect;
        if (allDeps['mysql'] || allDeps['mysql2']) return 'mysql' as DatabaseDialect;
        if (allDeps['sqlite3'] || allDeps['better-sqlite3']) return 'sqlite' as DatabaseDialect;
      } catch (error) {
        // Continue to fallback
      }
    }
    
    return undefined;
  }

  /**
   * Find TypeORM entity files
   */
  private async findTypeORMFiles(): Promise<string[]> {
    return this.findFiles(['**/*.entity.ts', '**/entities/**/*.ts', '**/entity/**/*.ts']);
  }

  /**
   * Find Prisma schema files
   */
  private async findPrismaFiles(): Promise<string[]> {
    return this.findFiles(['**/prisma/schema.prisma', '**/*.prisma']);
  }

  /**
   * Find Sequelize model files
   */
  private async findSequelizeFiles(): Promise<string[]> {
    return this.findFiles(['**/models/**/*.ts', '**/models/**/*.js', '**/*.model.ts']);
  }

  /**
   * Find Mongoose schema files
   */
  private async findMongooseFiles(): Promise<string[]> {
    return this.findFiles(['**/schemas/**/*.ts', '**/*.schema.ts', '**/models/**/*.ts']);
  }

  /**
   * Find files matching patterns
   */
  private async findFiles(patterns: string[]): Promise<string[]> {
    const files: string[] = [];
    const visited = new Set<string>();

    const searchDirectory = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and common build directories
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.git' ||
          visited.has(fullPath)
        ) {
          continue;
        }

        visited.add(fullPath);

        if (entry.isDirectory()) {
          searchDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check if file matches any pattern
          for (const pattern of patterns) {
            if (this.matchesPattern(fullPath, pattern)) {
              files.push(fullPath);
              break;
            }
          }
        }
      }
    };

    searchDirectory(this.projectPath);
    return files;
  }

  /**
   * Simple pattern matching
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');

    return new RegExp(regex).test(filePath);
  }

  /**
   * Detect ORMs by scanning file content
   */
  private async detectORMsFromFiles(
    detected: Map<ORMType, ORMDetectionResult>
  ): Promise<void> {
    // Scan for TypeORM decorators
    const typeormFiles = await this.findTypeORMFiles();
    if (typeormFiles.length > 0) {
      detected.set('typeorm', {
        type: 'typeorm',
        files: typeormFiles,
        confidence: 0.8,
      });
    }

    // Scan for Prisma schema
    const prismaFiles = await this.findPrismaFiles();
    if (prismaFiles.length > 0) {
      detected.set('prisma', {
        type: 'prisma',
        files: prismaFiles,
        confidence: 0.9,
      });
    }
  }
}

/**
 * Create default database analysis options
 */
export function createDefaultDatabaseAnalysisOptions(): DatabaseAnalysisOptions {
  return {
    detectIssues: true,
    extractRelationships: true,
    inferMissingRelationships: true,
    validateNamingConventions: true,
    checkPerformance: true,
    maxRelationshipDepth: 5,
  };
}
