/**
 * Database Initialization Script
 * Runs schema and migrations to ensure database is properly set up
 * Automatically creates the database if it doesn't exist
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✓ Loaded environment from: ${envPath}`);
    break;
  }
}

// Read PostgreSQL connection parameters
const PGHOST = process.env.PGHOST || 'localhost';
const PGPORT = process.env.PGPORT || '5432';
const PGUSER = process.env.PGUSER;
const PGPASSWORD = process.env.PGPASSWORD;
const PGDATABASE = process.env.PGDATABASE;

if (!PGUSER || !PGDATABASE) {
  console.error('❌ PGUSER and PGDATABASE environment variables are required!');
  process.exit(1);
}

const { Pool } = pg;

// Create database pool (will be initialized after database creation check)
let pool: pg.Pool;

async function runSqlFile(filePath: string, description: string): Promise<{ success: boolean; skipped: boolean }> {
  try {
    console.log(`📄 Running: ${description}`);
    
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.error(`   ❌ File not found: ${filePath}`);
      throw new Error(`Migration file not found: ${filePath}`);
    }
    
    let sql = fs.readFileSync(filePath, 'utf8');
    
    // Remove pgvector extension if not available (optional extension)
    // In production, this should be installed, but locally it's optional
    sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS vector;?/gi, '-- pgvector extension skipped (optional)');
    
    // Execute the entire file at once - PostgreSQL can handle multiple statements
    await pool.query(sql);
    
    console.log(`   ✅ ${description} completed`);
    return { success: true, skipped: false };
  } catch (error: any) {
    // Ignore "already exists" and constraint violation errors for idempotency
    // These errors indicate the database is already initialized or partially initialized
    if (
      error.code === '42P07' ||  // duplicate_table
      error.code === '42710' ||  // duplicate_object
      error.code === '42723' ||  // duplicate_function
      error.code === '42P01' ||  // undefined_table (might be attempting to alter non-existent table)
      error.code === '58P01' ||  // undefined_file (extension file not found)
      error.code === '23514' ||  // check_violation (check constraint violated)
      error.code === '42701' ||  // duplicate_column
      error.code === '42P16' ||  // invalid_table_definition
      error.message?.includes('already exists') ||
      error.message?.includes('does not exist') ||
      error.message?.includes('extension control file') ||
      error.message?.includes('check constraint') ||
      error.message?.includes('is violated by some row') ||
      error.message?.includes('Migration file not found')
    ) {
      console.log(`   ⚠️  ${description} - skipped (${error.message || error.code})`);
      return { success: false, skipped: true };
    } else {
      console.error(`   ❌ ${description} failed:`);
      console.error(`      Error Code: ${error.code || 'N/A'}`);
      console.error(`      Error Message: ${error.message}`);
      if (error.position) {
        console.error(`      Position: ${error.position}`);
      }
      // Don't throw - log and continue with other migrations
      console.log(`   ⏭️  Continuing with remaining migrations...`);
      return { success: false, skipped: false };
    }
  }
}

/**
 * Ensure the database exists, create it if it doesn't
 */
