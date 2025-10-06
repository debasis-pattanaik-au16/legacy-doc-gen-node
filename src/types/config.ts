/**
 * Analysis Engine Configuration System
 * 
 * Defines the complete configuration schema for the analysis engine.
 * Supports JSON/YAML file configuration with environment variable overrides.
 * 
 * @module types/config
 */

/**
 * Main analysis configuration interface
 */
export interface AnalysisConfiguration {
  /** Language-specific settings */
  languages: LanguageConfiguration;
  
  /** Feature detection and analysis settings */
  features: FeatureConfiguration;
  
  /** Performance and optimization settings */
  performance: PerformanceConfiguration;
  
  /** Exclusion patterns and filters */
  exclude: ExclusionConfiguration;
  
  /** Output and reporting settings */
  output: OutputConfiguration;
  
  /** Plugin and extension settings */
  plugins: PluginConfiguration;
}

/**
 * Language configuration
 */
export interface LanguageConfiguration {
  /** List of enabled languages (e.g., 'javascript', 'python', 'typescript') */
  enabled: string[];
  
  /** Parser-specific configuration for each language */
  parsers: Record<string, ParserConfiguration>;
}

/**
 * Parser configuration options
 */
export interface ParserConfiguration {
  /** Enable strict parsing mode (fail on syntax errors) */
  strictMode?: boolean;
  
  /** Include comments in AST */
  includeComments?: boolean;
  
  /** Tolerate parsing errors and continue */
  tolerateErrors?: boolean;
  
  /** Additional parser plugins to enable */
  plugins?: string[];
  
  /** Custom parser options */
  options?: Record<string, any>;
}

/**
 * Feature detection configuration
 */
export interface FeatureConfiguration {
  /** Security vulnerability detection */
  security: SecurityConfiguration;
  
  /** Code smell detection */
  codeSmells: CodeSmellConfiguration;
  
  /** Architecture pattern detection */
  patterns: PatternConfiguration;
  
  /** API detection and analysis */
  api: APIConfiguration;
  
  /** Database query analysis */
  database: DatabaseConfiguration;
  
  /** Dependency analysis */
  dependencies: DependencyConfiguration;
  
  /** Complexity metrics */
  complexity: ComplexityConfiguration;
}

/**
 * Security analysis configuration
 */
export interface SecurityConfiguration {
  /** Enable security analysis */
  enabled: boolean;
  
  /** List of security detectors to enable */
  detectors: SecurityDetector[];
  
  /** Minimum severity level to report */
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  
  /** Custom security rules */
  customRules?: SecurityRule[];
}

export type SecurityDetector = 
  | 'injection'           // SQL, NoSQL, Command injection
  | 'xss'                 // Cross-site scripting
  | 'crypto'              // Weak cryptography
  | 'auth'                // Authentication issues
  | 'secrets'             // Hardcoded secrets
  | 'cors'                // CORS misconfiguration
  | 'csrf'                // CSRF vulnerabilities
  | 'deserialization'     // Unsafe deserialization
  | 'path-traversal'      // Path traversal
  | 'xxe';                // XML external entity

export interface SecurityRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

/**
 * Code smell detection configuration
 */
export interface CodeSmellConfiguration {
  /** Enable code smell detection */
  enabled: boolean;
  
  /** List of code smell detectors to enable */
  detectors: CodeSmellDetector[];
  
  /** Thresholds for various metrics */
  thresholds: CodeSmellThresholds;
}

export type CodeSmellDetector =
  | 'longMethod'
  | 'largeClass'
  | 'duplicateCode'
  | 'longParameterList'
  | 'deepNesting'
  | 'godClass'
  | 'dataClass'
  | 'featureEnvy'
  | 'shotgunSurgery';

export interface CodeSmellThresholds {
  /** Maximum lines for a method */
  longMethod?: number;
  
  /** Maximum lines for a class */
  largeClass?: number;
  
  /** Minimum lines for duplicate code detection */
  duplicateCode?: number;
  
  /** Maximum number of parameters */
  longParameterList?: number;
  
  /** Maximum nesting depth */
  deepNesting?: number;
  
  /** Maximum cyclomatic complexity */
  cyclomaticComplexity?: number;
  
