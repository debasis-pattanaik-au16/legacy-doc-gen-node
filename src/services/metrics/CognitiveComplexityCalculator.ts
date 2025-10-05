/**
 * Cognitive Complexity Calculator
 * 
 * Implements SonarSource's Cognitive Complexity metric for measuring
 * code understandability. Unlike cyclomatic complexity, it considers
 * nesting and sequences of logical operators.
 * 
 * References:
 * - G. Ann Campbell (2018). Cognitive Complexity - A new way of measuring understandability
 * - SonarSource White Paper
 * 
 * Rules:
 * 1. +1 for each: if, else if, switch, for, while, do-while, catch, ternary
 * 2. +1 for each level of nesting
 * 3. +1 for recursion
 * 4. +1 for each && and || after the first in a condition
 * 5. No increment for else without if, finally
 * 
 * @module services/metrics/CognitiveComplexityCalculator
 */

import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { logger } from '@/utils/logger';
import { ComponentNode } from '@/types/ast';

/**
 * Cognitive Complexity Calculator
 */
export class CognitiveComplexityCalculator {
  private complexity = 0;
  private nestingLevel = 0;
  private currentFunctionName: string | null = null;
  private functionCalls = new Set<string>();

  /**
   * Calculate cognitive complexity for a component
   * @param ast Babel AST (can be the full AST or a subtree)
   * @param componentName Optional component name for recursion detection
   * @returns Cognitive complexity score
   */
  public calculate(ast: any, componentName?: string): number {
    // Reset state
    this.complexity = 0;
    this.nestingLevel = 0;
    this.currentFunctionName = componentName || null;
    this.functionCalls = new Set();

    try {
      traverse(ast, {
        enter: (path) => {
          this.processNode(path);
        }
      });

      // Check for recursion
      if (this.currentFunctionName && this.functionCalls.has(this.currentFunctionName)) {
        this.complexity += 1;
      }

      return this.complexity;
    } catch (error: any) {
      logger.error(`Error calculating cognitive complexity: ${error.message}`);
      return 0;
    }
  }

  /**
   * Process a single AST node
   */
  private processNode(path: any): void {
    const node = path.node;

    // Track function calls for recursion detection
    if (t.isCallExpression(node) && t.isIdentifier(node.callee)) {
      this.functionCalls.add(node.callee.name);
    }

    // Control flow structures - increment by 1 + nesting level
    if (this.isControlFlowNode(node)) {
      this.complexity += 1 + this.nestingLevel;
      
      // Increase nesting for the body
      if (this.hasBody(node)) {
        this.nestingLevel++;
        
        // Process children manually to control nesting
        this.traverseBody(path);
        
        this.nestingLevel--;
        
        // Skip default traversal
        path.skip();
      }
    }
    // else if specifically - increment but don't double-count
    else if (this.isElseIf(node, path.parent)) {
      // Already counted in the if statement
      // Just ensure nesting is correct
    }
    // Logical operators - count additional && and ||
    else if (t.isLogicalExpression(node)) {
      const logicalComplexity = this.countLogicalComplexity(node);
      this.complexity += logicalComplexity;
    }
    // Switch cases don't increment (only switch statement does)
    else if (t.isSwitchCase(node)) {
      // Don't increment - switch statement already counted
    }
    // Ternary operator
    else if (t.isConditionalExpression(node)) {
      this.complexity += 1 + this.nestingLevel;
    }
    // catch blocks
    else if (t.isCatchClause(node)) {
      this.complexity += 1 + this.nestingLevel;
      this.nestingLevel++;
      // Will be decremented by traversal
    }
  }

  /**
   * Check if node is a control flow structure
   */
  private isControlFlowNode(node: t.Node): boolean {
    return (
      t.isIfStatement(node) ||
      t.isForStatement(node) ||
      t.isForInStatement(node) ||
      t.isForOfStatement(node) ||
      t.isWhileStatement(node) ||
      t.isDoWhileStatement(node) ||
      t.isSwitchStatement(node)
    );
  }

  /**
   * Check if node is an else-if
   */
  private isElseIf(node: t.Node, parent: t.Node | null): boolean {
    if (!parent || !t.isIfStatement(node) || !t.isIfStatement(parent)) {
      return false;
    }
    return (parent as any).alternate === node;
  }

