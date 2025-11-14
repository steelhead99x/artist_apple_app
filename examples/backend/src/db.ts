import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from backend)
// Try multiple paths in case running from different locations
const envPaths = [
  path.resolve(process.cwd(), '../.env'),  // When running from backend/
  path.resolve(process.cwd(), '.env'),     // When running from root
  path.resolve(__dirname, '../../.env'),   // When running compiled code
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✓ Loaded environment from: ${envPath}`);
    break;
  }
}

const { Pool } = pg;

// Read PostgreSQL connection parameters from environment
const PGHOST = process.env.PGHOST;
const PGPORT = process.env.PGPORT || '5432';
const PGUSER = process.env.PGUSER;
const PGPASSWORD = process.env.PGPASSWORD;
const PGDATABASE = process.env.PGDATABASE;

// Validate required PostgreSQL environment variables are set
if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE) {
  console.error('❌ FATAL: Required PostgreSQL environment variables are not set!');
  console.error('   Please ensure the following variables are defined in your environment:');
  console.error('   - PGHOST: PostgreSQL host');
  console.error('   - PGPORT: PostgreSQL port (optional, defaults to 5432)');
  console.error('   - PGUSER: PostgreSQL user');
  console.error('   - PGPASSWORD: PostgreSQL password');
  console.error('   - PGDATABASE: PostgreSQL database name');
  process.exit(1);
}

console.log(`✓ Database connection configured`);
console.log(`  Host: ${PGHOST}`);
console.log(`  Port: ${PGPORT}`);
console.log(`  Database: ${PGDATABASE}`);
console.log(`  User: ${PGUSER}`);

// PostgreSQL connection pool
export const pool = new Pool({
  host: PGHOST,
  port: parseInt(PGPORT),
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 seconds (increased for cloud)
  query_timeout: 30000, // 30 seconds query timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // SSL disabled for self-hosted PostgreSQL
  // Set DATABASE_SSL=true in environment if you need SSL
  ssl: process.env.DATABASE_SSL === 'true' 
    ? { rejectUnauthorized: false }
    : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
  // Don't exit the process, just log the error
  // process.exit(-1);
});

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}

// Get a client from the pool (for transactions)
export async function getClient() {
  return await pool.connect();
}

// Close pool (for graceful shutdown)
export async function closePool() {
  await pool.end();
  console.log('✓ Database pool closed');
}

