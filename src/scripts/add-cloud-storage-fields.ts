/**
 * Database Migration Script
 * Adds cloud storage fields to existing DocumentationJob documents
 * 
 * This migration updates:
 * - Renames old storage fields to new cloudStorage fields
 * - Adds cloudStorageMetadata field with proper structure
 * - Updates cloudStorageProvider enum values
 * - Ensures all documents have default values
 * 
 * Run: npm run migrate:cloud-storage
 * or: ts-node src/scripts/add-cloud-storage-fields.ts
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { DocumentationJob } from '../models/DocumentationJob';

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
 * Migrate storage fields to cloud storage fields
 */
async function migrateCloudStorageFields(): Promise<void> {
  console.log('\n🔄 Starting cloud storage fields migration...\n');

  try {
    // Get all documentation jobs
    const jobs = await DocumentationJob.find({});
    console.log(`Found ${jobs.length} documentation jobs to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const job of jobs) {
      try {
        let hasChanges = false;

        // Check if old field names exist and migrate them
        const jobDoc = job.toObject() as any;

        // Migrate storageUrls -> cloudStorageUrls
        if (jobDoc.storageUrls && !jobDoc.cloudStorageUrls) {
          job.cloudStorageUrls = {
            readme: jobDoc.storageUrls.readme,
            apiDocs: jobDoc.storageUrls.apiDocs,
            architecture: jobDoc.storageUrls.architecture,
            components: jobDoc.storageUrls.components,
            dependencies: jobDoc.storageUrls.dependencies,
            zipArchive: jobDoc.storageUrls.archiveUrl
          };
          hasChanges = true;
        }

        // Migrate storageKeys -> cloudStorageKeys
        if (jobDoc.storageKeys && !jobDoc.cloudStorageKeys) {
          job.cloudStorageKeys = {
            readme: jobDoc.storageKeys.readme,
            apiDocs: jobDoc.storageKeys.apiDocs,
            architecture: jobDoc.storageKeys.architecture,
            components: jobDoc.storageKeys.components,
            dependencies: jobDoc.storageKeys.dependencies,
            zipArchive: jobDoc.storageKeys.archiveKey
          };
          hasChanges = true;
        }

        // Migrate storageProvider -> cloudStorageProvider
        if (jobDoc.storageProvider && !jobDoc.cloudStorageProvider) {
          // Map old provider names to new ones
          const providerMap: Record<string, 'local' | 'oracle_cloud' | 'aws_s3' | 'azure_blob' | 'gcp'> = {
            'local': 'local',
            's3': 'aws_s3',
            'azure': 'azure_blob',
            'gcp': 'gcp'
          };
          job.cloudStorageProvider = (providerMap[jobDoc.storageProvider] || 'local') as any;
          hasChanges = true;
        }

        // Initialize cloudStorageMetadata if not present
        if (!jobDoc.cloudStorageMetadata || Object.keys(jobDoc.cloudStorageMetadata).length === 0) {
          job.cloudStorageMetadata = {
            uploadedAt: job.completedAt || job.createdAt,
            totalSize: undefined,
            region: undefined,
            bucket: undefined,
            urlExpiresAt: undefined
          };
          hasChanges = true;
        }

        // Set default values if fields don't exist
        if (!jobDoc.cloudStorageProvider) {
          job.cloudStorageProvider = 'local' as any;
          hasChanges = true;
        }

        if (!jobDoc.cloudStorageUrls) {
          job.cloudStorageUrls = {};
          hasChanges = true;
        }

        if (!jobDoc.cloudStorageKeys) {
          job.cloudStorageKeys = {};
          hasChanges = true;
        }

        // Save if changes were made
        if (hasChanges) {
          await job.save();
          migratedCount++;
          console.log(`✓ Migrated job ${job._id} (Project: ${job.projectId})`);
        } else {
          skippedCount++;
        }
      } catch (error: any) {
        errorCount++;
        console.error(`✗ Error migrating job ${job._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  • Total jobs: ${jobs.length}`);
    console.log(`  • Migrated: ${migratedCount}`);
    console.log(`  • Skipped (already migrated): ${skippedCount}`);
    console.log(`  • Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!\n');
    } else {
      console.log('\n⚠️  Migration completed with errors\n');
    }
  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Create indexes for new fields
 */
async function createIndexes(): Promise<void> {
  console.log('\n🔄 Creating indexes for cloud storage fields...\n');

  try {
    await DocumentationJob.collection.createIndex(
      { cloudStorageProvider: 1, status: 1 },
      { name: 'cloudStorageProvider_status' }
    );
    console.log('✓ Created index: cloudStorageProvider_status');

    await DocumentationJob.collection.createIndex(
      { 'cloudStorageMetadata.uploadedAt': 1 },
      { name: 'cloudStorageMetadata.uploadedAt' }
    );
    console.log('✓ Created index: cloudStorageMetadata.uploadedAt');

    console.log('\n✅ Indexes created successfully!\n');
  } catch (error: any) {
    // Index might already exist, that's okay
    if (error.code === 85 || error.message.includes('already exists')) {
      console.log('ℹ️  Indexes already exist, skipping creation\n');
    } else {
      console.error('\n✗ Failed to create indexes:', error.message);
      throw error;
    }
  }
}

/**
 * Verify migration results
 */
async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verifying migration...\n');

  try {
    const totalJobs = await DocumentationJob.countDocuments({});
    const jobsWithCloudStorage = await DocumentationJob.countDocuments({
      cloudStorageProvider: { $exists: true }
    });
    const jobsWithMetadata = await DocumentationJob.countDocuments({
      cloudStorageMetadata: { $exists: true }
    });

    console.log('Verification Results:');
    console.log(`  • Total jobs: ${totalJobs}`);
    console.log(`  • Jobs with cloudStorageProvider: ${jobsWithCloudStorage}`);
    console.log(`  • Jobs with cloudStorageMetadata: ${jobsWithMetadata}`);

    if (jobsWithCloudStorage === totalJobs && jobsWithMetadata === totalJobs) {
      console.log('\n✅ Verification passed: All jobs have cloud storage fields\n');
    } else {
      console.log('\n⚠️  Verification warning: Some jobs may be missing fields\n');
    }

    // Show sample migrated job
    const sampleJob = await DocumentationJob.findOne({
      cloudStorageProvider: { $exists: true }
    }).lean();

    if (sampleJob) {
      console.log('Sample migrated job:');
      console.log(`  • ID: ${sampleJob._id}`);
      console.log(`  • Provider: ${sampleJob.cloudStorageProvider}`);
      console.log(`  • Has URLs: ${!!sampleJob.cloudStorageUrls}`);
      console.log(`  • Has Keys: ${!!sampleJob.cloudStorageKeys}`);
      console.log(`  • Has Metadata: ${!!sampleJob.cloudStorageMetadata}`);
    }
  } catch (error: any) {
    console.error('\n✗ Verification failed:', error.message);
  }
}

/**
 * Rollback migration (restore old field names)
 */
async function rollbackMigration(): Promise<void> {
  console.log('\n⏮️  Rolling back cloud storage fields migration...\n');

  try {
    const jobs = await DocumentationJob.find({});
    console.log(`Found ${jobs.length} documentation jobs to rollback\n`);

    let rollbackCount = 0;

    for (const job of jobs) {
      try {
        const jobDoc = job.toObject() as any;
        let hasChanges = false;

        // This is a safety rollback - in most cases you won't need this
        // But it's here if something goes wrong

        // Note: We can't easily rollback because the old fields were removed
        // This is more of a reset to default values
        if (jobDoc.cloudStorageProvider !== 'local') {
          job.cloudStorageProvider = 'local' as any;
          hasChanges = true;
        }

        if (hasChanges) {
          await job.save();
          rollbackCount++;
          console.log(`✓ Rolled back job ${job._id}`);
        }
      } catch (error: any) {
        console.error(`✗ Error rolling back job ${job._id}:`, error.message);
      }
    }

    console.log(`\n✅ Rollback completed: ${rollbackCount} jobs reset to local storage\n`);
  } catch (error: any) {
    console.error('\n✗ Rollback failed:', error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';

  try {
    await connectDB();

    switch (command) {
      case 'migrate':
        await migrateCloudStorageFields();
        await createIndexes();
        await verifyMigration();
        break;

      case 'verify':
        await verifyMigration();
        break;

      case 'indexes':
        await createIndexes();
        break;

      case 'rollback':
        const confirmRollback = args[1] === '--confirm';
        if (!confirmRollback) {
          console.log('\n⚠️  Rollback requires confirmation.');
          console.log('Run with: npm run migrate:cloud-storage rollback --confirm\n');
          break;
        }
        await rollbackMigration();
        break;

      default:
        console.log('\nUsage:');
        console.log('  npm run migrate:cloud-storage [command]');
        console.log('\nCommands:');
        console.log('  migrate   - Run full migration (default)');
        console.log('  verify    - Verify migration status');
        console.log('  indexes   - Create indexes only');
        console.log('  rollback  - Rollback migration (requires --confirm)');
        console.log('');
    }

    await disconnectDB();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration script failed:', error.message);
    await disconnectDB();
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main();
}

export { migrateCloudStorageFields, createIndexes, verifyMigration, rollbackMigration };
