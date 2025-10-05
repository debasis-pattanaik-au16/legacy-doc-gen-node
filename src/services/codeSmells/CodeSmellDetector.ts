/**
 * Code Smell Detector - Orchestrator
 * 
 * Coordinates all code smell detectors and aggregates results
 */

import {
  CodeSmell,
  CodeSmellAnalysisResult,
  CodeSmellSummary,
  CodeSmellConfiguration,
  CodeSmellCategory,
  CodeSmellSeverity,
  CodeSmellType,
  RefactoringRecommendation,
  RefactoringEffort,
  DEFAULT_CODE_SMELL_THRESHOLDS,
  calculateOverallImpact,
} from '@/types/codeSmell';
import { UnifiedAST } from '@/types/ast';
import { logger } from '@/utils/logger';
import { BloaterDetector } from './BloaterDetector';
import { OOPAbuseDetector } from './OOPAbuseDetector';
import { MagicNumberDetector } from './MagicNumberDetector';

export class CodeSmellDetector {
  private bloaterDetector: BloaterDetector;
  private oopAbuseDetector: OOPAbuseDetector;
  private magicNumberDetector: MagicNumberDetector;

  constructor(private config?: Partial<CodeSmellConfiguration>) {
    const thresholds = config?.thresholds || DEFAULT_CODE_SMELL_THRESHOLDS;
    
    this.bloaterDetector = new BloaterDetector(thresholds);
    this.oopAbuseDetector = new OOPAbuseDetector(thresholds);
    this.magicNumberDetector = new MagicNumberDetector(thresholds);
  }

  /**
   * Analyze code smells in one or more ASTs
   */
  async analyze(asts: UnifiedAST | UnifiedAST[]): Promise<CodeSmellAnalysisResult> {
    const startTime = Date.now();
    const astArray = Array.isArray(asts) ? asts : [asts];

    try {
      logger.info(`Starting code smell analysis on ${astArray.length} file(s)...`);

      // Run all detectors in parallel
      const allSmells = await this.runDetectors(astArray);

      // Deduplicate
      const uniqueSmells = this.deduplicateSmells(allSmells);

      // Filter by severity
      const filteredSmells = this.filterBySeverity(uniqueSmells);

      // Sort by priority
      const sortedSmells = this.sortByPriority(filteredSmells);

      // Generate summary
      const summary = this.generateSummary(sortedSmells, astArray);

      // Extract top recommendations
      const recommendations = this.extractTopRecommendations(sortedSmells);

      const executionTime = Date.now() - startTime;

      logger.info(`Code smell analysis complete. Found ${sortedSmells.length} smells in ${executionTime}ms`);

      return {
        smells: sortedSmells,
        summary,
        recommendations,
        executionTime,
      };
    } catch (error) {
      logger.error(`Error in code smell analysis: ${error}`);
      throw error;
    }
  }

  /**
   * Run all enabled detectors
   */
  private async runDetectors(asts: UnifiedAST[]): Promise<CodeSmell[]> {
    const allSmells: CodeSmell[] = [];
    const enabledDetectors = this.config?.detectors || {
      bloaters: true,
      oopAbusers: true,
      changePreventers: false,
      dispensables: true,
      couplers: false,
    };

    for (const ast of asts) {
      const detectorPromises: Promise<CodeSmell[]>[] = [];

      if (enabledDetectors.bloaters) {
        detectorPromises.push(this.bloaterDetector.detectAll(ast));
      }

      if (enabledDetectors.oopAbusers) {
        detectorPromises.push(this.oopAbuseDetector.detectAll(ast));
      }

      if (enabledDetectors.dispensables) {
        detectorPromises.push(this.magicNumberDetector.detectAll(ast));
      }

      const results = await Promise.all(detectorPromises);
      allSmells.push(...results.flat());
    }

    return allSmells;
  }

  /**
   * Deduplicate smells
   */
  private deduplicateSmells(smells: CodeSmell[]): CodeSmell[] {
    const seen = new Set<string>();
    const unique: CodeSmell[] = [];

    for (const smell of smells) {
      const key = this.getSmellKey(smell);
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(smell);
      }
    }

