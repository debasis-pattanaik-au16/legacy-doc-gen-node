import { parse } from '@babel/parser';
import { TypeScriptTypeResolver } from '../services/parsers/TypeScriptTypeResolver';
import { TypeContext } from '../types/typeInfo';

function parseTypeCode(code: string): any {
  const fullCode = `type Test = ${code};`;
  const ast = parse(fullCode, {
    sourceType: 'module',
    plugins: ['typescript'],
  });
  
  const typeAlias = (ast.program.body[0] as any);
  return typeAlias.typeAnnotation;
}

function getDefaultContext(): TypeContext {
  return {
    scope: 'module',
    genericContext: new Map(),
    typeAliases: new Map(),
    imports: new Map(),
  };
}

const resolver = new TypeScriptTypeResolver();
const context = getDefaultContext();

console.log('=== Test 1: Zero literal ===');
const test1 = parseTypeCode('0');
const result1 = resolver.resolveType(test1, context);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('isLiteral:', result1.isLiteral);
console.log('literalValue:', result1.literalValue);
console.log('literalValue === 0:', result1.literalValue === 0);

console.log('\n=== Test 2: Empty string literal ===');
const test2 = parseTypeCode('""');
const result2 = resolver.resolveType(test2, context);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('isLiteral:', result2.isLiteral);
console.log('literalValue:', result2.literalValue);
console.log('literalValue === "":', result2.literalValue === '');

console.log('\n=== Test 3: Conditional (string extends number) ===');
const test3 = parseTypeCode('string extends number ? true : false');
const result3 = resolver.resolveType(test3, context);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('isLiteral:', result3.isLiteral);
console.log('literalValue:', result3.literalValue);

console.log('\n=== Test 4: Omit utility type ===');
const test4 = parseTypeCode('Omit<{ a: string; b: number }, "a">');
const result4 = resolver.resolveType(test4, context);
console.log('Result:', JSON.stringify(result4, null, 2));
console.log('isUtility:', result4.isUtility);
console.log('utilityType:', result4.utilityType);

console.log('\n=== Test 5: Record utility type ===');
const test5 = parseTypeCode('Record<string, number>');
const result5 = resolver.resolveType(test5, context);
console.log('Result:', JSON.stringify(result5, null, 2));
console.log('isUtility:', result5.isUtility);
console.log('utilityType:', result5.utilityType);

console.log('\n=== Test 6: Awaited utility type ===');
const test6 = parseTypeCode('Awaited<Promise<string>>');
const result6 = resolver.resolveType(test6, context);
console.log('Result:', JSON.stringify(result6, null, 2));
console.log('isUtility:', result6.isUtility);
console.log('utilityType:', result6.utilityType);

console.log('\n=== Test 7: Nested generics ===');
const test7 = parseTypeCode('Promise<Promise<string>>');
const result7 = resolver.resolveType(test7, context);
console.log('Result name:', result7.name);
console.log('isGeneric:', result7.isGeneric);
console.log('genericTypes length:', result7.genericTypes.length);
if (result7.genericTypes.length > 0) {
  console.log('First generic isGeneric:', result7.genericTypes[0].isGeneric);
  console.log('First generic name:', result7.genericTypes[0].name);
}
