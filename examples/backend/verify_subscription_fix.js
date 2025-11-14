/**
 * Verification script for subscription signup fix
 * This script checks if the database schema supports all required payment methods
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function verifyFix() {
  console.log('🔍 Verifying subscription signup fix...\n');
  
  try {
    // Check if subscription_payments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscription_payments'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ subscription_payments table does not exist');
      console.log('   Please run the schema.sql file first');
      await pool.end();
      process.exit(1);
    }
    
    console.log('✅ subscription_payments table exists');
    
    // Check if subscription_plans table exists and has data
    const plansCheck = await pool.query(`
      SELECT COUNT(*) as count FROM subscription_plans;
    `);
    
    if (plansCheck.rows[0].count === '0') {
      console.log('⚠️  subscription_plans table is empty');
      console.log('   Please run: psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f backend/subscription_plans_seed.sql');
    } else {
      console.log(`✅ subscription_plans table has ${plansCheck.rows[0].count} plans`);
    }
    
    // List all plans
    const plans = await pool.query(`
      SELECT id, name, user_type, price_monthly, is_active 
      FROM subscription_plans 
      ORDER BY user_type, price_monthly;
    `);
    
    console.log('\n📋 Available subscription plans:');
    plans.rows.forEach(plan => {
      const status = plan.is_active ? '🟢' : '🔴';
      const price = plan.price_monthly === '0.00' ? 'Free' : `$${plan.price_monthly}/mo`;
      console.log(`   ${status} ${plan.id.padEnd(25)} | ${plan.name.padEnd(25)} | ${price.padEnd(15)} | ${plan.user_type}`);
    });
    
    // Check payment method constraint
    const constraintCheck = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'subscription_payments'::regclass
        AND conname LIKE '%payment_method%';
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('\n✅ Payment method constraint found:');
      console.log(`   ${constraintCheck.rows[0].constraint_definition}`);
      
      const def = constraintCheck.rows[0].constraint_definition;
      const requiredMethods = ['stripe', 'eth_wallet', 'bank_transfer', 'paypal', 'gift_card', 'free'];
      const missingMethods = requiredMethods.filter(method => !def.includes(`'${method}'`));
      
      if (missingMethods.length > 0) {
        console.log('\n❌ Missing payment methods in constraint:', missingMethods.join(', '));
        console.log('   Please run: psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f backend/migration_subscription_payment_methods.sql');
      } else {
        console.log('✅ All required payment methods are supported');
      }
    } else {
      console.log('\n⚠️  No payment_method constraint found (this might be okay for some setups)');
    }
    
    // Check if users table supports 'user' type
    const userTypeCheck = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
        AND conname LIKE '%user_type%';
    `);
    
    if (userTypeCheck.rows.length > 0) {
      const def = userTypeCheck.rows[0].constraint_definition;
      if (def.includes("'user'")) {
        console.log('\n✅ Users table supports "user" type (artist/musician)');
      } else {
        console.log('\n⚠️  Users table may not support "user" type');
      }
    }
    
    console.log('\n✅ Verification complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. If any issues were found above, run the suggested SQL commands');
    console.log('   2. Test registration at /register-subscription?plan=artist_free');
    console.log('   3. Check backend logs for any errors during signup');
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection refused. Please check:');
      console.log('   - PostgreSQL environment variables (PGHOST, PGUSER, PGPASSWORD, PGDATABASE) are set correctly');
      console.log('   - PostgreSQL is running');
      console.log('   - Database credentials are correct');
    }
  } finally {
    await pool.end();
  }
}

verifyFix().catch(console.error);

