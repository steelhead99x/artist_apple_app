/**
 * Development CORS Proxy Server
 * 
 * This proxy server helps bypass CORS issues during web development.
 * It proxies requests to the API and adds CORS headers.
 * 
 * Usage:
 *   1. Install: npm install express http-proxy-middleware cors
 *   2. Run: node dev-proxy-server.js
 *   3. Update .env: EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001;
const API_TARGET = process.env.API_TARGET || 'https://stage-www.artist-space.com';

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all routes - MUST be before proxy
app.use(cors({
  origin: '*', // Allow all origins in development
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle OPTIONS preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.sendStatus(200);
});

// Proxy middleware configuration
const proxyOptions = {
  target: API_TARGET,
  changeOrigin: true,
  secure: true, // Verify SSL certificate
  logLevel: 'debug',
  pathRewrite: {
    '^/api': '/api', // Keep /api in the path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.originalUrl} -> ${API_TARGET}${req.url}`);
    // Preserve original headers
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Force CORS headers on all responses
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept';
    proxyRes.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization';
    
    // Log response
    console.log(`[PROXY RESPONSE] ${req.method} ${req.originalUrl} -> ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err.message);
    console.error('[PROXY ERROR] Stack:', err.stack);
    
    // Send CORS headers even on error
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message,
      code: err.code 
    });
  },
};

// Apply proxy to all /api routes
app.use('/api', createProxyMiddleware(proxyOptions));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    proxy: 'active',
    target: API_TARGET,
    message: 'CORS proxy server is running' 
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying requests to: ${API_TARGET}`);
  console.log(`\n💡 Update your .env file:`);
  console.log(`   EXPO_PUBLIC_API_BASE_URL=http://localhost:${PORT}/api\n`);
});

