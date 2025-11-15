# Quick CORS Fix - Step by Step

## The Problem
Your browser is blocking requests to `https://stage-www.artist-space.com` because the server doesn't send CORS headers. **This cannot be fixed from the client side** - it must be fixed on the server OR you need a proxy.

## Immediate Solution (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

This will install the proxy server dependencies (express, http-proxy-middleware, cors).

### Step 2: Start the Proxy Server
Open a **new terminal window** and run:
```bash
npm run proxy
```

You should see:
```
🚀 CORS Proxy Server running on http://localhost:3001
📡 Proxying requests to: https://stage-www.artist-space.com
```

**Keep this terminal open** - the proxy must stay running.

### Step 3: Create/Update .env File
Create a `.env` file in the root directory (if it doesn't exist) and add:
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

### Step 4: Restart Expo
**Stop your current Expo server** (Ctrl+C) and restart it:
```bash
npm run web
```

### Step 5: Test
Try logging in again. The requests should now go through the proxy.

---

## Alternative: Use Native Platforms (No CORS Issues)

CORS only affects web browsers. Native apps don't have this problem:

```bash
npm run ios      # iOS Simulator (Mac only)
npm run android  # Android Emulator
```

---

## If It Still Doesn't Work

### Check 1: Is the proxy running?
Open http://localhost:3001/health in your browser. You should see:
```json
{"status":"ok","proxy":"active","target":"https://stage-www.artist-space.com"}
```

### Check 2: Is .env file correct?
Make sure `.env` has:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

**Important:** After changing `.env`, you MUST restart Expo.

### Check 3: Check browser console
Open DevTools (F12) → Console tab. Look for:
- Any proxy errors
- Network requests going to `localhost:3001` (good) vs `stage-www.artist-space.com` (bad)

### Check 4: Check Network tab
Open DevTools → Network tab → Try login → Check the request:
- **URL should be:** `http://localhost:3001/api/auth/login`
- **NOT:** `https://stage-www.artist-space.com/api/auth/login`

---

## Permanent Solution

The backend at `https://stage-www.artist-space.com` needs to be configured to send CORS headers. Contact your backend team to add:

```javascript
// Express.js example
app.use(cors({
  origin: ['http://localhost:19006', 'http://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## Troubleshooting

**Error: "Cannot find module 'express'"**
→ Run `npm install` first

**Error: "Port 3001 already in use"**
→ Change PORT in `dev-proxy-server.js` to something else (like 3002), then update `.env` accordingly

**Still getting CORS errors**
→ Make sure you restarted Expo after changing `.env`
→ Check that proxy is running (visit http://localhost:3001/health)
→ Clear browser cache

**Proxy shows errors**
→ Check the proxy terminal for error messages
→ Verify `API_TARGET` in `dev-proxy-server.js` matches your API URL