    return unique;
  }

  /**
   * Generate unique key for a smell
   */
  private getSmellKey(smell: CodeSmell): string {
    return `${smell.type}:${smell.location.file}:${smell.location.line}:${smell.location.component}`;
  }

  /**
   * Filter smells by minimum severity
   */
  private filterBySeverity(smells: CodeSmell[]): CodeSmell[] {
    const minSeverity = this.config?.minimumSeverity || CodeSmellSeverity.LOW;
    
    const severityOrder = {
      [CodeSmellSeverity.LOW]: 1,
      [CodeSmellSeverity.MEDIUM]: 2,
      [CodeSmellSeverity.HIGH]: 3,
      [CodeSmellSeverity.CRITICAL]: 4,
    };

    return smells.filter(smell => 
      severityOrder[smell.severity] >= severityOrder[minSeverity]
    );
  }

  /**
   * Sort smells by priority (severity, impact, type)
   */
  private sortByPriority(smells: CodeSmell[]): CodeSmell[] {
    const severityOrder = {
      [CodeSmellSeverity.CRITICAL]: 4,
      [CodeSmellSeverity.HIGH]: 3,
      [CodeSmellSeverity.MEDIUM]: 2,
      [CodeSmellSeverity.LOW]: 1,
    };

    return smells.sort((a, b) => {
      // Primary: severity
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // Secondary: impact score
      const impactA = calculateOverallImpact(a.impact);
      const impactB = calculateOverallImpact(b.impact);
      const impactDiff = impactB - impactA;
      if (impactDiff !== 0) return impactDiff;

      // Tertiary: affected LOC
      const locDiff = (b.affectedLinesOfCode || 0) - (a.affectedLinesOfCode || 0);
      return locDiff;
    });
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(smells: CodeSmell[], asts: UnifiedAST[]): CodeSmellSummary {
    const byCategory: Record<CodeSmellCategory, number> = {
      [CodeSmellCategory.BLOATER]: 0,
      [CodeSmellCategory.OOP_ABUSER]: 0,
      [CodeSmellCategory.CHANGE_PREVENTER]: 0,
      [CodeSmellCategory.DISPENSABLE]: 0,
      [CodeSmellCategory.COUPLER]: 0,
    };

    const bySeverity: Record<CodeSmellSeverity, number> = {
      [CodeSmellSeverity.LOW]: 0,
      [CodeSmellSeverity.MEDIUM]: 0,
      [CodeSmellSeverity.HIGH]: 0,
      [CodeSmellSeverity.CRITICAL]: 0,
    };

    const byType: Record<CodeSmellType, number> = {} as Record<CodeSmellType, number>;

    const affectedFiles = new Set<string>();
    let totalAffectedLines = 0;

    for (const smell of smells) {
      byCategory[smell.category]++;
      bySeverity[smell.severity]++;
      byType[smell.type] = (byType[smell.type] || 0) + 1;
      
      affectedFiles.add(smell.location.file);
      totalAffectedLines += smell.affectedLinesOfCode || 0;
    }

    // Estimate refactoring effort
    const estimatedRefactoringEffort = this.estimateOverallEffort(smells);

    // Calculate technical debt
    const technicalDebtHours = this.calculateTechnicalDebt(smells);

    // Get prioritized smells (top 10)
    const prioritizedSmells = smells.slice(0, 10);

    return {
      totalSmells: smells.length,
      byCategory,
      byType,
      bySeverity,
      totalAffectedFiles: affectedFiles.size,
      totalAffectedLines,
      estimatedRefactoringEffort,
      prioritizedSmells,
      technicalDebtHours,
    };
  }

  /**
   * Estimate overall refactoring effort
   */
  private estimateOverallEffort(smells: CodeSmell[]): RefactoringEffort {
    const effortScores = {
      [RefactoringEffort.TRIVIAL]: 1,
      [RefactoringEffort.LOW]: 2,
      [RefactoringEffort.MEDIUM]: 4,
      [RefactoringEffort.HIGH]: 8,
      [RefactoringEffort.VERY_HIGH]: 16,
    };

    let totalScore = 0;
    for (const smell of smells) {
      if (smell.recommendations.length > 0) {
        const effort = smell.recommendations[0].effort;
        totalScore += effortScores[effort];
      }
    }

    const avgScore = totalScore / (smells.length || 1);

    if (avgScore > 12) return RefactoringEffort.VERY_HIGH;
    if (avgScore > 6) return RefactoringEffort.HIGH;
    if (avgScore > 3) return RefactoringEffort.MEDIUM;
    if (avgScore > 1.5) return RefactoringEffort.LOW;
    return RefactoringEffort.TRIVIAL;
  }

  /**
   * Calculate technical debt in hours
   */
  private calculateTechnicalDebt(smells: CodeSmell[]): number {
    const effortHours = {
      [RefactoringEffort.TRIVIAL]: 0.25,
      [RefactoringEffort.LOW]: 0.75,
      [RefactoringEffort.MEDIUM]: 2,
      [RefactoringEffort.HIGH]: 6,
      [RefactoringEffort.VERY_HIGH]: 12,
    };

    let totalHours = 0;
    for (const smell of smells) {
      if (smell.recommendations.length > 0) {
        const effort = smell.recommendations[0].effort;
        totalHours += effortHours[effort];
      }
    }

    return Math.round(totalHours * 10) / 10; // Round to 1 decimal
  }

  /**
   * Extract top recommendations from smells
   */
  private extractTopRecommendations(smells: CodeSmell[]): RefactoringRecommendation[] {
    const recommendations: RefactoringRecommendation[] = [];

    // Get highest priority recommendations
    for (const smell of smells.slice(0, 5)) { // Top 5 smells
      if (smell.recommendations.length > 0) {
        recommendations.push(smell.recommendations[0]);
      }
    }

    return recommendations;
  }

  /**
   * Get statistics for a specific smell type
   */
  getSmellTypeStats(smells: CodeSmell[], type: CodeSmellType): {
    count: number;
    avgSeverity: number;
    avgImpact: number;
  } {
    const filtered = smells.filter(s => s.type === type);
    
    if (filtered.length === 0) {
      return { count: 0, avgSeverity: 0, avgImpact: 0 };
    }

    const severityScores = {
      [CodeSmellSeverity.LOW]: 1,
      [CodeSmellSeverity.MEDIUM]: 2,
      [CodeSmellSeverity.HIGH]: 3,
      [CodeSmellSeverity.CRITICAL]: 4,
    };

    const totalSeverity = filtered.reduce((sum, s) => 
      sum + severityScores[s.severity], 0
    );
    
    const totalImpact = filtered.reduce((sum, s) => 
      sum + calculateOverallImpact(s.impact), 0
    );

    return {
      count: filtered.length,
      avgSeverity: totalSeverity / filtered.length,
      avgImpact: totalImpact / filtered.length,
    };
  }
}