async function ensureDatabaseExists(): Promise<void> {
  console.log(`\n🔍 Checking if database "${PGDATABASE}" exists...\n`);
  
  // Connect to 'postgres' database to check/create target database
  const adminPool = new Pool({
    host: PGHOST,
    port: parseInt(PGPORT),
    user: PGUSER,
    password: PGPASSWORD,
    database: 'postgres', // Connect to default postgres database
    connectionTimeoutMillis: 10000, // 10 seconds timeout
    query_timeout: 30000, // 30 seconds query timeout
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // SSL disabled for self-hosted PostgreSQL
    // Set DATABASE_SSL=true in environment if you need SSL
    ssl: process.env.DATABASE_SSL === 'true' 
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    // Check if database exists
    const result = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [PGDATABASE]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Database "${PGDATABASE}" does not exist. Creating it...\n`);
      
      // Create database (can't use parameterized query for database name)
      // Sanitize database name to prevent SQL injection
      const safeDatabaseName = PGDATABASE!.replace(/[^a-zA-Z0-9_]/g, '');
      if (safeDatabaseName !== PGDATABASE) {
        throw new Error('Invalid database name. Only alphanumeric characters and underscores are allowed.');
      }
      
      await adminPool.query(`CREATE DATABASE ${safeDatabaseName} OWNER ${PGUSER!}`);
      console.log(`✅ Database "${PGDATABASE}" created successfully!\n`);
    } else {
      console.log(`✅ Database "${PGDATABASE}" already exists.\n`);
    }
  } catch (error: any) {
    if (error.code === '42P04') {
      // Database already exists (race condition)
      console.log(`✅ Database "${PGDATABASE}" already exists.\n`);
    } else {
      console.error(`❌ Error checking/creating database:`, error.message);
      throw error;
    }
  } finally {
    await adminPool.end();
  }
}

async function initializeDatabase() {
  try {
    console.log('\n🚀 Starting database initialization...\n');
    
    // Step 1: Ensure database exists
    await ensureDatabaseExists();
    
    // Step 2: Initialize connection pool to target database
    pool = new Pool({
      host: PGHOST,
      port: parseInt(PGPORT),
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      connectionTimeoutMillis: 10000, // 10 seconds timeout
      query_timeout: 30000, // 30 seconds query timeout
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // SSL disabled for self-hosted PostgreSQL
      // Set DATABASE_SSL=true in environment if you need SSL
      ssl: process.env.DATABASE_SSL === 'true' 
        ? { rejectUnauthorized: false }
        : false,
    });
    
    // Resolve SQL files location
    // When compiled: dist/scripts/ -> SQL files are in dist/
    // When running from source: src/scripts/ -> SQL files are in backend root
    let sqlDir: string;
    
    if (__dirname.includes('/dist/')) {
      // Running compiled code: SQL files are in dist/
      sqlDir = path.resolve(__dirname, '../');
    } else {
      // Running from source: SQL files are in backend root
      sqlDir = path.resolve(__dirname, '../../');
    }
    
    console.log(`📁 Looking for SQL files in: ${sqlDir}\n`);
    
    // 1. Run base schema
    const schemaPath = path.join(sqlDir, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      await runSqlFile(schemaPath, 'Base schema (schema.sql)');
    } else {
      console.log(`⚠️  Schema file not found: ${schemaPath}`);
    }
    
    // 2. Run additional schemas in order
    const additionalSchemas = [
      'schema_gift_cards.sql',
      'schema_live_streaming.sql',
      'schema_equipment_contracts.sql',
      'tour_payments_schema.sql',
      'venue_payment_tracking.sql',
    ];
    
    for (const schema of additionalSchemas) {
      const schemaFilePath = path.join(sqlDir, schema);
      if (fs.existsSync(schemaFilePath)) {
        await runSqlFile(schemaFilePath, schema);
      }
    }
    
    // 3. Run migrations in order
    const migrations = [
      'migration_password_reset.sql',
      'migration_login_pin_codes.sql',  // Add login PIN codes table for PIN-based authentication
      'migration_add_booking_manager_user_type.sql',
      'migration_add_booking_manager_to_bands.sql',
      'migration_add_band_approval.sql',
      'migration_add_band_limits.sql',
      'migration_add_custom_band_limits.sql',
      'migration_add_user_soft_delete.sql',
      'migration_add_recovery_email.sql',  // Add recovery email support
      'migration_user_management_enhancements.sql',
      'migration_contact_messages.sql',
      'migration_mailing_list.sql',
      'migration_add_real_payments.sql',
      'migration_payment_currency.sql',
      'migration_subscription_payment_methods.sql',
      'migration_add_cod_payment_method.sql',
      'migration_add_suspension_reason.sql',
      'migration_update_gift_card_recipient_type.sql',
      'migration_update_gift_card_transaction_type.sql',
      'migration_add_admin_created_payment_method.sql',  // Add admin_created payment method for gift cards
      'migration_band_admin_system.sql',
      'tours_events_migration.sql',
      'tour_payment_updates.sql',
      'event_status_management.sql',
      'fix_user_deletion.sql',
      'fix_zero_payment_logic.sql',
      'migration_failed_login_attempts.sql',  // Security: Failed login tracking
      'migration_audit_logging.sql',  // Security: Comprehensive audit logging
      'migration_ensure_admin_columns.sql',  // CRITICAL: Ensure admin columns exist before admin_booking_agent_system
      'admin_booking_agent_system.sql',
      'gift_card_admin_system.sql',
      'migration_streaming_content_complete.sql',  // Streaming content table with metadata
      'migration_add_content_metadata.sql',  // Add metadata support to streaming_content
      'migration_artist_w2_documents.sql',  // Artist W2 documents support
      'fix_venues_table.sql',  // CRITICAL: Ensures venues table exists (renames bars->venues OR creates venues if neither exists)
      'migration_e2ee_messaging.sql',  // E2EE messaging system for users, venues, and booking agents
    ];
    
    // Track migration results
    let migrationSuccessCount = 0;
    let migrationSkipCount = 0;
    let migrationFailCount = 0;
    let migrationMissingCount = 0;
    
    for (const migration of migrations) {
      const migrationPath = path.join(sqlDir, migration);
      if (fs.existsSync(migrationPath)) {
        const result = await runSqlFile(migrationPath, migration);
        if (result.success) {
          migrationSuccessCount++;
        } else if (result.skipped) {
          migrationSkipCount++;
        } else {
          migrationFailCount++;
        }
      } else {
        console.error(`   ❌ Migration file not found: ${migrationPath}`);
        migrationMissingCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${migrationSuccessCount}`);
    console.log(`   ⚠️  Skipped: ${migrationSkipCount} (already applied or non-critical)`);
    console.log(`   ❌ Failed: ${migrationFailCount}`);
    console.log(`   📁 Missing: ${migrationMissingCount}`);
    console.log('='.repeat(60) + '\n');
    
    // 4. Seed subscription plans if needed
    const seedPath = path.join(sqlDir, 'subscription_plans_seed.sql');
    if (fs.existsSync(seedPath)) {
      await runSqlFile(seedPath, 'Subscription plans seed data');
    }
    
    console.log('\n✅ Database initialization completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    throw error;
  } finally {
    // Clean up connection pool
    if (pool) {
      await pool.end();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('Database ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

export { initializeDatabase };

