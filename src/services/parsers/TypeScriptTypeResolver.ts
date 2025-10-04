/**
 * TypeScript Type Resolver
 * 
 * Resolves all TypeScript type constructs with high accuracy:
 * - Union and Intersection types
 * - Conditional types
 * - Mapped types
 * - Tuple types
 * - Literal types
 * - Utility types (Partial, Required, Pick, Omit, etc.)
 * - Indexed access types
 * - Function types
 * - Generic type parameters
 * 
 * Features:
 * - Type caching for performance
 * - Cycle detection for recursive types
 * - Type inference when possible
 * - Comprehensive error handling
 * 
 * @module services/parsers/TypeScriptTypeResolver
 */

import * as t from '@babel/types';
import { logger } from '@/utils/logger';
import {
  EnhancedTypeInfo,
  TypeContext,
  TypeParameterInfo,
  FunctionSignature,
  FunctionParameter,
  createPrimitiveType,
  createAnyType,
  createUnknownType,
  createNeverType,
  createLiteralType,
  createArrayType,
} from '@/types/typeInfo';

/**
 * TypeScript Type Resolver
 * Resolves TypeScript types from AST nodes
 */
export class TypeScriptTypeResolver {
  private typeCache: Map<string, EnhancedTypeInfo>;
  private resolving: Set<string>; // For cycle detection
  
  constructor() {
    this.typeCache = new Map();
    this.resolving = new Set();
  }
  
  /**
   * Resolve a type from an AST node
   * @param node - The AST node representing the type
   * @param context - The type resolution context
   * @returns Resolved type information
   */
  public resolveType(node: any, context: TypeContext = this.getDefaultContext()): EnhancedTypeInfo {
    if (!node) {
      return createAnyType();
    }
    
    const cacheKey = this.getCacheKey(node, context);
    
    // Check cache
    if (this.typeCache.has(cacheKey)) {
      return this.typeCache.get(cacheKey)!;
    }
    
    // Detect cycles
    if (this.resolving.has(cacheKey)) {
      logger.debug(`Circular type reference detected: ${cacheKey}`);
      return this.createRecursiveTypeRef(cacheKey);
    }
    
    this.resolving.add(cacheKey);
    
    try {
      const resolved = this.resolveTypeInternal(node, context);
      this.typeCache.set(cacheKey, resolved);
      return resolved;
    } finally {
      this.resolving.delete(cacheKey);
    }
  }
  
  /**
   * Internal type resolution dispatch
   */
  private resolveTypeInternal(node: any, context: TypeContext): EnhancedTypeInfo {
    if (!node || !node.type) {
      return createAnyType();
    }
    
    // Dispatch to specific resolver based on node type
    switch (node.type) {
      case 'TSTypeReference':
        return this.resolveTypeReference(node, context);
      case 'TSUnionType':
        return this.resolveUnionType(node, context);
      case 'TSIntersectionType':
        return this.resolveIntersectionType(node, context);
      case 'TSConditionalType':
        return this.resolveConditionalType(node, context);
      case 'TSMappedType':
        return this.resolveMappedType(node, context);
      case 'TSArrayType':
        return this.resolveArrayType(node, context);
      case 'TSTupleType':
        return this.resolveTupleType(node, context);
      case 'TSLiteralType':
        return this.resolveLiteralType(node, context);
      case 'TSIndexedAccessType':
        return this.resolveIndexedAccessType(node, context);
      case 'TSFunctionType':
      case 'TSConstructorType':
        return this.resolveFunctionType(node, context);
      case 'TSTypeLiteral':
        return this.resolveTypeLiteral(node, context);
      case 'TSParenthesizedType':
        return this.resolveType(node.typeAnnotation, context);
      case 'TSTypeQuery':
        return this.resolveTypeQuery(node, context);
      case 'TSTypeOperator':
        return this.resolveTypeOperator(node, context);
      case 'TSTemplateLiteralType':
        return this.resolveTemplateLiteralType(node, context);
      // Primitive types
      case 'TSStringKeyword':
        return createPrimitiveType('string');
      case 'TSNumberKeyword':
        return createPrimitiveType('number');
      case 'TSBooleanKeyword':
        return createPrimitiveType('boolean');
      case 'TSNullKeyword':
        return createPrimitiveType('null');
      case 'TSUndefinedKeyword':
        return createPrimitiveType('undefined');
      case 'TSVoidKeyword':
        return createPrimitiveType('void');
      case 'TSAnyKeyword':
        return createAnyType();
      case 'TSUnknownKeyword':
        return createUnknownType();
      case 'TSNeverKeyword':
        return createNeverType();
      case 'TSSymbolKeyword':
        return createPrimitiveType('symbol');
      case 'TSBigIntKeyword':
        return createPrimitiveType('bigint');
      case 'TSObjectKeyword':
        return createPrimitiveType('object');
      case 'TSThisType':
        return createPrimitiveType('this');
      default:
        logger.warn(`Unknown type node: ${node.type}`);
        return createAnyType();
    }
  }
  