  /** Maximum cognitive complexity */
  cognitiveComplexity?: number;
}

/**
 * Architecture pattern detection configuration
 */
export interface PatternConfiguration {
  /** Enable pattern detection */
  enabled: boolean;
  
  /** List of patterns to detect */
  types: ArchitecturePattern[];
}

export type ArchitecturePattern =
  | 'mvc'
  | 'mvvm'
  | 'singleton'
  | 'factory'
  | 'observer'
  | 'decorator'
  | 'strategy'
  | 'repository'
  | 'service-layer'
  | 'middleware';

/**
 * API detection configuration
 */
export interface APIConfiguration {
  /** Enable API detection */
  enabled: boolean;
  
  /** API types to detect */
  types: APIType[];
  
  /** Extract API documentation */
  extractDocs?: boolean;
  
  /** Detect authentication methods */
  detectAuth?: boolean;
}

export type APIType = 'rest' | 'graphql' | 'grpc' | 'soap' | 'websocket';

/**
 * Database query analysis configuration
 */
export interface DatabaseConfiguration {
  /** Enable database analysis */
  enabled: boolean;
  
  /** Database types to analyze */
  types: DatabaseType[];
  
  /** Detect N+1 queries */
  detectNPlusOne?: boolean;
  
  /** Detect missing indexes */
  detectMissingIndexes?: boolean;
}

export type DatabaseType = 'sql' | 'nosql' | 'orm' | 'graphql';

/**
 * Dependency analysis configuration
 */
export interface DependencyConfiguration {
  /** Enable dependency analysis */
  enabled: boolean;
  
  /** Include external dependencies */
  includeExternal?: boolean;
  
  /** Detect circular dependencies */
  detectCircular?: boolean;
  
  /** Detect unused dependencies */
  detectUnused?: boolean;
  
  /** Maximum allowed dependency depth */
  maxDepth?: number;
}

/**
 * Complexity metrics configuration
 */
export interface ComplexityConfiguration {
  /** Enable complexity analysis */
  enabled: boolean;
  
  /** Metrics to calculate */
  metrics: ComplexityMetric[];
  
  /** Thresholds for warnings */
  thresholds?: {
    cyclomatic?: number;
    cognitive?: number;
    halstead?: number;
  };
}

export type ComplexityMetric =
  | 'cyclomatic'
  | 'cognitive'
  | 'halstead'
  | 'maintainability-index';

/**
 * Performance and optimization configuration
 */
export interface PerformanceConfiguration {
  /** Enable parallel processing */
  parallel: boolean;
  
  /** Maximum number of worker threads */
  maxWorkers: number;
  
  /** Batch size for parallel processing */
  batchSize: number;
  
  /** Caching configuration */
  caching: CachingConfiguration;
  
  /** Enable incremental analysis */
  incremental: boolean;
  
  /** Timeout for single file analysis (ms) */
  timeout?: number;
  
  /** Memory limit per worker (MB) */
  memoryLimit?: number;
}

/**
 * Caching configuration
 */
export interface CachingConfiguration {
  /** Enable caching */
  enabled: boolean;
  
  /** Cache provider */
  provider: 'memory' | 'file' | 'redis';
  
  /** Time to live in seconds */
  ttl: number;
  
  /** Maximum cache size (MB) */
  maxSize?: number;
  
  /** Cache directory (for file provider) */
  cacheDir?: string;
  
  /** Redis connection (for redis provider) */
  redisUrl?: string;
}

/**
 * Exclusion configuration
 */
export interface ExclusionConfiguration {
  /** Glob patterns to exclude */
  patterns: string[];
  
  /** Directories to exclude */
  directories: string[];
  
  /** Specific files to exclude */
  files: string[];
  
  /** Exclude patterns for specific languages */
  byLanguage?: Record<string, string[]>;
}

/**
 * Output configuration
 */
export interface OutputConfiguration {
  /** Output format */
  format: 'json' | 'yaml' | 'html' | 'markdown';
  
  /** Output directory */
  directory: string;
  
  /** Generate summary report */
  summary: boolean;
  
  /** Include source code snippets */
  includeSnippets?: boolean;
  
  /** Verbosity level */
  verbosity: 'quiet' | 'normal' | 'verbose' | 'debug';
  
