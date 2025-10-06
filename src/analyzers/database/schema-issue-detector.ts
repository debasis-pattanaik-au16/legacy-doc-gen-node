/**
 * Schema Issue Detector
 * 
 * Analyzes database schemas to detect common issues, anti-patterns,
 * and potential problems related to naming, design, performance,
 * data integrity, and security.
 * 
 * @module schema-issue-detector
 */

import {
  DatabaseEntity,
  SchemaIssue,
  SchemaIssueType,
  NamingConvention,
  DEFAULT_NAMING_CONVENTION,
  isReservedKeyword,
  isSensitiveColumn,
  toSnakeCase,
  toPascalCase,
  toCamelCase,
} from '../../types/database';
import { randomUUID } from 'crypto';

/**
 * Schema Issue Detector Options
 */
export interface SchemaIssueDetectorOptions {
  /** Naming convention to validate against */
  namingConvention?: NamingConvention;
  
  /** Whether to check for naming issues */
  checkNaming?: boolean;
  
  /** Whether to check for design issues */
  checkDesign?: boolean;
  
  /** Whether to check for performance issues */
  checkPerformance?: boolean;
  
  /** Whether to check for data integrity issues */
  checkIntegrity?: boolean;
  
  /** Whether to check for anti-patterns */
  checkAntiPatterns?: boolean;
  
  /** Whether to check for security issues */
  checkSecurity?: boolean;
  
  /** Maximum number of columns before table is considered "God Table" */
  maxColumnsPerTable?: number;
  
  /** Maximum number of indexes per table */
  maxIndexesPerTable?: number;
  
  /** Maximum VARCHAR length before warning */
  maxVarcharLength?: number;
}

/**
 * Default detector options
 */
const DEFAULT_OPTIONS: SchemaIssueDetectorOptions = {
  namingConvention: DEFAULT_NAMING_CONVENTION,
  checkNaming: true,
  checkDesign: true,
  checkPerformance: true,
  checkIntegrity: true,
  checkAntiPatterns: true,
  checkSecurity: true,
  maxColumnsPerTable: 50,
  maxIndexesPerTable: 10,
  maxVarcharLength: 1000,
};

/**
 * Schema Issue Detector
 * Detects various issues in database schemas
 */
export class SchemaIssueDetector {
  private options: SchemaIssueDetectorOptions;
  private entities: Map<string, DatabaseEntity> = new Map();
  private issues: SchemaIssue[] = [];