  /**
   * Check if node has a body that increases nesting
   */
  private hasBody(node: t.Node): boolean {
    return (
      (t.isIfStatement(node) && !!node.consequent) ||
      (t.isForStatement(node) && !!node.body) ||
      (t.isForInStatement(node) && !!node.body) ||
      (t.isForOfStatement(node) && !!node.body) ||
      (t.isWhileStatement(node) && !!node.body) ||
      (t.isDoWhileStatement(node) && !!node.body) ||
      (t.isSwitchStatement(node) && !!node.cases && node.cases.length > 0)
    );
  }

  /**
   * Traverse body with current nesting level
   */
  private traverseBody(path: any): void {
    const node = path.node;

    if (t.isIfStatement(node)) {
      // Traverse consequent
      if (node.consequent) {
        path.traverse({
          enter: (childPath: any) => this.processNode(childPath)
        }, path.scope, path.state);
      }

      // Handle alternate (else/else if)
      if (node.alternate) {
        // else if doesn't increase nesting
        if (t.isIfStatement(node.alternate)) {
          this.processNode({ node: node.alternate, parent: node });
        } else {
          // Regular else block increases nesting
          this.nestingLevel++;
          path.traverse({
            enter: (childPath: any) => this.processNode(childPath)
          }, path.scope, path.state);
          this.nestingLevel--;
        }
      }
    } else if (t.isSwitchStatement(node)) {
      // Switch cases don't individually increase nesting
      node.cases.forEach((caseNode: any) => {
        caseNode.consequent.forEach((stmt: any) => {
          traverse(stmt, {
            enter: (childPath) => this.processNode(childPath)
          });
        });
      });
    } else {
      // Default body traversal
      const body = (node as any).body;
      if (body) {
        if (Array.isArray(body)) {
          body.forEach((stmt: any) => {
            traverse(stmt, {
              enter: (childPath) => this.processNode(childPath)
            });
          });
        } else {
          traverse(body, {
            enter: (childPath) => this.processNode(childPath)
          });
        }
      }
    }
  }

  /**
   * Count logical operators beyond the first
   * Rule: +1 for each && or || after the first in a sequence
   */
  private countLogicalComplexity(node: t.LogicalExpression): number {
    let count = 0;
    const operator = node.operator;
    
    // Count sequences of the same operator
    const countSequence = (expr: t.Node, op: string, isFirst: boolean): number => {
      if (!t.isLogicalExpression(expr) || expr.operator !== op) {
        return 0;
      }
      
      let total = isFirst ? 0 : 1; // Don't count the first one
      total += countSequence(expr.left, op, false);
      total += countSequence(expr.right, op, false);
      return total;
    };

    count += countSequence(node, operator, true);
    
    return count;
  }

  /**
   * Calculate cognitive complexity for a component node
   * This is a convenience method that extracts the component's AST
   */
  public calculateForComponent(component: ComponentNode, fullAst: any): number {
    // Find the component in the full AST
    let componentAst: any = null;
    const componentName = component.name;

    traverse(fullAst, {
      FunctionDeclaration: (path) => {
        if (path.node.id?.name === componentName) {
          componentAst = path.node;
          path.stop();
        }
      },
      FunctionExpression: (path) => {
        // Check if this is assigned to a variable with the component name
        const parent = path.parent;
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          if (parent.id.name === componentName) {
            componentAst = path.node;
            path.stop();
          }
        }
      },
      ClassMethod: (path) => {
        if (t.isIdentifier(path.node.key) && path.node.key.name === componentName) {
          componentAst = path.node;
          path.stop();
        }
      },
      ArrowFunctionExpression: (path) => {
        // Check if assigned to variable with component name
        const parent = path.parent;
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          if (parent.id.name === componentName) {
            componentAst = path.node;
            path.stop();
          }
        }
      }
    });

    if (componentAst) {
      return this.calculate(componentAst, componentName);
    }

    logger.warn(`Could not find component ${componentName} in AST`);
    return 0;
  }
}

/**
 * Factory function to create a cognitive complexity calculator
 */
export function createCognitiveComplexityCalculator(): CognitiveComplexityCalculator {
  return new CognitiveComplexityCalculator();
}

/**
 * Convenience function to calculate cognitive complexity
 */
export function calculateCognitiveComplexity(ast: any, componentName?: string): number {
  const calculator = new CognitiveComplexityCalculator();
  return calculator.calculate(ast, componentName);
}
