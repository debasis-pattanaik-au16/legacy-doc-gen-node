/**
 * Code Smell Types and Definitions
 * 
 * Comprehensive type system for code smell detection covering:
 * - Bloaters (long methods, large classes, etc.)
 * - Object-Orientation Abusers
 * - Change Preventers
 * - Dispensables
 * - Couplers
 */

/**
 * Code smell categories based on Martin Fowler's classification
 */
export enum CodeSmellCategory {
  BLOATER = 'bloater',
  OOP_ABUSER = 'oop_abuser',
  CHANGE_PREVENTER = 'change_preventer',
  DISPENSABLE = 'dispensable',
  COUPLER = 'coupler',
}

/**
 * Specific code smell types
 */
export enum CodeSmellType {
  // Bloaters
  LONG_METHOD = 'long_method',
  LARGE_CLASS = 'large_class',
  LONG_PARAMETER_LIST = 'long_parameter_list',
  DATA_CLUMPS = 'data_clumps',
  PRIMITIVE_OBSESSION = 'primitive_obsession',
  
  // Object-Orientation Abusers
  SWITCH_STATEMENTS = 'switch_statements',
  REFUSED_BEQUEST = 'refused_bequest',
  ALTERNATIVE_CLASSES_DIFFERENT_INTERFACES = 'alternative_classes_different_interfaces',
  TEMPORARY_FIELD = 'temporary_field',
  
  // Change Preventers
  DIVERGENT_CHANGE = 'divergent_change',
  SHOTGUN_SURGERY = 'shotgun_surgery',
  PARALLEL_INHERITANCE = 'parallel_inheritance',
  
  // Dispensables
  LAZY_CLASS = 'lazy_class',
  DATA_CLASS = 'data_class',
  DUPLICATE_CODE = 'duplicate_code',
  DEAD_CODE = 'dead_code',
  SPECULATIVE_GENERALITY = 'speculative_generality',
  COMMENTS = 'excessive_comments',
  
  // Couplers
  FEATURE_ENVY = 'feature_envy',
  INAPPROPRIATE_INTIMACY = 'inappropriate_intimacy',
  MESSAGE_CHAINS = 'message_chains',
  MIDDLE_MAN = 'middle_man',
  
  // Additional
  MAGIC_NUMBERS = 'magic_numbers',
  MAGIC_NUMBER = 'magic_number',
  GOD_CLASS = 'god_class',
  COMPLEX_CONDITIONAL = 'complex_conditional',
}

/**
 * Severity levels for code smells
 */
export enum CodeSmellSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Impact assessment for code smells
 */
export interface CodeSmellImpact {
  maintainability: number;  // 0-100 (0 = no impact, 100 = severe impact)
  readability: number;      // 0-100
  testability: number;      // 0-100
  performance?: number;     // 0-100 (optional)
  security?: number;        // 0-100 (optional)
  reusability?: number;     // 0-100 (optional)
}

/**
 * Location information for code smell
 */
export interface CodeSmellLocation {
  file: string;
  line: number;
  endLine?: number;
  column?: number;
  endColumn?: number;
  component?: string;  // Function/class/method name
  scope?: string;      // Namespace or module
}

/**
 * Refactoring effort estimation
 */
export enum RefactoringEffort {
  TRIVIAL = 'trivial',      // < 15 minutes
  LOW = 'low',              // 15-60 minutes
  MEDIUM = 'medium',        // 1-4 hours
  HIGH = 'high',            // 4-8 hours
  VERY_HIGH = 'very_high',  // > 8 hours
}

/**
 * Refactoring strategy types
 */
export enum RefactoringStrategy {
  // Method refactorings
  EXTRACT_METHOD = 'extract_method',
  INLINE_METHOD = 'inline_method',
  EXTRACT_VARIABLE = 'extract_variable',
  INLINE_TEMP = 'inline_temp',
  REPLACE_TEMP_WITH_QUERY = 'replace_temp_with_query',
  SPLIT_TEMPORARY_VARIABLE = 'split_temporary_variable',
  REMOVE_ASSIGNMENTS_TO_PARAMETERS = 'remove_assignments_to_parameters',
  
  // Class refactorings
  EXTRACT_CLASS = 'extract_class',
  INLINE_CLASS = 'inline_class',
  HIDE_DELEGATE = 'hide_delegate',
  REMOVE_MIDDLE_MAN = 'remove_middle_man',
  INTRODUCE_FOREIGN_METHOD = 'introduce_foreign_method',
  INTRODUCE_LOCAL_EXTENSION = 'introduce_local_extension',
  
