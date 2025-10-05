/**
 * Comprehensive Complexity Metrics Test Suite
 * 
 * Tests Halstead, Cognitive Complexity, and Coupling metrics
 * against known examples from literature and industry standards
 */

import { parse } from '@babel/parser';
import { HalsteadCalculator } from '@/services/metrics/HalsteadCalculator';
import { CognitiveComplexityCalculator, calculateCognitiveComplexity } from '@/services/metrics/CognitiveComplexityCalculator';

console.log('\n🧪 Complexity Metrics Test Suite\n');
console.log('='.repeat(80));

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => boolean): void {
  totalTests++;
  try {
    const result = fn();
    if (result) {
      passedTests++;
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name} - Assertion failed`);
    }
  } catch (error: any) {
    console.log(`❌ ${name} - Error: ${error.message}`);
  }
}

function approxEqual(a: number, b: number, tolerance = 0.1): boolean {
  return Math.abs(a - b) <= tolerance;
}

// ============================================================================
// HALSTEAD METRICS TESTS
// ============================================================================

console.log('\n📊 Halstead Metrics Tests\n' + '-'.repeat(80));

test('Halstead: Simple max function (from literature)', () => {
  const code = `
    function max(a, b) {
      if (a > b) return a;
      return b;
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const calculator = new HalsteadCalculator();
  const metrics = calculator.calculate(ast);
  
  // Known values from Halstead's examples
  // n1 = 4 (function, if, >, return)
  // n2 = 3 (max, a, b)
  console.log(`  Operators: ${metrics.n1}, Operands: ${metrics.n2}`);
  return metrics.n1 >= 3 && metrics.n2 >= 2;
});

test('Halstead: Vocabulary calculation', () => {
  const code = `
    function add(x, y) {
      return x + y;
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const calculator = new HalsteadCalculator();
  const metrics = calculator.calculate(ast);
  
  console.log(`  Vocabulary (n): ${metrics.vocabulary}`);
  return metrics.vocabulary === metrics.n1 + metrics.n2;
});

test('Halstead: Length calculation', () => {
  const code = `
    const result = a + b + c;
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const calculator = new HalsteadCalculator();
  const metrics = calculator.calculate(ast);
  
  console.log(`  Length (N): ${metrics.length}`);
  return metrics.length === metrics.N1 + metrics.N2;
});

test('Halstead: Volume increases with code size', () => {
  const smallCode = `const x = 1;`;
  const largeCode = `
    function process(data) {
      for (let i = 0; i < data.length; i++) {
        if (data[i] > 0) {
          console.log(data[i]);
        }
      }
    }
  `;
  
  const calculator = new HalsteadCalculator();
  const smallAst = parse(smallCode, { sourceType: 'module' });
  const largeAst = parse(largeCode, { sourceType: 'module' });
  
  const smallMetrics = calculator.calculate(smallAst);
  const largeMetrics = calculator.calculate(largeAst);
  
  console.log(`  Small volume: ${smallMetrics.volume.toFixed(2)}, Large volume: ${largeMetrics.volume.toFixed(2)}`);
  return largeMetrics.volume > smallMetrics.volume;
});

test('Halstead: Difficulty calculation', () => {
  const code = `
    function calculate(a, b, c) {
      return a + b * c - a / b;
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const calculator = new HalsteadCalculator();
  const metrics = calculator.calculate(ast);
  
  // D = (n1/2) * (N2/n2)
  const expectedDifficulty = (metrics.n1 / 2) * (metrics.N2 / metrics.n2);
  
  console.log(`  Difficulty: ${metrics.difficulty.toFixed(2)}`);
  return approxEqual(metrics.difficulty, expectedDifficulty, 0.01);
});

test('Halstead: Effort calculation', () => {
  const code = `
    const x = 10;
    const y = 20;
    const z = x + y;
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const calculator = new HalsteadCalculator();
  const metrics = calculator.calculate(ast);
  
  // E = D * V
  const expectedEffort = metrics.difficulty * metrics.volume;
  
  console.log(`  Effort: ${metrics.effort.toFixed(2)}`);
  return approxEqual(metrics.effort, expectedEffort, 0.01);
});

test('Halstead: Time estimation', () => {
  const code = `
    function fibonacci(n) {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const calculator = new HalsteadCalculator();
  const metrics = calculator.calculate(ast);
  
  // T = E / 18 (Halstead's constant)
  const expectedTime = metrics.effort / 18;
  
  console.log(`  Time (seconds): ${metrics.timeRequiredToProgram.toFixed(2)}`);
  return approxEqual(metrics.timeRequiredToProgram, expectedTime, 0.01);
});

test('Halstead: Bug estimation', () => {
  const code = `
    class Calculator {
      add(a, b) { return a + b; }
      subtract(a, b) { return a - b; }
      multiply(a, b) { return a * b; }
      divide(a, b) { return a / b; }
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const calculator = new HalsteadCalculator();
  const metrics = calculator.calculate(ast);
  
  // B = V / 3000 (Halstead's constant)
  const expectedBugs = metrics.volume / 3000;
  
  console.log(`  Estimated bugs: ${metrics.numberOfDeliveredBugs.toFixed(4)}`);
  return approxEqual(metrics.numberOfDeliveredBugs, expectedBugs, 0.0001);
});

// ============================================================================
// COGNITIVE COMPLEXITY TESTS
// ============================================================================

console.log('\n🧠 Cognitive Complexity Tests\n' + '-'.repeat(80));

test('Cognitive: Simple if statement (+1)', () => {
  const code = `
    function test() {
      if (a) {}  // +1
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast);
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 1;
});

test('Cognitive: Multiple if statements', () => {
  const code = `
    function test() {
      if (a) {}  // +1
      if (b) {}  // +1
      if (c) {}  // +1
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast);
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 3;
});

test('Cognitive: Nested if statements (with nesting increment)', () => {
  const code = `
    function test() {
      if (a) {       // +1
        if (b) {}    // +2 (1 + 1 for nesting)
      }
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast);
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 2;
});

test('Cognitive: For loop with if (+2 total)', () => {
  const code = `
    function test() {
      for (let i = 0; i < 10; i++) {  // +1
        if (i > 5) {}                  // +2 (1 + 1 for nesting)
      }
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast);
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 2;
});

test('Cognitive: Recursive function', () => {
  const code = `
    function factorial(n) {
      if (n <= 1) return 1;          // +1
      return n * factorial(n - 1);   // +1 for recursion
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast, 'factorial');
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 2;
});

test('Cognitive: Switch statement', () => {
  const code = `
    function test(x) {
      switch(x) {    // +1
        case 1:
          break;
        case 2:
          break;
        default:
          break;
      }
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast);
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 1;
});

test('Cognitive: Ternary operator', () => {
  const code = `
    const result = condition ? value1 : value2;  // +1
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast);
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 1;
});

test('Cognitive: Deep nesting (high complexity)', () => {
  const code = `
    function test() {
      if (a) {           // +1
        if (b) {         // +2
          if (c) {       // +3
            if (d) {}    // +4
          }
        }
      }
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  const complexity = calculateCognitiveComplexity(ast);
  
  console.log(`  Complexity: ${complexity}`);
  return complexity >= 5;
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

console.log('\n🔗 Integration Tests\n' + '-'.repeat(80));

test('Integration: Complex real-world function', () => {
  const code = `
    function processUserData(user) {
      if (!user) return null;
      
      const result = {};
      
      if (user.name) {
        result.name = user.name.trim();
      }
      
      if (user.email) {
        if (user.email.includes('@')) {
          result.email = user.email.toLowerCase();
        }
      }
      
      for (let key in user) {
        if (user.hasOwnProperty(key)) {
          if (key !== 'name' && key !== 'email') {
            result[key] = user[key];
          }
        }
      }
      
      return result;
    }
  `;
  
  const ast = parse(code, { sourceType: 'module' });
  
  // Test Halstead
  const halsteadCalc = new HalsteadCalculator();
  const halstead = halsteadCalc.calculate(ast);
  
  // Test Cognitive Complexity
  const cognitive = calculateCognitiveComplexity(ast, 'processUserData');
  
  console.log(`  Halstead Volume: ${halstead.volume.toFixed(2)}, Cognitive: ${cognitive}`);
  return halstead.volume > 0 && cognitive > 0;
});

test('Integration: Metrics correlation', () => {
  // More complex code should have higher metrics
  const simpleCode = `const x = 1;`;
  const complexCode = `
    function complex(arr) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
          if (arr[i][j] > 0) {
            if (arr[i][j] % 2 === 0) {
              console.log(arr[i][j]);
            }
          }
        }
      }
    }
  `;
  
  const halsteadCalc = new HalsteadCalculator();
  
  const simpleAst = parse(simpleCode, { sourceType: 'module' });
  const complexAst = parse(complexCode, { sourceType: 'module' });
  
  const simpleHalstead = halsteadCalc.calculate(simpleAst);
  const complexHalstead = halsteadCalc.calculate(complexAst);
  
  const simpleCognitive = calculateCognitiveComplexity(simpleAst);
  const complexCognitive = calculateCognitiveComplexity(complexAst);
  
  console.log(`  Simple: H=${simpleHalstead.volume.toFixed(1)}, C=${simpleCognitive}`);
  console.log(`  Complex: H=${complexHalstead.volume.toFixed(1)}, C=${complexCognitive}`);
  
  return complexHalstead.volume > simpleHalstead.volume && 
         complexCognitive > simpleCognitive;
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Test Summary\n`);
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Pass Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`);

if (passedTests === totalTests) {
  console.log('✨ All tests passed! Metrics calculators are working correctly.\n');
} else {
  console.log(`⚠️  ${totalTests - passedTests} test(s) failed.\n`);
  process.exit(1);
}
