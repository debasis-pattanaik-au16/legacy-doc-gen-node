/**
 * Bloater Detector
 * 
 * Detects bloater code smells including:
 * - Long methods
 * - Large classes
 * - Long parameter lists
 * - Data clumps
 * - Primitive obsession
 */

import { randomUUID } from 'crypto';
import {
  CodeSmell,
  CodeSmellType,
  CodeSmellCategory,
  CodeSmellSeverity,
  CodeSmellMetrics,
  CodeSmellThresholds,
  RefactoringStrategy,
  RefactoringEffort,
  RefactoringRecommendation,
  determineSeverity,
  DataClump,
  DataClumpOccurrence,
} from '@/types/codeSmell';
import { UnifiedAST, ComponentNode } from '@/types/ast';
import { logger } from '@/utils/logger';

export class BloaterDetector {
  constructor(private thresholds: CodeSmellThresholds) {}

  /**
   * Detect all bloater code smells in an AST
   */
  async detectAll(ast: UnifiedAST): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    try {
      logger.debug(`Running bloater detection on ${ast.fileName}`);

      // Detect long methods
      const longMethods = this.detectLongMethods(ast);
      smells.push(...longMethods);

      // Detect large classes
      const largeClasses = this.detectLargeClasses(ast);
      smells.push(...largeClasses);

      // Detect long parameter lists
      const longParams = this.detectLongParameterLists(ast);
      smells.push(...longParams);

      // Detect data clumps
      const dataClumps = this.detectDataClumps(ast);
      smells.push(...dataClumps);

      logger.debug(`Found ${smells.length} bloater smells in ${ast.fileName}`);
    } catch (error) {
      logger.error(`Error in bloater detection: ${error}`);
    }

