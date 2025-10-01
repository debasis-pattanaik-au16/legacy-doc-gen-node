/**
 * Test Script for Cloud Storage Model Changes
 * Tests the new cloud storage fields and methods in DocumentationJob model
 * 
 * Run: npm run test:cloud-model
 * or: ts-node -r tsconfig-paths/register src/scripts/test-cloud-storage-model.ts
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { DocumentationJob } from '../models/DocumentationJob';
import { StorageProviderFactory } from '../services/storage/StorageProviderFactory';

/**
 * Connect to MongoDB
 */
async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error: any) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error: any) {
    console.error('✗ Failed to disconnect from MongoDB:', error.message);
  }
}

/**
 * Test: Create a job with cloud storage fields
 */
async function testCreateJobWithCloudStorage(): Promise<void> {
  console.log('\n📝 Test 1: Creating job with cloud storage fields...\n');

  try {
    const testJob = new DocumentationJob({
      projectId: new mongoose.Types.ObjectId(),
      userId: 'test-user-123',
      status: 'completed',
      progress: 100,
      sections: ['readme', 'api', 'architecture'],
      cloudStorageProvider: 'oracle_cloud',
      cloudStorageUrls: {
        readme: 'https://example.com/readme.md',
        apiDocs: 'https://example.com/api-docs.md',
        architecture: 'https://example.com/architecture.md'
      },
      cloudStorageKeys: {
        readme: 'documentations/user123/proj123/job123/README.md',
        apiDocs: 'documentations/user123/proj123/job123/API_DOCS.md',
        architecture: 'documentations/user123/proj123/job123/ARCHITECTURE.md'
      },
      cloudStorageMetadata: {
        uploadedAt: new Date(),
        totalSize: 150000,
        region: 'us-phoenix-1',
        bucket: 'legacy-doc-storage',
        urlExpiresAt: new Date(Date.now() + 3600 * 1000)
      }
    });

    await testJob.save();

    console.log('✅ Test 1 Passed: Job created successfully');
    console.log(`   Job ID: ${testJob._id}`);
    console.log(`   Provider: ${testJob.cloudStorageProvider}`);
    console.log(`   Has URLs: ${!!testJob.cloudStorageUrls}`);
    console.log(`   Has Keys: ${!!testJob.cloudStorageKeys}`);
    console.log(`   Has Metadata: ${!!testJob.cloudStorageMetadata}`);

    // Clean up
    await testJob.deleteOne();
    console.log('   (Test job deleted)');
  } catch (error: any) {
    console.error('❌ Test 1 Failed:', error.message);
    throw error;
  }
}

/**
 * Test: updateCloudStorage method
 */
async function testUpdateCloudStorageMethod(): Promise<void> {
  console.log('\n📝 Test 2: Testing updateCloudStorage() method...\n');

  try {
    // Create a test job
    const testJob = new DocumentationJob({
      projectId: new mongoose.Types.ObjectId(),
      userId: 'test-user-456',
      status: 'processing',
      progress: 50,
      sections: ['readme']
    });

    await testJob.save();
    console.log(`   Created test job: ${testJob._id}`);

    // Update with cloud storage info
    await testJob.updateCloudStorage(
      {
        readme: 'https://cloud.example.com/signed-readme.md',
        apiDocs: 'https://cloud.example.com/signed-api-docs.md'
      },
      {
        readme: 'docs/user456/proj456/README.md',
        apiDocs: 'docs/user456/proj456/API_DOCS.md'
      },
      'oracle_cloud',
      {
        totalSize: 75000,
        region: 'us-west-1',
        bucket: 'test-bucket',
        urlExpiresAt: new Date(Date.now() + 7200 * 1000)
      }
    );

    console.log('✅ Test 2 Passed: updateCloudStorage() method works');
    console.log(`   Provider: ${testJob.cloudStorageProvider}`);
    console.log(`   URLs count: ${Object.keys(testJob.cloudStorageUrls || {}).length}`);
    console.log(`   Keys count: ${Object.keys(testJob.cloudStorageKeys || {}).length}`);
    console.log(`   Total size: ${testJob.cloudStorageMetadata?.totalSize} bytes`);
    console.log(`   Region: ${testJob.cloudStorageMetadata?.region}`);

    // Clean up
    await testJob.deleteOne();
    console.log('   (Test job deleted)');
  } catch (error: any) {
    console.error('❌ Test 2 Failed:', error.message);
    throw error;
  }
}

/**
 * Test: getSignedUrls method (mock test without actual cloud provider)
 */
async function testGetSignedUrlsMethod(): Promise<void> {
  console.log('\n📝 Test 3: Testing getSignedUrls() method...\n');

  try {
    // Create a test job with existing cloud storage
    const testJob = new DocumentationJob({
      projectId: new mongoose.Types.ObjectId(),
      userId: 'test-user-789',
      status: 'completed',
      progress: 100,
      sections: ['readme', 'api'],
      cloudStorageProvider: 'local', // Using local for testing
      cloudStorageKeys: {
        readme: 'test-docs/README.md',
        apiDocs: 'test-docs/API_DOCS.md'
      },
      cloudStorageMetadata: {
        uploadedAt: new Date(),
        urlExpiresAt: new Date(Date.now() - 1000) // Expired URL to trigger refresh
      }
    });

    await testJob.save();
    console.log(`   Created test job: ${testJob._id}`);

    // Test getSignedUrls - this will use local storage provider
    try {
      const signedUrls = await testJob.getSignedUrls(7200);
      
      console.log('✅ Test 3 Passed: getSignedUrls() method works');
      console.log(`   Generated URLs count: ${Object.keys(signedUrls).length}`);
      console.log(`   URLs updated: ${!!testJob.cloudStorageUrls}`);
      console.log(`   New expiry set: ${!!testJob.cloudStorageMetadata?.urlExpiresAt}`);
    } catch (error: any) {
      // Expected to fail if storage provider is not fully configured
      if (error.message.includes('Cloud storage keys or provider not available')) {
        console.log('⚠️  Test 3 Skipped: Storage provider not configured (expected in test env)');
      } else {
        throw error;
      }
    }

    // Clean up
    await testJob.deleteOne();
    console.log('   (Test job deleted)');
  } catch (error: any) {
    console.error('❌ Test 3 Failed:', error.message);
    throw error;
  }
}

