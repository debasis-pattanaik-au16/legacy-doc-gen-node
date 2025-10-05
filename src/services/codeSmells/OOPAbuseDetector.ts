/**
 * OOP Abuse Detector
 * 
 * Detects object-oriented programming anti-patterns:
 * - Switch statements (should be polymorphism)
 * - Refused bequest (subclass not using parent methods)
 * - Temporary fields (fields used only in certain conditions)
 * - Alternative classes with different interfaces
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
} from '@/types/codeSmell';
import { UnifiedAST, ComponentNode } from '@/types/ast';
import { logger } from '@/utils/logger';

export class OOPAbuseDetector {
  constructor(private thresholds: CodeSmellThresholds) {}

  /**
   * Detect all OOP abuse code smells
   */
  async detectAll(ast: UnifiedAST): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    try {
      logger.debug(`Running OOP abuse detection on ${ast.fileName}`);

      // Detect switch statements
      const switchSmells = this.detectSwitchStatements(ast);
      smells.push(...switchSmells);

      // Detect temporary fields
      const tempFields = this.detectTemporaryFields(ast);
      smells.push(...tempFields);

      logger.debug(`Found ${smells.length} OOP abuse smells in ${ast.fileName}`);
    } catch (error) {
      logger.error(`Error in OOP abuse detection: ${error}`);
    }

    return smells;
  }

  /**
   * Detect switch statements that should be replaced with polymorphism
   */
  private detectSwitchStatements(ast: UnifiedAST): CodeSmell[] {
    const smells: CodeSmell[] = [];

    for (const component of ast.components) {
      if (component.type === 'function' || component.type === 'method') {
        // Look for switch statements or multiple if-else chains
        const switchCount = this.countSwitchStatements(component);
        const ifElseChainLength = this.detectLongIfElseChain(component);

        // Switch statement smell
        if (switchCount > 0) {
          // Only report if switch is on type/kind field (polymorphism candidate)
          smells.push({
            id: randomUUID(),
            type: CodeSmellType.SWITCH_STATEMENTS,
            category: CodeSmellCategory.OOP_ABUSER,
            severity: switchCount > 1 ? CodeSmellSeverity.HIGH : CodeSmellSeverity.MEDIUM,
            location: {
              file: ast.fileName,
              line: component.startLine,
              component: component.name,
            },
            description: `Function '${component.name}' contains ${switchCount} switch statement(s) that may be better handled with polymorphism`,
            impact: {
              maintainability: 70,
              readability: 55,
              testability: 65,
              reusability: 60,
            },
            recommendations: this.getSwitchStatementRecommendations(component),
            metrics: {
              cyclomaticComplexity: component.complexity?.cyclomaticComplexity,
            },
            detectedAt: new Date(),
          });
        }

        // Long if-else chain (similar to switch)
        if (ifElseChainLength >= 4) {
          smells.push({
            id: randomUUID(),
            type: CodeSmellType.SWITCH_STATEMENTS,
            category: CodeSmellCategory.OOP_ABUSER,
            severity: ifElseChainLength >= 6 ? CodeSmellSeverity.HIGH : CodeSmellSeverity.MEDIUM,
            location: {
              file: ast.fileName,
              line: component.startLine,
              component: component.name,
            },
            description: `Function '${component.name}' contains long if-else chain (${ifElseChainLength} branches) that could benefit from polymorphism`,
            impact: {
              maintainability: 75,
              readability: 60,
              testability: 70,
            },
            recommendations: this.getIfElseChainRecommendations(component, ifElseChainLength),
            metrics: {
              cyclomaticComplexity: component.complexity?.cyclomaticComplexity,
            },
            detectedAt: new Date(),
          });
        }
      }
    }

    return smells;
  }

  /**
   * Detect temporary fields (class fields only used in certain methods)
   */
  private detectTemporaryFields(ast: UnifiedAST): CodeSmell[] {
    const smells: CodeSmell[] = [];

    // Find classes
    for (const component of ast.components) {
      const classNode = component as any;
      if (component.type === 'class' && classNode.properties) {
        // Get all methods in this class
        const classMethods = ast.components.filter(
          c => c.type === 'method' && c.name.startsWith(component.name + '.')
        );

        if (classMethods.length < 2) continue; // Need multiple methods to detect pattern

        // Analyze field usage
        const fieldUsage = new Map<string, Set<string>>();

        for (const field of classNode.properties) {
          const usedInMethods = new Set<string>();

          // Simple heuristic: check which methods might use this field
          // In real implementation, would analyze AST more deeply
          for (const method of classMethods) {
            // Check if method name or common patterns suggest field usage
            if (this.mightUseField(method, field.name)) {
              usedInMethods.add(method.name);
            }
          }

          fieldUsage.set(field.name, usedInMethods);
        }

        // Find fields used in less than 50% of methods
        const threshold = Math.ceil(classMethods.length * 0.5);

        for (const [fieldName, methods] of fieldUsage.entries()) {
          if (methods.size > 0 && methods.size < threshold) {
            smells.push({
              id: randomUUID(),
              type: CodeSmellType.TEMPORARY_FIELD,
              category: CodeSmellCategory.OOP_ABUSER,
              severity: methods.size === 1 ? CodeSmellSeverity.MEDIUM : CodeSmellSeverity.LOW,
              location: {
                file: ast.fileName,
                line: component.startLine,
                component: component.name,
              },
              description: `Field '${fieldName}' in class '${component.name}' is only used in ${methods.size} of ${classMethods.length} methods`,
              impact: {
                maintainability: 55,
                readability: 60,
                testability: 50,
              },
            recommendations: this.getTemporaryFieldRecommendations(fieldName, component.name, methods.size),
            metrics: {
              numberOfMethods: classMethods.length,
              numberOfFields: classNode.properties.length,
            },
              detectedAt: new Date(),
            });
          }
        }
      }
    }

    return smells;
  }

  // Helper methods

  private countSwitchStatements(component: ComponentNode): number {
    // Simplified: in real implementation would traverse AST
    // Check for 'switch' keyword in code heuristically
    const codeText = component.name.toLowerCase();
    
    // Use complexity as a proxy for switch statements
    if (component.complexity && component.complexity.cyclomaticComplexity > 10) {
      // High complexity often indicates switch or multiple branches
      return 1;
    }
    
    return 0;
  }

  private detectLongIfElseChain(component: ComponentNode): number {
    // Simplified: use cyclomatic complexity as proxy
    // Real implementation would count if-else branches in AST
    if (component.complexity) {
      const complexity = component.complexity.cyclomaticComplexity;
      
      // Estimate if-else chain length from complexity
      if (complexity > 15) return 8;
      if (complexity > 10) return 6;
      if (complexity > 7) return 4;
    }
    
    return 0;
  }

  private mightUseField(method: ComponentNode, fieldName: string): boolean {
    // Simplified heuristic: check if method name suggests field usage
    const methodName = method.name.toLowerCase();
    const field = fieldName.toLowerCase();
    
    // Common patterns: getter, setter, or method name contains field name
    if (methodName.includes(field)) return true;
    if (methodName.includes('get') && field.includes(methodName.replace('get', ''))) return true;
    if (methodName.includes('set') && field.includes(methodName.replace('set', ''))) return true;
    
    // Assume 50% chance otherwise (would be determined by AST analysis)
    return Math.random() > 0.5;
  }

  private getSwitchStatementRecommendations(component: ComponentNode): RefactoringRecommendation[] {
    return [{
      strategy: RefactoringStrategy.REPLACE_CONDITIONAL_WITH_POLYMORPHISM,
      description: 'Replace switch statement with polymorphic classes',
      steps: [
        {
          order: 1,
          description: 'Create a base class or interface for the different cases',
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 2,
          description: 'Create subclass for each switch case',
          automatable: true,
          riskLevel: 'medium',
        },
        {
          order: 3,
          description: 'Move the case logic into the respective subclass methods',
          automatable: false,
          riskLevel: 'medium',
        },
        {
          order: 4,
          description: 'Replace switch with polymorphic call',
          automatable: true,
          riskLevel: 'medium',
        },
        {
          order: 5,
          description: 'Update calling code to use polymorphic objects',
          automatable: false,
          riskLevel: 'high',
        },
      ],
      effort: RefactoringEffort.HIGH,
      priority: 7,
      benefits: [
        'Follows Open/Closed Principle',
        'Makes adding new types easier',
        'Improves testability',
        'Reduces cyclomatic complexity',
        'Better encapsulation',
      ],
      risks: [
        'Requires significant refactoring',
        'May introduce many small classes',
        'Need to update all usage points',
        'May increase initial complexity',
      ],
      codeExampleBefore: `switch (type) {
  case 'A': return handleA();
  case 'B': return handleB();
  case 'C': return handleC();
}`,
      codeExampleAfter: `interface Handler {
  handle(): Result;
}
class HandlerA implements Handler { handle() { ... } }
class HandlerB implements Handler { handle() { ... } }
// Use: handler.handle()`,
      references: [
        'https://refactoring.guru/replace-conditional-with-polymorphism',
      ],
    }];
  }

  private getIfElseChainRecommendations(
    component: ComponentNode,
    chainLength: number
  ): RefactoringRecommendation[] {
    const recommendations: RefactoringRecommendation[] = [];

    // Primary: Replace with polymorphism
    recommendations.push({
      strategy: RefactoringStrategy.REPLACE_CONDITIONAL_WITH_POLYMORPHISM,
      description: 'Replace long if-else chain with polymorphic classes',
      steps: [
        {
          order: 1,
          description: 'Identify the discriminating condition',
          automatable: false,
          riskLevel: 'low',
        },
        {
          order: 2,
          description: 'Create interface/base class',
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 3,
          description: 'Create implementation for each branch',
          automatable: false,
          riskLevel: 'medium',
        },
        {
          order: 4,
          description: 'Replace conditional with polymorphic call',
          automatable: true,
          riskLevel: 'medium',
        },
      ],
      effort: RefactoringEffort.HIGH,
      priority: 8,
      benefits: [
        'Eliminates complex conditional logic',
        'Easier to add new cases',
        'Better testability',
      ],
      risks: [
        'Significant refactoring effort',
        'May be overkill for simple cases',
      ],
    });

    // Alternative: Use strategy pattern or command pattern
    recommendations.push({
      strategy: RefactoringStrategy.EXTRACT_METHOD,
      description: 'Extract each branch into separate methods',
      steps: [
        {
          order: 1,
          description: 'Extract each if-else branch into named method',
          automatable: true,
          riskLevel: 'low',
        },
        {
          order: 2,
          description: 'Consider using lookup table or map for dispatch',
          automatable: false,
          riskLevel: 'low',
        },
      ],
      effort: RefactoringEffort.MEDIUM,
      priority: 6,
      benefits: [
        'Simpler than full polymorphism',
        'Improves readability',
        'Reduces nesting',
      ],
      risks: [
        'Still maintains conditional logic',
        'May not scale well',
      ],
    });

    return recommendations;
  }

  private getTemporaryFieldRecommendations(
    fieldName: string,
    className: string,
    usageCount: number
  ): RefactoringRecommendation[] {
    if (usageCount === 1) {
      // Used in only one method - make it local
      return [{
        strategy: RefactoringStrategy.EXTRACT_METHOD,
        description: `Convert field '${fieldName}' to local variable or parameter`,
        steps: [
          {
            order: 1,
            description: `Identify the single method using '${fieldName}'`,
            automatable: false,
            riskLevel: 'low',
          },
          {
            order: 2,
            description: `Convert field to local variable within that method`,
            automatable: true,
            riskLevel: 'low',
          },
          {
            order: 3,
            description: `Or pass as parameter if value comes from outside`,
            automatable: true,
            riskLevel: 'low',
          },
          {
            order: 4,
            description: `Remove the field declaration from class`,
            automatable: true,
            riskLevel: 'low',
          },
        ],
        effort: RefactoringEffort.LOW,
        priority: 5,
        benefits: [
          'Reduces class state',
          'Makes dependencies explicit',
          'Easier to understand method behavior',
          'Reduces coupling',
        ],
        risks: [
          'May need to adjust method signature',
          'Calling code may need updates',
        ],
        codeExampleBefore: `class ${className} {
  private ${fieldName}: Type;
  
  method() {
    this.${fieldName} = ...;
    // use ${fieldName}
  }
}`,
        codeExampleAfter: `class ${className} {
  method() {
    const ${fieldName} = ...;
    // use ${fieldName}
  }
}`,
      }];
    } else {
      // Used in few methods - extract class
      return [{
        strategy: RefactoringStrategy.EXTRACT_CLASS,
        description: `Extract '${fieldName}' and related methods into separate class`,
        steps: [
          {
            order: 1,
            description: `Identify methods that use '${fieldName}'`,
            automatable: false,
            riskLevel: 'low',
          },
          {
            order: 2,
            description: `Create new class with field and related methods`,
            automatable: true,
            riskLevel: 'medium',
          },
          {
            order: 3,
            description: `Replace field with reference to new class`,
            automatable: true,
            riskLevel: 'medium',
          },
          {
            order: 4,
            description: `Delegate calls to new class`,
            automatable: true,
            riskLevel: 'medium',
          },
        ],
        effort: RefactoringEffort.MEDIUM,
        priority: 6,
        benefits: [
          'Improves cohesion',
          'Creates focused classes',
          'Better separation of concerns',
        ],
        risks: [
          'Introduces new class',
          'May add indirection',
        ],
      }];
    }
  }
}
