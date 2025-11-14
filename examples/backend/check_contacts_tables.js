#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPaths = [
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) break;
}

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function checkTables() {
  const client = await pool.connect();
  try {
    console.log('\nChecking tables and columns...\n');
    
    // Check users table
    const users = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('id', 'name', 'email', 'user_type', 'status')
      ORDER BY column_name;
    `);
    console.log('Users table columns:', users.rows);
    
    // Check if venues table exists
    const venues = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'venues'
      );
    `);
    console.log('Venues table exists:', venues.rows[0].exists);
    
    // Check if bands table exists
    const bands = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bands'
      );
    `);
    console.log('Bands table exists:', bands.rows[0].exists);
    
    // Check if recording_studios table exists
    const studios = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recording_studios'
      );
    `);
    console.log('Recording studios table exists:', studios.rows[0].exists);
    
    // Test a simple query
    const testQuery = await client.query(`
      SELECT u.id, u.name, u.email, u.user_type, v.venue_name, b.band_name
      FROM users u
      LEFT JOIN venues v ON u.id = v.user_id
      LEFT JOIN bands b ON u.id = b.user_id
      WHERE u.status = 'approved'
      LIMIT 5
    `);
    console.log('\nTest query result count:', testQuery.rows.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();




