/**
 * Database Schema Analysis Types
 * 
 * Comprehensive type definitions for extracting and analyzing database schemas
 * from various ORMs (TypeORM, Prisma, Sequelize, Mongoose, SQLAlchemy, Django).
 * 
 * @module database
 */

/**
 * Database Entity (Table/Collection/Model)
 * Represents a single entity in the database schema
 */
export interface DatabaseEntity {
  /** Entity name (table/collection name) */
  name: string;
  
  /** Type of entity */
  type: 'table' | 'view' | 'materialized_view' | 'collection';
  
  /** Schema name (for databases that support schemas like PostgreSQL) */
  schema?: string;
  
  /** List of columns/fields in this entity */
  columns: Column[];
  
  /** Indexes defined on this entity */
  indexes: Index[];
  
  /** Constraints (primary key, foreign key, unique, check) */
  constraints: Constraint[];
  
  /** Relationships to other entities */
  relationships: Relationship[];
  
  /** Source file where entity is defined */
  sourceFile: string;
  
  /** Location in source file */
  sourceLocation: SourceLocation;
  
  /** ORM-specific information */
  orm?: ORMInfo;
  
  /** Documentation/comments for this entity */
  documentation?: string;
  
  /** Additional metadata */
  metadata?: EntityMetadata;
}

/**
 * Column definition
 * Represents a single column/field in an entity
 */
export interface Column {
  /** Column name */
  name: string;
  
  /** Column data type */
  type: ColumnType;
  
  /** Whether column can be null */
  nullable: boolean;
  
  /** Whether this is a primary key column */
  primary: boolean;
  
  /** Whether column has unique constraint */
  unique: boolean;
  
  /** Whether column auto-increments */
  autoIncrement?: boolean;
  
  /** Default value */
  default?: any;
  
  /** Length for string types */
  length?: number;
  
  /** Precision for numeric types */
  precision?: number;
  
  /** Scale for decimal types */
  scale?: number;
  
  /** Enum values if type is enum */
  enum?: string[];
  
  /** Column comment/documentation */
  comment?: string;
  
  /** ORM decorators applied to this column */
  decorators?: string[];
}

/**
 * Column types
 * Covers all common database column types
 */
export type ColumnType = 
  // String types
  | 'string' | 'text' | 'varchar' | 'char'
  // Numeric types
  | 'integer' | 'bigint' | 'smallint' | 'decimal' | 'numeric' | 'float' | 'double'
  // Boolean
  | 'boolean'
  // Date/Time
  | 'date' | 'datetime' | 'timestamp' | 'time'
  // JSON
  | 'json' | 'jsonb'
  // UUID
  | 'uuid'
  // Binary
  | 'binary' | 'blob'
  // Enum
  | 'enum'
  // Array
  | 'array'
  // Custom types
  | string;

/**
 * Index definition
 * Represents a database index
 */
export interface Index {
  /** Index name */
  name: string;
  
  /** Columns included in the index */
  columns: string[];
  
  /** Whether this is a unique index */
  unique: boolean;
  
  /** Index type */
  type?: 'btree' | 'hash' | 'gist' | 'gin' | 'brin' | 'spgist';
  
  /** Partial index condition (WHERE clause) */
  where?: string;
  
  /** Whether index was created concurrently */
  concurrent?: boolean;
}

/**
 * Constraint definition
 * Represents a database constraint
 */
export interface Constraint {
  /** Constraint name */
  name?: string;
  
  /** Type of constraint */
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null';
  
  /** Columns affected by this constraint */
  columns: string[];
  
  /** Foreign key reference details */
  references?: ForeignKeyReference;
  
  /** Check constraint condition */
  condition?: string;
}

/**
 * Foreign key reference
 * Defines a foreign key relationship
 */
export interface ForeignKeyReference {
  /** Referenced table name */
  table: string;
  
  /** Referenced columns */
  columns: string[];
  
  /** Action on delete */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
  
  /** Action on update */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
}

/**
 * Relationship between entities
 * Represents ORM-level relationships
 */
export interface Relationship {
  /** Type of relationship */
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  
  /** Source entity name */
  sourceEntity: string;
  
  /** Target entity name */
  targetEntity: string;
  
  /** Source column (foreign key in source table) */
  sourceColumn?: string;
  
  /** Target column (typically primary key in target table) */
  targetColumn?: string;
  