  constructor(options: Partial<SchemaIssueDetectorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Detect issues in a set of database entities
   */
  public detect(entities: DatabaseEntity[]): SchemaIssue[] {
    this.entities.clear();
    this.issues = [];

    // Index entities for quick lookup
    entities.forEach(entity => {
      this.entities.set(entity.name, entity);
    });

    // Run all enabled checks
    entities.forEach(entity => {
      if (this.options.checkNaming) {
        this.checkNamingIssues(entity);
      }

      if (this.options.checkDesign) {
        this.checkDesignIssues(entity);
      }

      if (this.options.checkPerformance) {
        this.checkPerformanceIssues(entity);
      }

      if (this.options.checkIntegrity) {
        this.checkIntegrityIssues(entity);
      }

      if (this.options.checkAntiPatterns) {
        this.checkAntiPatterns(entity);
      }

      if (this.options.checkSecurity) {
        this.checkSecurityIssues(entity);
      }
    });

    return this.issues;
  }

  /**
   * Check for naming convention issues
   */
  private checkNamingIssues(entity: DatabaseEntity): void {
    // Check table name convention
    const expectedTableName = this.normalizeNameByConvention(
      entity.name,
      this.options.namingConvention?.tableNames || 'snake_case'
    );

    if (entity.name !== expectedTableName) {
      this.addIssue({
        type: SchemaIssueType.INCONSISTENT_NAMING,
        severity: 'low',
        entity: entity.name,
        message: `Table name does not follow ${this.options.namingConvention?.tableNames} convention`,
        description: `Table "${entity.name}" should be "${expectedTableName}" according to the naming convention.`,
        recommendation: `Rename table to "${expectedTableName}" for consistency.`,
        location: entity.sourceLocation,
      });
    }

    // Check for reserved keywords
    if (isReservedKeyword(entity.name)) {
      this.addIssue({
        type: SchemaIssueType.RESERVED_WORD,
        severity: 'high',
        entity: entity.name,
        message: `Table name "${entity.name}" is a SQL reserved keyword`,
        description: 'Using SQL reserved keywords as table names can cause syntax errors and compatibility issues.',
        recommendation: 'Use a different table name or quote the identifier in queries.',
        location: entity.sourceLocation,
      });
    }

    // Check column naming
    entity.columns.forEach(column => {
      const expectedColumnName = this.normalizeNameByConvention(
        column.name,
        this.options.namingConvention?.columnNames || 'snake_case'
      );

      if (column.name !== expectedColumnName) {
        this.addIssue({
          type: SchemaIssueType.INCONSISTENT_NAMING,
          severity: 'low',
          entity: entity.name,
          column: column.name,
          message: `Column name does not follow ${this.options.namingConvention?.columnNames} convention`,
          description: `Column "${column.name}" should be "${expectedColumnName}".`,
          recommendation: `Rename column to "${expectedColumnName}".`,
          location: entity.sourceLocation,
        });
      }

      if (isReservedKeyword(column.name)) {
        this.addIssue({
          type: SchemaIssueType.RESERVED_WORD,
          severity: 'high',
          entity: entity.name,
          column: column.name,
          message: `Column name "${column.name}" is a SQL reserved keyword`,
          description: 'Using SQL reserved keywords as column names requires quoting and can cause issues.',
          recommendation: 'Use a different column name.',
          location: entity.sourceLocation,
        });
      }
    });
  }

  /**
   * Check for design issues
   */
  private checkDesignIssues(entity: DatabaseEntity): void {
    // Check for missing primary key
    const hasPrimaryKey = entity.columns.some(col => col.primary);
    if (!hasPrimaryKey) {
      this.addIssue({
        type: SchemaIssueType.MISSING_PRIMARY_KEY,
        severity: 'critical',
        entity: entity.name,
        message: 'Table has no primary key',
        description: 'Every table should have a primary key to uniquely identify rows.',
        recommendation: 'Add a primary key column (typically an auto-incrementing ID or UUID).',
        location: entity.sourceLocation,
      });
    }

    // Check for missing timestamps
    const hasCreatedAt = entity.metadata?.timestamps?.createdAt !== undefined;
    const hasUpdatedAt = entity.metadata?.timestamps?.updatedAt !== undefined;

    if (!hasCreatedAt) {
      this.addIssue({
        type: SchemaIssueType.MISSING_CREATED_AT,
        severity: 'medium',
        entity: entity.name,
        message: 'Table missing createdAt timestamp',
        description: 'Tables should track when records are created for auditing and debugging.',
        recommendation: 'Add a createdAt timestamp column with default value of current timestamp.',
        location: entity.sourceLocation,
      });
    }

    if (!hasUpdatedAt) {
      this.addIssue({
        type: SchemaIssueType.MISSING_UPDATED_AT,
        severity: 'medium',
        entity: entity.name,
        message: 'Table missing updatedAt timestamp',
        description: 'Tables should track when records are last modified.',
        recommendation: 'Add an updatedAt timestamp column that updates on each record modification.',
        location: entity.sourceLocation,
      });
    }

    // Check for soft delete support
    const hasSoftDelete = entity.metadata?.softDelete === true;
    if (!hasSoftDelete && entity.relationships.length > 0) {
      this.addIssue({
        type: SchemaIssueType.NO_SOFT_DELETE,
        severity: 'low',
        entity: entity.name,
        message: 'Table does not support soft delete',
        description: 'Tables with relationships should support soft delete to prevent accidental data loss.',
        recommendation: 'Add a deletedAt timestamp column for soft delete functionality.',
        location: entity.sourceLocation,
      });
    }
  }

  /**
   * Check for performance issues
   */
  private checkPerformanceIssues(entity: DatabaseEntity): void {
    // Check for unindexed foreign keys
    entity.relationships.forEach(relationship => {
      if (
        (relationship.type === 'many-to-one' || relationship.type === 'one-to-one') &&
        relationship.sourceColumn
      ) {
        const hasIndex = entity.indexes.some(idx =>
          idx.columns.includes(relationship.sourceColumn!)
        );

        if (!hasIndex) {
          this.addIssue({
            type: SchemaIssueType.UNINDEXED_FOREIGN_KEY,
            severity: 'high',
            entity: entity.name,
            column: relationship.sourceColumn,
            message: `Foreign key column "${relationship.sourceColumn}" is not indexed`,
            description: 'Foreign key columns should be indexed to improve join performance.',
            recommendation: `Create an index on "${relationship.sourceColumn}".`,
            location: entity.sourceLocation,
            references: [relationship.targetEntity],
          });
        }
      }
    });

    // Check for too many indexes
    if (entity.indexes.length > (this.options.maxIndexesPerTable || 10)) {
      this.addIssue({
        type: SchemaIssueType.TOO_MANY_INDEXES,
        severity: 'medium',
        entity: entity.name,
        message: `Table has ${entity.indexes.length} indexes`,
        description: 'Too many indexes can slow down write operations and increase storage requirements.',
        recommendation: 'Review and remove redundant or unused indexes.',
        location: entity.sourceLocation,
      });
    }

    // Check for large VARCHAR columns
    entity.columns.forEach(column => {
      if (
        (column.type === 'varchar' || column.type === 'string') &&
        column.length &&
        column.length > (this.options.maxVarcharLength || 1000)
      ) {
        this.addIssue({
          type: SchemaIssueType.LARGE_VARCHAR,
          severity: 'low',
          entity: entity.name,
          column: column.name,
          message: `VARCHAR column "${column.name}" has length ${column.length}`,
          description: 'Very large VARCHAR columns can impact performance and may indicate a design issue.',
          recommendation: 'Consider using TEXT type or normalizing the data into a separate table.',
          location: entity.sourceLocation,
        });
      }
    });
  }

  /**
   * Check for data integrity issues
   */
  private checkIntegrityIssues(entity: DatabaseEntity): void {
    // Check for nullable foreign keys
    entity.relationships.forEach(relationship => {
      if (
        (relationship.type === 'many-to-one' || relationship.type === 'one-to-one') &&
        relationship.sourceColumn
      ) {
        const column = entity.columns.find(col => col.name === relationship.sourceColumn);
        if (column && column.nullable) {
          this.addIssue({
            type: SchemaIssueType.NULLABLE_FOREIGN_KEY,
            severity: 'medium',
            entity: entity.name,
            column: relationship.sourceColumn,
            message: `Foreign key "${relationship.sourceColumn}" is nullable`,
            description: 'Nullable foreign keys can lead to orphaned records and data integrity issues.',
            recommendation: 'Make the foreign key NOT NULL or reconsider the relationship design.',
            location: entity.sourceLocation,
            references: [relationship.targetEntity],
          });
        }
      }
    });

    // Check for cascading delete risks
    entity.relationships.forEach(relationship => {
      if (
        relationship.cascade &&
        (relationship.cascade.includes('remove') || relationship.cascade.includes('soft-remove'))
      ) {
        this.addIssue({
          type: SchemaIssueType.CASCADING_DELETE_RISK,
          severity: 'high',
          entity: entity.name,
          message: `Cascading delete enabled on relationship to "${relationship.targetEntity}"`,
          description: 'Cascading deletes can accidentally remove large amounts of data.',
          recommendation: 'Review cascade settings and consider implementing soft delete instead.',
          location: entity.sourceLocation,
          references: [relationship.targetEntity],
        });
      }
    });

    // Check for orphaned relationships
    entity.relationships.forEach(relationship => {
      const targetEntity = this.entities.get(toSnakeCase(relationship.targetEntity));
      if (!targetEntity) {
        this.addIssue({
          type: SchemaIssueType.ORPHANED_RELATIONSHIP,
          severity: 'critical',
          entity: entity.name,
          message: `Relationship references non-existent entity "${relationship.targetEntity}"`,
          description: 'The target entity does not exist in the schema.',
          recommendation: 'Remove the relationship or add the missing entity.',
          location: entity.sourceLocation,
          references: [relationship.targetEntity],
        });
      }
    });
  }

  /**
   * Check for anti-patterns
   */
  private checkAntiPatterns(entity: DatabaseEntity): void {
    // Check for God Table (too many columns)
    if (entity.columns.length > (this.options.maxColumnsPerTable || 50)) {
      this.addIssue({
        type: SchemaIssueType.GOD_TABLE,
        severity: 'high',
        entity: entity.name,
        message: `Table has ${entity.columns.length} columns`,
        description: 'Tables with too many columns are difficult to maintain and may indicate poor normalization.',
        recommendation: 'Consider splitting into multiple related tables.',
        location: entity.sourceLocation,
      });
    }

    // Check for EAV pattern (Entity-Attribute-Value)
    const hasAttributeColumn = entity.columns.some(col =>
      ['attribute', 'key', 'property', 'name'].includes(col.name.toLowerCase())
    );
    const hasValueColumn = entity.columns.some(col =>
      ['value', 'data', 'content'].includes(col.name.toLowerCase())
    );

    if (hasAttributeColumn && hasValueColumn && entity.columns.length <= 5) {
      this.addIssue({
        type: SchemaIssueType.EAV_PATTERN,
        severity: 'medium',
        entity: entity.name,
        message: 'Possible EAV (Entity-Attribute-Value) anti-pattern detected',
        description: 'EAV patterns make queries complex and slow, and lose type safety.',
        recommendation: 'Consider using a proper relational schema with typed columns.',
        location: entity.sourceLocation,
      });
    }

    // Check for multi-column attributes (address1, address2, phone1, phone2, etc.)
    const columnGroups = this.groupSimilarColumns(entity.columns.map(c => c.name));
    Object.entries(columnGroups).forEach(([base, count]) => {
      if (count >= 3) {
        this.addIssue({
          type: SchemaIssueType.MULTI_COLUMN_ATTRIBUTE,
          severity: 'medium',
          entity: entity.name,
          message: `Multiple columns with same base name: ${base}1, ${base}2, ...`,
          description: 'Numbered columns indicate a need for a one-to-many relationship.',
          recommendation: `Create a separate table for ${base} records.`,
          location: entity.sourceLocation,
        });
      }
    });
  }

  /**
   * Check for security issues
   */
  private checkSecurityIssues(entity: DatabaseEntity): void {
    // Check for unencrypted sensitive data
    entity.columns.forEach(column => {
      if (isSensitiveColumn(column.name)) {
        // Check if the column is likely encrypted (typically stored as binary or has "encrypted" in name)
        const isEncrypted =
          column.type === 'binary' ||
          column.type === 'blob' ||
          column.name.toLowerCase().includes('encrypted') ||
          column.name.toLowerCase().includes('hash');

        if (!isEncrypted && column.name.toLowerCase().includes('password')) {
          // Passwords should always be hashed
          this.addIssue({
            type: SchemaIssueType.SENSITIVE_DATA_NOT_ENCRYPTED,
            severity: 'critical',
            entity: entity.name,
            column: column.name,
            message: `Sensitive column "${column.name}" may not be hashed`,
            description: 'Passwords must be hashed using a strong algorithm (bcrypt, argon2).',
            recommendation: 'Ensure passwords are hashed before storage. Store as VARCHAR or TEXT.',
            location: entity.sourceLocation,
          });
        } else if (!isEncrypted) {
          this.addIssue({
            type: SchemaIssueType.SENSITIVE_DATA_NOT_ENCRYPTED,
            severity: 'high',
            entity: entity.name,
            column: column.name,
            message: `Sensitive column "${column.name}" may not be encrypted`,
            description: 'Sensitive data should be encrypted at rest to prevent data breaches.',
            recommendation: 'Implement column-level encryption or application-level encryption.',
            location: entity.sourceLocation,
          });
        }
      }
    });
  }

  /**
   * Add an issue to the list
   */
  private addIssue(issue: Omit<SchemaIssue, 'id'>): void {
    this.issues.push({
      id: randomUUID(),
      ...issue,
    });
  }

  /**
   * Normalize a name according to naming convention
   */
  private normalizeNameByConvention(
    name: string,
    convention: 'snake_case' | 'camelCase' | 'PascalCase'
  ): string {
    switch (convention) {
      case 'snake_case':
        return toSnakeCase(name);
      case 'camelCase':
        return toCamelCase(name);
      case 'PascalCase':
        return toPascalCase(name);
      default:
        return name;
    }
  }

  /**
   * Group similar columns by base name (e.g., phone1, phone2 -> phone: 2)
   */
  private groupSimilarColumns(columnNames: string[]): Record<string, number> {
    const groups: Record<string, number> = {};

    columnNames.forEach(name => {
      // Check if column ends with a number
      const match = name.match(/^(.+?)(\d+)$/);
      if (match) {
        const base = match[1];
        groups[base] = (groups[base] || 0) + 1;
      }
    });

    return groups;
  }
}

export default SchemaIssueDetector;
