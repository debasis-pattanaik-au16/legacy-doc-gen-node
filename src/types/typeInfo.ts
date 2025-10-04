/**
 * Enhanced Type Information Structures
 * 
 * Comprehensive type system supporting all TypeScript type constructs including:
 * - Union and intersection types
 * - Conditional types
 * - Mapped types
 * - Tuple types
 * - Literal types
 * - Utility types
 * - Indexed access types
 * - Function signatures
 * - Generic type parameters
 * 
 * @module types/typeInfo
 */

import { TypeInfo } from './ast';

/**
 * Enhanced type information that extends the base TypeInfo
 * with support for advanced TypeScript type constructs
 */
export interface EnhancedTypeInfo extends TypeInfo {
  // Base properties (from TypeInfo)
  name: string;
  isArray: boolean;
  isGeneric: boolean;
  genericTypes: EnhancedTypeInfo[];
  isNullable: boolean;
  isPrimitive: boolean;
  
  // Union types
  isUnion: boolean;
  unionTypes: EnhancedTypeInfo[];
  
  // Intersection types
  isIntersection: boolean;
  intersectionTypes: EnhancedTypeInfo[];
  
  // Literal types
  isLiteral: boolean;
  literalValue?: string | number | boolean;
  
  // Tuple types
  isTuple: boolean;
  tupleTypes?: EnhancedTypeInfo[];
  tupleLabels?: string[];
  hasRestElement?: boolean;
  hasOptionalElements?: boolean;
  
  // Conditional types
  isConditional: boolean;
  conditionalInfo?: ConditionalTypeInfo;
  
  // Mapped types
  isMapped: boolean;
  mappedInfo?: MappedTypeInfo;
  
  // Utility types
  isUtility: boolean;
  utilityType?: UtilityTypeName;
  utilityArgs?: EnhancedTypeInfo[];
  
  // Indexed access types (e.g., T[K])
  isIndexedAccess: boolean;
  indexedAccessInfo?: IndexedAccessTypeInfo;
  
  // Function types
  isFunction: boolean;
  functionSignature?: FunctionSignature;
  
  // Type reference tracking
  isTypeReference: boolean;
  referencedTypeName?: string;
  
  // Additional metadata
  sourceLocation?: SourceLocation;
  documentation?: string;
}

/**
 * Conditional type information (e.g., T extends U ? X : Y)
 */
export interface ConditionalTypeInfo {
  /** The type being checked */
  check: EnhancedTypeInfo;
  /** The type to extend */
  extends: EnhancedTypeInfo;
  /** Type if condition is true */
  trueType: EnhancedTypeInfo;
  /** Type if condition is false */
  falseType: EnhancedTypeInfo;
}

/**
 * Mapped type information (e.g., { [K in keyof T]: T[K] })
 */
export interface MappedTypeInfo {
  /** Type parameter name (e.g., K) */
  typeParameter: string;
  /** Constraint on type parameter (e.g., keyof T) */
  constraint: EnhancedTypeInfo;
  /** Mapped value type (e.g., T[K]) */
  mapping: EnhancedTypeInfo;
  /** Readonly modifier */
  readonly?: boolean;
  /** Optional modifier */
  optional?: boolean;
  /** Readonly modifier is removed (-readonly) */
  removeReadonly?: boolean;
  /** Optional modifier is removed (-?) */
  removeOptional?: boolean;
}

/**
 * Indexed access type information (e.g., Person['name'])
 */
export interface IndexedAccessTypeInfo {
  /** Object type being indexed */
  object: EnhancedTypeInfo;
  /** Index type */
  index: EnhancedTypeInfo;
}

/**
 * Function signature information
 */
export interface FunctionSignature {
  /** Function parameters */
  parameters: FunctionParameter[];
  /** Return type */
  returnType: EnhancedTypeInfo;
  /** Type parameters (generics) */
  typeParameters?: TypeParameterInfo[];
  /** Is this a constructor signature */
  isConstructor?: boolean;
}

/**
 * Function parameter information
 */
export interface FunctionParameter {
  name: string;
  type: EnhancedTypeInfo;
  isOptional: boolean;
  isRest: boolean;
  defaultValue?: string;
}

/**
 * Type parameter information (generic type parameter)
 */
export interface TypeParameterInfo {
  /** Parameter name (e.g., T, K, V) */
  name: string;
  /** Constraint on the type parameter (e.g., extends string) */
  constraint?: EnhancedTypeInfo;
  /** Default type */
  default?: EnhancedTypeInfo;
  /** Variance annotation */
  variance?: 'covariant' | 'contravariant' | 'invariant';
}

/**
 * Source location information
 */
export interface SourceLocation {
  fileName: string;
  line: number;
  column: number;
}

/**
 * TypeScript utility type names
 */
export type UtilityTypeName =
  | 'Partial'
  | 'Required'
  | 'Readonly'
  | 'Pick'
  | 'Omit'
  | 'Record'
  | 'Exclude'
  | 'Extract'
  | 'NonNullable'
  | 'ReturnType'
  | 'InstanceType'
  | 'Parameters'
  | 'ConstructorParameters'
  | 'Awaited'
  | 'ThisType'
  | string; // Allow custom utility types

/**
 * Type context for resolution
 */
