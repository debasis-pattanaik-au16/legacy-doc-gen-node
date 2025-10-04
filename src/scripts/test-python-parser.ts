/**
 * Python Parser Integration Test Suite
 * 
 * Tests enhanced Python parser with:
 * - Type hint extraction (PEP 484)
 * - Decorator analysis
 * - Dataclass detection
 * - Pydantic model detection
 * - typing module types (List, Dict, Optional, Union)
 */

import { PythonParser } from '../services/parsers/pythonParser';
import * as path from 'path';
import * as fs from 'fs';

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
  console.log('🧪 Starting Python Parser Integration Tests\n');
  console.log('========================================================\n');
  
  const parser = new PythonParser();
  
  // ========================================================================
  // Test Group 1: Basic Type Hints
  // ========================================================================
  console.log('📝 Test Group 1: Basic Type Hints\n');
  
  {
    const code = `
def greet(name: str) -> str:
    return f"Hello, {name}"
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 1, 'Should find 1 component');
    assert(result.components[0].name === 'greet', 'Function name should be "greet"');
    
    const func = result.components[0] as any;
    assert(func.parameters?.length === 1, 'Should have 1 parameter');
    assert(func.parameters[0].name === 'name', 'Parameter name should be "name"');
    assert(func.parameters[0].type !== null, 'Parameter should have type annotation');
    assert(func.parameters[0].type?.name === 'str', 'Parameter type should be str');
    assert(func.returnType !== null, 'Function should have return type');
    assert(func.returnType?.name === 'str', 'Return type should be str');
  }
  
  // ========================================================================
  // Test Group 2: Complex Type Hints - Generic Types
  // ========================================================================
  console.log('\n📝 Test Group 2: Complex Type Hints - Generic Types\n');
  
  {
    const code = `
from typing import List, Dict, Optional

def process_items(items: List[str]) -> Dict[str, int]:
    return {item: len(item) for item in items}
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.imports.length === 1, 'Should have 1 import');
    assert(result.imports[0].source === 'typing', 'Should import from typing module');
    
    const func = result.components[0] as any;
    assert(func.parameters[0].type?.type === 'generic', 'Parameter should be generic type');
    assert(func.parameters[0].type?.name === 'List', 'Parameter type should be List');
    assert(func.parameters[0].type?.args?.length === 1, 'List should have 1 type argument');
    assert(func.returnType?.type === 'generic', 'Return type should be generic');
    assert(func.returnType?.name === 'Dict', 'Return type should be Dict');
    assert(func.returnType?.args?.length === 2, 'Dict should have 2 type arguments');
  }
  
  // ========================================================================
  // Test Group 3: Optional and Union Types
  // ========================================================================
  console.log('\n📝 Test Group 3: Optional and Union Types\n');
  
  {
    const code = `
from typing import Optional, Union

def find_user(user_id: int) -> Optional[str]:
    return None

def get_value(key: str) -> Union[int, str, None]:
    return key
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 2, 'Should find 2 functions');
    
    const func1 = result.components[0] as any;
    assert(func1.returnType?.type === 'generic', 'Optional should be generic type');
    assert(func1.returnType?.name === 'Optional', 'Return type should be Optional');
    
    const func2 = result.components[1] as any;
    assert(func2.returnType?.type === 'generic', 'Union should be generic type');
    assert(func2.returnType?.name === 'Union', 'Return type should be Union');
  }
  
  // ========================================================================
  // Test Group 4: Dataclass Detection
  // ========================================================================
  console.log('\n📝 Test Group 4: Dataclass Detection\n');
  
  {
    const code = `
from dataclasses import dataclass

@dataclass
class Person:
    name: str
    age: int
    email: str = "default@example.com"
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 1, 'Should find 1 component');
    
    const cls = result.components[0] as any;
    assert(cls.type === 'class', 'Should be a class');
    assert(cls.name === 'Person', 'Class name should be Person');
    assert(cls.isDataclass === true, 'Should be identified as dataclass');
    assert(cls.properties?.length === 3, 'Should have 3 properties');
    assert(cls.properties[0].name === 'name', 'First property should be name');
    assert(cls.properties[0].type?.name === 'str', 'First property type should be str');
    assert(cls.properties[2].defaultValue === 'default@example.com', 'Third property should have default value');
  }
  
  // ========================================================================
  // Test Group 5: Pydantic Model Detection
  // ========================================================================
  console.log('\n📝 Test Group 5: Pydantic Model Detection\n');
  
  {
    const code = `
from pydantic import BaseModel

class User(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool = True
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    assert(result.components.length === 1, 'Should find 1 component');
    
    const cls = result.components[0] as any;
    assert(cls.type === 'class', 'Should be a class');
    assert(cls.name === 'User', 'Class name should be User');
    assert(cls.isPydanticModel === true, 'Should be identified as Pydantic model');
    assert(cls.bases?.includes('BaseModel'), 'Should have BaseModel as base class');
    assert(cls.properties?.length === 4, 'Should have 4 properties');
    assert(cls.properties[3].defaultValue === true, 'Last property should have default value true');
  }
  
  // ========================================================================
  // Test Group 6: Decorator Analysis
  // ========================================================================
  console.log('\n📝 Test Group 6: Decorator Analysis\n');
  
  {
    const code = `
def my_decorator(func):
    return func

@my_decorator
def simple_func():
    pass

@property
def getter_func(self):
    return self._value

from flask import Flask
app = Flask(__name__)

@app.route('/api/users', methods=['GET', 'POST'])
def api_endpoint():
    pass
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    const funcs = result.components.filter(c => c.type === 'function');
    assert(funcs.length >= 3, 'Should find at least 3 functions');
    
    const simpleFunc = funcs.find((f: any) => f.name === 'simple_func') as any;
    assert(simpleFunc !== undefined, 'Should find simple_func');
    assert(simpleFunc.decorators?.length === 1, 'simple_func should have 1 decorator');
    assert(simpleFunc.decorators[0].name === 'my_decorator', 'Decorator should be my_decorator');
    
    const getterFunc = funcs.find((f: any) => f.name === 'getter_func') as any;
    assert(getterFunc !== undefined, 'Should find getter_func');
    assert(getterFunc.decorators?.length === 1, 'getter_func should have 1 decorator');
    assert(getterFunc.decorators[0].name === 'property', 'Decorator should be property');
    
    const apiFunc = funcs.find((f: any) => f.name === 'api_endpoint') as any;
    assert(apiFunc !== undefined, 'Should find api_endpoint');
    assert(apiFunc.decorators?.length === 1, 'api_endpoint should have 1 decorator');
    assert(apiFunc.decorators[0].name === 'route', 'Decorator should be route');
    assert(apiFunc.decorators[0].module === 'app', 'Decorator should be from app module');
    assert(apiFunc.decorators[0].arguments?.length > 0, 'Decorator should have arguments');
  }
  
  // ========================================================================
  // Test Group 7: Function Parameter Varieties
  // ========================================================================
  console.log('\n📝 Test Group 7: Function Parameter Varieties\n');
  
  {
    const code = `
def complex_params(
    pos_arg: str,
    default_arg: int = 10,
    *args: int,
    keyword_only: bool,
    **kwargs: str
) -> None:
    pass
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    const func = result.components[0] as any;
    assert(func.parameters?.length === 5, 'Should have 5 parameters');
    
    assert(func.parameters[0].kind === 'positional', 'First param should be positional');
    assert(func.parameters[1].isOptional === true, 'Second param should be optional');
    assert(func.parameters[1].defaultValue === 10, 'Second param should have default value 10');
    assert(func.parameters[2].kind === 'vararg', 'Third param should be vararg');
    assert(func.parameters[2].name === 'args', 'Third param name should be args');
    assert(func.parameters[3].kind === 'keyword-only', 'Fourth param should be keyword-only');
    assert(func.parameters[4].kind === 'kwarg', 'Fifth param should be kwarg');
    assert(func.parameters[4].name === 'kwargs', 'Fifth param name should be kwargs');
  }
  
  // ========================================================================
  // Test Group 8: Async Functions
  // ========================================================================
  console.log('\n📝 Test Group 8: Async Functions\n');
  
  {
    const code = `
async def fetch_data(url: str) -> dict:
    return {}
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    const func = result.components[0] as any;
    assert(func.isAsync === true, 'Function should be marked as async');
  }
  
  // ========================================================================
  // Test Group 9: Class with Methods
  // ========================================================================
  console.log('\n📝 Test Group 9: Class with Methods\n');
  
  {
    const code = `
class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b
    
    @staticmethod
    def multiply(x: int, y: int) -> int:
        return x * y
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    const cls = result.components.find(c => c.type === 'class') as any;
    assert(cls !== undefined, 'Should find class');
    assert(cls.name === 'Calculator', 'Class name should be Calculator');
    
    const methods = result.components.filter(c => c.type === 'function');
    assert(methods.length >= 2, 'Should find at least 2 methods');
  }
  
  // ========================================================================
  // Test Group 10: Private Members
  // ========================================================================
  console.log('\n📝 Test Group 10: Private Members\n');
  
  {
    const code = `
def _private_function():
    pass

class MyClass:
    _private_var: str
    public_var: int
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === true, 'Should parse successfully');
    const func = result.components.find(c => c.name === '_private_function') as any;
    assert(func !== undefined, 'Should find private function');
    assert(func.visibility === 'private', 'Function should be marked as private');
    
    const cls = result.components.find(c => c.type === 'class') as any;
    assert(cls.visibility === 'public', 'Class should be marked as public');
  }
  
  // ========================================================================
  // Test Group 11: Error Handling
  // ========================================================================
  console.log('\n📝 Test Group 11: Error Handling\n');
  
  {
    const code = `
def broken_function
    # Missing colon and body
`;
    
    const result = await parser.parse(code, 'test.py');
    
    assert(result.parseSuccess === false, 'Should fail to parse');
    assert(result.parseErrors.length > 0, 'Should have parse errors');
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
    console.log('🎉 Python Parser with type hints is working correctly!\n');
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
