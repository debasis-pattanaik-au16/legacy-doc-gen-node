/**
 * Task 2.4 End-to-End Integration Test
 * 
 * Tests the complete API Endpoint Extraction flow including:
 * - Express endpoint detection
 * - Route parameter extraction
 * - Middleware identification
 * - Authentication scheme detection
 * - Router handling
 * - API documentation generation
 * - Export to OpenAPI and Postman formats
 * 
 * Run with: npx ts-node --project tsconfig.json -r tsconfig-paths/register src/scripts/test-task-2.4-integration.ts
 */

import { ExpressEndpointExtractor } from '@/services/api/ExpressEndpointExtractor';
import { APIAnalyzer } from '@/services/api/APIAnalyzer';
import { WebFramework } from '@/types/api';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

console.log('\n' + '='.repeat(80));
console.log('Task 2.4 End-to-End Integration Test');
console.log('Testing: API Endpoint Extraction & Analysis');
console.log('='.repeat(80) + '\n');

let passedTests = 0;
let failedTests = 0;
let tempDir: string;

/**
 * Setup test environment
 */
function setupTestEnvironment(): void {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-'));
  
  // Create project structure
  fs.mkdirSync(path.join(tempDir, 'src', 'routes'), { recursive: true });
  
  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    },
    include: ['src/**/*']
  };
  
  fs.writeFileSync(
    path.join(tempDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );
  
  // Create package.json with Express
  const packageJson = {
    name: 'test-api-project',
    version: '1.0.0',
    dependencies: {
      express: '^4.18.0'
    }
  };
  
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log(`📁 Test environment created at: ${tempDir}\n`);
}

/**
 * Cleanup test environment
 */
function cleanupTestEnvironment(): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log('\n🧹 Test environment cleaned up\n');
}

/**
 * Create a test file in the test environment
 */
function createTestFile(relativePath: string, content: string): void {
  const fullPath = path.join(tempDir, 'src', relativePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content);
}

/**
 * Test helper function
 */
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

/**
 * Run all integration tests
 */