  /** Join table for many-to-many relationships */
  joinTable?: JoinTable;
  
  /** Cascade operations */
  cascade?: CascadeOption[];
  
  /** Whether relation is eagerly loaded */
  eager?: boolean;
  
  /** Whether relation is lazily loaded */
  lazy?: boolean;
}

/**
 * Join table for many-to-many relationships
 */
export interface JoinTable {
  /** Join table name */
  name: string;
  
  /** Column referencing source entity */
  sourceColumn: string;
  
  /** Column referencing target entity */
  targetColumn: string;
  
  /** Inverse source column name */
  inverseSourceColumn?: string;
  
  /** Inverse target column name */
  inverseTargetColumn?: string;
}

/**
 * Cascade options for relationships
 */
export type CascadeOption = 'insert' | 'update' | 'remove' | 'soft-remove' | 'recover';

/**
 * ORM information
 * Stores ORM-specific metadata
 */
export interface ORMInfo {
  /** ORM type */
  type: ORMType;
  
  /** ORM version */
  version?: string;
  
  /** ORM decorators applied to the entity */
  decorators: ORMDecorator[];
  
  /** ORM-specific options */
  options?: Record<string, any>;
}

/**
 * Supported ORM types
 */
export type ORMType = 
  | 'typeorm'
  | 'prisma'
  | 'sequelize'
  | 'mongoose'
  | 'sqlalchemy'
  | 'django';

/**
 * ORM decorator
 * Represents a decorator/annotation on an entity or column
 */
export interface ORMDecorator {
  /** Decorator name (e.g., @Entity, @Column) */
  name: string;
  
  /** Decorator arguments */
  arguments?: any[];
  
  /** Decorator options */
  options?: Record<string, any>;
}

/**
 * Entity metadata
 * Additional entity information
 */
export interface EntityMetadata {
  /** Timestamp columns */
  timestamps?: {
    /** Created at column name */
    createdAt?: string;
    /** Updated at column name */
    updatedAt?: string;
    /** Soft delete column name */
    deletedAt?: string;
  };
  
  /** Whether entity supports soft delete */
  softDelete?: boolean;
  
  /** Whether entity has version column for optimistic locking */
  version?: boolean;
  
  /** Inheritance strategy if entity is part of inheritance */
  inheritance?: InheritanceStrategy;
  
  /** Discriminator column for inheritance */
  discriminator?: string;
}

/**
 * Inheritance strategies
 */
export type InheritanceStrategy = 
  | 'single-table'
  | 'class-table'
  | 'concrete-table';

/**
 * Source location
 * File location information
 */
export interface SourceLocation {
  /** File path */
  file: string;
  
  /** Start line number */
  line: number;
  
  /** Start column number */
  column: number;
  
  /** End line number */
  endLine?: number;
}

/**
 * Database schema analysis result
 * Complete result of schema analysis
 */
export interface DatabaseSchemaAnalysis {
  /** All entities in the schema */
  entities: DatabaseEntity[];
  
  /** All relationships between entities */
  relationships: Relationship[];
  
  /** Detected schema issues */
  issues: SchemaIssue[];
  
  /** Analysis statistics */
  statistics: SchemaStatistics;
  
  /** ORM type detected */
  ormType?: ORMType;
  
  /** Database dialect */
  dialect?: DatabaseDialect;
  
  /** Schema version */
  version?: string;
  
  /** When analysis was performed */
  analyzedAt: Date;
  
  /** Generated ER diagram (if requested) */
  diagram?: ERDiagram;
}

/**
 * Schema issue
 * Represents a detected problem in the schema
 */
export interface SchemaIssue {
  /** Unique issue identifier */
  id: string;
  
  /** Type of issue */
  type: SchemaIssueType;
  
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  /** Affected entity name */
  entity: string;
  
  /** Affected column name (if applicable) */
  column?: string;
  
  /** Short issue message */
  message: string;
  
  /** Detailed description */
  description: string;
  
  /** Recommendation to fix the issue */
  recommendation: string;
  
  /** Location in source code */
  location: SourceLocation;
  
  /** References to related entities/columns */
  references?: string[];
}

/**
 * Schema issue types
 * All possible types of schema issues
 */
export enum SchemaIssueType {
  // Naming issues
  INCONSISTENT_NAMING = 'inconsistent_naming',
  RESERVED_WORD = 'reserved_word',
  
