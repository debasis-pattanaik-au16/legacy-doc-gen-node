import mongoose from 'mongoose';
import { User } from '@/models/User';
import { config } from '@/config/env';

/**
 * Migration Script: Add Profile & Settings fields to existing users
 * 
 * This script backfills default values for:
 * - timezone (default: 'UTC')
 * - notifications.productUpdates (default: false)
 * - notifications.analysisReady (default: true)
 * - preferences.autoSave (default: false)
 * 
 * Usage:
 *   npm run migrate:user-settings          # Run migration
 *   npm run migrate:user-settings verify   # Verify without applying
 */

interface MigrationStats {
  totalUsers: number;
  usersNeedingMigration: number;
  usersUpdated: number;
  errors: string[];
}

/**
 * Connect to MongoDB
 */
async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

/**
 * Check how many users need migration
 */
async function checkMigrationNeeded(): Promise<number> {
  const usersNeedingMigration = await User.countDocuments({
    $or: [
      { timezone: { $exists: false } },
      { 'notifications.productUpdates': { $exists: false } },
      { 'notifications.analysisReady': { $exists: false } },
      { 'preferences.autoSave': { $exists: false } }
    ]
  });
  
  return usersNeedingMigration;
}

/**
 * Run the migration
 */
async function runMigration(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    usersNeedingMigration: 0,
    usersUpdated: 0,
    errors: []
  };

  try {
    // Get total user count
    stats.totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${stats.totalUsers}`);

    // Check how many need migration
    stats.usersNeedingMigration = await checkMigrationNeeded();
    console.log(`📋 Users needing migration: ${stats.usersNeedingMigration}`);

    if (stats.usersNeedingMigration === 0) {
      console.log('✅ All users are already migrated!');
      return stats;
    }

    // Perform migration
    console.log('🔄 Starting migration...');
    
    const result = await User.updateMany(
      {
        $or: [
          { timezone: { $exists: false } },
          { 'notifications.productUpdates': { $exists: false } },
          { 'notifications.analysisReady': { $exists: false } },
          { 'preferences.autoSave': { $exists: false } }
        ]
      },
      {
        $set: {
          timezone: 'UTC',
          'notifications.productUpdates': false,
          'notifications.analysisReady': true,
          'preferences.autoSave': false
        }
      }
    );

    stats.usersUpdated = result.modifiedCount;
    console.log(`✅ Migration completed! Updated ${stats.usersUpdated} users`);

    // Verify migration
    const remainingUsers = await checkMigrationNeeded();
    if (remainingUsers > 0) {
      console.warn(`⚠️  Warning: ${remainingUsers} users still need migration`);
      stats.errors.push(`${remainingUsers} users still missing fields after migration`);
    } else {
      console.log('✅ Verification passed: All users have required fields');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    stats.errors.push(error.message);
    throw error;
  }

  return stats;
}

/**
 * Verify migration status without applying changes
 */
async function verifyMigration(): Promise<void> {
  console.log('🔍 Verification Mode (No changes will be made)');
  console.log('─────────────────────────────────────────────\n');

  const totalUsers = await User.countDocuments();
  const usersNeedingMigration = await checkMigrationNeeded();
  const migratedUsers = totalUsers - usersNeedingMigration;

  console.log(`📊 Total users: ${totalUsers}`);
  console.log(`✅ Already migrated: ${migratedUsers}`);
  console.log(`📋 Need migration: ${usersNeedingMigration}`);
  
  if (usersNeedingMigration === 0) {
    console.log('\n✅ All users have Profile & Settings fields!');
  } else {
    console.log(`\n⚠️  ${usersNeedingMigration} users are missing Profile & Settings fields`);
    console.log('Run without "verify" flag to apply migration');
  }

  // Show sample of users needing migration (max 5)
  if (usersNeedingMigration > 0) {
    console.log('\n📋 Sample users needing migration:');
    const sampleUsers = await User.find({
      $or: [
        { timezone: { $exists: false } },
        { 'notifications.productUpdates': { $exists: false } },
        { 'notifications.analysisReady': { $exists: false } },
        { 'preferences.autoSave': { $exists: false } }
      ]
    })
    .select('email name timezone notifications preferences')
    .limit(5);

    sampleUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email}`);
      console.log(`     - timezone: ${user.timezone ?? 'MISSING'}`);
      console.log(`     - notifications: ${user.notifications ? 'exists' : 'MISSING'}`);
      console.log(`     - preferences: ${user.preferences ? 'exists' : 'MISSING'}`);
    });

    if (usersNeedingMigration > 5) {
      console.log(`  ... and ${usersNeedingMigration - 5} more`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const isVerifyMode = process.argv.includes('verify');

  console.log('═══════════════════════════════════════════════');
  console.log('  User Profile & Settings Migration Script');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Connect to database
    await connectDatabase();

    if (isVerifyMode) {
      // Verification mode
      await verifyMigration();
    } else {
      // Migration mode
      const stats = await runMigration();

      // Print summary
      console.log('\n═══════════════════════════════════════════════');
      console.log('  Migration Summary');
      console.log('═══════════════════════════════════════════════');
      console.log(`Total users:           ${stats.totalUsers}`);
      console.log(`Users needing update:  ${stats.usersNeedingMigration}`);
      console.log(`Users updated:         ${stats.usersUpdated}`);
      console.log(`Errors:                ${stats.errors.length}`);
      
      if (stats.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        stats.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      console.log('═══════════════════════════════════════════════\n');
    }

  } catch (error: any) {
    console.error('\n❌ Migration script failed:', error.message);
    process.exit(1);
  } finally {
    // Disconnect from database
    await disconnectDatabase();
  }

  process.exit(0);
}

// Run the script
if (require.main === module) {
  main();
}

export { runMigration, verifyMigration, checkMigrationNeeded };
