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
   * @param ast Babel AST (must be a Program/File node or full AST)
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
      // Check if this is a Program or File node (can traverse directly)
      if (t.isProgram(ast) || t.isFile(ast)) {
        traverse(ast, {
          enter: (path) => {
            this.processNode(path);
          }
        });
      } else {
        // For other nodes, wrap in a file structure to enable traversal
        const wrappedAst = t.file(
          t.program([t.expressionStatement(ast)]),
          [],
          []
        );
        traverse(wrappedAst, {
          enter: (path) => {
            this.processNode(path);
          }
        });
      }

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
      // Cognitive complexity rule: +1 for structure, +nesting for nested structures
      // BUT: nesting penalty is only +1 per level (not multiplicative)
      this.complexity += 1;
      if (this.nestingLevel > 0) {
        this.complexity += this.nestingLevel; // Add nesting penalty once
      }
      
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
      this.complexity += 1;
      if (this.nestingLevel > 0) {
        this.complexity += this.nestingLevel;
      }
    }
    // catch blocks
    else if (t.isCatchClause(node)) {
      this.complexity += 1;
      if (this.nestingLevel > 0) {
        this.complexity += this.nestingLevel;
      }
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
   * This method is only called during the initial full-AST traversal
   */
  private traverseBody(path: any): void {
    const node = path.node;

    if (t.isIfStatement(node)) {
      // Traverse consequent
      if (node.consequent) {
        path.traverse({
          enter: (childPath: any) => this.processNode(childPath)
        });
      }

      // Handle alternate (else/else if)
      if (node.alternate) {
        // else if doesn't increase nesting
        if (t.isIfStatement(node.alternate)) {
          // Create a pseudo-path for the else-if
          this.processNode({ node: node.alternate, parent: node, skip: () => {}, traverse: () => {} });
        } else {
          // Regular else block increases nesting
          this.nestingLevel++;
          path.traverse({
            enter: (childPath: any) => this.processNode(childPath)
          });
          this.nestingLevel--;
        }
      }
    } else {
      // For all other cases, just continue the traversal
      // path.traverse will handle nested structures properly
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
   * This method traverses the full AST and calculates complexity for the specified component
   */
  public calculateForComponent(component: ComponentNode, fullAst: any): number {
    // Reset state
    this.complexity = 0;
    this.nestingLevel = 0;
    this.currentFunctionName = component.name;
    this.functionCalls = new Set();

    const componentName = component.name;
    
    // Handle anonymous/unnamed components
    if (!componentName) {
      logger.debug('Skipping cognitive complexity for unnamed component');
      return 0;
    }
    
    let insideComponent = false;
    let componentDepth = 0;

    try {
      traverse(fullAst, {
        enter: (path) => {
          // Check if we're entering the target component
          if (!insideComponent) {
            // Function Declarations
            if (t.isFunctionDeclaration(path.node) && path.node.id?.name === componentName) {
              insideComponent = true;
              componentDepth = 1;
              // Don't process the function declaration itself
              return;
            }
            
            // Function Expressions assigned to variables
            if (t.isVariableDeclarator(path.node) &&
                t.isIdentifier(path.node.id) &&
                path.node.id.name === componentName &&
                (t.isFunctionExpression(path.node.init) || t.isArrowFunctionExpression(path.node.init))) {
              insideComponent = true;
              componentDepth = 1;
              return;
            }
            
            // Class Methods
            if (t.isClassMethod(path.node) &&
                t.isIdentifier(path.node.key) &&
                path.node.key.name === componentName) {
              insideComponent = true;
              componentDepth = 1;
              return;
            }
          } else {
            // We're inside the target component
            componentDepth++;
            this.processNode(path);
          }
        },
        exit: (path) => {
          // Track when we exit the component
          if (insideComponent) {
            componentDepth--;
            if (componentDepth === 0) {
              // Exited the component
              path.stop();
            }
          }
        }
      });

      // Check for recursion
      if (this.currentFunctionName && this.functionCalls.has(this.currentFunctionName)) {
        this.complexity += 1;
      }

      if (!insideComponent) {
        logger.debug(`Could not find component '${componentName}' in AST (may be nested or scoped differently)`);
      }

      return this.complexity;
    } catch (error: any) {
      logger.error(`Error calculating cognitive complexity for '${componentName}': ${error.message}`);
      return 0;
    }
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