  // Design issues
  MISSING_PRIMARY_KEY = 'missing_primary_key',
  MISSING_FOREIGN_KEY_INDEX = 'missing_foreign_key_index',
  MISSING_CREATED_AT = 'missing_created_at',
  MISSING_UPDATED_AT = 'missing_updated_at',
  NO_SOFT_DELETE = 'no_soft_delete',
  
  // Performance issues
  UNINDEXED_FOREIGN_KEY = 'unindexed_foreign_key',
  TOO_MANY_INDEXES = 'too_many_indexes',
  LARGE_VARCHAR = 'large_varchar',
  MISSING_INDEX_ON_QUERY = 'missing_index_on_query',
  
  // Data integrity issues
  NULLABLE_FOREIGN_KEY = 'nullable_foreign_key',
  CASCADING_DELETE_RISK = 'cascading_delete_risk',
  MISSING_UNIQUE_CONSTRAINT = 'missing_unique_constraint',
  ORPHANED_RELATIONSHIP = 'orphaned_relationship',
  
  // Anti-patterns
  EAV_PATTERN = 'eav_pattern',
  GOD_TABLE = 'god_table',
  POLYMORPHIC_ASSOCIATION_WITHOUT_TYPE = 'polymorphic_without_type',
  MULTI_COLUMN_ATTRIBUTE = 'multi_column_attribute',
  
  // Security issues
  NO_ROW_LEVEL_SECURITY = 'no_row_level_security',
  SENSITIVE_DATA_NOT_ENCRYPTED = 'sensitive_data_not_encrypted',
}

/**
 * Database dialect
 */
export type DatabaseDialect = 'postgresql' | 'mysql' | 'sqlite' | 'mssql' | 'oracle' | 'mongodb';

/**
 * Schema statistics
 * Statistical information about the schema
 */
export interface SchemaStatistics {
  /** Total number of entities */
  totalEntities: number;
  
  /** Total number of columns across all entities */
  totalColumns: number;
  
  /** Total number of indexes */
  totalIndexes: number;
  
  /** Total number of relationships */
  totalRelationships: number;
  
  /** Breakdown of relationships by type */
  relationshipBreakdown: Record<string, number>;
  
  /** Issues grouped by type */
  issuesByType: Record<SchemaIssueType, number>;
  
  /** Issues grouped by severity */
  issuesBySeverity: Record<string, number>;
  
  /** Average columns per entity */
  averageColumnsPerEntity: number;
  
  /** Number of entities without primary key */
  entitiesWithoutPrimaryKey: number;
  
  /** Number of entities without indexes */
  entitiesWithoutIndexes: number;
  
  /** Number of orphaned tables (no relationships) */
  orphanedTables: number;
}

/**
 * Database analysis options
 * Configuration for schema analysis
 */
export interface DatabaseAnalysisOptions {
  /** Whether to extract relationships */
  includeRelationships: boolean;
  
  /** Whether to detect schema issues */
  detectIssues: boolean;
  
  /** Whether to analyze queries (if available) */
  analyzeQueries?: boolean;
  
  /** Whether to infer missing relationships from foreign keys */
  inferMissingRelationships?: boolean;
  
  /** Whether to validate naming conventions */
  validateNamingConventions?: boolean;
  
  /** Whether to check for performance issues */
  checkPerformance?: boolean;
  
  /** Whether to generate ER diagram */
  generateERDiagram?: boolean;
}

/**
 * ER Diagram
 * Entity-Relationship diagram representation
 */
export interface ERDiagram {
  /** Nodes (entities) in the diagram */
  nodes: ERNode[];
  
  /** Edges (relationships) in the diagram */
  edges: EREdge[];
  
  /** Layout algorithm to use */
  layout?: 'hierarchical' | 'force-directed' | 'circular';
  
  /** Diagram metadata */
  metadata: {
    generatedAt: Date;
    entityCount: number;
    relationshipCount: number;
  };
}

/**
 * ER diagram node
 * Represents an entity in the diagram
 */
export interface ERNode {
  /** Unique node identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Node type */
  type: 'entity' | 'junction';
  
  /** Column names to display */
  columns: string[];
  
  /** Position in diagram (if calculated) */
  position?: { x: number; y: number };
}

/**
 * ER diagram edge
 * Represents a relationship in the diagram
 */
export interface EREdge {
  /** Unique edge identifier */
  id: string;
  
