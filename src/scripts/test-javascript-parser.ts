/**
 * JavaScript Parser Integration Test
 * 
 * Tests the JavaScriptParser with TypeScriptTypeResolver integration
 * to ensure proper type resolution and parsing of modern JS/TS code
 */

import { JavaScriptParser } from '../services/parsers/javascriptParser';
import { logger } from '../utils/logger';

// Test statistics
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

/**
 * Simple test assertion
 */
function assert(condition: boolean, message: string): void {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Starting JavaScript Parser Integration Tests\n');
  console.log('========================================================\n');
  
  const parser = new JavaScriptParser();
  
  // ========================================================================
  // Test 1: Basic TypeScript Function with Type Annotations
  // ========================================================================
  console.log('📝 Test Group 1: TypeScript Function Parsing\n');
  
  {
    const code = `
      function greet(name: string, age: number): string {
        return \`Hello, \${name}! You are \${age} years old.\`;
      }
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 1, 'Should find 1 component');
    assert(result.components[0].type === 'function', 'Component should be a function');
    assert(result.components[0].name === 'greet', 'Function name should be "greet"');
    
    const funcNode = result.components[0] as any;
    assert(funcNode.parameters?.length === 2, 'Should have 2 parameters');
    assert(funcNode.parameters[0].name === 'name', 'First parameter name should be "name"');
    assert(funcNode.parameters[1].name === 'age', 'Second parameter name should be "age"');
  }
  
  // ========================================================================
  // Test 2: Arrow Functions with Complex Types
  // ========================================================================
  console.log('\n📝 Test Group 2: Arrow Function Parsing\n');
  
  {
    const code = `
      const calculate = (a: number, b: number): number => {
        return a + b;
      };
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length >= 1, 'Should find at least 1 component');
    
    const funcComponent = result.components.find(c => c.name === 'calculate');
    assert(funcComponent !== undefined, 'Should find calculate function');
    assert(funcComponent?.type === 'function', 'Should be a function type');
  }
  
  // ========================================================================
  // Test 3: TypeScript Class with Properties and Methods
  // ========================================================================
  console.log('\n📝 Test Group 3: Class Parsing\n');
  
  {
    const code = `
      class Person {
        name: string;
        age: number;
        
        constructor(name: string, age: number) {
          this.name = name;
          this.age = age;
        }
        
        greet(): string {
          return \`Hello, I'm \${this.name}\`;
        }
      }
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 1, 'Should find 1 component');
    assert(result.components[0].type === 'class', 'Component should be a class');
    assert(result.components[0].name === 'Person', 'Class name should be "Person"');
    
    const classNode = result.components[0] as any;
    assert(classNode.properties?.length >= 2, 'Should have at least 2 properties');
    assert(classNode.methods?.length >= 2, 'Should have at least 2 methods (constructor + greet)');
  }
  
  // ========================================================================
  // Test 4: TypeScript Interface
  // ========================================================================
  console.log('\n📝 Test Group 4: Interface Parsing\n');
  
  {
    const code = `
      interface User {
        id: number;
        name: string;
        email: string;
        roles?: string[];
      }
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 1, 'Should find 1 component');
    assert(result.components[0].type === 'interface', 'Component should be an interface');
    assert(result.components[0].name === 'User', 'Interface name should be "User"');
    
    const interfaceNode = result.components[0] as any;
    assert(interfaceNode.properties?.length >= 4, 'Should have at least 4 properties');
  }
  
  // ========================================================================
  // Test 5: Union and Intersection Types
  // ========================================================================
  console.log('\n📝 Test Group 5: Complex Type Parsing\n');
  
  {
    const code = `
      type StringOrNumber = string | number;
      type Coordinates = { x: number } & { y: number };
      
      function process(value: StringOrNumber): void {
        console.log(value);
      }
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length >= 1, 'Should find components');
    
    const funcComponent = result.components.find(c => c.name === 'process');
    assert(funcComponent !== undefined, 'Should find process function');
  }
  
  // ========================================================================
  // Test 6: Generics
  // ========================================================================
  console.log('\n📝 Test Group 6: Generic Types\n');
  
  {
    const code = `
      function identity<T>(value: T): T {
        return value;
      }
      
      class Container<T> {
        private value: T;
        
        constructor(value: T) {
          this.value = value;
        }
        
        getValue(): T {
          return this.value;
        }
      }
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length >= 2, 'Should find at least 2 components');
    
    const funcComponent = result.components.find(c => c.name === 'identity');
    const classComponent = result.components.find(c => c.name === 'Container');
    
    assert(funcComponent !== undefined, 'Should find identity function');
    assert(classComponent !== undefined, 'Should find Container class');
  }
  
  // ========================================================================
  // Test 7: Imports and Exports
  // ========================================================================
  console.log('\n📝 Test Group 7: Import/Export Parsing\n');
  
  {
    const code = `
      import { useState, useEffect } from 'react';
      import type { FC } from 'react';
      
      export const MyComponent: FC = () => {
        return <div>Hello</div>;
      };
      
      export default MyComponent;
    `;
    
    const result = await parser.parse(code, 'test.tsx');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.imports.length >= 2, 'Should find imports');
    assert(result.exports.length >= 1, 'Should find exports');
    assert(result.dependencies.length >= 1, 'Should extract dependencies');
  }
  
  // ========================================================================
  // Test 8: Async/Await
  // ========================================================================
  console.log('\n📝 Test Group 8: Async Function Parsing\n');
  
  {
    const code = `
      async function fetchData(url: string): Promise<any> {
        const response = await fetch(url);
        return await response.json();
      }
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 1, 'Should find 1 component');
    
    const funcNode = result.components[0] as any;
    assert(funcNode.async === true, 'Function should be marked as async');
  }
  
  // ========================================================================
  // Test 9: Type Aliases and Utility Types
  // ========================================================================
  console.log('\n📝 Test Group 9: Type Alias Parsing\n');
  
  {
    const code = `
      type PartialUser = Partial<User>;
      type ReadonlyUser = Readonly<User>;
      type UserKeys = keyof User;
      
      interface User {
        name: string;
        age: number;
      }
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length >= 1, 'Should find components');
  }
  
  // ========================================================================
  // Test 10: Error Handling
  // ========================================================================
  console.log('\n📝 Test Group 10: Error Handling\n');
  
  {
    const code = `
      function broken(
        // Missing closing parenthesis
    `;
    
    const result = await parser.parse(code, 'test.ts');
    
    assert(result.parseSuccess === false, 'Should fail to parse');
    assert(result.parseErrors.length > 0, 'Should have parse errors');
    assert(result.parseErrors[0].severity === 'error', 'Should have error severity');
  }
  
  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n========================================================\n');
  console.log('📊 Test Summary:\n');
  console.log(`   Total Tests: ${testsRun}`);
  console.log(`   Passed: ${testsPassed} ✓`);
  console.log(`   Failed: ${testsFailed} ✗`);
  console.log(`   Success Rate: ${((testsPassed / testsRun) * 100).toFixed(2)}%`);
  
  const targetAccuracy = 90;
  const actualAccuracy = (testsPassed / testsRun) * 100;
  
  if (actualAccuracy >= targetAccuracy) {
    console.log(`\n✅ Target accuracy of ${targetAccuracy}% achieved!`);
    console.log('🎉 JavaScript Parser integration is working correctly!\n');
    process.exit(0);
  } else {
    console.log(`\n❌ Target accuracy of ${targetAccuracy}% not achieved`);
    console.log(`   Current: ${actualAccuracy.toFixed(2)}%`);
    console.log(`   Gap: ${(targetAccuracy - actualAccuracy).toFixed(2)}%\n`);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite failed with error:', error);
    process.exit(1);
  });
}

export { runTests };
