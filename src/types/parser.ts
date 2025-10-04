/**
 * Parser interface and supporting types for language abstraction
 * Enables dynamic parser registration and extensibility
 */

import { 
  UnifiedAST, 
  ComponentNode, 
  ImportNode, 
  ExportNode, 
  ParseError,
  ComplexityMetrics 
} from './ast';

/**
 * Main parser interface that all language parsers must implement
 */
export interface LanguageParser {
  /** Language name (e.g., 'javascript', 'python', 'java') */
  readonly language: string;
  
  /** Supported file extensions (e.g., ['.js', '.jsx', '.ts']) */
  readonly supportedExtensions: string[];
  
  /** Parser version */
  readonly version: string;
  
  /**
   * Parse source code into unified AST
   * @param sourceCode - The source code to parse
   * @param fileName - Name of the file being parsed
   * @param options - Optional parsing options
   * @returns Promise resolving to UnifiedAST
   */
  parse(
    sourceCode: string, 
    fileName: string, 
    options?: ParseOptions
  ): Promise<UnifiedAST>;
  
  /**
   * Validate syntax without full parsing
   * @param sourceCode - The source code to validate
   * @returns Promise resolving to array of parse errors
   */
  validateSyntax(sourceCode: string): Promise<ParseError[]>;
  
  /**
   * Extract components from AST
   * @param ast - The AST object (language-specific)
   * @returns Array of component nodes
   */
  extractComponents(ast: any): ComponentNode[];
  
  /**
   * Extract imports from AST
   * @param ast - The AST object (language-specific)
   * @returns Array of import nodes
   */
  extractImports(ast: any): ImportNode[];
  
  /**
   * Extract exports from AST
   * @param ast - The AST object (language-specific)
   * @returns Array of export nodes
   */
  extractExports(ast: any): ExportNode[];
  
  /**
   * Calculate complexity metrics for a component
   * @param node - The component node
   * @returns Complexity metrics
   */
  calculateComplexity(node: ComponentNode): ComplexityMetrics;
  
  /**
   * Get language-specific features (optional)
   * @returns Array of supported language features
   */
  getLanguageFeatures?(): LanguageFeature[];
  
  /**
   * Detect frameworks used in code (optional)
   * @param ast - The AST object
   * @returns Array of detected frameworks
   */
  detectFrameworks?(ast: any): Framework[];
  
  /**
   * Extract architecture patterns (optional)
   * @param ast - The AST object
   * @returns Array of detected patterns
   */
  extractPatterns?(ast: any): ArchitecturePattern[];
}

/**
 * Options for parsing
 */
export interface ParseOptions {
  /** Include comments in AST */
  includeComments?: boolean;
  
  /** Include source locations */
  includeLocations?: boolean;
  
  /** Tolerate syntax errors and continue parsing */
  tolerateErrors?: boolean;
  
  /** Strict mode parsing */
  strictMode?: boolean;
  
  /** Language-specific parser plugins */
  plugins?: string[];
  
  /** Maximum file size to parse (bytes) */
  maxFileSize?: number;
}

/**
 * Language feature description
 */
export interface LanguageFeature {
  /** Feature name */
  name: string;
  
  /** Whether the feature is supported */
  supported: boolean;
  
  /** Optional description */
  description?: string;
  
  /** Minimum language version required */
  minVersion?: string;
}

/**
 * Framework detection result
 */
export interface Framework {
  /** Framework name */
  name: string;
  
  /** Detected version */
  version?: string;
  
  /** Confidence level (0-1) */
  confidence: number;
  
  /** Evidence for detection */
  evidence: string[];
  
  /** Framework type */
  type: FrameworkType;
}

export type FrameworkType = 
  | 'web' 
  | 'backend' 
  | 'testing' 
  | 'build' 
  | 'ui' 
  | 'data' 
  | 'mobile'
  | 'unknown';

/**
 * Architecture pattern detection result
 */
export interface ArchitecturePattern {
  /** Pattern name */
  name: string;
  
  /** Pattern type */
  type: PatternType;
  
  /** Confidence level (0-1) */
  confidence: number;
  
  /** Files where pattern is detected */
  locations: string[];
  
  /** Pattern description */
  description?: string;
}

export type PatternType =
  | 'architectural'
  | 'design'
  | 'creational'
  | 'structural'
  | 'behavioral'
  | 'concurrency'
  | 'unknown';

/**
 * Parser registry entry
 */
export interface ParserRegistryEntry {
  /** Parser instance */
  parser: LanguageParser;
  
  /** Registration timestamp */
  registeredAt: Date;
  
  /** Whether parser is active */
  active: boolean;
}

/**
 * Parser capabilities
 */
export interface ParserCapabilities {
  /** Can parse multiple files in parallel */
  supportsParallelParsing: boolean;
  
  /** Supports incremental parsing */
  supportsIncrementalParsing: boolean;
  
  /** Can recover from syntax errors */
  supportsErrorRecovery: boolean;
  
  /** Supports source maps */
  supportsSourceMaps: boolean;
  
  /** Maximum recommended file size (bytes) */
  maxRecommendedFileSize: number;
}