  // Data refactorings
  ENCAPSULATE_FIELD = 'encapsulate_field',
  ENCAPSULATE_COLLECTION = 'encapsulate_collection',
  REPLACE_DATA_VALUE_WITH_OBJECT = 'replace_data_value_with_object',
  CHANGE_VALUE_TO_REFERENCE = 'change_value_to_reference',
  CHANGE_REFERENCE_TO_VALUE = 'change_reference_to_value',
  REPLACE_ARRAY_WITH_OBJECT = 'replace_array_with_object',
  REPLACE_MAGIC_NUMBER_WITH_CONSTANT = 'replace_magic_number_with_constant',
  EXTRACT_CONSTANT = 'extract_constant',
  
  // Conditional refactorings
  DECOMPOSE_CONDITIONAL = 'decompose_conditional',
  CONSOLIDATE_CONDITIONAL_EXPRESSION = 'consolidate_conditional_expression',
  CONSOLIDATE_DUPLICATE_CONDITIONAL_FRAGMENTS = 'consolidate_duplicate_conditional_fragments',
  REMOVE_CONTROL_FLAG = 'remove_control_flag',
  REPLACE_NESTED_CONDITIONAL_WITH_GUARD_CLAUSES = 'replace_nested_conditional_with_guard_clauses',
  REPLACE_CONDITIONAL_WITH_POLYMORPHISM = 'replace_conditional_with_polymorphism',
  
  // Parameter refactorings
  INTRODUCE_PARAMETER_OBJECT = 'introduce_parameter_object',
  PRESERVE_WHOLE_OBJECT = 'preserve_whole_object',
  REPLACE_PARAMETER_WITH_METHOD = 'replace_parameter_with_method',
  
  // General
  RENAME = 'rename',
  MOVE_METHOD = 'move_method',
  MOVE_FIELD = 'move_field',
  PULL_UP_METHOD = 'pull_up_method',
  PUSH_DOWN_METHOD = 'push_down_method',
  EXTRACT_INTERFACE = 'extract_interface',
  COLLAPSE_HIERARCHY = 'collapse_hierarchy',
  FORM_TEMPLATE_METHOD = 'form_template_method',
  SUBSTITUTE_ALGORITHM = 'substitute_algorithm',
}

/**
 * Refactoring step details
 */
export interface RefactoringStep {
  order: number;
  description: string;
  codeExample?: string;
  automatable: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Detailed refactoring recommendation
 */
export interface RefactoringRecommendation {
  strategy: RefactoringStrategy;
  description: string;
  steps: RefactoringStep[];
  effort: RefactoringEffort;
  priority: number;  // 1-10
  benefits: string[];
  risks: string[];
  codeExampleBefore?: string;
  codeExampleAfter?: string;
  references?: string[];  // Links to documentation
}

/**
 * Main code smell interface
 */
export interface CodeSmell {
  id: string;
  type: CodeSmellType;
  category: CodeSmellCategory;
  severity: CodeSmellSeverity;
  location: CodeSmellLocation;
  description: string;
  impact: CodeSmellImpact;
  recommendations: RefactoringRecommendation[];
  metrics?: CodeSmellMetrics;
  detectedAt: Date;
  affectedLinesOfCode?: number;
  affectedComponents?: string[];
  relatedSmells?: string[];  // IDs of related code smells
}

/**
 * Metrics specific to code smells
 */
export interface CodeSmellMetrics {
  // Bloater metrics
  linesOfCode?: number;
  numberOfMethods?: number;
  numberOfFields?: number;
  numberOfParameters?: number;
  cyclomaticComplexity?: number;
  cognitiveComplexity?: number;
  
  // Duplication metrics
  duplicatedLines?: number;
  duplicatedBlocks?: number;
  cloneType?: 'exact' | 'similar' | 'functional';
  similarityScore?: number;  // 0-1
  
  // Magic number metrics
  value?: number;
  occurrences?: number;
  suggestedName?: string;
  context?: string;
  
  // Coupling metrics
  couplingBetweenObjects?: number;
  afferentCoupling?: number;
  efferentCoupling?: number;
  
  // Cohesion metrics
  lackOfCohesion?: number;
  