  /** Source node ID */
  source: string;
  
  /** Target node ID */
  target: string;
  
  /** Relationship label */
  label: string;
  
  /** Relationship type */
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  
  /** Cardinality notation (e.g., "1:N", "N:M") */
  cardinality: string;
}

/**
 * Migration
 * Database migration information
 */
export interface Migration {
  /** Migration version/timestamp */
  version: string;
  
  /** Migration name */
  name: string;
  
  /** When migration was created */
  timestamp: Date;
  
  /** Up migration SQL */
  up: string;
  
  /** Down migration SQL (rollback) */
  down: string;
  
  /** Migration status */
  status: 'pending' | 'applied' | 'failed';
  
  /** Source file path */
  sourceFile: string;
}

/**
 * Query pattern
 * Represents a database query for analysis
 */
export interface QueryPattern {
  /** The query string */
  query: string;
  
  /** Entities involved in the query */
  entities: string[];
  
  /** Query type */
  type: 'select' | 'insert' | 'update' | 'delete';
  
  /** Joins in the query */
  joins: JoinInfo[];
  
  /** Potential issues with this query */
  potentialIssues: string[];
  
  /** Suggested indexes to improve performance */
  suggestedIndexes: string[];
  
  /** Whether query has N+1 risk */
  nPlusOneRisk: boolean;
}

/**
 * Join information
 * Details about a join in a query
 */
export interface JoinInfo {
  /** Join type */
  type: 'inner' | 'left' | 'right' | 'full' | 'cross';
  
  /** Left table in the join */
  leftTable: string;
  
  /** Right table in the join */
  rightTable: string;
  
  /** Join condition */
  condition: string;
}

/**
 * Default analysis options
 */
export const DEFAULT_DATABASE_ANALYSIS_OPTIONS: DatabaseAnalysisOptions = {
  includeRelationships: true,
  detectIssues: true,
  analyzeQueries: false,
  inferMissingRelationships: true,
  validateNamingConventions: true,
  checkPerformance: true,
  generateERDiagram: false,
};

/**
 * Database naming conventions
 */
export interface NamingConvention {
  /** Convention for table names */
  tableNames: 'snake_case' | 'camelCase' | 'PascalCase';
  
  /** Convention for column names */
  columnNames: 'snake_case' | 'camelCase' | 'PascalCase';
  
  /** Convention for index names */
  indexNames?: string;
  
  /** Convention for constraint names */
  constraintNames?: string;
}

/**
 * Default naming conventions (PostgreSQL style)
 */
export const DEFAULT_NAMING_CONVENTION: NamingConvention = {
  tableNames: 'snake_case',
  columnNames: 'snake_case',
  indexNames: 'idx_{table}_{columns}',
  constraintNames: '{type}_{table}_{columns}',
};

/**
 * Reserved SQL keywords to check against
 */
export const SQL_RESERVED_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
  'ALTER', 'TABLE', 'INDEX', 'VIEW', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE', 'IN', 'EXISTS',
  'BETWEEN', 'LIKE', 'IS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'INTERSECT', 'EXCEPT', 'ALL', 'DISTINCT', 'UNIQUE', 'PRIMARY', 'FOREIGN',
  'KEY', 'REFERENCES', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT', 'CASCADE', 'RESTRICT',
  'USER', 'ROLE', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
]);

/**
 * Sensitive column name patterns
 * Used to detect potentially sensitive data
 */
export const SENSITIVE_COLUMN_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credit[_-]?card/i,
  /ssn/i,
  /social[_-]?security/i,
  /tax[_-]?id/i,
  /pin/i,
  /cvv/i,
  /private[_-]?key/i,
];

/**
 * Type guard to check if a column is sensitive
 */
export function isSensitiveColumn(columnName: string): boolean {
  return SENSITIVE_COLUMN_PATTERNS.some(pattern => pattern.test(columnName));
}

/**
 * Type guard to check if a name is a reserved keyword
 */
export function isReservedKeyword(name: string): boolean {
  return SQL_RESERVED_KEYWORDS.has(name.toUpperCase());
}

/**
 * Extract table name from entity decorator
 * Helper function for ORM extractors
 */
export function getTableName(entityName: string, decoratorArg?: string): string {
  return decoratorArg || toSnakeCase(entityName);
}

/**
 * Convert PascalCase/camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert snake_case to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