  /** Pretty print output */
  pretty?: boolean;
}

/**
 * Plugin configuration
 */
export interface PluginConfiguration {
  /** Enable plugin system */
  enabled: boolean;
  
  /** Plugin directories to scan */
  directories: string[];
  
  /** List of enabled plugins */
  plugins: PluginSettings[];
}

export interface PluginSettings {
  /** Plugin name */
  name: string;
  
  /** Plugin version */
  version?: string;
  
  /** Plugin-specific options */
  options?: Record<string, any>;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AnalysisConfiguration = {
  languages: {
    enabled: ['javascript', 'typescript', 'python'],
    parsers: {
      javascript: {
        strictMode: false,
        includeComments: true,
        tolerateErrors: true,
        plugins: ['jsx'],
      },
      typescript: {
        strictMode: false,
        includeComments: true,
        tolerateErrors: true,
        plugins: ['typescript', 'jsx'],
      },
      python: {
        strictMode: false,
        includeComments: true,
        tolerateErrors: true,
      },
    },
  },
  
  features: {
    security: {
      enabled: true,
      detectors: ['injection', 'xss', 'crypto', 'auth', 'secrets'],
      severityThreshold: 'medium',
    },
    codeSmells: {
      enabled: true,
      detectors: [
        'longMethod',
        'largeClass',
        'duplicateCode',
        'longParameterList',
        'deepNesting',
      ],
      thresholds: {
        longMethod: 50,
        largeClass: 500,
        duplicateCode: 10,
        longParameterList: 5,
        deepNesting: 4,
        cyclomaticComplexity: 10,
        cognitiveComplexity: 15,
      },
    },
    
    patterns: {
      enabled: true,
      types: ['mvc', 'singleton', 'factory', 'observer', 'repository'],
    },
    api: {
      enabled: true,
      types: ['rest', 'graphql'],
      extractDocs: true,
      detectAuth: true,
    },
    database: {
      enabled: true,
      types: ['sql', 'orm'],
      detectNPlusOne: true,
      detectMissingIndexes: false,
    },
    dependencies: {
      enabled: true,
      includeExternal: true,
      detectCircular: true,
      detectUnused: true,
      maxDepth: 10,
    },
    complexity: {
      enabled: true,
      metrics: ['cyclomatic', 'cognitive', 'maintainability-index'],
      thresholds: {
        cyclomatic: 10,
        cognitive: 15,
      },
    },
  },
  
  performance: {
    parallel: true,
    maxWorkers: 4,
    batchSize: 100,
    caching: {
      enabled: true,
      provider: 'memory',
      ttl: 3600,
      maxSize: 100,
    },
    incremental: false,
    timeout: 30000,
    memoryLimit: 512,
  },
  
  exclude: {
    patterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
    ],
    directories: ['node_modules', 'dist', 'build', 'coverage', '.git'],
    files: [],
  },
  
  output: {
    format: 'json',
    directory: './analysis-results',
    summary: true,
    includeSnippets: false,
    verbosity: 'normal',
    pretty: true,
  },
  
  plugins: {
    enabled: false,
    directories: ['./plugins'],
    plugins: [],
  },
};

/**
 * Environment variable mapping for configuration overrides
 */
export const ENV_VAR_MAPPING: Record<string, string> = {
  ANALYSIS_PARALLEL: 'performance.parallel',
  ANALYSIS_MAX_WORKERS: 'performance.maxWorkers',
  ANALYSIS_BATCH_SIZE: 'performance.batchSize',
  ANALYSIS_CACHE_ENABLED: 'performance.caching.enabled',
  ANALYSIS_CACHE_PROVIDER: 'performance.caching.provider',
  ANALYSIS_CACHE_TTL: 'performance.caching.ttl',
  ANALYSIS_OUTPUT_FORMAT: 'output.format',
  ANALYSIS_OUTPUT_DIR: 'output.directory',
  ANALYSIS_VERBOSITY: 'output.verbosity',
  ANALYSIS_SECURITY_ENABLED: 'features.security.enabled',
  ANALYSIS_CODE_SMELLS_ENABLED: 'features.codeSmells.enabled',
};

/**
 * Configuration validation errors
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly path?: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
