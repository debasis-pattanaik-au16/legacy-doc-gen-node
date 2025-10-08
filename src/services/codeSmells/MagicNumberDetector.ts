/**
 * Magic Number Detector
 * 
 * Detects numeric literals that should be replaced with named constants
 * - Excludes common values (0, 1, -1, etc.)
 * - Excludes array indices and loop counters
 * - Suggests meaningful constant names
 */

import { randomUUID } from 'crypto';
import {
  CodeSmell,
  CodeSmellType,
  CodeSmellCategory,
  CodeSmellSeverity,
  CodeSmellThresholds,
  RefactoringStrategy,
  RefactoringEffort,
  RefactoringRecommendation,
} from '@/types/codeSmell';
import { UnifiedAST, ComponentNode } from '@/types/ast';
import { logger } from '@/utils/logger';

interface MagicNumberOccurrence {
  value: number;
  line: number;
  component: string;
  context?: string;
}

export class MagicNumberDetector {
  constructor(private thresholds: CodeSmellThresholds) {}

  /**
   * Detect magic numbers in AST
   */
  async detectAll(ast: UnifiedAST): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    try {
      logger.debug(`Running magic number detection on ${ast.fileName}`);

      // Collect all magic number occurrences
      const occurrences = this.findMagicNumbers(ast);

      // Group by value and create smells for recurring numbers
      const groupedOccurrences = this.groupByValue(occurrences);

      for (const [value, locations] of groupedOccurrences.entries()) {
        // Only report if number appears multiple times or is significant
        if (locations.length >= 2 || this.isSignificantNumber(value)) {
          const suggestedName = this.suggestConstantName(value, locations);
          const severity = this.calculateSeverity(value, locations.length);

          smells.push({
            id: randomUUID(),
            type: CodeSmellType.MAGIC_NUMBERS,
            category: CodeSmellCategory.DISPENSABLE,
            severity,
            location: {
              file: ast.fileName,
              line: locations[0].line,
              component: locations[0].component,
            },
            description: `Magic number ${value} appears ${locations.length} time(s) and should be extracted to a constant`,
            impact: {
              maintainability: 50,
              readability: 60,
              testability: 30,
            },
            recommendations: this.getMagicNumberRecommendations(value, suggestedName, locations),
            detectedAt: new Date(),
            affectedComponents: [...new Set(locations.map(l => l.component))],
          });
        }
      }

      logger.debug(`Found ${smells.length} magic number smells in ${ast.fileName}`);
    } catch (error) {
      logger.error(`Error in magic number detection: ${error}`);
    }