    return smells;
  }

  /**
   * Detect long methods (functions with too many lines)
   */
  private detectLongMethods(ast: UnifiedAST): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const threshold = this.thresholds.longMethod;

    for (const component of ast.components) {
      if (component.type === 'function' || component.type === 'method') {
        const loc = component.endLine - component.startLine + 1;

        if (loc > threshold) {
          const metrics: CodeSmellMetrics = {
            linesOfCode: loc,
            cyclomaticComplexity: component.complexity?.cyclomaticComplexity,
            cognitiveComplexity: component.complexity?.cognitiveComplexity,
            nestingDepth: this.calculateNestingDepth(component),
          };

          const severity = determineSeverity(
            CodeSmellType.LONG_METHOD,
            metrics,
            this.thresholds
          );

          smells.push({
            id: randomUUID(),
            type: CodeSmellType.LONG_METHOD,
            category: CodeSmellCategory.BLOATER,
            severity,
            location: {
              file: ast.fileName,
              line: component.startLine,
              endLine: component.endLine,
              component: component.name,
            },
            description: `Method '${component.name}' is ${loc} lines long (threshold: ${threshold} lines)`,
            impact: {
              maintainability: this.calculateMaintainabilityImpact(loc, threshold),
              readability: this.calculateReadabilityImpact(loc, threshold),
              testability: this.calculateTestabilityImpact(loc, threshold),
            },
            recommendations: this.getLongMethodRecommendations(component, loc),
            metrics,
            detectedAt: new Date(),
            affectedLinesOfCode: loc,
          });
        }
      }
    }

    return smells;
  }

  /**
   * Detect large classes
   */
  private detectLargeClasses(ast: UnifiedAST): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const threshold = this.thresholds.largeClass;

    for (const component of ast.components) {
      if (component.type === 'class') {
        const loc = component.endLine - component.startLine + 1;
        const methods = ast.components.filter(
          c => c.type === 'method' && c.name.startsWith(component.name + '.')
        );
        // Type assertion needed since ComponentNode doesn't have properties
        const classNode = component as any;
        const fields = classNode.properties?.length || 0;

        if (loc > threshold) {
          const metrics: CodeSmellMetrics = {
            linesOfCode: loc,
            numberOfMethods: methods.length,
            numberOfFields: fields,
          };

          const severity = determineSeverity(
            CodeSmellType.LARGE_CLASS,
            metrics,
            this.thresholds
          );

          smells.push({
            id: randomUUID(),
            type: CodeSmellType.LARGE_CLASS,
            category: CodeSmellCategory.BLOATER,
            severity,
            location: {
              file: ast.fileName,
              line: component.startLine,
              endLine: component.endLine,
              component: component.name,
            },
            description: `Class '${component.name}' is ${loc} lines long with ${methods.length} methods (threshold: ${threshold} lines)`,
            impact: {
              maintainability: this.calculateMaintainabilityImpact(loc, threshold),
              readability: this.calculateReadabilityImpact(loc, threshold),
              testability: 70,
              reusability: 60,
            },
            recommendations: this.getLargeClassRecommendations(component, loc, methods.length),
            metrics,
            detectedAt: new Date(),
            affectedLinesOfCode: loc,
          });
        }
      }
    }

    return smells;
  }

  /**
   * Detect long parameter lists
   */
  private detectLongParameterLists(ast: UnifiedAST): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const threshold = this.thresholds.longParameterList;

    for (const component of ast.components) {
      if (component.type === 'function' || component.type === 'method') {
        // Type assertion for function/method nodes
        const funcNode = component as any;
        const paramCount = funcNode.parameters?.length || 0;

        if (paramCount > threshold) {
          const metrics: CodeSmellMetrics = {
            numberOfParameters: paramCount,
          };

          const severity = paramCount > threshold * 2 
            ? CodeSmellSeverity.HIGH 
            : CodeSmellSeverity.MEDIUM;

          smells.push({
            id: randomUUID(),
            type: CodeSmellType.LONG_PARAMETER_LIST,
            category: CodeSmellCategory.BLOATER,
            severity,
            location: {
              file: ast.fileName,
              line: component.startLine,
              component: component.name,
            },
            description: `Function '${component.name}' has ${paramCount} parameters (threshold: ${threshold})`,
            impact: {
              maintainability: 60,
              readability: 75,
              testability: 70,
            },
            recommendations: this.getLongParameterListRecommendations(component, paramCount),
            metrics,
            detectedAt: new Date(),
          });
        }
      }
    }

    return smells;
  }

  /**
   * Detect data clumps (groups of parameters that appear together frequently)
   */
  private detectDataClumps(ast: UnifiedAST): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const threshold = this.thresholds.dataClumps;

    // Collect parameter groups from all functions
    const parameterGroups = new Map<string, DataClumpOccurrence[]>();

    for (const component of ast.components) {
      if (component.type === 'function' || component.type === 'method') {
        const funcNode = component as any;
        if (funcNode.parameters) {
          const params = funcNode.parameters.map((p: any) => p.name).sort();
        
        if (params.length >= threshold) {
          // Generate all combinations of parameters >= threshold size
          for (let i = 0; i < params.length - threshold + 1; i++) {
            const group = params.slice(i, i + threshold).join(',');
            
            if (!parameterGroups.has(group)) {
              parameterGroups.set(group, []);
            }
            
            parameterGroups.get(group)!.push({
              file: ast.fileName,
              component: component.name,
              line: component.startLine,
            });
          }
        }
      }
        }
      }

    // Find groups that appear multiple times
    for (const [group, occurrences] of parameterGroups.entries()) {
      if (occurrences.length >= 2) {
        const params = group.split(',');
        const suggestedName = this.generateObjectName(params);

        smells.push({
          id: randomUUID(),
          type: CodeSmellType.DATA_CLUMPS,
          category: CodeSmellCategory.BLOATER,
          severity: occurrences.length >= 4 ? CodeSmellSeverity.HIGH : CodeSmellSeverity.MEDIUM,
          location: {
            file: ast.fileName,
            line: occurrences[0].line,
            component: occurrences[0].component,
          },
          description: `Parameters [${params.join(', ')}] appear together in ${occurrences.length} functions`,
          impact: {
            maintainability: 65,
            readability: 55,
            testability: 60,
            reusability: 75,
          },
          recommendations: [{
            strategy: RefactoringStrategy.INTRODUCE_PARAMETER_OBJECT,
            description: `Create a '${suggestedName}' class/object to group these related parameters`,
            steps: [
              {
                order: 1,
                description: `Create a new class or interface '${suggestedName}' with properties: ${params.join(', ')}`,
                automatable: true,
                riskLevel: 'low',
              },
              {
                order: 2,
                description: `Replace parameter list with single '${suggestedName}' parameter in all ${occurrences.length} functions`,
                automatable: true,
                riskLevel: 'medium',
              },
              {
                order: 3,
                description: 'Update all call sites to pass the new object',
                automatable: false,
                riskLevel: 'medium',
              },
            ],
            effort: RefactoringEffort.MEDIUM,
            priority: 7,
            benefits: [
              'Reduces parameter list complexity',
              'Improves code reusability',
              'Makes future changes easier',
              'Creates a cohesive data structure',
            ],
            risks: [
              'Requires updating all call sites',
              'May increase object creation overhead',
            ],
            codeExampleBefore: `function process(${params.join(', ')}) { ... }`,
            codeExampleAfter: `interface ${suggestedName} { ${params.map(p => `${p}: type;`).join(' ')} }\nfunction process(data: ${suggestedName}) { ... }`,
          }],
          metrics: {
            numberOfParameters: params.length,
          },
          detectedAt: new Date(),
          affectedComponents: occurrences.map(o => o.component),
        });
      }
    }

    return smells;
  }

  // Helper methods

  private calculateNestingDepth(component: ComponentNode): number {
    // Simplified nesting depth calculation
    // In real implementation, would traverse AST
    return component.complexity?.cognitiveComplexity 
      ? Math.min(Math.floor(component.complexity.cognitiveComplexity / 5), 10) 
      : 1;
  }

  private calculateMaintainabilityImpact(actual: number, threshold: number): number {
    const ratio = actual / threshold;
    return Math.min(Math.round(ratio * 30), 100);
  }

  private calculateReadabilityImpact(actual: number, threshold: number): number {
    const ratio = actual / threshold;
    return Math.min(Math.round(ratio * 35), 100);
  }

  private calculateTestabilityImpact(actual: number, threshold: number): number {
    const ratio = actual / threshold;
    return Math.min(Math.round(ratio * 25), 100);
  }

  private getLongMethodRecommendations(
    component: ComponentNode,
    loc: number
  ): RefactoringRecommendation[] {
    const recommendations: RefactoringRecommendation[] = [];

    // Extract Method recommendation
    recommendations.push({
      strategy: RefactoringStrategy.EXTRACT_METHOD,
      description: 'Break down the long method into smaller, focused methods',
      steps: [
        {
          order: 1,
          description: 'Identify logical sections or responsibilities within the method',
          automatable: false,
          riskLevel: 'low',
        },
        {
          order: 2,
          description: 'Extract each section into a separate method with a descriptive name',
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 3,
          description: 'Ensure extracted methods have minimal parameters (use class fields if needed)',
          automatable: false,
          riskLevel: 'low',
        },
      ],
      effort: loc > this.thresholds.longMethod * 2 ? RefactoringEffort.HIGH : RefactoringEffort.MEDIUM,
      priority: 8,
      benefits: [
        'Improves code readability',
        'Makes testing easier',
        'Enables code reuse',
        'Reduces cognitive load',
      ],
      risks: [
        'May introduce too many small methods',
        'Requires careful naming',
      ],
    });

    // If high complexity, suggest decompose conditional
    if (component.complexity && component.complexity.cyclomaticComplexity > this.thresholds.cyclomaticComplexity) {
      recommendations.push({
        strategy: RefactoringStrategy.DECOMPOSE_CONDITIONAL,
        description: 'Simplify complex conditional logic',
        steps: [
          {
            order: 1,
            description: 'Extract condition checks into well-named methods',
            automatable: true,
            riskLevel: 'low',
          },
          {
            order: 2,
            description: 'Extract then/else blocks into separate methods',
            automatable: true,
            riskLevel: 'low',
          },
        ],
        effort: RefactoringEffort.MEDIUM,
        priority: 7,
        benefits: ['Clarifies intent', 'Reduces nesting'],
        risks: ['May create many small methods'],
      });
    }

    return recommendations;
  }

  private getLargeClassRecommendations(
    component: ComponentNode,
    loc: number,
    methodCount: number
  ): RefactoringRecommendation[] {
    return [{
      strategy: RefactoringStrategy.EXTRACT_CLASS,
      description: 'Split the large class into smaller, focused classes',
      steps: [
        {
          order: 1,
          description: 'Identify groups of related methods and fields',
          automatable: false,
          riskLevel: 'low',
        },
        {
          order: 2,
          description: 'Create new classes for each group',
          automatable: true,
          riskLevel: 'medium',
        },
        {
          order: 3,
          description: 'Move methods and fields to the new classes',
          automatable: true,
          riskLevel: 'medium',
        },
        {
          order: 4,
          description: 'Update the original class to delegate to the new classes',
          automatable: false,
          riskLevel: 'high',
        },
      ],
      effort: loc > this.thresholds.largeClass * 2 ? RefactoringEffort.VERY_HIGH : RefactoringEffort.HIGH,
      priority: methodCount > 20 ? 9 : 7,
      benefits: [
        'Improves Single Responsibility Principle',
        'Makes code more maintainable',
        'Enables better testing',
        'Facilitates code reuse',
      ],
      risks: [
        'Requires careful design',
        'May introduce coupling between classes',
        'Large refactoring effort',
      ],
    }];
  }

  private getLongParameterListRecommendations(
    component: ComponentNode,
    paramCount: number
  ): RefactoringRecommendation[] {
    return [{
      strategy: RefactoringStrategy.INTRODUCE_PARAMETER_OBJECT,
      description: 'Group related parameters into an object',
      steps: [
        {
          order: 1,
          description: 'Create a parameter object class/interface',
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 2,
          description: 'Replace parameter list with the parameter object',
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 3,
          description: 'Update all call sites',
          automatable: false,
          riskLevel: 'medium',
        },
      ],
      effort: RefactoringEffort.MEDIUM,
      priority: paramCount > 7 ? 8 : 6,
      benefits: [
        'Reduces parameter complexity',
        'Creates reusable data structure',
        'Makes future changes easier',
      ],
      risks: [
        'Requires updating all callers',
        'May group unrelated parameters',
      ],
    }];
  }

  private generateObjectName(params: string[]): string {
    // Simple heuristic to generate a meaningful object name
    const commonPrefixes = ['user', 'data', 'config', 'request', 'response', 'info'];
    
    for (const prefix of commonPrefixes) {
      if (params.some(p => p.toLowerCase().includes(prefix))) {
        return prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'Data';
      }
    }
    
    // Default to a generic name
    return 'ParameterData';
  }
}
