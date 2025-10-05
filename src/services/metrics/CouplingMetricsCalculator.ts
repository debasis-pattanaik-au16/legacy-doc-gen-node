/**
 * Coupling Metrics Calculator
 * 
 * Implements coupling and cohesion metrics for measuring code modularity
 * and maintainability. Based on Robert C. Martin's stability metrics.
 * 
 * Metrics:
 * - Ca (Afferent Coupling): Number of classes that depend on this class
 * - Ce (Efferent Coupling): Number of classes this class depends on
 * - I (Instability): Ce / (Ca + Ce) - Range [0,1], 0=stable, 1=unstable
 * - A (Abstractness): Abstract classes / Total classes
 * - D (Distance): |A + I - 1| - Distance from ideal balance
 * 
 * References:
 * - Martin, R. C. (1994). OO Design Quality Metrics
 * - Martin, R. C. (2000). Design Principles and Design Patterns
 * 
 * @module services/metrics/CouplingMetricsCalculator
 */

import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { logger } from '@/utils/logger';
import { UnifiedAST, ComponentNode, ClassNode, FunctionNode, PropertyNode } from '@/types/ast';

/**
 * Coupling metrics for a module/class
 */
export interface CouplingMetrics {
  // Basic coupling measures
  afferentCoupling: number;        // Ca - incoming dependencies
  efferentCoupling: number;        // Ce - outgoing dependencies
  
  // Derived metrics
  instability: number;             // I = Ce / (Ca + Ce)
  abstractness: number;            // A = abstract classes / total classes
  distance: number;                // D = |A + I - 1|
  
  // Additional details
  incomingDependencies: string[];  // List of classes that depend on this
  outgoingDependencies: string[];  // List of classes this depends on
  isAbstract: boolean;             // Whether this is an abstract class
  
  // Metrics by Robert Martin
  couplingBetweenObjects: number;  // CBO - total unique couplings
}

/**
 * LCOM (Lack of Cohesion of Methods) metrics
 */
export interface CohesionMetrics {
  lcom: number;                    // LCOM1 - (P-Q) where P>Q, else 0
  lcom4: number;                   // LCOM4 - number of connected components
  cohesionRatio: number;           // Ratio of connected to total method pairs
  methodCount: number;             // Total methods
  sharedVariableCount: number;     // Variables shared by multiple methods
}

/**
 * Coupling Metrics Calculator
 */
export class CouplingMetricsCalculator {
  private dependencyMap = new Map<string, Set<string>>();
  private classNames = new Set<string>();
  private abstractClasses = new Set<string>();

  /**
   * Calculate coupling metrics for all classes in an AST
   */
  public calculateForAST(ast: UnifiedAST): Map<string, CouplingMetrics> {
    // Reset state
    this.dependencyMap = new Map();
    this.classNames = new Set();
    this.abstractClasses = new Set();

    // Collect all classes and their dependencies
    ast.components.forEach(component => {
      if (component.type === 'class') {
        const className = component.name;
        this.classNames.add(className);

        if ((component as ClassNode).isAbstract) {
          this.abstractClasses.add(className);
        }

        // Collect dependencies
        const dependencies = this.extractDependencies(component);
        this.dependencyMap.set(className, dependencies);
      }
    });

    // Calculate metrics for each class
    const metricsMap = new Map<string, CouplingMetrics>();
    this.classNames.forEach(className => {
      metricsMap.set(className, this.calculateForClass(className));
    });

    return metricsMap;
  }

