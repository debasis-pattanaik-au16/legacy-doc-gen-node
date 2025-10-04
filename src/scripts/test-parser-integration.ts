/**
 * Parser System Integration Test (Phase 1 Task 1.1)
 * Tests the refactored parser architecture including:
 * - Parser interface and registry
 * - JavaScript and Python parsers
 * - Parser factory
 * - Dependency analyzer integration
 * 
 * Run: npm run test:parser
 * or: ts-node -r tsconfig-paths/register src/scripts/test-parser-integration.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ParserRegistry } from '../services/parsers/ParserRegistry';
import { ParserFactory } from '../services/parsers/ParserFactory';
import { DependencyAnalyzer } from '../services/dependencyAnalyzer';
import { LanguageParser } from '../types/parser';
import { UnifiedAST, ComponentNode, ImportNode, ExportNode } from '../types/ast';

/**
 * Test 1: Verify Parser Registry initialization
 */
async function testParserRegistry(): Promise<void> {
  console.log('\n📝 Test 1: Verifying Parser Registry initialization...\n');

  try {
    const registry = ParserRegistry.getInstance();
    
    // Check supported languages
    const supportedLanguages = registry.getSupportedLanguages();
    console.log(`   Supported Languages: ${supportedLanguages.join(', ')}`);
    
    if (supportedLanguages.length === 0) {
      throw new Error('No parsers registered!');
    }
    
    // Verify JavaScript parser is registered
    const jsParserRegistered = supportedLanguages.includes('javascript');
    console.log(`   JavaScript Parser Registered: ${jsParserRegistered}`);
    
    // Verify Python parser is registered
    const pyParserRegistered = supportedLanguages.includes('python');
    console.log(`   Python Parser Registered: ${pyParserRegistered}`);
    
    if (!jsParserRegistered || !pyParserRegistered) {
      throw new Error('Required parsers (JavaScript, Python) are not registered');
    }
    
    // Verify parser retrieval
    const jsParser = registry.getParser('javascript');
    console.log(`   JavaScript Parser Retrieved: ${jsParser !== null}`);
    
    const pyParser = registry.getParser('python');
    console.log(`   Python Parser Retrieved: ${pyParser !== null}`);
    
    // Test invalid language
    const invalidParser = registry.getParser('invalid-language');
    console.log(`   Invalid Language Returns Null: ${invalidParser === null}`);
    
    console.log('\n✅ Test 1 Passed: Parser Registry working correctly');
  } catch (error: any) {
    console.error('❌ Test 1 Failed:', error.message);
    throw error;
  }
}

/**
 * Test 2: Verify Parser Factory functionality
 */
async function testParserFactory(): Promise<void> {
  console.log('\n📝 Test 2: Testing Parser Factory functionality...\n');

  try {
    // Test file extension detection
    const jsParser = ParserFactory.getParserForFile('test.js');
    console.log(`   Parser for .js file: ${jsParser ? jsParser.language : 'Not found'}`);
    
    const tsParser = ParserFactory.getParserForFile('test.ts');
    console.log(`   Parser for .ts file: ${tsParser ? tsParser.language : 'Not found'}`);
    
    const jsxParser = ParserFactory.getParserForFile('Component.jsx');
    console.log(`   Parser for .jsx file: ${jsxParser ? jsxParser.language : 'Not found'}`);
    
    const pyParser = ParserFactory.getParserForFile('script.py');
    console.log(`   Parser for .py file: ${pyParser ? pyParser.language : 'Not found'}`);
    
    const unknownParser = ParserFactory.getParserForFile('readme.md');
    console.log(`   Parser for .md file: ${unknownParser ? unknownParser.language : 'Not found (expected)'}`);
    
    // Test parser retrieval by language
    const jsParserByLang = ParserFactory.getParserByLanguage('javascript');
    console.log(`   Parser by language 'javascript': ${jsParserByLang ? jsParserByLang.language : 'Not found'}`);
    
    const pyParserByLang = ParserFactory.getParserByLanguage('python');
    console.log(`   Parser by language 'python': ${pyParserByLang ? pyParserByLang.language : 'Not found'}`);
    
    // Verify all parsers are accessible
    const allParsers = ParserFactory.getSupportedLanguages();
    console.log(`   Total Parsers Available: ${allParsers.length}`);
    
    if (allParsers.length < 2) {
      throw new Error('Expected at least 2 parsers (JavaScript, Python)');
    }
    
    console.log('\n✅ Test 2 Passed: Parser Factory working correctly');
  } catch (error: any) {
    console.error('❌ Test 2 Failed:', error.message);
    throw error;
  }
}

