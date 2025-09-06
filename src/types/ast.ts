/**
 * Unified AST representation interface for all supported languages
 * Provides consistent structure for 99% accuracy across different parsers
 */

export interface UnifiedAST {
  fileName: string;
  language: string;
  sourceCode: string;
  parseSuccess: boolean;
  parseErrors: ParseError[];
  components: ComponentNode[];
  imports: ImportNode[];
  exports: ExportNode[];
  dependencies: DependencyNode[];
  metadata: ASTMetadata;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  code?: string;
}

export interface ComponentNode {
  id: string;
  name: string;
  type: ComponentType;
  startLine: number;
  endLine: number;
  description?: string;
  visibility: 'public' | 'private' | 'protected' | 'internal';
  isExported: boolean;
  decorators: DecoratorNode[];
  annotations: AnnotationNode[];
  children: ComponentNode[];
  parent?: string;
  complexity: ComplexityMetrics;
}

export type ComponentType = 
  | 'function'
  | 'class' 
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'constant'
  | 'method'
  | 'property'
  | 'constructor'
  | 'module'
  | 'namespace';

export interface FunctionNode extends ComponentNode {
  type: 'function' | 'method' | 'constructor';
  parameters: ParameterNode[];
  returnType: TypeInfo;
  isAsync: boolean;
  isGenerator: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  overloads: FunctionOverload[];
}

export interface ClassNode extends ComponentNode {
  type: 'class';
  superClass?: string;
  interfaces: string[];
  methods: FunctionNode[];
  properties: PropertyNode[];
  constructors: FunctionNode[];
  isAbstract: boolean;
  isGeneric: boolean;
  typeParameters: TypeParameter[];
}

export interface InterfaceNode extends ComponentNode {
  type: 'interface';
  extends: string[];
  methods: MethodSignature[];
  properties: PropertySignature[];
  isGeneric: boolean;
  typeParameters: TypeParameter[];
}

export interface PropertyNode extends ComponentNode {
  type: 'property';
  propertyType: TypeInfo;
  isReadonly: boolean;
  isStatic: boolean;
  hasGetter: boolean;
  hasSetter: boolean;
  initialValue?: string;
}

export interface ParameterNode {
  name: string;
  type: TypeInfo;
  isOptional: boolean;
  isRest: boolean;
  defaultValue?: string;
  decorators: DecoratorNode[];
}

export interface TypeInfo {
  name: string;
  isArray: boolean;
  isGeneric: boolean;
  genericTypes: TypeInfo[];
  isUnion: boolean;
  unionTypes: TypeInfo[];
  isNullable: boolean;
  isPrimitive: boolean;
}

export interface ImportNode {
  source: string;
  type: ImportType;
  specifiers: ImportSpecifier[];
  isTypeOnly: boolean;
  isDynamic: boolean;
  line: number;
}

export type ImportType = 'default' | 'named' | 'namespace' | 'side-effect';

export interface ImportSpecifier {
  imported: string;
  local: string;
  isType: boolean;
}

export interface ExportNode {
  type: ExportType;
  name?: string;
  source?: string;
  specifiers: ExportSpecifier[];
  isTypeOnly: boolean;
  line: number;
}

export type ExportType = 'default' | 'named' | 'all' | 're-export';

export interface ExportSpecifier {
  local: string;
  exported: string;
  isType: boolean;
}

export interface DependencyNode {
  name: string;
  type: DependencyType;
  version?: string;
  isInternal: boolean;
  usageCount: number;
  usageLocations: UsageLocation[];
}

export type DependencyType = 'runtime' | 'development' | 'peer' | 'optional';

export interface UsageLocation {
  line: number;
  column: number;
  context: string;
}

export interface DecoratorNode {
  name: string;
  arguments: string[];
  line: number;
}

export interface AnnotationNode {
  name: string;
  value?: string;
  line: number;
}

export interface FunctionOverload {
  parameters: ParameterNode[];
  returnType: TypeInfo;
  description?: string;
}

export interface MethodSignature {
  name: string;
  parameters: ParameterNode[];
  returnType: TypeInfo;
  isOptional: boolean;
}

export interface PropertySignature {
  name: string;
  type: TypeInfo;
  isOptional: boolean;
  isReadonly: boolean;
}

export interface TypeParameter {
  name: string;
  constraint?: TypeInfo;
  default?: TypeInfo;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  halsteadMetrics: HalsteadMetrics;
}

export interface HalsteadMetrics {
  vocabulary: number;
  length: number;
  calculatedLength: number;
  volume: number;
  difficulty: number;
  effort: number;
  timeRequiredToProgram: number;
  numberOfDeliveredBugs: number;
}

export interface ASTMetadata {
  parseTime: number;
  parserVersion: string;
  language: string;
  languageVersion?: string;
  encoding: string;
  fileSize: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  features: LanguageFeature[];
}

export interface LanguageFeature {
  name: string;
  version: string;
  usage: string[];
}

/**
 * Parser interface that all language parsers must implement
 */
export interface ASTParser {
  language: string;
  supportedExtensions: string[];
  parse(sourceCode: string, fileName: string, options?: ParseOptions): Promise<UnifiedAST>;
  validateSyntax(sourceCode: string): Promise<ParseError[]>;
  extractComponents(ast: any): ComponentNode[];
  extractImports(ast: any): ImportNode[];
  extractExports(ast: any): ExportNode[];
  calculateComplexity(node: ComponentNode): ComplexityMetrics;
}

export interface ParseOptions {
  strictMode?: boolean;
  includeComments?: boolean;
  includeLocations?: boolean;
  sourceType?: 'script' | 'module';
  plugins?: string[];
  tolerateErrors?: boolean;
}

/**
 * Analysis result combining AST with AI insights
 */
export interface CodeAnalysisResult {
  ast: UnifiedAST;
  aiInsights: AIInsights;
  relationships: ComponentRelationship[];
  patterns: DesignPattern[];
  quality: QualityMetrics;
  suggestions: CodeSuggestion[];
}

export interface AIInsights {
  summary: string;
  purpose: string;
  businessLogic: string[];
  technicalDebt: TechnicalDebtItem[];
  securityConcerns: SecurityConcern[];
  performanceIssues: PerformanceIssue[];
}

export interface ComponentRelationship {
  from: string;
  to: string;
  type: RelationshipType;
  strength: number;
  description: string;
}

export type RelationshipType = 
  | 'calls'
  | 'imports'
  | 'extends'
  | 'implements'
  | 'uses'
  | 'depends_on'
  | 'aggregates'
  | 'composes';

export interface DesignPattern {
  name: string;
  confidence: number;
  evidence: string[];
  components: string[];
  description: string;
}

export interface QualityMetrics {
  maintainability: number;
  readability: number;
  testability: number;
  reusability: number;
  reliability: number;
  overall: number;
}

export interface CodeSuggestion {
  type: SuggestionType;
  severity: 'info' | 'warning' | 'error';
  message: string;
  location: CodeLocation;
  suggestedFix?: string;
}

export type SuggestionType = 
  | 'refactor'
  | 'performance'
  | 'security'
  | 'maintainability'
  | 'best_practice'
  | 'bug_risk';

export interface CodeLocation {
  fileName: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface TechnicalDebtItem {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: CodeLocation;
  estimatedEffort: number; // hours
}

export interface SecurityConcern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: CodeLocation;
  cwe?: string; // Common Weakness Enumeration
}

export interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: CodeLocation;
  impact: string;
}