  /**
   * Calculate coupling for a module given its dependencies
   * 
   * @param moduleName Module identifier
   * @param dependencyMap Map of module names to their dependencies
   */
  public calculateCoupling(moduleName: string, dependencyMap: Map<string, string[]>): CouplingMetrics {
    const outgoing = new Set(dependencyMap.get(moduleName) || []);
    const incoming = new Set<string>();
    
    // Find incoming dependencies
    dependencyMap.forEach((deps, sourceModule) => {
      if (deps.includes(moduleName)) {
        incoming.add(sourceModule);
      }
    });
    
    const ce = outgoing.size;  // Efferent coupling
    const ca = incoming.size;  // Afferent coupling
    const total = ca + ce;
    
    // Calculate instability (0 = stable, 1 = unstable)
    const instability = total === 0 ? 0 : ce / total;
    
    // CBO - Coupling Between Objects (total unique couplings)
    const cbo = new Set([...incoming, ...outgoing]).size;
    
    return {
      afferentCoupling: ca,
      efferentCoupling: ce,
      instability,
      abstractness: 0, // Not applicable for module-level analysis
      distance: instability, // Simplified distance calculation
      incomingDependencies: Array.from(incoming),
      outgoingDependencies: Array.from(outgoing),
      isAbstract: false, // Not applicable for module-level analysis
      couplingBetweenObjects: cbo,
    };
  }
  
  /**
   * Calculate coupling metrics for a single class
   */
  public calculateForClass(className: string): CouplingMetrics {
    const outgoing = this.dependencyMap.get(className) || new Set();
    const incoming = this.getIncomingDependencies(className);

    const ce = outgoing.size;  // Efferent coupling
    const ca = incoming.size;  // Afferent coupling
    const total = ca + ce;

    // Calculate instability (0 = stable, 1 = unstable)
    const instability = total === 0 ? 0 : ce / total;

    // Calculate abstractness for this module
    const isAbstract = this.abstractClasses.has(className);
    const abstractness = isAbstract ? 1 : 0;

    // Calculate distance from main sequence
    const distance = Math.abs(abstractness + instability - 1);

    // CBO - Coupling Between Objects (total unique couplings)
    const cbo = new Set([...incoming, ...outgoing]).size;

    return {
      afferentCoupling: ca,
      efferentCoupling: ce,
      instability,
      abstractness,
      distance,
      incomingDependencies: Array.from(incoming),
      outgoingDependencies: Array.from(outgoing),
      isAbstract,
      couplingBetweenObjects: cbo,
    };
  }

  /**
   * Extract dependencies from a component
   */
  private extractDependencies(component: ComponentNode): Set<string> {
    const dependencies = new Set<string>();

    // Add base class dependencies
    if (component.type === 'class') {
      const classNode = component as ClassNode;
      
      if (classNode.superClass) {
        dependencies.add(classNode.superClass);
      }

      classNode.interfaces?.forEach(iface => {
        dependencies.add(iface);
      });
    }

    // Note: ComponentNode doesn't have a dependencies array in the type definition
    // Dependencies would need to be extracted from actual code analysis

    return dependencies;
  }

  /**
   * Get incoming dependencies (classes that depend on this class)
   */
  private getIncomingDependencies(className: string): Set<string> {
    const incoming = new Set<string>();

    this.dependencyMap.forEach((deps, sourceClass) => {
      if (deps.has(className)) {
        incoming.add(sourceClass);
      }
    });

    return incoming;
  }

  /**
   * Calculate cohesion metrics for a class
   */
  public calculateCohesion(classNode: ClassNode): CohesionMetrics {
    const methods = classNode.methods || [];
    const properties = classNode.properties || [];

    if (methods.length === 0) {
      return {
        lcom: 0,
        lcom4: 0,
        cohesionRatio: 1,
        methodCount: 0,
        sharedVariableCount: 0,
      };
    }

    // Build method-variable usage matrix
    const methodVariableUsage = this.buildMethodVariableMatrix(classNode);
    
    // Calculate LCOM (Lack of Cohesion of Methods)
    const lcom = this.calculateLCOM(methodVariableUsage);
    
    // Calculate LCOM4 (connected components)
    const lcom4 = this.calculateLCOM4(methodVariableUsage);
    
    // Calculate cohesion ratio
    const { sharingPairs, totalPairs } = this.calculateSharingPairs(methodVariableUsage);
    const cohesionRatio = totalPairs === 0 ? 1 : sharingPairs / totalPairs;
    
    // Count shared variables
    const sharedVariableCount = this.countSharedVariables(methodVariableUsage);

    return {
      lcom,
      lcom4,
      cohesionRatio,
      methodCount: methods.length,
      sharedVariableCount,
    };
  }