async function runTests() {
  
  // ==================== SECTION 1: Basic Endpoint Extraction ====================
  console.log('📍 Section 1: Basic Endpoint Extraction\n');
  
  await test('Extract simple GET endpoint', async () => {
    createTestFile('app.ts', `
      import express from 'express';
      const app = express();
      
      app.get('/users', (req, res) => {
        res.json({ users: [] });
      });
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const getUsersEndpoint = endpoints.find(e => e.path === '/users' && e.method === 'GET');
    
    if (getUsersEndpoint) {
      console.log(`\n  Endpoint: GET ${getUsersEndpoint.path}`);
      console.log(`  Handler: ${getUsersEndpoint.handler.name}`);
      console.log(`  Framework: ${getUsersEndpoint.framework}`);
    }
    
    return getUsersEndpoint !== undefined;
  });
  
  await test('Extract multiple HTTP methods', async () => {
    createTestFile('crud.ts', `
      import express from 'express';
      const app = express();
      
      app.get('/posts', (req, res) => res.json([]));
      app.post('/posts', (req, res) => res.json({}));
      app.put('/posts/:id', (req, res) => res.json({}));
      app.delete('/posts/:id', (req, res) => res.status(204).send());
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const methods = new Set(endpoints.map(e => e.method));
    
    console.log(`\n  HTTP Methods detected: ${Array.from(methods).join(', ')}`);
    console.log(`  Total endpoints: ${endpoints.length}`);
    
    return methods.has('GET') && methods.has('POST') && 
           methods.has('PUT') && methods.has('DELETE');
  });
  
  // ==================== SECTION 2: Route Parameters ====================
  console.log('\n📍 Section 2: Route Parameters\n');
  
  await test('Extract route parameters', async () => {
    createTestFile('params.ts', `
      import express from 'express';
      const app = express();
      
      app.get('/users/:userId/posts/:postId', (req, res) => {
        res.json({});
      });
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const endpoint = endpoints.find(e => e.path.includes(':userId'));
    
    if (endpoint) {
      console.log(`\n  Path: ${endpoint.path}`);
      console.log(`  Parameters found: ${endpoint.parameters?.length || 0}`);
      endpoint.parameters?.forEach((param: any) => {
        console.log(`    - ${param.name} (${param.in}, required: ${param.required})`);
      });
    }
    
    return endpoint?.parameters?.length === 2 &&
           endpoint.parameters?.some((p: any) => p.name === 'userId') &&
           endpoint.parameters?.some((p: any) => p.name === 'postId');
  });
  
  await test('Detect optional parameters', async () => {
    createTestFile('optional-params.ts', `
      import express from 'express';
      const app = express();
      
      app.get('/files/:category/:filename?', (req, res) => {
        res.json({});
      });
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const endpoint = endpoints.find(e => e.path.includes('filename?'));
    const requiredParam = endpoint?.parameters?.find((p: any) => p.name === 'category');
    const optionalParam = endpoint?.parameters?.find((p: any) => p.name === 'filename');
    
    if (endpoint) {
      console.log(`\n  Path: ${endpoint.path}`);
      console.log(`  Required params: ${endpoint.parameters?.filter((p: any) => p.required).length}`);
      console.log(`  Optional params: ${endpoint.parameters?.filter((p: any) => !p.required).length}`);
    }
    
    return requiredParam?.required === true && optionalParam?.required === false;
  });
  
  // ==================== SECTION 3: Middleware Detection ====================
  console.log('\n📍 Section 3: Middleware Detection\n');
  
  await test('Extract route-level middleware', async () => {
    createTestFile('middleware.ts', `
      import express from 'express';
      const app = express();
      
      const authMiddleware = (req, res, next) => next();
      const validateMiddleware = (req, res, next) => next();
      
      app.get('/protected', authMiddleware, validateMiddleware, (req, res) => {
        res.json({});
      });
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const endpoint = endpoints.find(e => e.path === '/protected');
    
    if (endpoint) {
      console.log(`\n  Endpoint: ${endpoint.method} ${endpoint.path}`);
      console.log(`  Middleware count: ${endpoint.middlewares?.length || 0}`);
      endpoint.middlewares?.forEach((m: any) => {
        console.log(`    - ${m.name} (type: ${m.type}, order: ${m.order})`);
      });
    }
    
    return endpoint?.middlewares?.length === 2 &&
           endpoint.middlewares?.some((m: any) => m.name === 'authMiddleware') &&
           endpoint.middlewares?.some((m: any) => m.name === 'validateMiddleware');
  });
  
  await test('Infer middleware types', async () => {
    createTestFile('typed-middleware.ts', `
      import express from 'express';
      const app = express();
      
      const jwtAuth = (req, res, next) => next();
      const validateRequest = (req, res, next) => next();
      const logRequest = (req, res, next) => next();
      const corsMiddleware = (req, res, next) => next();
      
      app.get('/api/data', jwtAuth, validateRequest, logRequest, corsMiddleware, (req, res) => {
        res.json({});
      });
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const endpoint = endpoints.find(e => e.path === '/api/data');
    
    if (endpoint) {
      console.log(`\n  Middleware type inference:`);
      endpoint.middlewares?.forEach((m: any) => {
        console.log(`    - ${m.name} → ${m.type}`);
      });
    }
    
    return endpoint?.middlewares?.some((m: any) => m.type === 'authentication') &&
           endpoint.middlewares?.some((m: any) => m.type === 'validation') &&
           endpoint.middlewares?.some((m: any) => m.type === 'logging') &&
           endpoint.middlewares?.some((m: any) => m.type === 'cors') || false;
  });
  
  // ==================== SECTION 4: Authentication Detection ====================
  console.log('\n📍 Section 4: Authentication Scheme Detection\n');
  
  await test('Detect JWT authentication', async () => {
    createTestFile('jwt-auth.ts', `
      import express from 'express';
      const app = express();
      
      const jwtAuth = (req, res, next) => next();
      
      app.get('/protected', jwtAuth, (req, res) => {
        res.json({});
      });
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const endpoint = endpoints.find(e => e.path === '/protected');
    
    if (endpoint?.authentication) {
      console.log(`\n  Authentication detected:`);
      console.log(`    Type: ${endpoint.authentication.type}`);
      console.log(`    Scheme: ${endpoint.authentication.scheme}`);
      console.log(`    Description: ${endpoint.authentication.description}`);
    }
    
    return endpoint?.authentication?.type === 'bearer' &&
           endpoint.authentication.scheme === 'JWT';
  });
  
  await test('Detect API key authentication', async () => {
    createTestFile('apikey-auth.ts', `
      import express from 'express';
      const app = express();
      
      const apiKeyAuth = (req, res, next) => next();
      
      app.get('/api/resource', apiKeyAuth, (req, res) => {
        res.json({});
      });
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    const endpoints = await extractor.extractEndpoints();
    
    const endpoint = endpoints.find(e => e.path === '/api/resource');
    
    if (endpoint?.authentication) {
      console.log(`\n  Authentication detected:`);
      console.log(`    Type: ${endpoint.authentication.type}`);
      console.log(`    In: ${endpoint.authentication.in}`);
      console.log(`    Name: ${endpoint.authentication.name}`);
    }
    
    return endpoint?.authentication?.type === 'apiKey' &&
           endpoint.authentication.in === 'header';
  });
  
  // ==================== SECTION 5: Router Handling ====================
  console.log('\n📍 Section 5: Router Handling\n');
  
  await test('Detect router initialization', async () => {
    createTestFile('routes/users.ts', `
      import express from 'express';
      const userRouter = express.Router();
      
      userRouter.get('/profile', (req, res) => res.json({}));
      userRouter.post('/settings', (req, res) => res.json({}));
      
      export default userRouter;
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    await extractor.extractEndpoints();
    const routers = extractor.getRouters();
    
    const userRouter = routers.find(r => r.name === 'userRouter');
    
    if (userRouter) {
      console.log(`\n  Router: ${userRouter.name}`);
      console.log(`  Base path: ${userRouter.basePath}`);
      console.log(`  Endpoints: ${userRouter.endpoints.length}`);
    }
    
    return userRouter !== undefined && userRouter.basePath === '/users';
  });
  
  await test('Handle nested routers', async () => {
    createTestFile('nested-routers.ts', `
      import express from 'express';
      const app = express();
      const apiRouter = express.Router();
      const userRouter = express.Router();
      
      userRouter.get('/list', (req, res) => res.json([]));
      apiRouter.use('/users', userRouter);
      app.use('/api', apiRouter);
    `);
    
    const extractor = new ExpressEndpointExtractor(tempDir);
    await extractor.extractEndpoints();
    const routers = extractor.getRouters();
    
    const userRouter = routers.find(r => r.name === 'userRouter');
    
    if (userRouter) {
      console.log(`\n  Nested router: ${userRouter.name}`);
      console.log(`  Updated base path: ${userRouter.basePath}`);
    }
    
    return userRouter?.basePath === '/users';
  });
  
  // ==================== SECTION 6: API Analyzer Integration ====================
  console.log('\n📍 Section 6: API Analyzer Integration\n');
  
  await test('Framework auto-detection', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    await analyzer.analyze();
    
    const frameworks = analyzer.getDetectedFrameworks();
    
    console.log(`\n  Detected frameworks: ${frameworks.join(', ')}`);
    
    return frameworks.includes('EXPRESS');
  });
  
  await test('Complete API analysis with statistics', async () => {
    // Create comprehensive API
    createTestFile('comprehensive-api.ts', `
      import express from 'express';
      const app = express();
      
      const jwtAuth = (req, res, next) => next();
      
      // Public endpoints
      app.get('/health', (req, res) => res.json({ status: 'ok' }));
      app.get('/api/v1/products', (req, res) => res.json([]));
      
      // Protected endpoints
      app.get('/api/v1/users/:id', jwtAuth, (req, res) => res.json({}));
      app.post('/api/v1/orders', jwtAuth, (req, res) => res.json({}));
      app.put('/api/v1/orders/:orderId', jwtAuth, (req, res) => res.json({}));
      app.delete('/api/v1/orders/:orderId', jwtAuth, (req, res) => res.status(204).send());
    `);
    
    const analyzer = new APIAnalyzer(tempDir);
    const result = await analyzer.analyze();
    
    console.log(`\n  Analysis Results:`);
    console.log(`    Total Endpoints: ${result.statistics.totalEndpoints}`);
    console.log(`    Authenticated: ${result.statistics.authenticatedEndpoints}`);
    console.log(`    With Parameters: ${result.statistics.endpointsWithParameters}`);
    console.log(`    Methods:`);
    Object.entries(result.statistics.byMethod).forEach(([method, count]) => {
      console.log(`      ${method}: ${count}`);
    });
    
    return result.statistics.totalEndpoints >= 6 &&
           result.statistics.authenticatedEndpoints >= 4;
  });
  
  await test('Generate API documentation', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    const result = await analyzer.analyze();
    
    console.log(`\n  Documentation:`);
    console.log(`    Title: ${result.documentation.title}`);
    console.log(`    Version: ${result.documentation.version}`);
    console.log(`    Base URL: ${result.documentation.baseUrl}`);
    console.log(`    Tags: ${result.documentation.tags.length}`);
    result.documentation.tags.forEach((tag: any) => {
      console.log(`      - ${tag.name} (${tag.endpoints} endpoints)`);
    });
    
    return result.documentation.title.includes('API') &&
           result.documentation.version &&
           result.documentation.tags.length > 0;
  });
  
  await test('Security schemes aggregation', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    const result = await analyzer.analyze();
    
    console.log(`\n  Security Schemes: ${result.securitySchemes.length}`);
    result.securitySchemes.forEach((scheme: any) => {
      console.log(`    - Type: ${scheme.type}, Scheme: ${scheme.scheme || 'N/A'}`);
    });
    
    return result.securitySchemes.length > 0;
  });
  
  // ==================== SECTION 7: Export Formats ====================
  console.log('\n📍 Section 7: Export Formats\n');
  
  await test('Export to JSON format', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    await analyzer.analyze();
    
    const jsonExport = analyzer.exportToFormat('json');
    const parsed = JSON.parse(jsonExport);
    
    console.log(`\n  JSON Export:`);
    console.log(`    Endpoints: ${parsed.endpoints.length}`);
    console.log(`    Frameworks: ${parsed.frameworks.join(', ')}`);
    console.log(`    Exported at: ${parsed.exportedAt}`);
    
    return parsed.endpoints && Array.isArray(parsed.endpoints) &&
           parsed.frameworks && parsed.exportedAt;
  });
  
  await test('Export to OpenAPI 3.0 format', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    await analyzer.analyze();
    
    const openApiExport = analyzer.exportToFormat('openapi');
    const parsed = JSON.parse(openApiExport);
    
    console.log(`\n  OpenAPI 3.0 Export:`);
    console.log(`    Version: ${parsed.openapi}`);
    console.log(`    Title: ${parsed.info.title}`);
    console.log(`    Paths: ${Object.keys(parsed.paths).length}`);
    console.log(`    Components: ${Object.keys(parsed.components || {}).length}`);
    console.log(`    Sample paths:`);
    Object.keys(parsed.paths).slice(0, 3).forEach(p => {
      console.log(`      - ${p}`);
    });
    
    return parsed.openapi === '3.0.0' &&
           parsed.info &&
           parsed.paths &&
           Object.keys(parsed.paths).length > 0;
  });
  
  await test('Export to Postman collection format', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    await analyzer.analyze();
    
    const postmanExport = analyzer.exportToFormat('postman');
    const parsed = JSON.parse(postmanExport);
    
    console.log(`\n  Postman Collection Export:`);
    console.log(`    Name: ${parsed.info.name}`);
    console.log(`    Schema: ${parsed.info.schema}`);
    console.log(`    Item groups: ${parsed.item.length}`);
    console.log(`    Variables: ${parsed.variable.length}`);
    
    return parsed.info &&
           parsed.info.schema.includes('postman') &&
           parsed.item &&
           Array.isArray(parsed.item);
  });
  
  // ==================== SECTION 8: Endpoint Filtering ====================
  console.log('\n📍 Section 8: Endpoint Filtering\n');
  
  await test('Filter by HTTP method', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    await analyzer.analyze();
    
    const getEndpoints = analyzer.filterEndpoints({ method: 'GET' });
    const postEndpoints = analyzer.filterEndpoints({ method: 'POST' });
    
    console.log(`\n  Filtering results:`);
    console.log(`    GET endpoints: ${getEndpoints.length}`);
    console.log(`    POST endpoints: ${postEndpoints.length}`);
    
    return getEndpoints.every(e => e.method === 'GET') &&
           postEndpoints.every(e => e.method === 'POST');
  });
  
  await test('Filter by authentication status', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    await analyzer.analyze();
    
    const authenticatedEndpoints = analyzer.filterEndpoints({ authenticated: true });
    const publicEndpoints = analyzer.filterEndpoints({ authenticated: false });
    
    console.log(`\n  Authentication filtering:`);
    console.log(`    Authenticated endpoints: ${authenticatedEndpoints.length}`);
    console.log(`    Public endpoints: ${publicEndpoints.length}`);
    
    return authenticatedEndpoints.every(e => e.authentication !== undefined) &&
           publicEndpoints.every(e => e.authentication === undefined);
  });
  
  await test('Filter by multiple criteria', async () => {
    const analyzer = new APIAnalyzer(tempDir);
    await analyzer.analyze();
    
    const filtered = analyzer.filterEndpoints({
      method: 'GET',
      authenticated: true
    });
    
    console.log(`\n  Combined filter (GET + authenticated): ${filtered.length} endpoints`);
    
    return filtered.every(e => e.method === 'GET' && e.authentication !== undefined);
  });
  
  // ==================== SECTION 9: Edge Cases ====================
  console.log('\n📍 Section 9: Edge Cases\n');
  
  await test('Handle project with no endpoints', async () => {
    // Clear previous files
    const srcDir = path.join(tempDir, 'src');
    fs.readdirSync(srcDir).forEach(file => {
      const filePath = path.join(srcDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
    
    createTestFile('empty.ts', 'console.log("no endpoints");');
    
    const analyzer = new APIAnalyzer(tempDir);
    const result = await analyzer.analyze();
    
    console.log(`\n  Empty project analysis:`);
    console.log(`    Endpoints found: ${result.endpoints.length}`);
    console.log(`    Frameworks detected: ${result.frameworks.join(', ')}`);
    
    return result.endpoints.length === 0;
  });
  
  await test('Handle complex nested structure', async () => {
    createTestFile('complex-app.ts', `
      import express from 'express';
      const app = express();
      const apiRouter = express.Router();
      const v1Router = express.Router();
      const usersRouter = express.Router();
      
      const authMiddleware = (req, res, next) => next();
      
      usersRouter.get('/', (req, res) => res.json([]));
      usersRouter.get('/:id', (req, res) => res.json({}));
      usersRouter.post('/', authMiddleware, (req, res) => res.json({}));
      
      v1Router.use('/users', usersRouter);
      apiRouter.use('/v1', v1Router);
      app.use('/api', apiRouter);
    `);
    
    const analyzer = new APIAnalyzer(tempDir);
    const result = await analyzer.analyze();
    
    console.log(`\n  Complex nesting analysis:`);
    console.log(`    Routers detected: ${result.routers.length}`);
    console.log(`    Endpoints extracted: ${result.endpoints.length}`);
    
    return result.routers.length > 0 && result.endpoints.length >= 3;
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    setupTestEnvironment();
    await runTests();
  } catch (error: any) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
  } finally {
    cleanupTestEnvironment();
  }
  
  // Print summary
  console.log('='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);
  console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');
  
  process.exit(failedTests > 0 ? 1 : 0);
}

main();
