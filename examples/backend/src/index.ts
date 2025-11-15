import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { pool, closePool } from './db.js';
import { router } from './router.js';
import { syncAdminBookingAgents } from './utils/adminBookingAgents.js';
import { initializeDatabase } from './scripts/initDb.js';

// Load .env from project root (one level up from backend)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.PORT || 8787;
// Default CORS origins for development (Expo web, Vite, etc.)
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:19006',  // Expo web dev server
  'http://localhost:8081',   // Expo dev server
  'http://localhost:5173',   // Vite dev server
  'http://localhost:3000',   // Common React dev server
  'http://localhost:3001',   // Proxy server
];
const CORS_ORIGIN = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || DEFAULT_CORS_ORIGINS;

// Trust proxy headers (needed when behind reverse proxy like DigitalOcean/Cloudflare)
app.set('trust proxy', true);

// SECURITY: Add security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.mux.com https://stream.mux.com https://api.web3modal.org https://pulse.walletconnect.org"
  );
  // Strict Transport Security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Hostname-based redirect: artistspace.info -> stage-www.artist-space.com
app.use((req, res, next) => {
  // Extract hostname (supports proxy headers)
  const hostRaw = req.headers['x-forwarded-host'] || req.headers.host || '';
  const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw;
  const hostname = host.split(':')[0].toLowerCase();
  
  // Redirect artistspace.info to stage-www.artist-space.com
  if (hostname === 'artistspace.info' || hostname === 'www.artistspace.info') {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const redirectUrl = `${protocol}://stage-www.artist-space.com${req.originalUrl}`;
    return res.redirect(301, redirectUrl);
  }
  
  next();
});

// CORS Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (CORS_ORIGIN.includes(origin) || CORS_ORIGIN.includes('*')) {
      return callback(null, true);
    }
    
    // In development, allow localhost origins
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle OPTIONS preflight requests explicitly
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && (CORS_ORIGIN.includes(origin) || CORS_ORIGIN.includes('*') || 
      (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204); // No Content
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// SECURITY: Rate limiting - Basic implementation
// Note: For production, consider using express-rate-limit npm package
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 3000; // Max requests per window (increased 3x from 1000)
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    next();
  } else if (record.count < maxRequests) {
    record.count++;
    next();
  } else {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
    res.status(429).json({ 
      error: `Too many requests. You have exceeded the limit of ${maxRequests} requests per 15 minutes. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes !== 1 ? 's' : ''}.`,
      retryAfter: retryAfterSeconds,
      retryAfterMinutes: retryAfterMinutes,
      limit: maxRequests,
      windowMinutes: 15
    });
  }
});

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000); // Clean up every minute

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes (must come before static file serving)
console.log('Mounting API routes...');
app.use('/api', router);
console.log('API routes mounted successfully');

// Serve static files from public folder (for artwork, etc.)
const publicPath = path.resolve(process.cwd(), '../public');
console.log('Serving static files from public folder:', publicPath);
app.use(express.static(publicPath));

// Serve Humboldt Hat Company page (PUBLIC - NO AUTH REQUIRED)
// This route is served directly before the React app catch-all to ensure it's accessible without authentication
// Support both spellings: humboldhatcompany and humboldthatcompany
const serveHumboldHatPage = (req: express.Request, res: express.Response) => {
  const htmlPath = path.resolve(process.cwd(), '../public/humboldhatcompany.html');
  res.sendFile(htmlPath, (err) => {
    if (err) {
      console.error('Error sending humboldhatcompany.html:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

app.get('/merch/humboldhatcompany', serveHumboldHatPage);
app.get('/merch/humboldthatcompany', serveHumboldHatPage);

// Serve static files from frontend build
const distPath = path.resolve(process.cwd(), '../dist');
console.log('Serving static files from:', distPath);
app.use(express.static(distPath));

// Serve React app for all non-API routes (catch-all must be last)
app.get('*', (req, res) => {
  console.log('Catch-all route hit for:', req.path);
  const indexPath = path.resolve(process.cwd(), '../dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize database before starting server
async function startServer() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting Artist Space Backend');
  console.log('='.repeat(60));
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Build proper PostgreSQL connection string for display (without password)
  const pgUser = process.env.PGUSER || 'postgres';
  const pgHost = process.env.PGHOST || 'localhost';
  const pgPort = process.env.PGPORT || '5432';
  const pgDatabase = process.env.PGDATABASE || 'artist_space';
  const sslEnabled = process.env.DATABASE_SSL === 'true' ? '?sslmode=require' : '';
  const dbConnectionString = `postgresql://${pgUser}:****@${pgHost}:${pgPort}/${pgDatabase}${sslEnabled}`;
  
  console.log(`🗄️  Database: ${dbConnectionString}`);
  console.log('='.repeat(60) + '\n');
  
  try {
    // Initialize database at runtime (not during build)
    console.log('🔄 Initializing database...');
    const initStartTime = Date.now();
    await initializeDatabase();
    const initDuration = Date.now() - initStartTime;
    console.log(`✅ Database initialized successfully in ${initDuration}ms`);
  } catch (error: any) {
    console.error('\n' + '⚠️ '.repeat(30));
    console.error('⚠️ DATABASE INITIALIZATION FAILED');
    console.error('⚠️ '.repeat(30));
    console.error('Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Stack:', error.stack);
    console.error('⚠️ '.repeat(30) + '\n');
    console.error('⚠️ Continuing startup anyway - database may already be initialized');
    console.error('⚠️ If you see errors, the database may not be properly configured\n');
  }

  // Start server
  const server = app.listen(PORT, async () => {
    console.log('\n' + '✓'.repeat(60));
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ CORS origins: ${CORS_ORIGIN.join(', ')}`);
    console.log('✓'.repeat(60) + '\n');
    
    console.log('📊 API Endpoints:');
    console.log(`   - Health Check: http://localhost:${PORT}/health`);
    console.log(`   - Diagnostics: http://localhost:${PORT}/api/diagnostics/db`);
    console.log(`   - Auth: http://localhost:${PORT}/api/auth/*`);
    console.log('');
    
    // Sync admin booking agents from environment
    try {
      console.log('🔄 Syncing admin booking agents...');
      await syncAdminBookingAgents();
      console.log('✅ Admin booking agents synced\n');
    } catch (error) {
      console.error('❌ Failed to sync admin booking agents:', error);
    }
    
    console.log('🎉 Server is ready to accept connections!\n');
  });

  // Graceful shutdown handlers
  setupGracefulShutdown(server);
}

function setupGracefulShutdown(server: any) {
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
    await closePool();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
    await closePool();
    process.exit(0);
  });
}

// Start the application
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;