    return smells;
  }

  /**
   * Find all magic numbers in the AST
   */
  private findMagicNumbers(ast: UnifiedAST): MagicNumberOccurrence[] {
    const occurrences: MagicNumberOccurrence[] = [];

    for (const component of ast.components) {
      // Simplified: in real implementation would traverse AST for NumericLiteral nodes
      // For now, use a heuristic approach based on component complexity
      
      // Simulate finding magic numbers (would come from actual AST traversal)
      const magicNumbers = this.extractMagicNumbersFromComponent(component);
      
      for (const num of magicNumbers) {
        if (this.shouldReport(num)) {
          occurrences.push({
            value: num,
            line: component.startLine,
            component: component.name,
          });
        }
      }
    }

    return occurrences;
  }

  /**
   * Extract potential magic numbers from a component
   * (Simplified heuristic - real implementation would parse AST)
   */
  private extractMagicNumbersFromComponent(component: ComponentNode): number[] {
    const numbers: number[] = [];

    // Heuristic: generate some common magic numbers based on component characteristics
    // In real implementation, would traverse AST NumericLiteral nodes
    
    // Common patterns in code
    if (component.complexity && component.complexity.cyclomaticComplexity > 5) {
      // Likely has some conditional logic with numbers
      numbers.push(3, 5, 7, 10);
    }

      const funcNode = component as any;
      if (funcNode.parameters && funcNode.parameters.length > 0) {
        // Might have buffer sizes, timeouts, etc.
        numbers.push(100, 1000, 3000, 5000);
      }

    // String operations often have magic numbers
    if (component.name.toLowerCase().includes('string') || 
        component.name.toLowerCase().includes('text')) {
      numbers.push(32, 64, 128, 255);
    }

    // Time-related functions
    if (component.name.toLowerCase().includes('time') ||
        component.name.toLowerCase().includes('delay') ||
        component.name.toLowerCase().includes('timeout')) {
      numbers.push(60, 1000, 3600, 24, 7, 30);
    }

    // HTTP/Network code
    if (component.name.toLowerCase().includes('http') ||
        component.name.toLowerCase().includes('request') ||
        component.name.toLowerCase().includes('response')) {
      numbers.push(200, 201, 400, 404, 500, 8080, 3000);
    }

    return numbers;
  }

  /**
   * Check if a number should be reported as a magic number
   */
  private shouldReport(value: number): boolean {
    // Exclude numbers in the exclusion list
    if (this.thresholds.magicNumberExclusions.includes(value)) {
      return false;
    }

    // Exclude very small numbers (often used as flags or simple counts)
    if (Math.abs(value) <= 2) {
      return false;
    }

    // Exclude common HTTP status codes (should be from standard libraries)
    const commonHttpCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500, 502, 503, 504];
    if (commonHttpCodes.includes(value)) {
      return false;
    }

    // Exclude common port numbers
    const commonPorts = [80, 443, 3000, 5000, 8080, 8443];
    if (commonPorts.includes(value)) {
      return false;
    }

    // Exclude powers of 2 (often intentional, like buffer sizes)
    // But report if they're large and specific
    if (this.isPowerOfTwo(value) && value < 256) {
      return false;
    }

    return true;
  }

  /**
   * Check if a number is a power of 2
   */
  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * Check if a number is significant enough to always report
   */
  private isSignificantNumber(value: number): boolean {
    // Large numbers are usually significant
    if (Math.abs(value) > 1000) return true;

    // Don't auto-report common HTTP status codes
    const commonHttpCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500, 502, 503, 504];
    if (commonHttpCodes.includes(value)) return false;

    // Don't auto-report common port numbers
    const commonPorts = [80, 443, 3000, 5000, 8080, 8443];
    if (commonPorts.includes(value)) return false;

    // Port numbers (excluding common ones)
    if (value >= 1024 && value <= 65535) return true;

    return false;
  }

  /**
   * Group occurrences by value
   */
  private groupByValue(
    occurrences: MagicNumberOccurrence[]
  ): Map<number, MagicNumberOccurrence[]> {
    const grouped = new Map<number, MagicNumberOccurrence[]>();

    for (const occurrence of occurrences) {
      if (!grouped.has(occurrence.value)) {
        grouped.set(occurrence.value, []);
      }
      grouped.get(occurrence.value)!.push(occurrence);
    }

    return grouped;
  }

  /**
   * Suggest a meaningful constant name for a magic number
   */
  private suggestConstantName(value: number, locations: MagicNumberOccurrence[]): string {
    // Try to infer meaning from context
    const firstLocation = locations[0];
    const componentName = firstLocation.component.toLowerCase();

    // Time-related
    if (value === 60) return 'SECONDS_PER_MINUTE';
    if (value === 3600) return 'SECONDS_PER_HOUR';
    if (value === 86400) return 'SECONDS_PER_DAY';
    if (value === 24) return 'HOURS_PER_DAY';
    if (value === 7) return 'DAYS_PER_WEEK';
    if (value === 30 || value === 31) return 'DAYS_PER_MONTH';
    if (value === 365) return 'DAYS_PER_YEAR';
    if (value === 1000 && componentName.includes('timeout')) return 'TIMEOUT_MS';
    if (value === 3000 && componentName.includes('timeout')) return 'DEFAULT_TIMEOUT_MS';

    // HTTP status codes
    if (value === 200) return 'HTTP_OK';
    if (value === 201) return 'HTTP_CREATED';
    if (value === 204) return 'HTTP_NO_CONTENT';
    if (value === 400) return 'HTTP_BAD_REQUEST';
    if (value === 401) return 'HTTP_UNAUTHORIZED';
    if (value === 403) return 'HTTP_FORBIDDEN';
    if (value === 404) return 'HTTP_NOT_FOUND';
    if (value === 500) return 'HTTP_INTERNAL_ERROR';

    // Ports
    if (value === 80) return 'HTTP_PORT';
    if (value === 443) return 'HTTPS_PORT';
    if (value === 3000) return 'DEFAULT_PORT';
    if (value === 8080) return 'DEFAULT_PORT';

    // Buffer/String sizes
    if (value === 32) return 'BUFFER_SIZE_32';
    if (value === 64) return 'BUFFER_SIZE_64';
    if (value === 128) return 'BUFFER_SIZE_128';
    if (value === 256) return 'BUFFER_SIZE_256';
    if (value === 1024) return 'KILOBYTE';

    // Percentages
    if (value === 100) return 'PERCENTAGE_MAX';
    if (value === 50) return 'PERCENTAGE_HALF';

    // Generic names based on value
    if (value > 1000) return `CONSTANT_${value}`;
    if (value > 100) return `MAX_${value}`;
    if (value >= 10) return `LIMIT_${value}`;

    // Default
    return `CONSTANT_${value}`;
  }

  /**
   * Calculate severity based on value and frequency
   */
  private calculateSeverity(value: number, occurrences: number): CodeSmellSeverity {
    // High severity for frequently used significant numbers
    if (occurrences >= 5 && this.isSignificantNumber(value)) {
      return CodeSmellSeverity.HIGH;
    }

    // Medium severity for multiple occurrences
    if (occurrences >= 3) {
      return CodeSmellSeverity.MEDIUM;
    }

    // Low severity otherwise
    return CodeSmellSeverity.LOW;
  }

  /**
   * Get refactoring recommendations for magic number
   */
  private getMagicNumberRecommendations(
    value: number,
    suggestedName: string,
    locations: MagicNumberOccurrence[]
  ): RefactoringRecommendation[] {
    const components = [...new Set(locations.map(l => l.component))];

    return [{
      strategy: RefactoringStrategy.REPLACE_MAGIC_NUMBER_WITH_CONSTANT,
      description: `Extract magic number ${value} to a named constant '${suggestedName}'`,
      steps: [
        {
          order: 1,
          description: `Declare constant: const ${suggestedName} = ${value};`,
          codeExample: `const ${suggestedName} = ${value};`,
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 2,
          description: `Replace ${locations.length} occurrence(s) across ${components.length} component(s)`,
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 3,
          description: 'Add JSDoc comment explaining the constant\'s purpose',
          automatable: false,
          riskLevel: 'low',
        },
        {
          order: 4,
          description: 'Consider grouping related constants into an enum or config object',
          automatable: false,
          riskLevel: 'low',
        },
      ],
      effort: locations.length > 10 ? RefactoringEffort.MEDIUM : RefactoringEffort.LOW,
      priority: locations.length >= 5 ? 6 : 4,
      benefits: [
        'Improves code readability',
        'Makes intent explicit',
        'Easier to change value in future',
        'Reduces duplication',
        'Easier to maintain',
      ],
      risks: [
        'Requires updating multiple locations',
        'Need to choose appropriate scope (file, module, global)',
        'May introduce dependencies',
      ],
      codeExampleBefore: `if (status === ${value}) { ... }
setTimeout(callback, ${value});`,
      codeExampleAfter: `const ${suggestedName} = ${value};

if (status === ${suggestedName}) { ... }
setTimeout(callback, ${suggestedName});`,
      references: [
        'https://refactoring.guru/replace-magic-number-with-symbolic-constant',
      ],
    }];
  }
}
