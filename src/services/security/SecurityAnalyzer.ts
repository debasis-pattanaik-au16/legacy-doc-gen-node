/**
 * Security Analyzer Orchestrator
 * 
 * Coordinates all security detectors and aggregates results:
 * - Runs all detectors in parallel
 * - Aggregates and deduplicates findings
 * - Filters by severity threshold
 * - Generates summary statistics
 * - Provides actionable recommendations
 */

import {
  SecurityIssue,
  SecurityAnalysisResult,
  SecurityAnalysisOptions,
  SecuritySummary,
  SecuritySeverity,
  SecurityCategory,
  VulnerabilityType,
  SecurityRecommendation
} from '@/types/security';
import { UnifiedAST } from '@/types/ast';
import { ExternalLibrary } from '@/types/dependency';
import { InjectionDetector } from './InjectionDetector';
import { CryptographyDetector } from './CryptographyDetector';
import { AuthenticationDetector } from './AuthenticationDetector';
import { DependencySecurityAnalyzer } from './DependencySecurityAnalyzer';
import { logger } from '@/utils/logger';

/**
 * SecurityAnalyzer class
 */
export class SecurityAnalyzer {
  private injectionDetector: InjectionDetector;
  private cryptoDetector: CryptographyDetector;
  private authDetector: AuthenticationDetector;
  private depAnalyzer: DependencySecurityAnalyzer;

  constructor() {
    this.injectionDetector = new InjectionDetector();
    this.cryptoDetector = new CryptographyDetector();
    this.authDetector = new AuthenticationDetector();
    this.depAnalyzer = new DependencySecurityAnalyzer();
  }

  /**
   * Run comprehensive security analysis
   */
  async analyze(
    files: Map<string, UnifiedAST>,
    dependencies: ExternalLibrary[],
    options: SecurityAnalysisOptions
  ): Promise<SecurityAnalysisResult> {
    const startTime = Date.now();
    const allIssues: SecurityIssue[] = [];

    try {
      logger.info(`Starting security analysis on ${files.size} files...`);

      // Run code-level detectors on all files
      for (const [fileName, ast] of files.entries()) {
        const context = {
          fileName,
          fileContent: ast.sourceCode,
          language: ast.language,
          imports: ast.imports.map(imp => imp.source),
          options
        };

        // Run detectors in parallel for each file
        const [injectionIssues, cryptoIssues, authIssues] = await Promise.all([
          options.enabledDetectors.includes('injection') 
            ? this.injectionDetector.detect(ast, context)
            : [],
          options.enabledDetectors.includes('cryptography')
            ? this.cryptoDetector.detect(ast, context)
            : [],
          options.enabledDetectors.includes('authentication')
            ? this.authDetector.detect(ast, context)
            : []
        ]);

        allIssues.push(...injectionIssues, ...cryptoIssues, ...authIssues);
      }

      // Run dependency scanner if enabled
      if (options.scanDependencies && options.enabledDetectors.includes('dependencies')) {
        const depIssues = await this.depAnalyzer.scanDependencies(dependencies);
        allIssues.push(...depIssues);
      }

      // Filter by severity threshold
      const filteredIssues = this.filterBySeverity(allIssues, options.severityThreshold);

      // Deduplicate issues
      const uniqueIssues = this.deduplicateIssues(filteredIssues);

      // Sort by severity (critical first)
      const sortedIssues = this.sortBySeverity(uniqueIssues);

      // Apply max issues per file limit if specified
      const finalIssues = options.maxIssuesPerFile
        ? this.limitIssuesPerFile(sortedIssues, options.maxIssuesPerFile)
        : sortedIssues;

      // Generate summary
      const summary = this.createSummary(finalIssues, files.size, Date.now() - startTime);

      // Generate recommendations
      const recommendations = this.generateRecommendations(finalIssues);

      logger.info(`Security analysis complete. Found ${finalIssues.length} issues in ${Date.now() - startTime}ms`);

      return {
        issues: finalIssues,
        summary,
        recommendations,
        analysisDate: new Date(),
        analysisVersion: '1.0.0',
        configUsed: options
      };
    } catch (error) {
      logger.error(`Security analysis failed: ${error}`);
      throw error;
    }
  }

  /**
   * Filter issues by severity threshold
   */
  private filterBySeverity(issues: SecurityIssue[], threshold: SecuritySeverity): SecurityIssue[] {
    const severityOrder = [
      SecuritySeverity.INFO,
      SecuritySeverity.LOW,
      SecuritySeverity.MEDIUM,
      SecuritySeverity.HIGH,
      SecuritySeverity.CRITICAL
    ];

    const thresholdIndex = severityOrder.indexOf(threshold);
    return issues.filter(issue => severityOrder.indexOf(issue.severity) >= thresholdIndex);
  }

