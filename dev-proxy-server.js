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

// Enable CORS for all routes
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Proxy middleware configuration
const proxyOptions = {
  target: API_TARGET,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // Keep /api in the path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${API_TARGET}${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are present
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
  },
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err.message);
    res.status(500).json({ error: 'Proxy error', message: err.message });
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

