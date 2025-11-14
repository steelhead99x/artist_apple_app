#!/usr/bin/env node

/**
 * Apply E2EE Messaging Migration
 * Creates the messages table for end-to-end encrypted messaging
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✓ Loaded environment from: ${envPath}`);
    break;
  }
}

const { Pool } = pg;

const PGHOST = process.env.PGHOST;
const PGPORT = process.env.PGPORT || '5432';
const PGUSER = process.env.PGUSER;
const PGPASSWORD = process.env.PGPASSWORD;
const PGDATABASE = process.env.PGDATABASE;

if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure PGHOST, PGUSER, PGPASSWORD, and PGDATABASE are set');
  process.exit(1);
}

const pool = new Pool({
  host: PGHOST,
  port: parseInt(PGPORT),
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔄 Applying E2EE Messaging Migration...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migration_e2ee_messaging.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration applied successfully!\n');
    
    // Verify table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ messages table exists');
      
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'messages'
        ORDER BY ordinal_position;
      `);
      
      console.log(`✓ Table has ${columns.rows.length} columns:`);
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.error('❌ messages table not found after migration!');
      process.exit(1);
    }
    
    console.log('\n✅ Migration complete!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});




