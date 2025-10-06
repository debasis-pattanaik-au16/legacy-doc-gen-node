/**
 * TypeORM Schema Extractor
 * 
 * Extracts database schema information from TypeORM entity files.
 * Supports decorators: @Entity, @Column, @PrimaryColumn, @PrimaryGeneratedColumn,
 * @OneToOne, @OneToMany, @ManyToOne, @ManyToMany, @Index, @Unique, etc.
 * 
 * @module typeorm-extractor
 */

import * as ts from 'typescript';
import * as path from 'path';
import {
  DatabaseEntity,
  Column,
  Index,
  Constraint,
  Relationship,
  ORMDecorator,
  ColumnType,
  SourceLocation,
  ForeignKeyReference,
  JoinTable,
  CascadeOption,
  getTableName,
  toSnakeCase,
} from '../../types/database';

/**
 * TypeORM Extractor
 * Analyzes TypeScript files to extract TypeORM entity definitions
 */
export class TypeORMExtractor {
  private sourceFiles: ts.SourceFile[] = [];
  private entities: Map<string, DatabaseEntity> = new Map();
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;

  /**
   * Extract schema from TypeORM entity files
   * @param filePaths - Array of file paths to analyze
   * @returns Array of extracted database entities
   */
  public async extract(filePaths: string[]): Promise<DatabaseEntity[]> {
    // Create TypeScript program for type checking
    this.program = ts.createProgram(filePaths, {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    });

    this.typeChecker = this.program.getTypeChecker();

    // Parse all source files
    for (const filePath of filePaths) {
      const sourceFile = this.program.getSourceFile(filePath);
      if (sourceFile) {
        this.sourceFiles.push(sourceFile);
        this.analyzeSourceFile(sourceFile);
      }
    }

    // Process relationships after all entities are extracted
    this.processRelationships();

    return Array.from(this.entities.values());
  }

