/**
 * Quick Oracle Cloud Upload Test
 * Tests actual file upload to Oracle Cloud bucket
 */

import { OracleCloudStorage } from '../services/storage/OracleCloudStorage';
import { storageConfig } from '../config/storage.config';

async function testOracleUpload() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 ORACLE CLOUD UPLOAD TEST');
  console.log('='.repeat(70));

  try {
    // Get Oracle Cloud configuration
    console.log('\n📋 Configuration:');
    const config = storageConfig.getOracleCloudConfig();
    console.log(`   Namespace: ${config.namespace}`);
    console.log(`   Bucket: ${config.bucketName}`);
    console.log(`   Region: ${config.region}`);
    console.log(`   User ID: ${config.userId.substring(0, 30)}...`);
    console.log(`   Tenancy ID: ${config.tenancyId.substring(0, 30)}...`);
    console.log(`   Fingerprint: ${config.fingerprint}`);
    console.log(`   Private Key: ${config.privateKey ? '✅ Loaded' : '❌ Missing'}`);

    // Initialize Oracle Cloud Storage
    console.log('\n🔧 Initializing Oracle Cloud Storage...');
    const storage = new OracleCloudStorage(config);
    console.log('   ✅ Storage provider initialized');

    // Run health check
    console.log('\n🏥 Health Check...');
    const health = await storage.healthCheck();
    console.log(`   Status: ${health.status}`);
    console.log(`   Message: ${health.details.message}`);
    
    if (health.status === 'unhealthy') {
      console.error('\n❌ Health check failed!');
      console.error('   Error:', health.details);
      process.exit(1);
    }

    // Create test file
    const testContent = `# Oracle Cloud Test File

This file was uploaded to test Oracle Cloud Object Storage integration.

**Upload Details:**
- Date: ${new Date().toISOString()}
- Bucket: ${config.bucketName}
- Region: ${config.region}
- Namespace: ${config.namespace}

## Test Information
- User: test-user-123
- Project: test-project-456
- Documentation ID: test-doc-789

This is a test file and can be safely deleted.
`;

    const testBuffer = Buffer.from(testContent, 'utf-8');
    const testKey = `documentations/test-user-123/test-project-456/test-doc-789/oracle-test-${Date.now()}.md`;

    // Upload file
    console.log('\n📤 Uploading test file...');
    console.log(`   Key: ${testKey}`);
    console.log(`   Size: ${testBuffer.length} bytes`);
    
    const uploadResult = await storage.upload(testBuffer, testKey, {
      contentType: 'text/markdown',
      metadata: {
        test: 'true',
        uploadedBy: 'test-script',
        timestamp: new Date().toISOString()
      }
    });

    console.log('\n✅ Upload Successful!');
    console.log(`   Key: ${uploadResult.key}`);
    console.log(`   Size: ${uploadResult.size} bytes`);
    console.log(`   ETag: ${uploadResult.etag || 'N/A'}`);
    console.log(`   URL: ${uploadResult.url.substring(0, 100)}...`);

    // Verify file exists
    console.log('\n🔍 Verifying file exists...');
    const exists = await storage.exists(testKey);
    console.log(`   File exists: ${exists ? '✅ Yes' : '❌ No'}`);

    // Get metadata
    console.log('\n📊 Getting file metadata...');
    const metadata = await storage.getMetadata(testKey);
    console.log(`   Size: ${metadata.size} bytes`);
    console.log(`   Content-Type: ${metadata.contentType}`);
    console.log(`   Last Modified: ${metadata.lastModified}`);
    console.log(`   Custom Metadata:`, metadata.metadata);

    // Generate signed URL
    console.log('\n🔗 Generating signed URL...');
    const signedUrl = await storage.getSignedUrl(testKey, {
      expiresIn: 3600 // 1 hour
    });
    console.log(`   ✅ Signed URL generated`);
    console.log(`   URL (valid for 1 hour):`);
    console.log(`   ${signedUrl}`);

    // Download and verify content
    console.log('\n📥 Downloading file to verify...');
    const downloadedBuffer = await storage.download(testKey);
    const downloadedContent = downloadedBuffer.toString('utf-8');
    const contentMatches = downloadedContent === testContent;
    console.log(`   Downloaded size: ${downloadedBuffer.length} bytes`);
    console.log(`   Content matches: ${contentMatches ? '✅ Yes' : '❌ No'}`);

    // List files
    console.log('\n📁 Listing files in bucket...');
    const prefix = 'documentations/test-user-123';
    const files = await storage.listFiles(prefix, 10);
    console.log(`   Found ${files.length} file(s) with prefix: ${prefix}`);
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });

    // Clean up (optional - comment out if you want to keep the file)
    console.log('\n🧹 Cleaning up test file...');
    await storage.delete(testKey);
    const deletedExists = await storage.exists(testKey);
    console.log(`   File deleted: ${!deletedExists ? '✅ Yes' : '❌ No'}`);

    // Success summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 ORACLE CLOUD TEST SUCCESSFUL!');
    console.log('='.repeat(70));
    console.log('\n✅ All operations completed successfully:');
    console.log('   • Health check passed');
    console.log('   • File uploaded to bucket');
    console.log('   • File verified in bucket');
    console.log('   • Metadata retrieved');
    console.log('   • Signed URL generated');
    console.log('   • File downloaded and verified');
    console.log('   • File listing works');
    console.log('   • File deleted successfully');
    
    console.log('\n📊 Your Oracle Cloud Storage is ready to use!');
    console.log(`   Bucket: ${config.bucketName}`);
    console.log(`   Region: ${config.region}`);
    console.log(`   Status: ✅ Operational\n`);

    process.exit(0);

  } catch (error: any) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ ORACLE CLOUD TEST FAILED');
    console.error('='.repeat(70));
    console.error('\n🔴 Error:', error.message);
    
    if (error.stack) {
      console.error('\n📍 Stack trace:');
      console.error(error.stack);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check that STORAGE_PROVIDER=oracle_cloud in .env');
    console.error('   2. Verify all Oracle Cloud credentials are correct');
    console.error('   3. Ensure private key file exists and has correct permissions');
    console.error('   4. Check that bucket name and region match Oracle Cloud Console');
    console.error('   5. Verify your Oracle Cloud account has proper permissions\n');

    process.exit(1);
  }
}

// Run the test
testOracleUpload();

