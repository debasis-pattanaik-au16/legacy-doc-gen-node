/**
 * Security Vulnerability Detection Types
 * 
 * Defines types for security analysis including:
 * - OWASP Top 10 categories
 * - CWE (Common Weakness Enumeration) references
 * - Security issue details and recommendations
 */

/**
 * Severity levels for security issues
 */
export enum SecuritySeverity {
  CRITICAL = 'critical',  // Immediate action required
  HIGH = 'high',          // Should be fixed soon
  MEDIUM = 'medium',      // Should be addressed
  LOW = 'low',            // Nice to fix
  INFO = 'info'           // Informational only
}

/**
 * OWASP Top 10 and other security issue categories
 */
export enum SecurityCategory {
  // OWASP Top 10 2021
  BROKEN_ACCESS_CONTROL = 'broken_access_control',
  CRYPTOGRAPHIC_FAILURES = 'cryptographic_failures',
  INJECTION = 'injection',
  INSECURE_DESIGN = 'insecure_design',
  SECURITY_MISCONFIGURATION = 'security_misconfiguration',
  VULNERABLE_COMPONENTS = 'vulnerable_components',
  AUTHENTICATION_FAILURES = 'authentication_failures',
  DATA_INTEGRITY_FAILURES = 'data_integrity_failures',
  LOGGING_MONITORING_FAILURES = 'logging_monitoring_failures',
  SSRF = 'server_side_request_forgery',
  
  // Additional categories
  INSECURE_DESERIALIZATION = 'insecure_deserialization',
  SENSITIVE_DATA_EXPOSURE = 'sensitive_data_exposure',
  XML_EXTERNAL_ENTITIES = 'xml_external_entities',
  USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES = 'using_components_with_known_vulnerabilities'
}

/**
 * Specific types of security vulnerabilities
 */
export enum VulnerabilityType {
  // Injection vulnerabilities
  SQL_INJECTION = 'sql_injection',
  XSS = 'cross_site_scripting',
  COMMAND_INJECTION = 'command_injection',
  LDAP_INJECTION = 'ldap_injection',
  XPATH_INJECTION = 'xpath_injection',
  CODE_INJECTION = 'code_injection',
  TEMPLATE_INJECTION = 'template_injection',
  
  // Cryptographic issues
  WEAK_CRYPTO_ALGORITHM = 'weak_crypto_algorithm',
  HARDCODED_SECRET = 'hardcoded_secret',
  WEAK_RANDOM = 'weak_random_number_generation',
  INSECURE_KEY_SIZE = 'insecure_key_size',
  MISSING_ENCRYPTION = 'missing_encryption',
  WEAK_HASH = 'weak_hash_algorithm',
  
  // Authentication & Authorization
  MISSING_AUTHENTICATION = 'missing_authentication',
  WEAK_PASSWORD_POLICY = 'weak_password_policy',
  INSECURE_SESSION = 'insecure_session_management',
  MISSING_AUTHORIZATION = 'missing_authorization',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  INSECURE_COOKIE = 'insecure_cookie_settings',
  
  // Input validation
  MISSING_INPUT_VALIDATION = 'missing_input_validation',
  PATH_TRAVERSAL = 'path_traversal',
  OPEN_REDIRECT = 'open_redirect',
  
  // Configuration
  DEBUG_MODE_ENABLED = 'debug_mode_enabled',
  VERBOSE_ERRORS = 'verbose_error_messages',
  CORS_MISCONFIGURATION = 'cors_misconfiguration',
  SECURITY_HEADERS_MISSING = 'missing_security_headers',
  
  // Data exposure
  SENSITIVE_DATA_IN_LOGS = 'sensitive_data_in_logs',
  SENSITIVE_DATA_IN_URL = 'sensitive_data_in_url',
  CLEARTEXT_STORAGE = 'cleartext_storage',
  
  // Resource handling
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  DENIAL_OF_SERVICE = 'denial_of_service',
  
  // Dependencies
  OUTDATED_DEPENDENCY = 'outdated_dependency',
  VULNERABLE_DEPENDENCY = 'vulnerable_dependency',
  
  // Other
  UNSAFE_DESERIALIZATION = 'unsafe_deserialization',
  RACE_CONDITION = 'race_condition',
  UNVALIDATED_REDIRECT = 'unvalidated_redirect'
}

/**
 * Location of a security issue in the codebase
 */
export interface SecurityLocation {
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  component?: string;  // Function/class name
  snippet?: string;    // Code snippet showing the issue
}

/**
 * Recommendation for fixing a security issue
 */
export interface SecurityRecommendation {
  title: string;
  description: string;
  codeExample?: string;      // Example of secure code
  references: string[];      // URLs to documentation
  effort: 'low' | 'medium' | 'high';  // Estimated effort to fix
  priority: number;          // 1-5, where 1 is highest priority
}

/**
 * CVSS (Common Vulnerability Scoring System) metrics
 */
export interface CVSSMetrics {
  version: '3.1' | '3.0' | '2.0';
  baseScore: number;         // 0.0 - 10.0
  temporalScore?: number;
  environmentalScore?: number;
  vectorString: string;      // e.g., "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
}

/**
 * CWE (Common Weakness Enumeration) reference
 */
export interface CWEReference {
  id: string;                // e.g., "CWE-89"
  name: string;              // e.g., "SQL Injection"
  description?: string;
  url: string;               // Link to CWE details
}

/**
 * OWASP reference
 */
export interface OWASPReference {
  category: SecurityCategory;
  year: number;              // e.g., 2021
  rank?: number;             // Position in OWASP Top 10
  url: string;
}

/**
 * Details of a discovered security issue
 */