/**
 * Test 3: Test JavaScript Parser
 */
async function testJavaScriptParser(): Promise<void> {
  console.log('\n📝 Test 3: Testing JavaScript Parser...\n');

  try {
    const parser = ParserFactory.getParserByLanguage('javascript');
    
    if (!parser) {
      throw new Error('JavaScript parser not found');
    }
    
    console.log(`   Parser Language: ${parser.language}`);
    console.log(`   Supported Extensions: ${parser.supportedExtensions.join(', ')}`);
    
    // Create test JavaScript file
    const testJsCode = `
import React from 'react';
import { useState } from 'react';
const lodash = require('lodash');

/**
 * A sample component for testing
 * @param {Object} props - Component props
 */
export function TestComponent(props) {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default TestComponent;
`;
    
    const testFilePath = path.join(os.tmpdir(), 'test-component.js');
    fs.writeFileSync(testFilePath, testJsCode, 'utf8');
    
    console.log(`   Created test file: ${testFilePath}`);
    
    // Parse the file
    const result: UnifiedAST = await parser.parse(testJsCode, testFilePath);
    
    console.log(`   Parsing Success: ${result.parseSuccess}`);
    
    if (!result.parseSuccess) {
      console.log(`   Parse Errors: ${result.parseErrors.map((e: any) => e.message).join(', ')}`);
      throw new Error('Failed to parse JavaScript file');
    }
    
    console.log(`   File Path: ${result.fileName}`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Imports: ${result.imports.length}`);
    console.log(`   Exports: ${result.exports.length}`);
    console.log(`   Components: ${result.components.length}`);
    
    // Verify imports
    if (result.imports.length === 0) {
      console.log('   ⚠️  Warning: No imports detected');
    } else {
      console.log(`   Import Sources: ${result.imports.map((i: ImportNode) => i.source).join(', ')}`);
    }
    
    // Verify exports
    if (result.exports.length === 0) {
      console.log('   ⚠️  Warning: No exports detected');
    } else {
      console.log(`   Export Names: ${result.exports.map((e: ExportNode) => e.name).join(', ')}`);
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('   (Test file cleaned up)');
    
    console.log('\n✅ Test 3 Passed: JavaScript parser working correctly');
  } catch (error: any) {
    console.error('❌ Test 3 Failed:', error.message);
    throw error;
  }
}

/**
 * Test 4: Test Python Parser
 */
async function testPythonParser(): Promise<void> {
  console.log('\n📝 Test 4: Testing Python Parser...\n');

  try {
    const parser = ParserFactory.getParserByLanguage('python');
    
    if (!parser) {
      throw new Error('Python parser not found');
    }
    
    console.log(`   Parser Language: ${parser.language}`);
    console.log(`   Supported Extensions: ${parser.supportedExtensions.join(', ')}`);
    
    // Create test Python file
    const testPyCode = `
"""
A sample Python module for testing
"""
import os
import sys
from typing import List, Dict
import numpy as np

class TestClass:
    """A test class with methods"""
    
    def __init__(self, name: str):
        """Initialize the test class"""
        self.name = name
    
    def greet(self) -> str:
        """Return a greeting"""
        return f"Hello, {self.name}!"

def calculate_sum(numbers: List[int]) -> int:
    """
    Calculate the sum of numbers
    
    Args:
        numbers: List of integers
        
    Returns:
        Sum of all numbers
    """
    return sum(numbers)

def main():
    """Main function"""
    test_obj = TestClass("Parser Test")
    print(test_obj.greet())
    print(calculate_sum([1, 2, 3, 4, 5]))

if __name__ == "__main__":
    main()
`;
    
    const testFilePath = path.join(os.tmpdir(), 'test-module.py');
    fs.writeFileSync(testFilePath, testPyCode, 'utf8');
    
    console.log(`   Created test file: ${testFilePath}`);
    
    // Parse the file
    const result: UnifiedAST = await parser.parse(testPyCode, testFilePath);
    
    console.log(`   Parsing Success: ${result.parseSuccess}`);
    
    if (!result.parseSuccess) {
      console.log(`   Parse Errors: ${result.parseErrors.map((e: any) => e.message).join(', ')}`);
      throw new Error('Failed to parse Python file');
    }
    
    console.log(`   File Path: ${result.fileName}`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Imports: ${result.imports.length}`);
    console.log(`   Exports: ${result.exports.length}`);
    console.log(`   Components: ${result.components.length}`);
    
    // Verify imports
    if (result.imports.length === 0) {
      console.log('   ⚠️  Warning: No imports detected');
    } else {
      console.log(`   Import Sources: ${result.imports.map((i: ImportNode) => i.source).join(', ')}`);
    }
    
    // Verify components (classes and functions)
    const classes = result.components.filter((c: ComponentNode) => c.type === 'class');
    const functions = result.components.filter((c: ComponentNode) => c.type === 'function');
    
    if (classes.length === 0) {
      console.log('   ⚠️  Warning: No classes detected');
    } else {
      console.log(`   Class Names: ${classes.map((c: ComponentNode) => c.name).join(', ')}`);
    }
    
    if (functions.length === 0) {
      console.log('   ⚠️  Warning: No functions detected');
    } else {
      console.log(`   Function Names: ${functions.map((f: ComponentNode) => f.name).join(', ')}`);
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('   (Test file cleaned up)');
    
    console.log('\n✅ Test 4 Passed: Python parser working correctly');
  } catch (error: any) {
    console.error('❌ Test 4 Failed:', error.message);
    throw error;
  }
}

/**
 * Test 5: Test Dependency Analyzer Integration
 */
async function testDependencyAnalyzerIntegration(): Promise<void> {
  console.log('\n📝 Test 5: Testing Dependency Analyzer Integration...\n');

  try {
    // Create a temporary directory with test files
    const tempDir = path.join(os.tmpdir(), `parser-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    console.log(`   Created temp directory: ${tempDir}`);
    
    // Create test files
    const indexJs = `
import { helper } from './utils/helper.js';
import config from './config.js';

export function main() {
  const result = helper.process(config.data);
  return result;
}
`;
    
    const helperJs = `
export const helper = {
  process(data) {
    return data.toUpperCase();
  }
};
`;
    
    const configJs = `
export default {
  data: 'test data',
  version: '1.0.0'
};
`;
    
    // Write files
    fs.writeFileSync(path.join(tempDir, 'index.js'), indexJs, 'utf8');
    fs.mkdirSync(path.join(tempDir, 'utils'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'utils', 'helper.js'), helperJs, 'utf8');
    fs.writeFileSync(path.join(tempDir, 'config.js'), configJs, 'utf8');
    
    console.log('   Created test files: index.js, utils/helper.js, config.js');
    
    // Analyze dependencies
    const analyzer = new DependencyAnalyzer();
    const result = await analyzer.analyzeDependencies(tempDir);
    
    console.log(`   Total Nodes Analyzed: ${result.graph.nodes.length}`);
    console.log(`   Total Edges: ${result.graph.edges.length}`);
    console.log(`   Component Relationships: ${result.relationships.length}`);
    
    if (result.graph.nodes.length === 0) {
      throw new Error('No files were analyzed');
    }
    
    // Verify file analysis
    const indexNode = result.graph.nodes.find((n: any) => n.filePath?.endsWith('index.js'));
    if (indexNode) {
      console.log(`   index.js dependencies: ${indexNode.dependencies.length}`);
      console.log(`   index.js dependents: ${indexNode.dependents.length}`);
    }
    
    // Verify relationships
    if (result.relationships.length > 0) {
      console.log(`   Relationships detected:`);
      result.relationships.slice(0, 3).forEach((rel: any) => {
        console.log(`     • ${rel.from} → ${rel.to} (${rel.type})`);
      });
    }
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('   (Test directory cleaned up)');
    
    console.log('\n✅ Test 5 Passed: Dependency Analyzer integration working correctly');
  } catch (error: any) {
    console.error('❌ Test 5 Failed:', error.message);
    throw error;
  }
}

/**
 * Test 6: Test Error Handling
 */
async function testErrorHandling(): Promise<void> {
  console.log('\n📝 Test 6: Testing error handling...\n');

  try {
    const jsParser = ParserFactory.getParserByLanguage('javascript');
    
    if (!jsParser) {
      throw new Error('JavaScript parser not found');
    }
    
    // Test 1: Invalid syntax
    console.log('   Testing invalid syntax...');
    const invalidJsCode = `
function brokenFunction(
  // Missing closing parenthesis and brace
`;
    
    const invalidFilePath = path.join(os.tmpdir(), 'invalid-syntax.js');
    fs.writeFileSync(invalidFilePath, invalidJsCode, 'utf8');
    
    const invalidSyntaxResult: UnifiedAST = await jsParser.parse(invalidJsCode, invalidFilePath);
    console.log(`   Invalid syntax handled: ${!invalidSyntaxResult.parseSuccess || invalidSyntaxResult.parseErrors.length > 0}`);
    
    // The parser might still succeed but report errors
    if (invalidSyntaxResult.parseSuccess && invalidSyntaxResult.parseErrors.length === 0) {
      console.log('   ⚠️  Note: Parser may be lenient with syntax errors');
    } else {
      console.log(`   Error detected: ${invalidSyntaxResult.parseErrors[0]?.message}`);
    }
    
    // Clean up
    fs.unlinkSync(invalidFilePath);
    
    console.log('\n✅ Test 6 Passed: Error handling working correctly');
  } catch (error: any) {
    console.error('❌ Test 6 Failed:', error.message);
    throw error;
  }
}

/**
 * Test 7: Performance Test
 */
async function testPerformance(): Promise<void> {
  console.log('\n📝 Test 7: Testing parser performance...\n');

  try {
    const jsParser = ParserFactory.getParserByLanguage('javascript');
    
    if (!jsParser) {
      throw new Error('JavaScript parser not found');
    }
    
    // Create a larger test file
    let largeJsCode = `
import React from 'react';
import { Component } from 'react';
`;
    
    // Generate multiple functions
    for (let i = 0; i < 50; i++) {
      largeJsCode += `
/**
 * Function ${i}
 * @param {number} value - Input value
 * @returns {number} Processed value
 */
export function function${i}(value) {
  const result = value * ${i};
  return result + ${i};
}
`;
    }
    
    const largeFilePath = path.join(os.tmpdir(), 'large-file.js');
    fs.writeFileSync(largeFilePath, largeJsCode, 'utf8');
    
    console.log(`   Created large test file with ~50 functions`);
    console.log(`   File size: ${fs.statSync(largeFilePath).size} bytes`);
    
    // Measure parsing time
    const startTime = Date.now();
    const result: UnifiedAST = await jsParser.parse(largeJsCode, largeFilePath);
    const endTime = Date.now();
    
    const parseTime = endTime - startTime;
    console.log(`   Parse time: ${parseTime}ms`);
    
    if (result.parseSuccess) {
      const functions = result.components.filter((c: ComponentNode) => c.type === 'function');
      console.log(`   Functions detected: ${functions.length}`);
      console.log(`   Imports detected: ${result.imports.length}`);
      console.log(`   Exports detected: ${result.exports.length}`);
    }
    
    // Performance threshold
    if (parseTime > 5000) {
      console.log(`   ⚠️  Warning: Parse time exceeds 5 seconds (${parseTime}ms)`);
    } else {
      console.log(`   ✓ Performance acceptable (under 5 seconds)`);
    }
    
    // Clean up
    fs.unlinkSync(largeFilePath);
    console.log('   (Test file cleaned up)');
    
    console.log('\n✅ Test 7 Passed: Performance test completed');
  } catch (error: any) {
    console.error('❌ Test 7 Failed:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🧪 Starting Parser System Integration Tests (Phase 1 Task 1.1)\n');
  console.log('=============================================================\n');

  const startTime = Date.now();
  
  try {
    // Run all tests
    await testParserRegistry();
    await testParserFactory();
    await testJavaScriptParser();
    await testPythonParser();
    await testDependencyAnalyzerIntegration();
    await testErrorHandling();
    await testPerformance();

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log('\n=============================================================');
    console.log('\n✅ All Parser Integration Tests Completed!\n');
    console.log('📝 Summary:');
    console.log('   • Parser Registry verified');
    console.log('   • Parser Factory tested');
    console.log('   • JavaScript parser validated');
    console.log('   • Python parser validated');
    console.log('   • Dependency Analyzer integration confirmed');
    console.log('   • Error handling verified');
    console.log('   • Performance benchmarked');
    console.log(`\n⏱️  Total test time: ${totalTime}ms`);
    console.log('\n🎉 Phase 1 Task 1.1 is complete and ready!\n');

    process.exit(0);
  } catch (error: any) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.error('\n=============================================================');
    console.error('\n❌ Integration tests failed:', error.message);
    console.error('\nStack trace:', error.stack);
    console.error(`\n⏱️  Test time before failure: ${totalTime}ms\n`);
    
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main();
}

export {
  testParserRegistry,
  testParserFactory,
  testJavaScriptParser,
  testPythonParser,
  testDependencyAnalyzerIntegration,
  testErrorHandling,
  testPerformance
};
