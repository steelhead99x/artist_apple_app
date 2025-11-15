# CORS Production Server Fix

## Problem

The production server at `https://stage-www.artist-space.com` is not sending CORS headers, causing browser requests to fail with:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://stage-www.artist-space.com/api/auth/login. 
(Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 204.
```

## Solution: Configure CORS_ORIGIN Environment Variable

The backend server needs the `CORS_ORIGIN` environment variable configured to allow requests from your frontend origin.

### Step 1: Identify Your Frontend Origin

The origin is the protocol + domain + port of where your frontend is running. Examples:
- `http://localhost:19006` (Expo web dev server)
- `http://localhost:8081` (Expo dev server)
- `https://your-app.com` (Production web app)
- `https://stage-www.artist-space.com` (If frontend is on same domain)

### Step 2: Update Backend Environment Variable

**For Digital Ocean App Platform:**

1. Log into Digital Ocean
2. Navigate to your app: `https://cloud.digitalocean.com/apps`
3. Click on your backend app
4. Go to **Settings** → **App-Level Environment Variables**
5. Find or add `CORS_ORIGIN`
6. Set the value to your frontend origin(s), comma-separated:

   ```
   CORS_ORIGIN=http://localhost:19006,http://localhost:8081,https://your-app.com
   ```

   **For development, you can use:**
   ```
   CORS_ORIGIN=*
   ```
   ⚠️ **Warning:** Using `*` allows all origins. Only use in development!

7. Click **Save**
8. The app will automatically redeploy

**For other hosting platforms:**

Set the `CORS_ORIGIN` environment variable in your hosting platform's environment configuration:
- Heroku: `heroku config:set CORS_ORIGIN=http://localhost:19006,https://your-app.com`
- AWS: Set in Elastic Beanstalk environment variables
- Docker: Add to `docker-compose.yml` or `Dockerfile` ENV
- Kubernetes: Add to ConfigMap or Secret

### Step 3: Verify CORS Headers

After deployment, test the CORS configuration:

```bash
# Test OPTIONS preflight request
curl -X OPTIONS https://stage-www.artist-space.com/api/auth/login \
  -H "Origin: http://localhost:19006" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should return 204 with headers:
# Access-Control-Allow-Origin: http://localhost:19006
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept
```

### Step 4: Test in Browser

1. Open your frontend app
2. Open browser DevTools (F12)
3. Go to Network tab
4. Try to login
5. Check the request headers:
   - Request should include: `Origin: http://localhost:19006` (or your origin)
   - Response should include: `Access-Control-Allow-Origin: http://localhost:19006`

## Updated Backend Code

The backend code has been updated to:
- ✅ Include common development origins by default
- ✅ Handle OPTIONS preflight requests properly (returns 204)
- ✅ Allow localhost origins in development mode
- ✅ Support comma-separated origins in `CORS_ORIGIN` env var

## Common Origins to Allow

### Development
```
CORS_ORIGIN=http://localhost:19006,http://localhost:8081,http://localhost:5173,http://localhost:3000,http://localhost:3001
```

### Production
```
CORS_ORIGIN=https://your-production-domain.com,https://www.your-production-domain.com
```

### Staging + Development
```
CORS_ORIGIN=https://stage-www.artist-space.com,http://localhost:19006,http://localhost:8081
```

## Troubleshooting

### Still getting CORS errors after setting CORS_ORIGIN

1. **Verify the environment variable is set:**
   ```bash
   # Check in Digital Ocean console
   # Or if you have SSH access:
   echo $CORS_ORIGIN
   ```

2. **Check the exact origin in browser:**
   - Open DevTools → Network tab
   - Look at the `Origin` header in the request
   - Make sure it exactly matches what's in `CORS_ORIGIN` (including protocol, no trailing slash)

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

4. **Check if app redeployed:**
   - In Digital Ocean, verify the deployment completed
   - Check deployment logs for errors

5. **Verify OPTIONS request works:**
   ```bash
   curl -X OPTIONS https://stage-www.artist-space.com/api/auth/login \
     -H "Origin: YOUR_ORIGIN_HERE" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```
   Should return 204 with CORS headers.

### 204 Status Code Issue

The 204 (No Content) status is correct for OPTIONS preflight requests. The issue is that the CORS headers are missing. After setting `CORS_ORIGIN`, the response should include:
- `Access-Control-Allow-Origin: <your-origin>`
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept`

## Quick Test Script

Save this as `test-cors.sh`:

```bash
#!/bin/bash

ORIGIN="${1:-http://localhost:19006}"
API_URL="${2:-https://stage-www.artist-space.com}"

echo "Testing CORS for origin: $ORIGIN"
echo "API URL: $API_URL"
echo ""

echo "1. Testing OPTIONS preflight..."
curl -X OPTIONS "$API_URL/api/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v 2>&1 | grep -i "access-control"

echo ""
echo "2. Testing actual request..."
curl -X POST "$API_URL/api/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v 2>&1 | grep -i "access-control"
```

Run it:
```bash
chmod +x test-cors.sh
./test-cors.sh http://localhost:19006 https://stage-www.artist-space.com
```

## Next Steps

1. ✅ Set `CORS_ORIGIN` environment variable on production server
2. ✅ Wait for app to redeploy
3. ✅ Test CORS headers with curl
4. ✅ Test in browser
5. ✅ Verify login works

## Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- Backend code: `examples/backend/src/index.ts` (lines 67-106)

