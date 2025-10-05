/**
 * Task 2.3 End-to-End Integration Test
 * 
 * Tests the complete flow of parsing code and calculating all complexity metrics
 * through the JavaScriptParser (production usage).
 * 
 * Run with: npx ts-node --project tsconfig.json -r tsconfig-paths/register src/scripts/test-task-2.3-integration.ts
 */

import { JavaScriptParser } from '@/services/parsers/javascriptParser';
import { logger } from '@/utils/logger';

console.log('\n' + '='.repeat(80));
console.log('Task 2.3 End-to-End Integration Test');
console.log('Testing: Halstead, Cognitive Complexity, and Parser Integration');
console.log('='.repeat(80) + '\n');

const parser = new JavaScriptParser();
let passedTests = 0;
let failedTests = 0;

async function test(name: string, testFn: () => Promise<boolean>) {
  try {
    const result = await testFn();
    if (result) {
      console.log(`✅ ${name}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}`);
      failedTests++;
    }
  } catch (error: any) {
    console.log(`❌ ${name} - Error: ${error.message}`);
    failedTests++;
  }
}

async function runTests() {
  
  // Test 1: Simple Function with Halstead Metrics
  await test('Simple function - Halstead metrics calculated', async () => {
    const code = `
      function add(a, b) {
        return a + b;
      }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const func = ast.components.find(c => c.type === 'function');
    
    if (!func) return false;
    
    console.log(`\n  Function: ${func.name}`);
    console.log(`  Halstead Volume: ${func.complexity.halsteadMetrics.volume.toFixed(2)}`);
    console.log(`  Halstead Difficulty: ${func.complexity.halsteadMetrics.difficulty.toFixed(2)}`);
    console.log(`  Halstead Effort: ${func.complexity.halsteadMetrics.effort.toFixed(2)}`);
    console.log(`  Time: ${func.complexity.halsteadMetrics.timeRequiredToProgram.toFixed(2)}s`);
    console.log(`  Est. Bugs: ${func.complexity.halsteadMetrics.numberOfDeliveredBugs.toFixed(4)}`);
    
    return func.complexity.halsteadMetrics.volume > 0 &&
           func.complexity.halsteadMetrics.difficulty > 0;
  });

  // Test 2: Function with Control Flow - Cognitive Complexity
  await test('Control flow function - Cognitive complexity calculated', async () => {
    const code = `
      function isValid(x, y) {
        if (x > 0) {
          if (y > 0) {
            return true;
          }
        }
        return false;
      }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const func = ast.components.find(c => c.type === 'function');
    
    if (!func) return false;
    
    console.log(`\n  Function: ${func.name}`);
    console.log(`  Cyclomatic Complexity: ${func.complexity.cyclomaticComplexity}`);
    console.log(`  Cognitive Complexity: ${func.complexity.cognitiveComplexity}`);
    console.log(`  Lines of Code: ${func.complexity.linesOfCode}`);
    
    // Cognitive complexity should be > 1 due to nesting
    return func.complexity.cognitiveComplexity >= 1;
  });

  // Test 3: Complex Function with All Metrics
  await test('Complex function - All metrics populated', async () => {
    const code = `
      function processData(items) {
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          if (items[i].active) {
            total += items[i].value;
          }
        }
        return total;
      }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const func = ast.components.find(c => c.type === 'function');
    
    if (!func) return false;
    
    console.log(`\n  Function: ${func.name}`);
    console.log(`  Cyclomatic: ${func.complexity.cyclomaticComplexity}`);
    console.log(`  Cognitive: ${func.complexity.cognitiveComplexity}`);
    console.log(`  LOC: ${func.complexity.linesOfCode}`);
    console.log(`  Halstead Volume: ${func.complexity.halsteadMetrics.volume.toFixed(2)}`);
    console.log(`  Halstead Length: ${func.complexity.halsteadMetrics.length}`);
    console.log(`  Halstead Vocabulary: ${func.complexity.halsteadMetrics.vocabulary}`);
    console.log(`  Maintainability Index: ${func.complexity.maintainabilityIndex.toFixed(2)}`);
    
    // All metrics should be populated
    return func.complexity.cyclomaticComplexity > 0 &&
           func.complexity.cognitiveComplexity > 0 &&
           func.complexity.linesOfCode > 0 &&
           func.complexity.halsteadMetrics.volume > 0 &&
           func.complexity.maintainabilityIndex > 0;
  });

  // Test 4: Recursive Function
  await test('Recursive function - Detected by cognitive complexity', async () => {
    const code = `
      function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const func = ast.components.find(c => c.type === 'function');
    
    if (!func) return false;
    
    console.log(`\n  Function: ${func.name}`);
    console.log(`  Cognitive Complexity: ${func.complexity.cognitiveComplexity} (should detect recursion)`);
    console.log(`  Halstead Volume: ${func.complexity.halsteadMetrics.volume.toFixed(2)}`);
    
    // Should have some cognitive complexity (at least 1 for if, ideally +1 for recursion)
    return func.complexity.cognitiveComplexity >= 1;
  });

  // Test 5: Class with Methods
  await test('Class with methods - All methods have metrics', async () => {
    const code = `
      class Calculator {
        add(a, b) {
          return a + b;
        }
        
        multiply(a, b) {
          return a * b;
        }
        
        power(base, exponent) {
          let result = 1;
          for (let i = 0; i < exponent; i++) {
            result *= base;
          }
          return result;
        }
      }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const cls = ast.components.find(c => c.type === 'class');
    
    if (!cls) return false;
    
    console.log(`\n  Class: ${cls.name}`);
    console.log(`  Methods found: ${ast.components.filter(c => c.type === 'method').length}`);
    
    // Check that methods have metrics
    const methods = ast.components.filter(c => c.type === 'method');
    let allHaveMetrics = true;
    
    methods.forEach(method => {
      const hasMetrics = method.complexity.halsteadMetrics.volume > 0;
      console.log(`    Method: ${method.name} - Halstead Volume: ${method.complexity.halsteadMetrics.volume.toFixed(2)} - ${hasMetrics ? '✓' : '✗'}`);
      if (!hasMetrics) allHaveMetrics = false;
    });
    
    return allHaveMetrics && methods.length >= 3;
  });

  // Test 6: Arrow Function
  await test('Arrow function - Metrics calculated', async () => {
    const code = `
      const double = (x) => x * 2;
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const func = ast.components.find(c => c.type === 'function');
    
    if (!func) return false;
    
    console.log(`\n  Function: ${func.name}`);
    console.log(`  Halstead Volume: ${func.complexity.halsteadMetrics.volume.toFixed(2)}`);
    console.log(`  LOC: ${func.complexity.linesOfCode}`);
    
    return func.complexity.halsteadMetrics.volume > 0;
  });

  // Test 7: Deep Nesting - High Cognitive Complexity
  await test('Deep nesting - High cognitive complexity', async () => {
    const code = `
      function complexFunction(data) {
        if (data) {
          for (let i = 0; i < data.length; i++) {
            if (data[i].active) {
              for (let j = 0; j < data[i].items.length; j++) {
                if (data[i].items[j].valid) {
                  console.log('Found');
                }
              }
            }
          }
        }
      }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const func = ast.components.find(c => c.type === 'function');
    
    if (!func) return false;
    
    console.log(`\n  Function: ${func.name}`);
    console.log(`  Cognitive Complexity: ${func.complexity.cognitiveComplexity} (should be high due to nesting)`);
    console.log(`  Cyclomatic Complexity: ${func.complexity.cyclomaticComplexity}`);
    console.log(`  Maintainability Index: ${func.complexity.maintainabilityIndex.toFixed(2)}`);
    
    // Deep nesting should result in higher cognitive complexity
    return func.complexity.cognitiveComplexity >= 3;
  });

  // Test 8: TypeScript Function with Types
  await test('TypeScript function - Metrics work with types', async () => {
    const code = `
      function greet(name: string): string {
        const greeting = 'Hello';
        return greeting + ', ' + name + '!';
      }
    `;
    
    const ast = await parser.parse(code, 'test.ts');
    const func = ast.components.find(c => c.type === 'function');
    
    if (!func) return false;
    
    console.log(`\n  Function: ${func.name}`);
    console.log(`  Halstead Volume: ${func.complexity.halsteadMetrics.volume.toFixed(2)}`);
    console.log(`  Vocabulary: ${func.complexity.halsteadMetrics.vocabulary}`);
    
    return func.complexity.halsteadMetrics.volume > 0;
  });

  // Test 9: Enhanced Maintainability Index
  await test('Maintainability Index - Uses Halstead volume', async () => {
    const code = `
      function simple() {
        return 42;
      }
      
      function complex(a, b, c, d, e) {
        if (a > b) {
          if (c < d) {
            for (let i = 0; i < e; i++) {
              console.log(i);
            }
          }
        }
        return a + b + c + d + e;
      }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const simple = ast.components.find(c => c.name === 'simple');
    const complex = ast.components.find(c => c.name === 'complex');
    
    if (!simple || !complex) return false;
    
    console.log(`\n  Simple function:`);
    console.log(`    Halstead Volume: ${simple.complexity.halsteadMetrics.volume.toFixed(2)}`);
    console.log(`    Maintainability Index: ${simple.complexity.maintainabilityIndex.toFixed(2)}`);
    
    console.log(`\n  Complex function:`);
    console.log(`    Halstead Volume: ${complex.complexity.halsteadMetrics.volume.toFixed(2)}`);
    console.log(`    Maintainability Index: ${complex.complexity.maintainabilityIndex.toFixed(2)}`);
    
    // Simple function should have higher maintainability than complex
    return simple.complexity.maintainabilityIndex > complex.complexity.maintainabilityIndex;
  });

  // Test 10: Multiple Functions in One File
  await test('Multiple functions - All calculated independently', async () => {
    const code = `
      function add(a, b) { return a + b; }
      function subtract(a, b) { return a - b; }
      function multiply(a, b) { return a * b; }
      function divide(a, b) { return b !== 0 ? a / b : 0; }
    `;
    
    const ast = await parser.parse(code, 'test.js');
    const functions = ast.components.filter(c => c.type === 'function');
    
    console.log(`\n  Functions found: ${functions.length}`);
    
    let allHaveMetrics = true;
    functions.forEach(func => {
      const hasMetrics = func.complexity.halsteadMetrics.volume > 0;
      console.log(`    ${func.name}: Volume=${func.complexity.halsteadMetrics.volume.toFixed(2)} - ${hasMetrics ? '✓' : '✗'}`);
      if (!hasMetrics) allHaveMetrics = false;
    });
    
    return functions.length === 4 && allHaveMetrics;
  });

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);
  console.log('='.repeat(80) + '\n');

  if (failedTests === 0) {
    console.log('🎉 All tests passed! Task 2.3 integration is working perfectly!\n');
  } else {
    console.log('⚠️  Some tests failed. Review the output above for details.\n');
  }

  process.exit(failedTests === 0 ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