export interface SecurityIssue {
  id: string;                       // Unique identifier
  type: VulnerabilityType;
  category: SecurityCategory;
  severity: SecuritySeverity;
  title: string;
  description: string;
  location: SecurityLocation;
  
  // Remediation
  recommendations: SecurityRecommendation[];
  fixComplexity: 'low' | 'medium' | 'high';
  
  // References
  cwe?: CWEReference[];
  owasp?: OWASPReference[];
  cvss?: CVSSMetrics;
  
  // Additional context
  confidence: number;               // 0-100, confidence in detection
  exploitability?: 'easy' | 'medium' | 'hard';
  impact?: {
    confidentiality: 'none' | 'low' | 'medium' | 'high';
    integrity: 'none' | 'low' | 'medium' | 'high';
    availability: 'none' | 'low' | 'medium' | 'high';
  };
  
  // False positive handling
  isFalsePositive?: boolean;
  falsePositiveReason?: string;
  
  // Metadata
  detectedBy: string;               // Name of detector
  detectedAt: Date;
  lastUpdated?: Date;
}

/**
 * Summary statistics for security analysis
 */
export interface SecuritySummary {
  totalIssues: number;
  issuesBySeverity: Record<SecuritySeverity, number>;
  issuesByCategory: Record<SecurityCategory, number>;
  issuesByType: Record<VulnerabilityType, number>;
  
  // Risk metrics
  criticalRiskScore: number;        // 0-100, overall risk level
  mostCommonCategory: SecurityCategory;
  mostSevereIssue?: SecurityIssue;
  
  // Detection stats
  totalFilesScanned: number;
  filesWithIssues: number;
  detectionTime: number;            // milliseconds
  confidenceScore: number;          // 0-100, average confidence
}

/**
 * Configuration for security analysis
 */
export interface SecurityAnalysisOptions {
  // What to scan
  enabledDetectors: string[];       // Which detectors to run
  enabledCategories: SecurityCategory[];
  severityThreshold: SecuritySeverity;  // Minimum severity to report
  
  // Exclusions
  excludePatterns?: string[];       // Files/paths to exclude
  ignoreList?: string[];            // Issue IDs to ignore
  
  // Behavior
  stopOnCritical?: boolean;         // Stop analysis on critical issue
  includeTests?: boolean;           // Scan test files
  maxIssuesPerFile?: number;        // Limit issues per file
  
  // Dependencies
  scanDependencies?: boolean;       // Check for vulnerable dependencies
  dependencyDepth?: number;         // How deep to scan dependency tree
  
  // Performance
  parallel?: boolean;
  maxWorkers?: number;
  timeout?: number;                 // Per-file timeout in ms
}

/**
 * Result of security analysis
 */
export interface SecurityAnalysisResult {
  issues: SecurityIssue[];
  summary: SecuritySummary;
  recommendations: SecurityRecommendation[];
  
  // Compliance
  owaspCompliance?: {
    category: SecurityCategory;
    compliant: boolean;
    issues: SecurityIssue[];
  }[];
  
  // Trends (if comparing with previous analysis)
  trends?: {
    newIssues: number;
    fixedIssues: number;
    unchangedIssues: number;
    regressions: number;
  };
  
  // Metadata
  analysisDate: Date;
  analysisVersion: string;
  configUsed: SecurityAnalysisOptions;
}

/**
 * Dependency vulnerability information
 */
export interface DependencyVulnerability {
  packageName: string;
  packageVersion: string;
  vulnerabilityId: string;          // CVE or vulnerability ID
  severity: SecuritySeverity;
  title: string;
  description: string;
  
  // Affected versions
  affectedVersions: string[];
  fixedInVersion?: string;
  
  // Details
  cvss?: CVSSMetrics;
  cwe?: CWEReference[];
  publishedDate?: Date;
  lastModified?: Date;
  
  // Remediation
  recommendations: string[];
  patchAvailable: boolean;
  
  // Sources
  source: 'OSV' | 'NVD' | 'GitHub' | 'NPM' | 'Other';
  references: string[];
}

/**
 * Pattern definition for security rule matching
 */
export interface SecurityPattern {
  id: string;
  name: string;
  description: string;
  type: VulnerabilityType;
  category: SecurityCategory;
  severity: SecuritySeverity;
  
  // Detection pattern
  pattern: {
    nodeTypes?: string[];           // AST node types to match
    functionNames?: string[];       // Function calls to detect
    importPatterns?: string[];      // Import statements to match
    regex?: string;                 // Regex pattern for code matching
  };
  
  // Context requirements
  contextRequired?: {
    hasImport?: string[];           // Requires specific imports
    hasDecorator?: string[];        // Requires specific decorators
    inFunction?: boolean;           // Must be inside function
    variableType?: string;          // Variable must be of type
  };
  
  // Metadata
  cwe: string[];
  owasp?: SecurityCategory;
  confidence: number;               // Base confidence level
}

/**
 * Security detector interface
 */
export interface SecurityDetector {
  name: string;
  version: string;
  supportedLanguages: string[];
  detectedTypes: VulnerabilityType[];
  
  detect(ast: any, context: DetectionContext): Promise<SecurityIssue[]>;
}

/**
 * Context provided to security detectors
 */
export interface DetectionContext {
  fileName: string;
  fileContent: string;
  language: string;
  imports: string[];
  dependencies?: Map<string, string>;  // package -> version
  options: SecurityAnalysisOptions;
}

/**
 * Cache entry for security analysis results
 */
export interface SecurityCacheEntry {
  fileHash: string;
  issues: SecurityIssue[];
  timestamp: Date;
  detectorVersion: string;
}

