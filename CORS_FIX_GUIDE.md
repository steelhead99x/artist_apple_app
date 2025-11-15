# CORS Fix Guide

## Problem

When running the app on web (React Native Web), you may encounter CORS errors:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://stage-www.artist-space.com/api/auth/login. 
(Reason: CORS header 'Access-Control-Allow-Origin' missing).
```

This happens because:
1. The app runs in a web browser (which enforces CORS)
2. The API server at `https://stage-www.artist-space.com` doesn't send CORS headers
3. Browsers block cross-origin requests without proper CORS headers

## Solutions

### ✅ Solution 1: Use Development Proxy Server (Recommended for Development)

A local proxy server can add CORS headers to API responses.

**Step 1: Install dependencies**
```bash
npm install --save-dev express http-proxy-middleware cors
```

**Step 2: Start the proxy server**
```bash
npm run proxy
```

The proxy will run on `http://localhost:3001`

**Step 3: Update your `.env` file**
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

**Step 4: Restart your Expo app**
```bash
npm run web
```

The proxy server will:
- Forward all `/api/*` requests to `https://stage-www.artist-space.com/api/*`
- Add CORS headers to responses
- Log all proxied requests for debugging

### ✅ Solution 2: Configure Backend CORS (Recommended for Production)

The best long-term solution is to configure the backend server to send proper CORS headers.

**For Express.js backend:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:19006',  // Expo web dev server
    'http://localhost:8081',   // Expo dev server
    'https://your-production-domain.com',  // Production web app
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
```

**For Cloudflare Workers or other serverless:**
```javascript
// Add CORS headers to responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific origins
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

// Handle OPTIONS preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Add headers to all responses
response.headers.set('Access-Control-Allow-Origin', '*');
```

### ⚠️ Solution 3: Browser Extension (Development Only)

**Not recommended for production**, but useful for quick testing:

1. Install a CORS browser extension (e.g., "CORS Unblock" or "Allow CORS")
2. Enable it only during development
3. **Never use this in production or share with users**

### ✅ Solution 4: Use Native Platforms (iOS/Android)

CORS is a browser security feature. Native mobile apps (iOS/Android) don't have CORS restrictions.

- Run on iOS: `npm run ios`
- Run on Android: `npm run android`

These platforms won't have CORS issues.

## Current Implementation

The API service (`src/services/api.ts`) has been updated to:
- Detect web platform automatically
- Provide better error messages for CORS issues
- Handle CORS errors gracefully

## Testing

After implementing a solution:

1. **Test login:**
   ```bash
   # Start the app
   npm run web
   
   # Try logging in
   # Check browser console for errors
   ```

2. **Verify proxy (if using Solution 1):**
   ```bash
   # Check proxy logs
   # You should see: [PROXY] POST /api/auth/login -> https://stage-www.artist-space.com/api/auth/login
   ```

3. **Check network tab:**
   - Open browser DevTools → Network tab
   - Look for the login request
   - Verify response headers include CORS headers

## Production Considerations

For production deployment:

1. **Backend must have CORS configured** - This is the only viable production solution
2. **Don't use proxy server in production** - It adds latency and complexity
3. **Don't use browser extensions** - Users can't be expected to install these
4. **Whitelist specific origins** - Don't use `*` for `Access-Control-Allow-Origin` in production

## Troubleshooting

**Issue: Proxy server not starting**
- Check if port 3001 is already in use
- Try: `lsof -i :3001` (Mac/Linux) or `netstat -ano | findstr :3001` (Windows)

**Issue: Still getting CORS errors**
- Verify `.env` file has correct `EXPO_PUBLIC_API_BASE_URL`
- Restart Expo dev server after changing `.env`
- Clear browser cache
- Check proxy server is running

**Issue: 404 errors from proxy**
- Verify `API_TARGET` in `dev-proxy-server.js` matches your API URL
- Check proxy logs for the actual request URL

## Next Steps

1. **For immediate development:** Use Solution 1 (proxy server)
2. **For production:** Implement Solution 2 (backend CORS configuration)
3. **For testing:** Use Solution 4 (native platforms)

## Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)