  // Depth metrics
  nestingDepth?: number;
  inheritanceDepth?: number;
}

/**
 * Configuration for code smell detection
 */
export interface CodeSmellConfiguration {
  enabled: boolean;
  detectors: {
    bloaters: boolean;
    oopAbusers: boolean;
    changePreventers: boolean;
    dispensables: boolean;
    couplers: boolean;
  };
  thresholds: CodeSmellThresholds;
  severityMapping: {
    [key in CodeSmellType]?: CodeSmellSeverity;
  };
  excludePatterns?: string[];
  minimumSeverity?: CodeSmellSeverity;
  maxIssuesPerType?: number;
}

/**
 * Threshold configuration for code smell detection
 */
export interface CodeSmellThresholds {
  // Bloaters
  longMethod: number;                  // Lines of code
  largeClass: number;                  // Lines of code
  longParameterList: number;           // Number of parameters
  dataClumps: number;                  // Number of grouped parameters
  
  // Complexity
  cyclomaticComplexity: number;        // McCabe's complexity
  cognitiveComplexity: number;         // Cognitive complexity
  nestingDepth: number;                // Maximum nesting level
  
  // Duplication
  duplicateCodeMinLines: number;       // Minimum lines for duplicate
  duplicateSimilarityThreshold: number;// 0-1 similarity threshold
  
  // Coupling
  maxCouplingBetweenObjects: number;   // CBO threshold
  maxAfferentCoupling: number;         // Ca threshold
  maxEfferentCoupling: number;         // Ce threshold
  
  // Cohesion
  maxLackOfCohesion: number;           // LCOM threshold
  
