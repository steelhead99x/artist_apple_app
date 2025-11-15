# Production Deployment Guide
## Artist Space - Secure Deployment to Digital Ocean

This guide walks you through deploying your enterprise-secure app to production.

---

## Prerequisites

- Digital Ocean account with PostgreSQL database
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt free)
- Git repository (GitHub/GitLab)

---

## Step 1: Backend Deployment (Digital Ocean App Platform)

### 1.1 Prepare Repository

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Add enterprise security features"
git push origin main
```

### 1.2 Create App on Digital Ocean

1. Log into Digital Ocean
2. Click "Create" → "Apps"
3. Connect to your GitHub repository
4. Select the `examples/backend` directory as source
5. Configure build settings:
   - **Build Command:** `npm run build`
   - **Run Command:** `npm start`
   - **Environment:** `NODE_ENV=production`

### 1.3 Configure Environment Variables

Add these in Digital Ocean App Platform:

```
NODE_ENV=production
JWT_SECRET=<generate with: openssl rand -hex 64>
PGHOST=<your-db-host>.db.ondigitalocean.com
PGPORT=25060
PGUSER=<your-db-user>
PGPASSWORD=<your-db-password>
PGDATABASE=artist_space
DATABASE_SSL=true
CORS_ORIGIN=https://yourapp.com
```

### 1.4 Deploy

1. Click "Create Resources"
2. Wait for deployment (5-10 minutes)
3. Note your app URL: `https://your-app-abc123.ondigitalocean.app`

---

## Step 2: Database Setup

### 2.1 Run Migrations

```bash
# Get database connection string from Digital Ocean
export DATABASE_URL="postgresql://user:pass@host:port/database?sslmode=require"

# Run all migrations in order
psql $DATABASE_URL < examples/backend/schema.sql
psql $DATABASE_URL < examples/backend/migration_e2ee_public_keys.sql
psql $DATABASE_URL < examples/backend/migration_message_encryption_at_rest.sql
psql $DATABASE_URL < examples/backend/migration_audit_logging.sql
psql $DATABASE_URL < examples/backend/migration_add_user_soft_delete.sql
```

### 2.2 Verify Migrations

```bash
psql $DATABASE_URL
\dt  # List tables
\d users  # Check users table has e2ee_public_key column
```

---

## Step 3: Mobile App Deployment

### 3.1 Configure Production Environment

```bash
# Update .env for production
cat > .env << EOF
EXPO_PUBLIC_API_BASE_URL=https://your-backend.digitalocean.app/api
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_ENABLE_WALLET_LOGIN=true
EXPO_PUBLIC_ENABLE_TLS_PINNING=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_API_TIMEOUT=15000
EOF
```

### 3.2 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 3.3 Configure EAS Build

```bash
eas build:configure
```

This creates `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://your-backend.digitalocean.app/api",
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  }
}
```

### 3.4 Build for iOS

**Requirements:**
- Apple Developer account ($99/year)
- Xcode installed (macOS only)

```bash
# Build
eas build --platform ios --profile production

# Wait for build (~15 minutes)
# Download IPA when complete
```

**Submit to App Store:**
```bash
eas submit --platform ios
```

### 3.5 Build for Android

```bash
# Build AAB (Android App Bundle)
eas build --platform android --profile production

# Wait for build (~10 minutes)
# Download AAB when complete
```

**Submit to Play Store:**
```bash
eas submit --platform android
```

---

## Step 4: SSL & Domain Configuration

### 4.1 Add Custom Domain (Optional)

1. In Digital Ocean App Platform
2. Go to Settings → Domains
3. Add your domain: `api.yourapp.com`
4. Update DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-app-abc123.ondigitalocean.app
   ```

### 4.2 Enable SSL

Digital Ocean automatically provisions Let's Encrypt certificate.

Verify: https://api.yourapp.com should show valid SSL certificate

### 4.3 Update Mobile App

```bash
# Update .env
EXPO_PUBLIC_API_BASE_URL=https://api.yourapp.com/api

# Rebuild mobile app
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## Step 5: Post-Deployment Verification

### 5.1 Health Check

```bash
curl https://your-backend.digitalocean.app/health
# Should return: {"status":"ok"}
```

### 5.2 Test Registration

```bash
curl -X POST https://your-backend.digitalocean.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#",
    "name": "Test User",
    "userType": "user"
  }'
```

### 5.3 Test E2EE

1. Open mobile app
2. Register two accounts
3. Send encrypted message
4. Verify in database:
   ```sql
   SELECT encrypted_content, iv FROM messages ORDER BY created_at DESC LIMIT 1;
   ```
5. Message should be encrypted (Base64 gibberish)

### 5.4 Verify Security Headers

```bash
curl -I https://your-backend.digitalocean.app/api/health

# Should see:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
```

---

## Step 6: Monitoring & Logging

### 6.1 Enable Digital Ocean Monitoring

1. Go to your app in Digital Ocean
2. Click "Insights"
3. Enable monitoring

### 6.2 Set Up Alerts