  /**
   * Build method-variable usage matrix
   */
  private buildMethodVariableMatrix(classNode: ClassNode): Map<string, Set<string>> {
    const matrix = new Map<string, Set<string>>();
    const properties = new Set(classNode.properties?.map(p => p.name) || []);

    classNode.methods?.forEach(method => {
      const usedVars = new Set<string>();
      
      // In a real implementation, we would parse the method body to find variable usage
      // For now, we use a simplified approach based on method parameters
      // This is a placeholder that should be enhanced with actual code analysis
      
      matrix.set(method.name, usedVars);
    });

    return matrix;
  }

  /**
   * Calculate LCOM (Henderson-Sellers version)
   * LCOM = (P - Q) where:
   * P = pairs of methods that don't share variables
   * Q = pairs of methods that share variables
   * Result: max(0, P - Q)
   */
  private calculateLCOM(matrix: Map<string, Set<string>>): number {
    const methods = Array.from(matrix.keys());
    let P = 0; // Pairs without shared variables
    let Q = 0; // Pairs with shared variables

    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        const vars1 = matrix.get(methods[i]) || new Set();
        const vars2 = matrix.get(methods[j]) || new Set();

        if (this.shareVariables(vars1, vars2)) {
          Q++;
        } else {
          P++;
        }
      }
    }

    return Math.max(0, P - Q);
  }

  /**
   * Calculate LCOM4 (number of connected components)
   * Methods are connected if they share instance variables
   */
  private calculateLCOM4(matrix: Map<string, Set<string>>): number {
    const methods = Array.from(matrix.keys());
    const visited = new Set<string>();
    let components = 0;

    const dfs = (method: string) => {
      if (visited.has(method)) return;
      visited.add(method);

      const vars = matrix.get(method) || new Set();
      
      // Visit all methods that share variables with this method
      methods.forEach(otherMethod => {
        if (!visited.has(otherMethod)) {
          const otherVars = matrix.get(otherMethod) || new Set();
          if (this.shareVariables(vars, otherVars)) {
            dfs(otherMethod);
          }
        }
      });
    };

    methods.forEach(method => {
      if (!visited.has(method)) {
        components++;
        dfs(method);
      }
    });

    return components;
  }

  /**
   * Check if two sets of variables share any elements
   */
  private shareVariables(vars1: Set<string>, vars2: Set<string>): boolean {
    for (const v of vars1) {
      if (vars2.has(v)) return true;
    }
    return false;
  }

  /**
   * Calculate sharing pairs for cohesion ratio
   */
  private calculateSharingPairs(matrix: Map<string, Set<string>>): { sharingPairs: number; totalPairs: number } {
    const methods = Array.from(matrix.keys());
    let sharingPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < methods.length; i++) {
      for (let j = i + 1; j < methods.length; j++) {
        totalPairs++;
        const vars1 = matrix.get(methods[i]) || new Set();
        const vars2 = matrix.get(methods[j]) || new Set();

        if (this.shareVariables(vars1, vars2)) {
          sharingPairs++;
        }
      }
    }

    return { sharingPairs, totalPairs };
  }

  /**
   * Count variables shared by multiple methods
   */
  private countSharedVariables(matrix: Map<string, Set<string>>): number {
    const variableUsage = new Map<string, number>();

    matrix.forEach(vars => {
      vars.forEach(v => {
        variableUsage.set(v, (variableUsage.get(v) || 0) + 1);
      });
    });

    let sharedCount = 0;
    variableUsage.forEach(count => {
      if (count > 1) sharedCount++;
    });

    return sharedCount;
  }
}

/**
 * Factory function
 */
export function createCouplingMetricsCalculator(): CouplingMetricsCalculator {
  return new CouplingMetricsCalculator();
}