  // Other
  magicNumberExclusions: number[];     // Numbers to exclude (e.g., 0, 1, -1)
  deadCodeDays: number;                // Days before marking as dead code
}

/**
 * Default thresholds based on industry standards
 */
export const DEFAULT_CODE_SMELL_THRESHOLDS: CodeSmellThresholds = {
  longMethod: 50,
  largeClass: 500,
  longParameterList: 5,
  dataClumps: 3,
  cyclomaticComplexity: 10,
  cognitiveComplexity: 15,
  nestingDepth: 4,
  duplicateCodeMinLines: 6,
  duplicateSimilarityThreshold: 0.85,
  maxCouplingBetweenObjects: 10,
  maxAfferentCoupling: 5,
  maxEfferentCoupling: 5,
  maxLackOfCohesion: 80,
  magicNumberExclusions: [0, 1, -1, 2, 10, 100, 1000],
  deadCodeDays: 90,
};

/**
 * Code smell analysis result
 */
export interface CodeSmellAnalysisResult {
  smells: CodeSmell[];
  summary: CodeSmellSummary;
  recommendations: RefactoringRecommendation[];
  executionTime: number;
}

/**
 * Summary statistics for code smell analysis
 */
export interface CodeSmellSummary {
  totalSmells: number;
  byCategory: Record<CodeSmellCategory, number>;
  byType: Record<CodeSmellType, number>;
  bySeverity: Record<CodeSmellSeverity, number>;
  totalAffectedFiles: number;
  totalAffectedLines: number;
  estimatedRefactoringEffort: RefactoringEffort;
  prioritizedSmells: CodeSmell[];  // Top priority smells
  technicalDebtHours: number;      // Estimated hours to fix all
}

/**
 * Clone detection result
 */
export interface CloneSet {
  id: string;
  type: 'exact' | 'similar' | 'functional';
  instances: CloneInstance[];
  similarityScore: number;  // 0-1
  linesOfCode: number;
}

/**
 * Individual clone instance
 */
export interface CloneInstance {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  component?: string;
}

/**
 * Token sequence for duplicate detection
 */
export interface TokenSequence {
  file: string;
  component: string;
  startLine: number;
  endLine: number;
  tokens: string[];
  hash: string;
}

/**
 * Data clump detection result
 */
export interface DataClump {
  parameters: string[];
  occurrences: DataClumpOccurrence[];
  suggestedObjectName: string;
}

/**
 * Data clump occurrence
 */
export interface DataClumpOccurrence {
  file: string;
  component: string;
  line: number;
}

/**
 * Magic number detection result
 */
export interface MagicNumber {
  value: number;
  line: number;
  context: string;
  suggestedName: string;
  occurrences: number;
}

/**
 * Type guards
 */
export function isBloater(type: CodeSmellType): boolean {
  return [
    CodeSmellType.LONG_METHOD,
    CodeSmellType.LARGE_CLASS,
    CodeSmellType.LONG_PARAMETER_LIST,
    CodeSmellType.DATA_CLUMPS,
    CodeSmellType.PRIMITIVE_OBSESSION,
  ].includes(type);
}

export function isOOPAbuser(type: CodeSmellType): boolean {
  return [
    CodeSmellType.SWITCH_STATEMENTS,
    CodeSmellType.REFUSED_BEQUEST,
    CodeSmellType.ALTERNATIVE_CLASSES_DIFFERENT_INTERFACES,
    CodeSmellType.TEMPORARY_FIELD,
  ].includes(type);
}

export function isChangePreventer(type: CodeSmellType): boolean {
  return [
    CodeSmellType.DIVERGENT_CHANGE,
    CodeSmellType.SHOTGUN_SURGERY,
    CodeSmellType.PARALLEL_INHERITANCE,
  ].includes(type);
}

export function isDispensable(type: CodeSmellType): boolean {
  return [
    CodeSmellType.LAZY_CLASS,
    CodeSmellType.DATA_CLASS,
    CodeSmellType.DUPLICATE_CODE,
    CodeSmellType.DEAD_CODE,
    CodeSmellType.SPECULATIVE_GENERALITY,
    CodeSmellType.COMMENTS,
  ].includes(type);
}

export function isCoupler(type: CodeSmellType): boolean {
  return [
    CodeSmellType.FEATURE_ENVY,
    CodeSmellType.INAPPROPRIATE_INTIMACY,
    CodeSmellType.MESSAGE_CHAINS,
    CodeSmellType.MIDDLE_MAN,
  ].includes(type);
}

/**
 * Get category for a code smell type
 */
export function getCodeSmellCategory(type: CodeSmellType): CodeSmellCategory {
  if (isBloater(type)) return CodeSmellCategory.BLOATER;
  if (isOOPAbuser(type)) return CodeSmellCategory.OOP_ABUSER;
  if (isChangePreventer(type)) return CodeSmellCategory.CHANGE_PREVENTER;
  if (isDispensable(type)) return CodeSmellCategory.DISPENSABLE;
  if (isCoupler(type)) return CodeSmellCategory.COUPLER;
  return CodeSmellCategory.BLOATER; // default
}

/**
 * Calculate overall impact score (0-100)
 */
export function calculateOverallImpact(impact: CodeSmellImpact): number {
  const weights = {
    maintainability: 0.35,
    readability: 0.25,
    testability: 0.20,
    performance: 0.10,
    security: 0.05,
    reusability: 0.05,
  };
  
  let score = 
    impact.maintainability * weights.maintainability +
    impact.readability * weights.readability +
    impact.testability * weights.testability;
  
  if (impact.performance) score += impact.performance * weights.performance;
  if (impact.security) score += impact.security * weights.security;
  if (impact.reusability) score += impact.reusability * weights.reusability;
  
  return Math.round(score);
}

/**
 * Determine severity based on metrics
 */
export function determineSeverity(
  type: CodeSmellType,
  metrics: CodeSmellMetrics,
  thresholds: CodeSmellThresholds
): CodeSmellSeverity {
  // Long method
  if (type === CodeSmellType.LONG_METHOD && metrics.linesOfCode) {
    const ratio = metrics.linesOfCode / thresholds.longMethod;
    if (ratio > 3) return CodeSmellSeverity.CRITICAL;
    if (ratio > 2) return CodeSmellSeverity.HIGH;
    if (ratio > 1.5) return CodeSmellSeverity.MEDIUM;
    return CodeSmellSeverity.LOW;
  }
  
  // Large class
  if (type === CodeSmellType.LARGE_CLASS && metrics.linesOfCode) {
    const ratio = metrics.linesOfCode / thresholds.largeClass;
    if (ratio > 2) return CodeSmellSeverity.CRITICAL;
    if (ratio > 1.5) return CodeSmellSeverity.HIGH;
    if (ratio > 1.2) return CodeSmellSeverity.MEDIUM;
    return CodeSmellSeverity.LOW;
  }
  
  // Cyclomatic complexity
  if (metrics.cyclomaticComplexity) {
    const ratio = metrics.cyclomaticComplexity / thresholds.cyclomaticComplexity;
    if (ratio > 3) return CodeSmellSeverity.CRITICAL;
    if (ratio > 2) return CodeSmellSeverity.HIGH;
    if (ratio > 1.5) return CodeSmellSeverity.MEDIUM;
    return CodeSmellSeverity.LOW;
  }
  
  // Default to medium
  return CodeSmellSeverity.MEDIUM;
}
