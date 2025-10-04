/**
 * Test Analysis on Complex Real-World Codebase
 * 
 * Purpose: Validate analysis accuracy and field population claims
 * Codebase: ip-synpro-v2-node (~2000 TypeScript files)
 */

import { DependencyAnalyzer } from '../services/dependencyAnalyzer';
import * as path from 'path';
import * as fs from 'fs';

const CODEBASE_PATH = '/Users/debasis/sponsorcloud/ip-synpro-v2-node/src';
const OUTPUT_PATH = path.join(__dirname, '../../test-results/complex-codebase-analysis.json');

interface FieldPopulationReport {
  fieldName: string;
  populated: boolean;
  itemCount: number;
  sampleData?: any;
  notes: string;
}

async function testComplexCodebase() {
  console.log('\n' + '='.repeat(80));
  console.log('  COMPLEX CODEBASE ANALYSIS TEST');
  console.log('='.repeat(80));
  console.log(`\nCodebase: ${CODEBASE_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  // Check if codebase exists
  if (!fs.existsSync(CODEBASE_PATH)) {
    console.error(`❌ Codebase not found: ${CODEBASE_PATH}`);
    process.exit(1);
  }

  // Count files
  const fileCount = countFiles(CODEBASE_PATH);
  console.log(`📊 File Statistics:`);
  console.log(`   - Total .ts/.js files: ${fileCount}`);

  // Initialize analyzer
  console.log(`\n🔧 Initializing analyzer...`);
  const analyzer = new DependencyAnalyzer();

  // Run analysis
  console.log(`\n⚙️  Starting analysis... (this may take 30-60 seconds)\n`);
  const startTime = Date.now();

  try {
    const result = await analyzer.analyzeDependencies(CODEBASE_PATH);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Analysis completed in ${duration}s\n`);

    // Generate field population report
    const report = generateFieldPopulationReport(result);

    // Display results
    displayResults(result, report, duration, fileCount);

    // Save full results
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify({ result, report, metadata: { duration, fileCount } }, null, 2)
    );

    console.log(`\n💾 Full results saved to: ${OUTPUT_PATH}\n`);

    // Validation summary
    displayValidationSummary(report, duration, fileCount);

  } catch (error) {
    console.error(`\n❌ Analysis failed:`, error);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

function countFiles(dirPath: string): number {
  let count = 0;
  
  function traverse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'build') {
          traverse(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        count++;
      }
    }
  }
  
  traverse(dirPath);
  return count;
}

function generateFieldPopulationReport(result: any): FieldPopulationReport[] {
  const report: FieldPopulationReport[] = [];

  // Components
  report.push({
    fieldName: 'components',
    populated: result.components && result.components.length > 0,
    itemCount: result.components?.length || 0,
    sampleData: result.components?.[0],
    notes: result.components?.length > 0 
      ? `Includes ${result.components.filter((c: any) => c.type === 'function').length} functions, ${result.components.filter((c: any) => c.type === 'class').length} classes`
      : 'No components extracted'
  });

  // Dependencies
  report.push({
    fieldName: 'dependencies',
    populated: result.dependencies && result.dependencies.length > 0,
    itemCount: result.dependencies?.length || 0,
    notes: result.dependencies?.length > 0 
      ? `Tracked ${result.dependencies.length} dependency relationships`
      : 'No dependencies found'
  });

  // Architecture Patterns
  report.push({
    fieldName: 'architecturePatterns',
    populated: result.architecturePatterns && result.architecturePatterns.length > 0,
    itemCount: result.architecturePatterns?.length || 0,
    sampleData: result.architecturePatterns?.[0],
    notes: result.architecturePatterns?.length > 0 
      ? `Detected patterns: ${result.architecturePatterns.map((p: any) => p.name).join(', ')}`
      : 'No patterns detected'
  });

  // Complexity Metrics
  report.push({
    fieldName: 'complexityMetrics',
    populated: result.complexityMetrics !== undefined && result.complexityMetrics !== null,
    itemCount: result.complexityMetrics ? Object.keys(result.complexityMetrics).length : 0,
    sampleData: result.complexityMetrics,
    notes: result.complexityMetrics 
      ? `LOC: ${result.complexityMetrics.linesOfCode}, Cyclomatic: ${result.complexityMetrics.cyclomaticComplexity}`
      : 'No metrics calculated'
  });

  // Insights
  report.push({
    fieldName: 'insights',
    populated: result.insights && result.insights.length > 0,
    itemCount: result.insights?.length || 0,
    sampleData: result.insights?.[0],
    notes: result.insights?.length > 0 
      ? `Types: ${[...new Set(result.insights.map((i: any) => i.type))].join(', ')}`
      : 'No insights generated'
  });

  // Check insights.affectedFiles population
  const insightsWithFiles = result.insights?.filter((i: any) => 
    i.affectedFiles && i.affectedFiles.length > 0
  ).length || 0;
  
  report.push({
    fieldName: 'insights.affectedFiles',
    populated: insightsWithFiles > 0,
    itemCount: insightsWithFiles,
    notes: `${insightsWithFiles}/${result.insights?.length || 0} insights have affectedFiles populated`
  });

  // Recommendations
  report.push({
    fieldName: 'recommendations',
    populated: result.recommendations && result.recommendations.length > 0,
    itemCount: result.recommendations?.length || 0,
    sampleData: result.recommendations?.[0],
    notes: result.recommendations?.length > 0 
      ? `Types: ${[...new Set(result.recommendations.map((r: any) => r.type))].join(', ')}`
      : 'No recommendations generated'
  });

  // Check recommendations.benefits population
  const recsWithBenefits = result.recommendations?.filter((r: any) => 
    r.benefits && r.benefits.length > 0
  ).length || 0;
  
  report.push({
    fieldName: 'recommendations.benefits',
    populated: recsWithBenefits > 0,
    itemCount: recsWithBenefits,
    notes: `${recsWithBenefits}/${result.recommendations?.length || 0} recommendations have benefits populated`
  });

  // Check recommendations.implementation population
  const recsWithImpl = result.recommendations?.filter((r: any) => 
    r.implementation && r.implementation.length > 0
  ).length || 0;
  
  report.push({
    fieldName: 'recommendations.implementation',
    populated: recsWithImpl > 0,
    itemCount: recsWithImpl,
    notes: `${recsWithImpl}/${result.recommendations?.length || 0} recommendations have implementation steps populated`
  });

  // API Endpoints (expected to be empty)
  report.push({
    fieldName: 'apiEndpoints',
    populated: result.apiEndpoints && result.apiEndpoints.length > 0,
    itemCount: result.apiEndpoints?.length || 0,
    notes: 'Phase 2 feature - not yet implemented'
  });

  // Database Schemas (expected to be empty)
  report.push({
    fieldName: 'databaseSchemas',
    populated: result.databaseSchemas && result.databaseSchemas.length > 0,
    itemCount: result.databaseSchemas?.length || 0,
    notes: 'Phase 2 feature - not yet implemented'
  });

  return report;
}