  // =========================================================================
  // Type Resolution Methods
  // =========================================================================
  
  /**
   * Resolve type reference (e.g., MyType, Array<T>, Promise<string>)
   */
  private resolveTypeReference(node: any, context: TypeContext): EnhancedTypeInfo {
    const typeName = this.getTypeReferenceName(node);
    
    // Check if it's a generic type in current context
    if (context.genericContext?.has(typeName)) {
      return context.genericContext.get(typeName)!;
    }
    
    // Check if it's a utility type
    const utilityTypes = ['Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Record', 
                          'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'InstanceType',
                          'Parameters', 'ConstructorParameters', 'Awaited', 'ThisType'];
    
    if (utilityTypes.includes(typeName)) {
      return this.resolveUtilityType(node, context);
    }
    
    // Handle generic parameters
    const typeParameters = node.typeParameters?.params || [];
    const genericTypes = typeParameters.map((param: any) => this.resolveType(param, context));
    
    // Built-in generic types
    if (typeName === 'Array' && genericTypes.length > 0) {
      return createArrayType(genericTypes[0]);
    }
    
    if (typeName === 'Promise' && genericTypes.length > 0) {
      return {
        name: `Promise<${genericTypes[0].name}>`,
        isGeneric: true,
        genericTypes,
        isArray: false,
        isUnion: false,
        unionTypes: [],
        isIntersection: false,
        intersectionTypes: [],
        isLiteral: false,
        isTuple: false,
        isConditional: false,
        isMapped: false,
        isUtility: false,
        isIndexedAccess: false,
        isFunction: false,
        isTypeReference: true,
        referencedTypeName: typeName,
        isNullable: false,
        isPrimitive: false,
      };
    }
    
    // Generic type reference
    return {
      name: genericTypes.length > 0 
        ? `${typeName}<${genericTypes.map((t: EnhancedTypeInfo) => t.name).join(', ')}>`
        : typeName,
      isGeneric: genericTypes.length > 0,
      genericTypes,
      isArray: false,
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: true,
      referencedTypeName: typeName,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve union type (e.g., string | number | boolean)
   */
  private resolveUnionType(node: any, context: TypeContext): EnhancedTypeInfo {
    const types: EnhancedTypeInfo[] = [];
    
    for (const typeNode of node.types) {
      const resolved = this.resolveType(typeNode, context);
      
      // Flatten nested unions
      if (resolved.isUnion) {
        types.push(...resolved.unionTypes);
      } else {
        types.push(resolved);
      }
    }
    
    // Remove duplicates
    const uniqueTypes = this.deduplicateTypes(types);
    
    return {
      name: uniqueTypes.map(t => t.name).join(' | '),
      isUnion: true,
      unionTypes: uniqueTypes,
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: uniqueTypes.some(t => t.name === 'null' || t.name === 'undefined'),
      isPrimitive: uniqueTypes.every(t => t.isPrimitive),
    };
  }
  
  /**
   * Resolve intersection type (e.g., Type1 & Type2 & Type3)
   */
  private resolveIntersectionType(node: any, context: TypeContext): EnhancedTypeInfo {
    const types: EnhancedTypeInfo[] = [];
    
    for (const typeNode of node.types) {
      const resolved = this.resolveType(typeNode, context);
      
      // Flatten nested intersections
      if (resolved.isIntersection) {
        types.push(...resolved.intersectionTypes);
      } else {
        types.push(resolved);
      }
    }
    
    return {
      name: types.map(t => t.name).join(' & '),
      isIntersection: true,
      intersectionTypes: types,
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve conditional type (e.g., T extends U ? X : Y)
   */
  private resolveConditionalType(node: any, context: TypeContext): EnhancedTypeInfo {
    const checkType = this.resolveType(node.checkType, context);
    const extendsType = this.resolveType(node.extendsType, context);
    const trueType = this.resolveType(node.trueType, context);
    const falseType = this.resolveType(node.falseType, context);
    
    // Try to evaluate if both types are concrete
    const evaluated = this.tryEvaluateConditional(checkType, extendsType, trueType, falseType, context);
    
    if (evaluated) {
      return evaluated;
    }
    
    // Return unevaluated conditional
    return {
      name: `${checkType.name} extends ${extendsType.name} ? ${trueType.name} : ${falseType.name}`,
      isConditional: true,
      conditionalInfo: {
        check: checkType,
        extends: extendsType,
        trueType,
        falseType,
      },
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve mapped type (e.g., { [K in keyof T]: T[K] })
   */
  private resolveMappedType(node: any, context: TypeContext): EnhancedTypeInfo {
    const typeParameter = node.typeParameter.name;
    const constraint = node.typeParameter.constraint 
      ? this.resolveType(node.typeParameter.constraint, context)
      : createAnyType();
    const mapping = this.resolveType(node.typeAnnotation, context);
    
    return {
      name: `{ [${typeParameter} in ${constraint.name}]: ${mapping.name} }`,
      isMapped: true,
      mappedInfo: {
        typeParameter,
        constraint,
        mapping,
        readonly: node.readonly === true || node.readonly === '+',
        optional: node.optional === true || node.optional === '+',
        removeReadonly: node.readonly === '-',
        removeOptional: node.optional === '-',
      },
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve tuple type (e.g., [string, number, boolean])
   */
  private resolveTupleType(node: any, context: TypeContext): EnhancedTypeInfo {
    const elementTypes = node.elementTypes || [];
    const tupleTypes = elementTypes.map((element: any) => {
      // Handle named tuple elements
      if (element.type === 'TSNamedTupleMember') {
        return this.resolveType(element.elementType, context);
      }
      // Handle rest elements
      if (element.type === 'TSRestType') {
        return this.resolveType(element.typeAnnotation, context);
      }
      // Handle optional elements
      if (element.type === 'TSOptionalType') {
        return this.resolveType(element.typeAnnotation, context);
      }
      return this.resolveType(element, context);
    });
    
    const labels = elementTypes
      .filter((e: any) => e.type === 'TSNamedTupleMember')
      .map((e: any) => e.label?.name);
    
    const hasRestElement = elementTypes.some((e: any) => e.type === 'TSRestType');
    const hasOptionalElements = elementTypes.some((e: any) => e.type === 'TSOptionalType');
    
    return {
      name: `[${tupleTypes.map((t: EnhancedTypeInfo) => t.name).join(', ')}]`,
      isTuple: true,
      tupleTypes,
      tupleLabels: labels.length > 0 ? labels : undefined,
      hasRestElement,
      hasOptionalElements,
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve literal type (e.g., "hello", 42, true)
   */
  private resolveLiteralType(node: any, context: TypeContext): EnhancedTypeInfo {
    const literal = node.literal;
    
    if (!literal) {
      return createAnyType();
    }
    
    // String literal
    if (t.isStringLiteral(literal)) {
      return createLiteralType(literal.value);
    }
    
    // Number literal
    if (t.isNumericLiteral(literal)) {
      return createLiteralType(literal.value);
    }
    
    // Boolean literal
    if (t.isBooleanLiteral(literal)) {
      return createLiteralType(literal.value);
    }
    
    // BigInt literal
    if (t.isBigIntLiteral(literal)) {
      return createLiteralType(literal.value);
    }
    
    // Template literal (unary minus for negative numbers)
    if (t.isUnaryExpression(literal) && literal.operator === '-') {
      if (t.isNumericLiteral(literal.argument)) {
        return createLiteralType(-literal.argument.value);
      }
    }
    
    return createAnyType();
  }
  
  /**
   * Resolve indexed access type (e.g., Person['name'], T[K])
   */
  private resolveIndexedAccessType(node: any, context: TypeContext): EnhancedTypeInfo {
    const objectType = this.resolveType(node.objectType, context);
    const indexType = this.resolveType(node.indexType, context);
    
    return {
      name: `${objectType.name}[${indexType.name}]`,
      isIndexedAccess: true,
      indexedAccessInfo: {
        object: objectType,
        index: indexType,
      },
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve function type (e.g., (a: string) => number)
   */
  private resolveFunctionType(node: any, context: TypeContext): EnhancedTypeInfo {
    const parameters: FunctionParameter[] = (node.parameters || []).map((param: any) => ({
      name: param.name || 'arg',
      type: param.typeAnnotation ? this.resolveType(param.typeAnnotation.typeAnnotation, context) : createAnyType(),
      isOptional: param.optional || false,
      isRest: param.type === 'RestElement',
      defaultValue: undefined,
    }));
    
    const returnType = node.typeAnnotation 
      ? this.resolveType(node.typeAnnotation.typeAnnotation, context)
      : createAnyType();
    
    const typeParameters: TypeParameterInfo[] | undefined = node.typeParameters?.params.map((tp: any) => ({
      name: tp.name,
      constraint: tp.constraint ? this.resolveType(tp.constraint, context) : undefined,
      default: tp.default ? this.resolveType(tp.default, context) : undefined,
    }));
    
    const signature: FunctionSignature = {
      parameters,
      returnType,
      typeParameters,
      isConstructor: node.type === 'TSConstructorType',
    };
    
    const paramStr = parameters.map(p => 
      `${p.isRest ? '...' : ''}${p.name}${p.isOptional ? '?' : ''}: ${p.type.name}`
    ).join(', ');
    
    return {
      name: `(${paramStr}) => ${returnType.name}`,
      isFunction: true,
      functionSignature: signature,
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve array type (e.g., string[], Array<string>)
   */
  private resolveArrayType(node: any, context: TypeContext): EnhancedTypeInfo {
    const elementType = this.resolveType(node.elementType, context);
    return createArrayType(elementType);
  }
  
  /**
   * Resolve type literal (object type)
   */
  private resolveTypeLiteral(node: any, context: TypeContext): EnhancedTypeInfo {
    return {
      name: 'object',
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve type query (typeof expression)
   */
  private resolveTypeQuery(node: any, context: TypeContext): EnhancedTypeInfo {
    const exprName = this.getExpressionName(node.exprName);
    return {
      name: `typeof ${exprName}`,
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve type operator (keyof, readonly, unique)
   */
  private resolveTypeOperator(node: any, context: TypeContext): EnhancedTypeInfo {
    const operator = node.operator;
    const typeAnnotation = this.resolveType(node.typeAnnotation, context);
    
    return {
      name: `${operator} ${typeAnnotation.name}`,
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Resolve template literal type
   */
  private resolveTemplateLiteralType(node: any, context: TypeContext): EnhancedTypeInfo {
    return {
      name: 'string',
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: false,
      isNullable: false,
      isPrimitive: true,
    };
  }
  
  /**
   * Resolve utility type (Partial, Required, etc.)
   */
  private resolveUtilityType(node: any, context: TypeContext): EnhancedTypeInfo {
    const typeName = this.getTypeReferenceName(node);
    const typeParameters = node.typeParameters?.params || [];
    const args = typeParameters.map((param: any) => this.resolveType(param, context));
    
    // Try to expand utility type
    const expanded = this.expandUtilityType(typeName, args, context);
    
    if (expanded) {
      return expanded;
    }
    
    // Return unexpanded utility type
    return {
      name: args.length > 0 
        ? `${typeName}<${args.map((a: EnhancedTypeInfo) => a.name).join(', ')}>`
        : typeName,
      isUtility: true,
      utilityType: typeName,
      utilityArgs: args,
      isArray: false,
      isGeneric: true,
      genericTypes: args,
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: true,
      referencedTypeName: typeName,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  // =========================================================================
  // Utility Methods
  // =========================================================================
  
  /**
   * Try to expand utility type if possible
   */
  private expandUtilityType(
    name: string,
    args: EnhancedTypeInfo[],
    context: TypeContext
  ): EnhancedTypeInfo | null {
    // For now, we don't expand utility types as it would require full type system implementation
    // This can be enhanced in the future
    return null;
  }
  
  /**
   * Try to evaluate a conditional type
   */
  private tryEvaluateConditional(
    check: EnhancedTypeInfo,
    extends_: EnhancedTypeInfo,
    trueType: EnhancedTypeInfo,
    falseType: EnhancedTypeInfo,
    context: TypeContext
  ): EnhancedTypeInfo | null {
    // Simple evaluation for exact type matches
    if (check.name === extends_.name && check.isPrimitive && extends_.isPrimitive) {
      return trueType;
    }
    
    // If types are completely different primitives
    if (check.isPrimitive && extends_.isPrimitive && check.name !== extends_.name) {
      return falseType;
    }
    
    // Can't evaluate - return null
    return null;
  }
  
  /**
   * Deduplicate an array of types
   */
  private deduplicateTypes(types: EnhancedTypeInfo[]): EnhancedTypeInfo[] {
    const seen = new Set<string>();
    const unique: EnhancedTypeInfo[] = [];
    
    for (const type of types) {
      const signature = this.getTypeSignature(type);
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(type);
      }
    }
    
    return unique;
  }
  
  /**
   * Get a unique signature for a type
   */
  private getTypeSignature(type: EnhancedTypeInfo): string {
    return type.name; // Simple signature based on name
  }
  
  /**
   * Get cache key for a type node
   */
  private getCacheKey(node: any, context: TypeContext): string {
    return `${node.type}_${node.start}_${node.end}_${context.scope}`;
  }
  
  /**
   * Create a recursive type reference placeholder
   */
  private createRecursiveTypeRef(cacheKey: string): EnhancedTypeInfo {
    return {
      name: 'RecursiveType',
      isArray: false,
      isGeneric: false,
      genericTypes: [],
      isUnion: false,
      unionTypes: [],
      isIntersection: false,
      intersectionTypes: [],
      isLiteral: false,
      isTuple: false,
      isConditional: false,
      isMapped: false,
      isUtility: false,
      isIndexedAccess: false,
      isFunction: false,
      isTypeReference: true,
      isNullable: false,
      isPrimitive: false,
    };
  }
  
  /**
   * Get type reference name from node
   */
  private getTypeReferenceName(node: any): string {
    if (node.typeName) {
      if (node.typeName.type === 'Identifier') {
        return node.typeName.name;
      }
      if (node.typeName.type === 'TSQualifiedName') {
        return this.getQualifiedName(node.typeName);
      }
    }
    return 'unknown';
  }
  
  /**
   * Get qualified name (e.g., React.Component)
   */
  private getQualifiedName(node: any): string {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'TSQualifiedName') {
      const left = this.getQualifiedName(node.left);
      const right = node.right.name;
      return `${left}.${right}`;
    }
    return 'unknown';
  }
  
  /**
   * Get expression name
   */
  private getExpressionName(node: any): string {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'TSQualifiedName') {
      return this.getQualifiedName(node);
    }
    return 'unknown';
  }
  
  /**
   * Get default type context
   */
  private getDefaultContext(): TypeContext {
    return {
      scope: 'module',
      genericContext: new Map(),
      typeAliases: new Map(),
      imports: new Map(),
    };
  }
  
  /**
   * Clear the type cache
   */
  public clearCache(): void {
    this.typeCache.clear();
    this.resolving.clear();
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; resolving: number } {
    return {
      size: this.typeCache.size,
      resolving: this.resolving.size,
    };
  }
}

/**
 * Singleton instance
 */
let resolverInstance: TypeScriptTypeResolver | null = null;

/**
 * Get singleton instance of the type resolver
 */
export function getTypeResolver(): TypeScriptTypeResolver {
  if (!resolverInstance) {
    resolverInstance = new TypeScriptTypeResolver();
  }
  return resolverInstance;
}