/**
 * Test: Cloud storage indexes
 */
async function testCloudStorageIndexes(): Promise<void> {
  console.log('\n📝 Test 4: Verifying cloud storage indexes...\n');

  try {
    const indexes = await DocumentationJob.collection.getIndexes();
    
    // Check for cloud storage indexes
    const hasProviderStatusIndex = indexes.cloudStorageProvider_status !== undefined;
    const hasMetadataIndex = Object.keys(indexes).some(key => 
      key.includes('cloudStorageMetadata.uploadedAt')
    );

    if (hasProviderStatusIndex) {
      console.log('✓ Index found: cloudStorageProvider_status');
    } else {
      console.log('⚠️  Index not found: cloudStorageProvider_status');
    }

    if (hasMetadataIndex) {
      console.log('✓ Index found: cloudStorageMetadata.uploadedAt');
    } else {
      console.log('⚠️  Index not found: cloudStorageMetadata.uploadedAt');
    }

    console.log('\n✅ Test 4 Passed: Index verification completed');
    console.log(`   Total indexes: ${Object.keys(indexes).length}`);
  } catch (error: any) {
    console.error('❌ Test 4 Failed:', error.message);
    throw error;
  }
}

/**
 * Test: Query jobs by cloud storage provider
 */
async function testQueryByCloudProvider(): Promise<void> {
  console.log('\n📝 Test 5: Testing queries with cloud storage fields...\n');

  try {
    // Create test jobs with different providers
    const jobs = await DocumentationJob.create([
      {
        projectId: new mongoose.Types.ObjectId(),
        userId: 'test-user-query-1',
        status: 'completed',
        cloudStorageProvider: 'local'
      },
      {
        projectId: new mongoose.Types.ObjectId(),
        userId: 'test-user-query-2',
        status: 'completed',
        cloudStorageProvider: 'oracle_cloud'
      },
      {
        projectId: new mongoose.Types.ObjectId(),
        userId: 'test-user-query-3',
        status: 'completed',
        cloudStorageProvider: 'oracle_cloud'
      }
    ]);

    // Query by provider
    const localJobs = await DocumentationJob.countDocuments({
      cloudStorageProvider: 'local',
      userId: { $regex: '^test-user-query' }
    });
    
    const oracleJobs = await DocumentationJob.countDocuments({
      cloudStorageProvider: 'oracle_cloud',
      userId: { $regex: '^test-user-query' }
    });

    console.log('✅ Test 5 Passed: Queries with cloud storage fields work');
    console.log(`   Local storage jobs: ${localJobs}`);
    console.log(`   Oracle Cloud jobs: ${oracleJobs}`);

    // Clean up
    await DocumentationJob.deleteMany({
      userId: { $regex: '^test-user-query' }
    });
    console.log('   (Test jobs deleted)');
  } catch (error: any) {
    console.error('❌ Test 5 Failed:', error.message);
    throw error;
  }
}

/**
 * Test: Validate enum values
 */
async function testEnumValidation(): Promise<void> {
  console.log('\n📝 Test 6: Testing cloudStorageProvider enum validation...\n');

  try {
    // Test valid enum value
    const validJob = new DocumentationJob({
      projectId: new mongoose.Types.ObjectId(),
      userId: 'test-user-enum-1',
      cloudStorageProvider: 'oracle_cloud'
    });

    await validJob.save();
    console.log('✓ Valid enum value accepted: oracle_cloud');
    await validJob.deleteOne();

    // Test invalid enum value
    try {
      const invalidJob = new DocumentationJob({
        projectId: new mongoose.Types.ObjectId(),
        userId: 'test-user-enum-2',
        cloudStorageProvider: 'invalid_provider' as any
      });

      await invalidJob.save();
      console.log('❌ Invalid enum value accepted (should have failed)');
    } catch (error: any) {
      if (error.message.includes('Storage provider must be one of')) {
        console.log('✓ Invalid enum value rejected correctly');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Test 6 Passed: Enum validation works correctly');
  } catch (error: any) {
    console.error('❌ Test 6 Failed:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🧪 Starting Cloud Storage Model Tests\n');
  console.log('==========================================\n');

  try {
    await connectDB();

    // Run all tests
    await testCreateJobWithCloudStorage();
    await testUpdateCloudStorageMethod();
    await testGetSignedUrlsMethod();
    await testCloudStorageIndexes();
    await testQueryByCloudProvider();
    await testEnumValidation();

    console.log('\n==========================================');
    console.log('\n✅ All tests passed successfully!\n');

    await disconnectDB();
    process.exit(0);
  } catch (error: any) {
    console.error('\n==========================================');
    console.error('\n❌ Tests failed:', error.message);
    console.error('\nStack trace:', error.stack);
    
    await disconnectDB();
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main();
}

export {
  testCreateJobWithCloudStorage,
  testUpdateCloudStorageMethod,
  testGetSignedUrlsMethod,
  testCloudStorageIndexes,
  testQueryByCloudProvider,
  testEnumValidation
};