  /**
   * Analyze a single source file for entity definitions
   */
  private analyzeSourceFile(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && this.hasEntityDecorator(node)) {
        const entity = this.extractEntity(node, sourceFile);
        if (entity) {
          this.entities.set(entity.name, entity);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Check if a class has @Entity decorator
   */
  private hasEntityDecorator(node: ts.ClassDeclaration): boolean {
    if (!node.modifiers) return false;

    return node.modifiers.some(
      (modifier) =>
        ts.isDecorator(modifier) &&
        ts.isCallExpression(modifier.expression) &&
        ts.isIdentifier(modifier.expression.expression) &&
        modifier.expression.expression.text === 'Entity'
    );
  }

  /**
   * Extract entity information from a class declaration
   */
  private extractEntity(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile
  ): DatabaseEntity | null {
    const className = node.name?.text;
    if (!className) return null;

    const entityDecorator = this.getEntityDecorator(node);
    const tableName = this.getTableNameFromDecorator(entityDecorator, className);
    const schema = this.getSchemaFromDecorator(entityDecorator);

    const columns: Column[] = [];
    const indexes: Index[] = [];
    const constraints: Constraint[] = [];
    const relationships: Relationship[] = [];
    const decorators: ORMDecorator[] = [];

    // Extract entity-level decorators
    decorators.push(...this.extractEntityDecorators(node));

    // Extract entity-level indexes
    indexes.push(...this.extractEntityIndexes(node, tableName));

    // Process class members (columns and relationships)
    node.members.forEach((member) => {
      if (ts.isPropertyDeclaration(member)) {
        const propertyName = this.getPropertyName(member);
        if (!propertyName) return;

        if (this.isColumn(member)) {
          const column = this.extractColumn(member, propertyName);
          if (column) {
            columns.push(column);

            // Extract constraints from column
            if (column.primary) {
              constraints.push({
                type: 'primary_key',
                columns: [column.name],
                name: `pk_${tableName}_${column.name}`,
              });
            }

            if (column.unique) {
              constraints.push({
                type: 'unique',
                columns: [column.name],
                name: `uq_${tableName}_${column.name}`,
              });
            }

            if (!column.nullable) {
              constraints.push({
                type: 'not_null',
                columns: [column.name],
              });
            }
          }
        } else if (this.isRelationship(member)) {
          const relationship = this.extractRelationship(
            member,
            propertyName,
            className
          );
          if (relationship) {
            relationships.push(relationship);
          }
        }
      }
    });

    const location = this.getSourceLocation(node, sourceFile);

    const entity: DatabaseEntity = {
      name: tableName,
      type: 'table',
      schema,
      columns,
      indexes,
      constraints,
      relationships,
      sourceFile: sourceFile.fileName,
      sourceLocation: location,
      orm: {
        type: 'typeorm',
        decorators,
        options: this.getEntityOptions(entityDecorator),
      },
      documentation: this.extractDocumentation(node),
      metadata: this.extractEntityMetadata(node, columns),
    };

    return entity;
  }

  /**
   * Get @Entity decorator from class
   */
  private getEntityDecorator(node: ts.ClassDeclaration): ts.Decorator | null {
    if (!node.modifiers) return null;

    for (const modifier of node.modifiers) {
      if (
        ts.isDecorator(modifier) &&
        ts.isCallExpression(modifier.expression) &&
        ts.isIdentifier(modifier.expression.expression) &&
        modifier.expression.expression.text === 'Entity'
      ) {
        return modifier;
      }
    }

    return null;
  }

  /**
   * Extract table name from @Entity decorator
   */
  private getTableNameFromDecorator(
    decorator: ts.Decorator | null,
    className: string
  ): string {
    if (!decorator || !ts.isCallExpression(decorator.expression)) {
      return toSnakeCase(className);
    }

    const args = decorator.expression.arguments;
    if (args.length === 0) {
      return toSnakeCase(className);
    }

    // First argument can be table name string or options object
    const firstArg = args[0];
    if (ts.isStringLiteral(firstArg)) {
      return firstArg.text;
    }

    if (ts.isObjectLiteralExpression(firstArg)) {
      const nameProperty = firstArg.properties.find(
        (prop) =>
          ts.isPropertyAssignment(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === 'name'
      );

      if (
        nameProperty &&
        ts.isPropertyAssignment(nameProperty) &&
        ts.isStringLiteral(nameProperty.initializer)
      ) {
        return nameProperty.initializer.text;
      }
    }

    return toSnakeCase(className);
  }

  /**
   * Extract schema from @Entity decorator
   */
  private getSchemaFromDecorator(decorator: ts.Decorator | null): string | undefined {
    if (!decorator || !ts.isCallExpression(decorator.expression)) {
      return undefined;
    }

    const args = decorator.expression.arguments;
    if (args.length === 0) return undefined;

    const firstArg = args[0];
    if (ts.isObjectLiteralExpression(firstArg)) {
      const schemaProperty = firstArg.properties.find(
        (prop) =>
          ts.isPropertyAssignment(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === 'schema'
      );

      if (
        schemaProperty &&
        ts.isPropertyAssignment(schemaProperty) &&
        ts.isStringLiteral(schemaProperty.initializer)
      ) {
        return schemaProperty.initializer.text;
      }
    }

    return undefined;
  }

  /**
   * Check if property is a column
   */
  private isColumn(member: ts.PropertyDeclaration): boolean {
    if (!member.modifiers) return false;

    return member.modifiers.some((modifier) => {
      if (!ts.isDecorator(modifier)) return false;

      const decoratorName = this.getDecoratorName(modifier);
      return (
        decoratorName === 'Column' ||
        decoratorName === 'PrimaryColumn' ||
        decoratorName === 'PrimaryGeneratedColumn' ||
        decoratorName === 'CreateDateColumn' ||
        decoratorName === 'UpdateDateColumn' ||
        decoratorName === 'DeleteDateColumn' ||
        decoratorName === 'VersionColumn'
      );
    });
  }

  /**
   * Check if property is a relationship
   */
  private isRelationship(member: ts.PropertyDeclaration): boolean {
    if (!member.modifiers) return false;

    return member.modifiers.some((modifier) => {
      if (!ts.isDecorator(modifier)) return false;

      const decoratorName = this.getDecoratorName(modifier);
      return (
        decoratorName === 'OneToOne' ||
        decoratorName === 'OneToMany' ||
        decoratorName === 'ManyToOne' ||
        decoratorName === 'ManyToMany'
      );
    });
  }

  /**
   * Extract column information from property
   */
  private extractColumn(
    member: ts.PropertyDeclaration,
    propertyName: string
  ): Column | null {
    const columnDecorator = this.getColumnDecorator(member);
    if (!columnDecorator) return null;

    const decoratorName = this.getDecoratorName(columnDecorator);
    const options = this.getColumnOptions(columnDecorator);

    const columnName = options.name || toSnakeCase(propertyName);
    const columnType = this.getColumnType(member, options);
    const nullable = options.nullable !== false;
    const unique = options.unique === true;
    const primary =
      decoratorName === 'PrimaryColumn' ||
      decoratorName === 'PrimaryGeneratedColumn';
    const autoIncrement = decoratorName === 'PrimaryGeneratedColumn';

    const column: Column = {
      name: columnName,
      type: columnType,
      nullable: primary ? false : nullable,
      primary,
      unique,
      autoIncrement,
      default: options.default,
      length: options.length,
      precision: options.precision,
      scale: options.scale,
      enum: options.enum,
      comment: options.comment,
      decorators: this.getColumnDecoratorNames(member),
    };

    return column;
  }

  /**
   * Get column decorator from property
   */
  private getColumnDecorator(member: ts.PropertyDeclaration): ts.Decorator | null {
    if (!member.modifiers) return null;

    for (const modifier of member.modifiers) {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (
          decoratorName === 'Column' ||
          decoratorName === 'PrimaryColumn' ||
          decoratorName === 'PrimaryGeneratedColumn' ||
          decoratorName === 'CreateDateColumn' ||
          decoratorName === 'UpdateDateColumn' ||
          decoratorName === 'DeleteDateColumn' ||
          decoratorName === 'VersionColumn'
        ) {
          return modifier;
        }
      }
    }

    return null;
  }

  /**
   * Get decorator name
   */
  private getDecoratorName(decorator: ts.Decorator): string | null {
    if (ts.isCallExpression(decorator.expression)) {
      if (ts.isIdentifier(decorator.expression.expression)) {
        return decorator.expression.expression.text;
      }
    } else if (ts.isIdentifier(decorator.expression)) {
      return decorator.expression.text;
    }
    return null;
  }

  /**
   * Extract column options from decorator
   */
  private getColumnOptions(decorator: ts.Decorator): Record<string, any> {
    const options: Record<string, any> = {};

    if (!ts.isCallExpression(decorator.expression)) {
      return options;
    }

    const args = decorator.expression.arguments;
    if (args.length === 0) return options;

    const firstArg = args[0];

    // @Column('type') or @Column('type', {options})
    if (ts.isStringLiteral(firstArg)) {
      options.type = firstArg.text;

      if (args.length > 1 && ts.isObjectLiteralExpression(args[1])) {
        Object.assign(options, this.parseObjectLiteral(args[1]));
      }
    } else if (ts.isObjectLiteralExpression(firstArg)) {
      Object.assign(options, this.parseObjectLiteral(firstArg));
    }

    return options;
  }

  /**
   * Parse object literal expression to plain object
   */
  private parseObjectLiteral(node: ts.ObjectLiteralExpression): Record<string, any> {
    const result: Record<string, any> = {};

    node.properties.forEach((prop) => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const key = prop.name.text;
        const value = this.evaluateExpression(prop.initializer);
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Evaluate expression to get its value
   */
  private evaluateExpression(node: ts.Expression): any {
    if (ts.isStringLiteral(node)) {
      return node.text;
    } else if (ts.isNumericLiteral(node)) {
      return Number(node.text);
    } else if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    } else if (node.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    } else if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map((element) => this.evaluateExpression(element));
    } else if (ts.isObjectLiteralExpression(node)) {
      return this.parseObjectLiteral(node);
    }

    return undefined;
  }

  /**
   * Get column type from property type and options
   */
  private getColumnType(
    member: ts.PropertyDeclaration,
    options: Record<string, any>
  ): ColumnType {
    // If type is explicitly specified in decorator
    if (options.type) {
      return this.normalizeColumnType(options.type);
    }

    // Infer from TypeScript type
    if (member.type) {
      return this.inferColumnTypeFromTSType(member.type);
    }

    return 'string';
  }

  /**
   * Normalize TypeORM column type to standard type
   */
  private normalizeColumnType(typeormType: string): ColumnType {
    const typeMap: Record<string, ColumnType> = {
      int: 'integer',
      int2: 'smallint',
      int4: 'integer',
      int8: 'bigint',
      smallserial: 'smallint',
      serial: 'integer',
      bigserial: 'bigint',
      bool: 'boolean',
      timestamptz: 'timestamp',
      timetz: 'time',
      varbit: 'binary',
      bit: 'binary',
    };

    return typeMap[typeormType] || typeormType;
  }

  /**
   * Infer column type from TypeScript type
   */
  private inferColumnTypeFromTSType(typeNode: ts.TypeNode): ColumnType {
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
      const typeName = typeNode.typeName.text;

      const typeMap: Record<string, ColumnType> = {
        String: 'string',
        Number: 'integer',
        Boolean: 'boolean',
        Date: 'timestamp',
      };

      return typeMap[typeName] || 'string';
    }

    // Handle literal types
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.NumberKeyword:
        return 'integer';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      default:
        return 'string';
    }
  }

  /**
   * Get all decorator names for a column
   */
  private getColumnDecoratorNames(member: ts.PropertyDeclaration): string[] {
    const decorators: string[] = [];

    if (!member.modifiers) return decorators;

    member.modifiers.forEach((modifier) => {
      if (ts.isDecorator(modifier)) {
        const name = this.getDecoratorName(modifier);
        if (name) {
          decorators.push(`@${name}`);
        }
      }
    });

    return decorators;
  }

  /**
   * Extract relationship from property
   */
  private extractRelationship(
    member: ts.PropertyDeclaration,
    propertyName: string,
    sourceEntity: string
  ): Relationship | null {
    const relationDecorator = this.getRelationDecorator(member);
    if (!relationDecorator) return null;

    const decoratorName = this.getDecoratorName(relationDecorator);
    if (!decoratorName) return null;

    const relationType = this.mapRelationType(decoratorName);
    const targetEntity = this.getTargetEntity(relationDecorator, member);
    const options = this.getRelationOptions(relationDecorator);

    const relationship: Relationship = {
      type: relationType,
      sourceEntity,
      targetEntity,
      cascade: options.cascade,
      eager: options.eager,
      lazy: options.lazy,
    };

    // Extract join column or join table information
    const joinColumnDecorator = this.getDecoratorByName(member, 'JoinColumn');
    const joinTableDecorator = this.getDecoratorByName(member, 'JoinTable');

    if (joinColumnDecorator) {
      const joinOptions = this.getDecoratorOptions(joinColumnDecorator);
      relationship.sourceColumn = joinOptions.name || `${toSnakeCase(propertyName)}_id`;
      relationship.targetColumn = joinOptions.referencedColumnName || 'id';
    }

    if (joinTableDecorator) {
      const joinOptions = this.getDecoratorOptions(joinTableDecorator);
      relationship.joinTable = this.extractJoinTable(
        joinOptions,
        sourceEntity,
        targetEntity
      );
    }

    return relationship;
  }

  /**
   * Get relation decorator
   */
  private getRelationDecorator(member: ts.PropertyDeclaration): ts.Decorator | null {
    if (!member.modifiers) return null;

    for (const modifier of member.modifiers) {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (
          decoratorName === 'OneToOne' ||
          decoratorName === 'OneToMany' ||
          decoratorName === 'ManyToOne' ||
          decoratorName === 'ManyToMany'
        ) {
          return modifier;
        }
      }
    }

    return null;
  }

