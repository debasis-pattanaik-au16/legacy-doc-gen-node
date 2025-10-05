/**
 * Halstead Complexity Metrics Calculator
 * 
 * Implements Maurice Halstead's software metrics for measuring program complexity.
 * Based on the frequency of operators and operands in the source code.
 * 
 * References:
 * - Halstead, M. H. (1977). Elements of Software Science
 * - IEEE Standard 1061-1998 for Software Quality Metrics
 * 
 * @module services/metrics/HalsteadCalculator
 */

import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { logger } from '@/utils/logger';

/**
 * Halstead metrics interface
 */
export interface HalsteadMetrics {
  // Basic measures
  n1: number;                      // Number of unique operators
  n2: number;                      // Number of unique operands
  N1: number;                      // Total number of operators
  N2: number;                      // Total number of operands
  
  // Derived measures
  vocabulary: number;              // n = n1 + n2
  length: number;                  // N = N1 + N2
  calculatedLength: number;        // N̂ = n1 * log2(n1) + n2 * log2(n2)
  volume: number;                  // V = N * log2(n)
  difficulty: number;              // D = (n1/2) * (N2/n2)
  effort: number;                  // E = D * V
  timeRequiredToProgram: number;   // T = E / 18 seconds
  numberOfDeliveredBugs: number;   // B = V / 3000
  
  // Additional metadata
  operators: string[];             // List of unique operators
  operands: string[];              // List of unique operands
}

/**
 * Halstead Calculator
 * Analyzes Babel AST to calculate Halstead complexity metrics
 */
export class HalsteadCalculator {
  // Operators (as per Halstead's original definition)
  private operators: Set<string> = new Set();
  private operands: Set<string> = new Set();
  private operatorCount = 0;
  private operandCount = 0;