1. Go to "Alerts"
2. Add alert for:
   - CPU > 80%
   - Memory > 80%
   - Failed deployments
   - High error rate

### 6.3 Application Logging (Optional)

**Install Sentry:**
```bash
cd examples/backend
npm install @sentry/node

# Add to index.ts
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

**Frontend (Mobile App):**
```bash
npm install sentry-expo

# Add to App.tsx
import * as Sentry from 'sentry-expo';
Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
```

---

## Step 7: Backup & Recovery

### 7.1 Enable Automated Backups

1. Go to Digital Ocean Databases
2. Select your database
3. Enable "Automated Backups"
4. Set retention: 7 days

### 7.2 Manual Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql

# Upload to Digital Ocean Spaces or S3
```

### 7.3 Test Recovery

```bash
# Create test database
createdb test_restore

# Restore
gunzip < backup_20251115.sql.gz | psql test_restore

# Verify
psql test_restore -c "SELECT COUNT(*) FROM users;"
```

---

## Step 8: Performance Optimization

### 8.1 Enable Database Connection Pooling

Already configured in `db.ts`:
```javascript
pool: {
  min: 2,
  max: 10
}
```

### 8.2 Enable Gzip Compression

```javascript
// examples/backend/src/index.ts
import compression from 'compression';
app.use(compression());
```

### 8.3 Add Caching (Optional)

```bash
npm install ioredis

# Add Redis to Digital Ocean
# Update code to cache frequently accessed data
```

---

## Production Checklist

Before going live:

**Security:**
- [ ] All `.env` files secured (not in git)
- [ ] JWT secret is strong (64+ characters)
- [ ] Database SSL enabled
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting tested
- [ ] E2EE messaging verified
- [ ] Input validation working
- [ ] CORS configured correctly

**Functionality:**
- [ ] User registration works
- [ ] Login works (all 4 methods)
- [ ] Password reset works
- [ ] Biometric auth works
- [ ] E2EE messaging works
- [ ] Payments work (test mode first!)
- [ ] File uploads work
- [ ] Notifications work

**Infrastructure:**
- [ ] Database backups enabled
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Logs accessible
- [ ] Domain configured (if using)
- [ ] SSL certificate valid
- [ ] Health check endpoint responding

**Compliance:**
- [ ] Privacy policy added
- [ ] Terms of service added
- [ ] GDPR compliance (if EU users)
- [ ] Data retention policy
- [ ] User data export functionality

---

## Maintenance

### Daily

```bash
# Check logs
doctl apps logs <app-id> --follow

# Monitor errors
doctl apps alerts list <app-id>
```

### Weekly

```bash
# Check dependencies
npm audit

# Review database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('artist_space'));"
```

### Monthly

```bash
# Update dependencies
npm update
npm audit fix

# Review user growth
psql $DATABASE_URL -c "SELECT COUNT(*), user_type FROM users GROUP BY user_type;"

# Check backup integrity
# Restore latest backup to test database
```

### Quarterly

```bash
# Security audit
npm audit
# Review SECURITY_ANALYSIS.md recommendations

# Rotate E2EE keys
# Notify users to update their encryption keys

# Performance review
# Check database query performance
# Optimize slow queries
```

---

## Troubleshooting

### App won't start

```bash
# Check logs
doctl apps logs <app-id>

# Check environment variables
doctl apps env list <app-id>

# Restart app
doctl apps restart <app-id>
```

### Database connection errors

```bash
# Verify connection
psql $DATABASE_URL -c "SELECT 1;"

# Check SSL
psql "$DATABASE_URL&sslmode=require" -c "SELECT 1;"

# Check firewall
# Add your app's IP to database trusted sources
```

### Mobile app can't connect

```bash
# Test API directly
curl https://your-backend.digitalocean.app/api/health

# Check CORS
curl -H "Origin: http://localhost:8081" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-backend.digitalocean.app/api/auth/login

# Update CORS_ORIGIN if needed
```

---

## Scaling

When you need to scale:

### Horizontal Scaling

1. Increase app instances in Digital Ocean
2. Add load balancer
3. Use Redis for session storage

### Database Scaling

1. Upgrade database plan
2. Add read replicas
3. Implement caching layer

### CDN for Assets

1. Upload images to Digital Ocean Spaces
2. Enable CDN
3. Update app to use CDN URLs

---

## Support

**Documentation:**
- Security Guide: `SECURITY_IMPLEMENTATION_GUIDE.md`
- Quick Start: `QUICK_START.md`

**Digital Ocean:**
- Docs: https://docs.digitalocean.com/
- Support: https://www.digitalocean.com/support/

**Emergency:**
- Backend down: `doctl apps restart <app-id>`
- Database issues: Check Digital Ocean console
- Security incident: Follow incident response in security guide

---

**Deployment Complete! 🎉**

Your enterprise-secure app is now live with:
- ✅ E2EE messaging
- ✅ Secure authentication
- ✅ Protected API
- ✅ SSL/HTTPS
- ✅ Automated backups
- ✅ Monitoring & alerts

**Next:** Monitor logs and user feedback for first week!
