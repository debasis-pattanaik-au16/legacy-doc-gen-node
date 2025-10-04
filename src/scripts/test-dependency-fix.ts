/**
 * Quick Test for Dependency Detection Fix
 * 
 * Tests that imports are resolved with correct file extensions
 */

import { DependencyAnalyzer } from '../services/dependencyAnalyzer';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function testDependencyDetection() {
  console.log('\n🧪 Testing Dependency Detection Fix\n');
  console.log('═'.repeat(80));

  // Create temporary test directory
  const testDir = path.join(os.tmpdir(), 'dep-test-' + Date.now());
  await fs.mkdir(testDir, { recursive: true });

  try {
    // Create test files
    console.log('\n📁 Creating test files...');
    
    const fileA = path.join(testDir, 'a.ts');
    const fileB = path.join(testDir, 'b.ts');
    const fileC = path.join(testDir, 'c.ts');

    await fs.writeFile(fileA, `export const foo = 'bar';\nexport const baz = 42;`);
    await fs.writeFile(fileB, `import { foo } from './a';\nexport const result = foo + ' world';`);
    await fs.writeFile(fileC, `import { result } from './b';\nimport { baz } from './a';\nconsole.log(result, baz);`);

    console.log(`   ✓ Created ${fileA}`);
    console.log(`   ✓ Created ${fileB}`);
    console.log(`   ✓ Created ${fileC}`);

    // Run analysis
    console.log('\n⚙️  Running analysis...');
    const analyzer = new DependencyAnalyzer();
    const result = await analyzer.analyzeDependencies(testDir);

    console.log('\n📊 Analysis Results:');
    console.log(`   Nodes: ${result.graph.nodes.length}`);
    console.log(`   Edges: ${result.graph.edges.length}`);

    // Verify results
    const expectedNodes = 3;
    const expectedEdges = 3; // b -> a, c -> b, c -> a

    console.log('\n✅ Verification:');
    
    if (result.graph.nodes.length === expectedNodes) {
      console.log(`   ✓ Node count correct: ${expectedNodes}`);
    } else {
      console.log(`   ✗ Node count WRONG: Expected ${expectedNodes}, got ${result.graph.nodes.length}`);
    }

    if (result.graph.edges.length === expectedEdges) {
      console.log(`   ✓ Edge count correct: ${expectedEdges}`);
      console.log(`   ✓ DEPENDENCY DETECTION IS WORKING! 🎉`);
    } else {
      console.log(`   ✗ Edge count WRONG: Expected ${expectedEdges}, got ${result.graph.edges.length}`);
      if (result.graph.edges.length === 0) {
        console.log(`   ⚠️  CRITICAL: Zero edges detected - bug still present!`);
      }
    }

    // Display edges
    if (result.graph.edges.length > 0) {
      console.log('\n📌 Detected Dependencies:');
      result.graph.edges.forEach((edge, i) => {
        const source = path.basename(edge.source);
        const target = path.basename(edge.target);
        console.log(`   ${i + 1}. ${source} → ${target}`);
      });
    }

    // Display node details
    console.log('\n📦 Nodes:');
    result.graph.nodes.forEach(node => {
      console.log(`   - ${path.basename(node.path)}`);
      console.log(`     Dependencies: ${node.dependencies.map(d => path.basename(d)).join(', ') || 'none'}`);
      console.log(`     Dependents: ${node.dependents.map(d => path.basename(d)).join(', ') || 'none'}`);
    });

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('   ✓ Test directory removed');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Test Complete!\n');
}

// Run the test
testDependencyDetection().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