export interface TypeContext {
  /** Current scope (for type parameter resolution) */
  scope: 'function' | 'class' | 'interface' | 'module';
  /** Current generic type parameters in scope */
  genericContext?: Map<string, EnhancedTypeInfo>;
  /** Type aliases available in current scope */
  typeAliases?: Map<string, EnhancedTypeInfo>;
  /** Imported types */
  imports?: Map<string, string>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a type is a union type
 */
export function isUnionType(type: EnhancedTypeInfo): boolean {
  return type.isUnion && type.unionTypes.length > 0;
}

/**
 * Type guard to check if a type is an intersection type
 */
export function isIntersectionType(type: EnhancedTypeInfo): boolean {
  return type.isIntersection && type.intersectionTypes.length > 0;
}

/**
 * Type guard to check if a type is a conditional type
 */
export function isConditionalType(type: EnhancedTypeInfo): boolean {
  return type.isConditional && type.conditionalInfo !== undefined;
}

/**
 * Type guard to check if a type is a mapped type
 */
export function isMappedType(type: EnhancedTypeInfo): boolean {
  return type.isMapped && type.mappedInfo !== undefined;
}

/**
 * Type guard to check if a type is a tuple type
 */
export function isTupleType(type: EnhancedTypeInfo): boolean {
  return type.isTuple && type.tupleTypes !== undefined && type.tupleTypes.length > 0;
}

/**
 * Type guard to check if a type is a literal type
 */
export function isLiteralType(type: EnhancedTypeInfo): boolean {
  return type.isLiteral === true;
}

/**
 * Type guard to check if a type is a utility type
 */
export function isUtilityType(type: EnhancedTypeInfo): boolean {
  return type.isUtility && type.utilityType !== undefined;
}

/**
 * Type guard to check if a type is a function type
 */
export function isFunctionType(type: EnhancedTypeInfo): boolean {
  return type.isFunction && type.functionSignature !== undefined;
}

/**
 * Type guard to check if a type is an indexed access type
 */
export function isIndexedAccessType(type: EnhancedTypeInfo): boolean {
  return type.isIndexedAccess && type.indexedAccessInfo !== undefined;
}

/**
 * Type guard to check if a type is a primitive type
 */
export function isPrimitiveType(type: EnhancedTypeInfo): boolean {
  return type.isPrimitive || ['string', 'number', 'boolean', 'null', 'undefined', 'void', 'never', 'any', 'unknown'].includes(type.name);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a basic primitive type info
 */
export function createPrimitiveType(name: string): EnhancedTypeInfo {
  return {
    name,
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
    isNullable: name === 'null' || name === 'undefined',
    isPrimitive: true,
  };
}

/**
 * Creates an 'any' type
 */
export function createAnyType(): EnhancedTypeInfo {
  return createPrimitiveType('any');
}

/**
 * Creates an 'unknown' type
 */
export function createUnknownType(): EnhancedTypeInfo {
  return createPrimitiveType('unknown');
}

/**
 * Creates a 'never' type
 */
export function createNeverType(): EnhancedTypeInfo {
  return createPrimitiveType('never');
}

/**
 * Creates a literal type
 */
export function createLiteralType(value: string | number | boolean): EnhancedTypeInfo {
  return {
    name: typeof value === 'string' ? `"${value}"` : String(value),
    isLiteral: true,
    literalValue: value,
    isArray: false,
    isGeneric: false,
    genericTypes: [],
    isUnion: false,
    unionTypes: [],
    isIntersection: false,
    intersectionTypes: [],
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
 * Creates an array type
 */
export function createArrayType(elementType: EnhancedTypeInfo): EnhancedTypeInfo {
  return {
    name: `${elementType.name}[]`,
    isArray: true,
    isGeneric: false,
    genericTypes: [elementType],
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
 * Gets a human-readable description of a type
 */
export function getTypeDescription(type: EnhancedTypeInfo): string {
  if (type.isUnion) {
    return `Union of ${type.unionTypes.length} types`;
  }
  if (type.isIntersection) {
    return `Intersection of ${type.intersectionTypes.length} types`;
  }
  if (type.isConditional) {
    return 'Conditional type';
  }
  if (type.isMapped) {
    return 'Mapped type';
  }
  if (type.isTuple) {
    return `Tuple with ${type.tupleTypes?.length || 0} elements`;
  }
  if (type.isLiteral) {
    return `Literal type: ${type.literalValue}`;
  }
  if (type.isFunction) {
    return 'Function type';
  }
  if (type.isArray) {
    return `Array of ${type.genericTypes[0]?.name || 'unknown'}`;
  }
  if (type.isGeneric) {
    return `Generic type with ${type.genericTypes.length} parameters`;
  }
  return `Type: ${type.name}`;
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Simple type
 * const stringType = createPrimitiveType('string');
 * 
 * // Union type
 * const unionType: EnhancedTypeInfo = {
 *   name: 'string | number',
 *   isUnion: true,
 *   unionTypes: [
 *     createPrimitiveType('string'),
 *     createPrimitiveType('number')
 *   ],
 *   // ... other properties
 * };
 * 
 * // Conditional type
 * const conditionalType: EnhancedTypeInfo = {
 *   name: 'T extends string ? true : false',
 *   isConditional: true,
 *   conditionalInfo: {
 *     check: createPrimitiveType('T'),
 *     extends: createPrimitiveType('string'),
 *     trueType: createLiteralType(true),
 *     falseType: createLiteralType(false),
 *   },
 *   // ... other properties
 * };
 * ```
 */