  /**
   * Calculate Halstead metrics for a given AST
   * @param ast Babel AST
   * @returns HalsteadMetrics object
   */
  public calculate(ast: any): HalsteadMetrics {
    // Reset state
    this.operators = new Set();
    this.operands = new Set();
    this.operatorCount = 0;
    this.operandCount = 0;

    try {
      // Traverse AST and collect operators/operands
      traverse(ast, {
        enter: (path) => {
          this.processNode(path.node);
        }
      });

      // Calculate metrics
      return this.calculateMetrics();
    } catch (error: any) {
      logger.error(`Error calculating Halstead metrics: ${error.message}`);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Process a single AST node
   */
  private processNode(node: t.Node): void {
    // Operators
    if (t.isBinaryExpression(node)) {
      this.addOperator(node.operator);
    } else if (t.isUnaryExpression(node)) {
      this.addOperator(node.operator);
    } else if (t.isUpdateExpression(node)) {
      this.addOperator(node.operator);
    } else if (t.isLogicalExpression(node)) {
      this.addOperator(node.operator);
    } else if (t.isAssignmentExpression(node)) {
      this.addOperator(node.operator);
    } else if (t.isMemberExpression(node)) {
      this.addOperator('.');
    } else if (t.isCallExpression(node)) {
      this.addOperator('()');
    } else if (t.isNewExpression(node)) {
      this.addOperator('new');
    } else if (t.isArrayExpression(node)) {
      this.addOperator('[]');
    } else if (t.isObjectExpression(node)) {
      this.addOperator('{}');
    } else if (t.isConditionalExpression(node)) {
      this.addOperator('?:');
    } else if (t.isSequenceExpression(node)) {
      this.addOperator(',');
    }
    
    // Control flow operators
    else if (t.isIfStatement(node)) {
      this.addOperator('if');
    } else if (t.isForStatement(node)) {
      this.addOperator('for');
    } else if (t.isWhileStatement(node)) {
      this.addOperator('while');
    } else if (t.isDoWhileStatement(node)) {
      this.addOperator('do-while');
    } else if (t.isSwitchStatement(node)) {
      this.addOperator('switch');
    } else if (t.isSwitchCase(node)) {
      this.addOperator('case');
    } else if (t.isBreakStatement(node)) {
      this.addOperator('break');
    } else if (t.isContinueStatement(node)) {
      this.addOperator('continue');
    } else if (t.isReturnStatement(node)) {
      this.addOperator('return');
    } else if (t.isThrowStatement(node)) {
      this.addOperator('throw');
    } else if (t.isTryStatement(node)) {
      this.addOperator('try');
    } else if (t.isCatchClause(node)) {
      this.addOperator('catch');
    }
    
    // Function/Class operators
    else if (t.isFunctionDeclaration(node) || t.isFunctionExpression(node)) {
      this.addOperator('function');
    } else if (t.isArrowFunctionExpression(node)) {
      this.addOperator('=>');
    } else if (t.isClassDeclaration(node) || t.isClassExpression(node)) {
      this.addOperator('class');
    } else if (t.isClassMethod(node)) {
      this.addOperator('method');
    }
    
    // Import/Export operators
    else if (t.isImportDeclaration(node)) {
      this.addOperator('import');
    } else if (t.isExportNamedDeclaration(node) || t.isExportDefaultDeclaration(node)) {
      this.addOperator('export');
    }

    // Operands
    if (t.isIdentifier(node)) {
      // Exclude keywords and built-ins
      if (!this.isKeyword(node.name)) {
        this.addOperand(node.name);
      }
    } else if (t.isStringLiteral(node)) {
      this.addOperand(node.value);
    } else if (t.isNumericLiteral(node)) {
      this.addOperand(String(node.value));
    } else if (t.isBooleanLiteral(node)) {
      this.addOperand(String(node.value));
    } else if (t.isNullLiteral(node)) {
      this.addOperand('null');
    } else if (t.isRegExpLiteral(node)) {
      this.addOperand(node.pattern);
    } else if (t.isTemplateLiteral(node)) {
      node.quasis.forEach(quasi => {
        if (quasi.value.raw) {
          this.addOperand(quasi.value.raw);
        }
      });
    }
  }

  /**
   * Add an operator to the set and increment count
   */
  private addOperator(operator: string): void {
    this.operators.add(operator);
    this.operatorCount++;
  }

  /**
   * Add an operand to the set and increment count
   */
  private addOperand(operand: string): void {
    this.operands.add(operand);
    this.operandCount++;
  }

  /**
   * Check if a name is a JavaScript keyword
   */
  private isKeyword(name: string): boolean {
    const keywords = new Set([
      'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
      'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
      'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
      'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with', 'yield', 'async', 'await', 'of',
      'true', 'false', 'null', 'undefined'
    ]);
    return keywords.has(name);
  }

  /**
   * Calculate all Halstead metrics
   */
  private calculateMetrics(): HalsteadMetrics {
    const n1 = this.operators.size;      // Unique operators
    const n2 = this.operands.size;       // Unique operands
    const N1 = this.operatorCount;       // Total operators
    const N2 = this.operandCount;        // Total operands

    // Prevent division by zero
    const safeN1 = n1 || 1;
    const safeN2 = n2 || 1;
    const n = n1 + n2;
    const N = N1 + N2;
    const safeN = n || 1;

    // Calculate derived metrics
    const calculatedLength = safeN1 * Math.log2(safeN1) + safeN2 * Math.log2(safeN2);
    const volume = N * Math.log2(safeN);
    const difficulty = (safeN1 / 2) * (N2 / safeN2);
    const effort = difficulty * volume;
    const timeRequiredToProgram = effort / 18; // Halstead's constant
    const numberOfDeliveredBugs = volume / 3000; // Halstead's constant

    return {
      n1,
      n2,
      N1,
      N2,
      vocabulary: n,
      length: N,
      calculatedLength,
      volume,
      difficulty,
      effort,
      timeRequiredToProgram,
      numberOfDeliveredBugs,
      operators: Array.from(this.operators),
      operands: Array.from(this.operands),
    };
  }

  /**
   * Return empty metrics (for error cases)
   */
  private getEmptyMetrics(): HalsteadMetrics {
    return {
      n1: 0,
      n2: 0,
      N1: 0,
      N2: 0,
      vocabulary: 0,
      length: 0,
      calculatedLength: 0,
      volume: 0,
      difficulty: 0,
      effort: 0,
      timeRequiredToProgram: 0,
      numberOfDeliveredBugs: 0,
      operators: [],
      operands: [],
    };
  }
}

/**
 * Factory function to create a Halstead calculator instance
 */
export function createHalsteadCalculator(): HalsteadCalculator {
  return new HalsteadCalculator();
}