function displayResults(result: any, report: FieldPopulationReport[], duration: string, fileCount: number) {
  console.log('─'.repeat(80));
  console.log('  ANALYSIS RESULTS');
  console.log('─'.repeat(80));

  console.log(`\n📈 Performance:`);
  console.log(`   - Files analyzed: ${fileCount}`);
  console.log(`   - Analysis time: ${duration}s`);
  console.log(`   - Files per second: ${(fileCount / parseFloat(duration)).toFixed(2)}`);

  console.log(`\n📊 Field Population Report:\n`);
  
  const populatedFields = report.filter(r => r.populated);
  const emptyFields = report.filter(r => !r.populated);

  console.log(`✅ Populated Fields (${populatedFields.length}/${report.length}):\n`);
  populatedFields.forEach(field => {
    console.log(`   ✓ ${field.fieldName}`);
    console.log(`     Count: ${field.itemCount}`);
    console.log(`     ${field.notes}\n`);
  });

  if (emptyFields.length > 0) {
    console.log(`❌ Empty Fields (${emptyFields.length}/${report.length}):\n`);
    emptyFields.forEach(field => {
      console.log(`   ✗ ${field.fieldName}`);
      console.log(`     ${field.notes}\n`);
    });
  }
}

function displayValidationSummary(report: FieldPopulationReport[], duration: string, fileCount: number) {
  console.log('─'.repeat(80));
  console.log('  VALIDATION SUMMARY');
  console.log('─'.repeat(80));

  const populatedCount = report.filter(r => r.populated).length;
  const totalCount = report.length;
  const populationRate = ((populatedCount / totalCount) * 100).toFixed(1);

  console.log(`\n✅ Field Population Rate: ${populationRate}% (${populatedCount}/${totalCount})`);

  // Performance validation
  const filesPerSecond = parseFloat((fileCount / parseFloat(duration)).toFixed(2));
  const performanceRating = filesPerSecond > 100 ? '🚀 Excellent' : 
                           filesPerSecond > 50 ? '✅ Good' : 
                           filesPerSecond > 20 ? '⚠️  Fair' : '❌ Slow';

  console.log(`\n⚡ Performance Rating: ${performanceRating}`);
  console.log(`   - Speed: ${filesPerSecond} files/sec`);

  // Expected empty fields (Phase 2 features)
  const phase2Fields = report.filter(r => 
    r.fieldName === 'apiEndpoints' || r.fieldName === 'databaseSchemas'
  );
  
  console.log(`\n📋 Phase 2 Fields (Expected Empty): ${phase2Fields.length}`);
  phase2Fields.forEach(field => {
    console.log(`   - ${field.fieldName}: ${field.notes}`);
  });

  // Accuracy assessment
  const coreFields = report.filter(r => 
    !r.fieldName.includes('.') && 
    r.fieldName !== 'apiEndpoints' && 
    r.fieldName !== 'databaseSchemas'
  );
  const corePopulated = coreFields.filter(f => f.populated).length;
  const coreAccuracy = ((corePopulated / coreFields.length) * 100).toFixed(1);

  console.log(`\n🎯 Core Features Accuracy: ${coreAccuracy}% (${corePopulated}/${coreFields.length})`);

  // Nested field checks
  const nestedFields = report.filter(r => r.fieldName.includes('.'));
  const nestedPopulated = nestedFields.filter(f => f.populated).length;

  console.log(`\n🔍 Nested Field Population: ${nestedPopulated}/${nestedFields.length}`);
  nestedFields.forEach(field => {
    const status = field.populated ? '✓' : '✗';
    console.log(`   ${status} ${field.fieldName}: ${field.notes}`);
  });

  console.log(`\n${'─'.repeat(80)}\n`);
}

// Run the test
testComplexCodebase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