  /**
   * Deduplicate issues based on type, file, and line
   */
  private deduplicateIssues(issues: SecurityIssue[]): SecurityIssue[] {
    const seen = new Set<string>();
    const unique: SecurityIssue[] = [];

    for (const issue of issues) {
      const key = `${issue.type}:${issue.location.file}:${issue.location.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }

    return unique;
  }

  /**
   * Sort issues by severity (critical first)
   */
  private sortBySeverity(issues: SecurityIssue[]): SecurityIssue[] {
    const severityWeight: Record<SecuritySeverity, number> = {
      [SecuritySeverity.CRITICAL]: 5,
      [SecuritySeverity.HIGH]: 4,
      [SecuritySeverity.MEDIUM]: 3,
      [SecuritySeverity.LOW]: 2,
      [SecuritySeverity.INFO]: 1
    };

    return issues.sort((a, b) => {
      const weightDiff = severityWeight[b.severity] - severityWeight[a.severity];
      if (weightDiff !== 0) return weightDiff;
      
      // Secondary sort by confidence
      return b.confidence - a.confidence;
    });
  }

  /**
   * Limit issues per file
   */
  private limitIssuesPerFile(issues: SecurityIssue[], maxPerFile: number): SecurityIssue[] {
    const fileIssues = new Map<string, SecurityIssue[]>();
    
    // Group by file
    for (const issue of issues) {
      const file = issue.location.file;
      if (!fileIssues.has(file)) {
        fileIssues.set(file, []);
      }
      fileIssues.get(file)!.push(issue);
    }

    // Limit each file and flatten
    const limited: SecurityIssue[] = [];
    for (const [file, fileIssueList] of fileIssues) {
      limited.push(...fileIssueList.slice(0, maxPerFile));
    }

    return limited;
  }

  /**
   * Create summary statistics
   */
  private createSummary(
    issues: SecurityIssue[],
    totalFiles: number,
    detectionTime: number
  ): SecuritySummary {
    const issuesBySeverity: Record<SecuritySeverity, number> = {
      [SecuritySeverity.CRITICAL]: 0,
      [SecuritySeverity.HIGH]: 0,
      [SecuritySeverity.MEDIUM]: 0,
      [SecuritySeverity.LOW]: 0,
      [SecuritySeverity.INFO]: 0
    };

    const issuesByCategory: Record<SecurityCategory, number> = {} as any;
    const issuesByType: Record<VulnerabilityType, number> = {} as any;
    const filesWithIssues = new Set<string>();

    let totalConfidence = 0;
    let mostSevereIssue: SecurityIssue | undefined;

    for (const issue of issues) {
      // Count by severity
      issuesBySeverity[issue.severity]++;

      // Count by category
      issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;

      // Count by type
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;

      // Track files with issues
      filesWithIssues.add(issue.location.file);

      // Sum confidence
      totalConfidence += issue.confidence;

      // Track most severe
      if (!mostSevereIssue || this.isMoreSevere(issue, mostSevereIssue)) {
        mostSevereIssue = issue;
      }
    }

    // Find most common category
    let mostCommonCategory = SecurityCategory.INJECTION;
    let maxCategoryCount = 0;
    for (const [category, count] of Object.entries(issuesByCategory)) {
      if (count > maxCategoryCount) {
        maxCategoryCount = count;
        mostCommonCategory = category as SecurityCategory;
      }
    }

    // Calculate risk score (0-100)
    const criticalRiskScore = this.calculateRiskScore(issuesBySeverity);

    return {
      totalIssues: issues.length,
      issuesBySeverity,
      issuesByCategory,
      issuesByType,
      criticalRiskScore,
      mostCommonCategory,
      mostSevereIssue,
      totalFilesScanned: totalFiles,
      filesWithIssues: filesWithIssues.size,
      detectionTime,
      confidenceScore: issues.length > 0 ? totalConfidence / issues.length : 0
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(issuesBySeverity: Record<SecuritySeverity, number>): number {
    const weights = {
      [SecuritySeverity.CRITICAL]: 25,
      [SecuritySeverity.HIGH]: 10,
      [SecuritySeverity.MEDIUM]: 3,
      [SecuritySeverity.LOW]: 1,
      [SecuritySeverity.INFO]: 0
    };

    let score = 0;
    for (const [severity, count] of Object.entries(issuesBySeverity)) {
      score += count * weights[severity as SecuritySeverity];
    }

    // Normalize to 0-100
    return Math.min(100, score);
  }

  /**
   * Check if issue A is more severe than issue B
   */
  private isMoreSevere(a: SecurityIssue, b: SecurityIssue): boolean {
    const severityOrder = [
      SecuritySeverity.INFO,
      SecuritySeverity.LOW,
      SecuritySeverity.MEDIUM,
      SecuritySeverity.HIGH,
      SecuritySeverity.CRITICAL
    ];
    
    const aIndex = severityOrder.indexOf(a.severity);
    const bIndex = severityOrder.indexOf(b.severity);
    
    if (aIndex !== bIndex) return aIndex > bIndex;
    return a.confidence > b.confidence;
  }

  /**
   * Generate top recommendations
   */
  private generateRecommendations(issues: SecurityIssue[]): SecurityRecommendation[] {
    // Aggregate recommendations by priority
    const recMap = new Map<string, SecurityRecommendation>();

    for (const issue of issues) {
      for (const rec of issue.recommendations) {
        const key = rec.title;
        if (!recMap.has(key)) {
          recMap.set(key, rec);
        }
      }
    }

    // Sort by priority and effort
    const recommendations = Array.from(recMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      const effortWeight = { low: 1, medium: 2, high: 3 };
      return effortWeight[a.effort] - effortWeight[b.effort];
    });

    // Return top 10 recommendations
    return recommendations.slice(0, 10);
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.depAnalyzer.clearCache();
  }
}

/**
 * Create default security analysis options
 */
export function createDefaultSecurityOptions(): SecurityAnalysisOptions {
  return {
    enabledDetectors: ['injection', 'cryptography', 'authentication', 'dependencies'],
    enabledCategories: Object.values(SecurityCategory),
    severityThreshold: SecuritySeverity.LOW,
    excludePatterns: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
    scanDependencies: true,
    dependencyDepth: 1,
    parallel: true,
    maxWorkers: 4,
    timeout: 30000
  };
}
