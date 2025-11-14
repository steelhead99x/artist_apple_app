import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// Middleware to verify admin access for diagnostics
const verifyAdmin = async (req: any, res: any, next: any) => {
  if (req.user.userType !== 'booking_agent') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }

  // Check if user is an admin booking agent
  try {
    const userResult = await query(
      'SELECT is_admin_agent, agent_status FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Only allow access for admin booking agents with active status
    if (user.is_admin_agent === true && user.agent_status === 'active') {
      return next();
    }

    return res.status(403).json({
      error: 'Unauthorized: Admin booking agent access required'
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/diagnostics/db - Check database connectivity and schema (admin only)
router.get('/db', authenticateToken, verifyAdmin, async (req, res) => {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      host: process.env.PGHOST || 'Not set',
      port: process.env.PGPORT || 'Not set',
      database: process.env.PGDATABASE || 'Not set',
      user: process.env.PGUSER || 'Not set',
      tables: {},
    },
  };

  try {
    // Test basic connectivity
    const versionResult = await query('SELECT version()');
    diagnostics.database.connected = true;
    diagnostics.database.version = versionResult.rows[0].version;

    // Check for required PostgreSQL extensions
    try {
      const extensionsCheck = await query(`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname IN ('uuid-ossp', 'vector')
      `);
      diagnostics.database.extensions = {
        'uuid-ossp': extensionsCheck.rows.find((e: any) => e.extname === 'uuid-ossp') 
          ? { installed: true, version: extensionsCheck.rows.find((e: any) => e.extname === 'uuid-ossp').extversion }
          : { installed: false },
        'vector': extensionsCheck.rows.find((e: any) => e.extname === 'vector')
          ? { installed: true, version: extensionsCheck.rows.find((e: any) => e.extname === 'vector').extversion }
          : { installed: false, optional: true },
      };

      // Test uuid_generate_v4() function
      try {
        const uuidTest = await query('SELECT uuid_generate_v4() as test_uuid');
        diagnostics.database.extensions['uuid-ossp'].functional = true;
        diagnostics.database.extensions['uuid-ossp'].testResult = uuidTest.rows[0].test_uuid;
      } catch (uuidError: any) {
        diagnostics.database.extensions['uuid-ossp'].functional = false;
        diagnostics.database.extensions['uuid-ossp'].error = uuidError.message;
      }
    } catch (error: any) {
      diagnostics.database.extensions = {
        error: 'Failed to check extensions',
        message: error.message,
      };
    }

    // Check if bands table exists
    try {
      const bandsCheck = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'bands'
        ORDER BY ordinal_position
      `);
      diagnostics.database.tables.bands = {
        exists: bandsCheck.rows.length > 0,
        columns: bandsCheck.rows.map((r: any) => ({
          name: r.column_name,
          type: r.data_type,
          nullable: r.is_nullable,
          default: r.column_default,
        })),
      };

      // Check if bands table has any data
      const bandCount = await query('SELECT COUNT(*) as count FROM bands');
      diagnostics.database.tables.bands.count = parseInt(bandCount.rows[0].count);
    } catch (error: any) {
      diagnostics.database.tables.bands = {
        exists: false,
        error: error.message,
      };
    }

    // Check if users table exists
    try {
      const usersCheck = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      diagnostics.database.tables.users = {
        exists: usersCheck.rows.length > 0,
        columns: usersCheck.rows.map((r: any) => ({
          name: r.column_name,
          type: r.data_type,
          nullable: r.is_nullable,
        })),
      };

      // Check if users table has any data
      const userCount = await query('SELECT COUNT(*) as count FROM users');
      diagnostics.database.tables.users.count = parseInt(userCount.rows[0].count);
    } catch (error: any) {
      diagnostics.database.tables.users = {
        exists: false,
        error: error.message,
      };
    }

    // Try to run the actual bands query
    try {
      const bandsResult = await query(`
        SELECT b.id, b.user_id, b.booking_manager_id, b.band_name
        FROM bands b 
        JOIN users u ON b.user_id = u.id 
        WHERE u.status = 'approved'
        LIMIT 1
      `);
      diagnostics.database.bandsQuery = {
        success: true,
        sampleCount: bandsResult.rows.length,
      };
    } catch (error: any) {
      diagnostics.database.bandsQuery = {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    res.json(diagnostics);
  } catch (error: any) {
    diagnostics.database.error = error.message;
    diagnostics.database.code = error.code;
    res.status(500).json(diagnostics);
  }
});

export default router;