  /**
   * Map TypeORM relation decorator to relationship type
   */
  private mapRelationType(
    decoratorName: string
  ): 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' {
    const map: Record<string, any> = {
      OneToOne: 'one-to-one',
      OneToMany: 'one-to-many',
      ManyToOne: 'many-to-one',
      ManyToMany: 'many-to-many',
    };

    return map[decoratorName] || 'many-to-one';
  }

  /**
   * Get target entity from relation decorator
   */
  private getTargetEntity(
    decorator: ts.Decorator,
    member: ts.PropertyDeclaration
  ): string {
    // Try to get from decorator arguments (type function)
    if (ts.isCallExpression(decorator.expression)) {
      const args = decorator.expression.arguments;
      if (args.length > 0) {
        const firstArg = args[0];

        // Arrow function: () => EntityClass
        if (ts.isArrowFunction(firstArg) && firstArg.body) {
          if (ts.isIdentifier(firstArg.body)) {
            return firstArg.body.text;
          }
        }

        // Direct reference: EntityClass
        if (ts.isIdentifier(firstArg)) {
          return firstArg.text;
        }
      }
    }

    // Fallback: Try to infer from property type
    if (member.type) {
      if (ts.isTypeReferenceNode(member.type) && ts.isIdentifier(member.type.typeName)) {
        return member.type.typeName.text;
      }

      // Handle array types: EntityClass[]
      if (ts.isArrayTypeNode(member.type)) {
        const elementType = member.type.elementType;
        if (ts.isTypeReferenceNode(elementType) && ts.isIdentifier(elementType.typeName)) {
          return elementType.typeName.text;
        }
      }
    }

    return 'Unknown';
  }

  /**
   * Get relation options
   */
  private getRelationOptions(decorator: ts.Decorator): Record<string, any> {
    if (!ts.isCallExpression(decorator.expression)) {
      return {};
    }

    const args = decorator.expression.arguments;
    
    // Second argument is usually the inverse side, third is options
    if (args.length >= 3 && ts.isObjectLiteralExpression(args[2])) {
      return this.parseObjectLiteral(args[2]);
    }

    // If only two arguments, second might be options
    if (args.length === 2 && ts.isObjectLiteralExpression(args[1])) {
      // Check if it's actually options (not inverse side function)
      if (!ts.isArrowFunction(args[1])) {
        return this.parseObjectLiteral(args[1]);
      }
    }

    return {};
  }

  /**
   * Get decorator by name
   */
  private getDecoratorByName(
    member: ts.PropertyDeclaration,
    name: string
  ): ts.Decorator | null {
    if (!member.modifiers) return null;

    for (const modifier of member.modifiers) {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (decoratorName === name) {
          return modifier;
        }
      }
    }

    return null;
  }

  /**
   * Get decorator options
   */
  private getDecoratorOptions(decorator: ts.Decorator): Record<string, any> {
    if (!ts.isCallExpression(decorator.expression)) {
      return {};
    }

    const args = decorator.expression.arguments;
    if (args.length === 0) return {};

    if (ts.isObjectLiteralExpression(args[0])) {
      return this.parseObjectLiteral(args[0]);
    }

    return {};
  }

  /**
   * Extract join table information
   */
  private extractJoinTable(
    options: Record<string, any>,
    sourceEntity: string,
    targetEntity: string
  ): JoinTable {
    return {
      name: options.name || `${toSnakeCase(sourceEntity)}_${toSnakeCase(targetEntity)}`,
      sourceColumn: options.joinColumn?.name || `${toSnakeCase(sourceEntity)}_id`,
      targetColumn: options.inverseJoinColumn?.name || `${toSnakeCase(targetEntity)}_id`,
    };
  }

  /**
   * Extract entity-level decorators
   */
  private extractEntityDecorators(node: ts.ClassDeclaration): ORMDecorator[] {
    const decorators: ORMDecorator[] = [];

    if (!node.modifiers) return decorators;

    node.modifiers.forEach((modifier) => {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (decoratorName) {
          decorators.push({
            name: decoratorName,
            options: this.getDecoratorOptions(modifier),
          });
        }
      }
    });

    return decorators;
  }

  /**
   * Extract entity-level indexes
   */
  private extractEntityIndexes(node: ts.ClassDeclaration, tableName: string): Index[] {
    const indexes: Index[] = [];

    if (!node.modifiers) return indexes;

    node.modifiers.forEach((modifier) => {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (decoratorName === 'Index') {
          const options = this.getDecoratorOptions(modifier);
          const columns = Array.isArray(options.columns)
            ? options.columns
            : [options.columns].filter(Boolean);

          if (columns.length > 0) {
            indexes.push({
              name: options.name || `idx_${tableName}_${columns.join('_')}`,
              columns,
              unique: options.unique === true,
              type: options.type,
              where: options.where,
            });
          }
        }
      }
    });

    return indexes;
  }

  /**
   * Get entity options from @Entity decorator
   */
  private getEntityOptions(decorator: ts.Decorator | null): Record<string, any> {
    if (!decorator) return {};
    return this.getDecoratorOptions(decorator);
  }

  /**
   * Extract documentation from JSDoc comments
   */
  private extractDocumentation(node: ts.Node): string | undefined {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());

    if (!commentRanges || commentRanges.length === 0) return undefined;

    const lastComment = commentRanges[commentRanges.length - 1];
    const commentText = fullText.substring(lastComment.pos, lastComment.end);

    // Extract JSDoc content
    const jsdocMatch = commentText.match(/\/\*\*([\s\S]*?)\*\//);
    if (jsdocMatch) {
      return jsdocMatch[1]
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, '').trim())
        .filter((line) => line.length > 0)
        .join(' ');
    }

    return undefined;
  }

  /**
   * Extract entity metadata (timestamps, soft delete, etc.)
   */
  private extractEntityMetadata(
    node: ts.ClassDeclaration,
    columns: Column[]
  ): any {
    const metadata: any = {
      timestamps: {},
    };

    // Check for timestamp columns
    const createdAtColumn = columns.find((col) =>
      col.decorators?.includes('@CreateDateColumn')
    );
    const updatedAtColumn = columns.find((col) =>
      col.decorators?.includes('@UpdateDateColumn')
    );
    const deletedAtColumn = columns.find((col) =>
      col.decorators?.includes('@DeleteDateColumn')
    );
    const versionColumn = columns.find((col) =>
      col.decorators?.includes('@VersionColumn')
    );

    if (createdAtColumn) metadata.timestamps.createdAt = createdAtColumn.name;
    if (updatedAtColumn) metadata.timestamps.updatedAt = updatedAtColumn.name;
    if (deletedAtColumn) {
      metadata.timestamps.deletedAt = deletedAtColumn.name;
      metadata.softDelete = true;
    }
    if (versionColumn) metadata.version = true;

    return metadata;
  }

  /**
   * Get source location
   */
  private getSourceLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      file: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      endLine: endLine + 1,
    };
  }

  /**
   * Get property name from member
   */
  private getPropertyName(member: ts.PropertyDeclaration): string | null {
    if (ts.isIdentifier(member.name)) {
      return member.name.text;
    }
    return null;
  }

  /**
   * Process relationships to add foreign key constraints
   */
  private processRelationships(): void {
    this.entities.forEach((entity) => {
      entity.relationships.forEach((relationship) => {
        // Add foreign key constraints for many-to-one and one-to-one relationships
        if (
          (relationship.type === 'many-to-one' || relationship.type === 'one-to-one') &&
          relationship.sourceColumn
        ) {
          const fkConstraint: Constraint = {
            type: 'foreign_key',
            columns: [relationship.sourceColumn],
            name: `fk_${entity.name}_${relationship.targetEntity}`,
            references: {
              table: toSnakeCase(relationship.targetEntity),
              columns: [relationship.targetColumn || 'id'],
              onDelete: this.getCascadeAction(relationship.cascade),
              onUpdate: this.getCascadeAction(relationship.cascade),
            },
          };

          entity.constraints.push(fkConstraint);
        }
      });
    });
  }

  /**
   * Get cascade action from cascade options
   */
  private getCascadeAction(
    cascade?: CascadeOption[]
  ): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | undefined {
    if (!cascade || cascade.length === 0) return undefined;

    if (cascade.includes('remove') || cascade.includes('soft-remove')) {
      return 'CASCADE';
    }

    return 'RESTRICT';
  }
}

export default TypeORMExtractor;
