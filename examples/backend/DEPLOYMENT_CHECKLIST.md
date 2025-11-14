# Security Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migrations ⚠️ CRITICAL

Run these migrations in order **before** deploying code:

```bash
# Connect to your database
psql -U your_username -d artist_space_db

# Run migration 1: Failed Login Attempts
\i migration_failed_login_attempts.sql

# Verify tables created
\dt failed_login_attempts

# Run migration 2: Audit Logging
\i migration_audit_logging.sql

# Verify tables created
\dt audit_logs
\dt admin_action_logs

# Exit psql
\q
```

**Verification:**
```sql
-- Check new columns on users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('locked_until', 'lockout_reason', 'failed_login_count', 'last_failed_login');

-- Should return 4 rows
```

### 2. Environment Variables

Ensure `.env` has:

```bash
# CRITICAL: Must be set in production
JWT_SECRET=<64+ character random string>

# Required
NODE_ENV=production
PGHOST=your-db-host
PGPORT=5432
PGDATABASE=artist_space
PGUSER=your-db-user
PGPASSWORD=your-db-password

# Recommended
CORS_ORIGIN=https://yourdomain.com
PGSSL=true
```

Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Dependency Check

```bash
cd backend
npm install
npm audit
npm audit fix

# Verify new packages installed
npm list decimal.js
npm list express-rate-limit
```

### 4. Build and Test

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run security-specific tests
npm run test -- auditLog.test.ts
npm run test -- validation.test.ts
```

---

## Deployment Steps

### Step 1: Deploy Backend

```bash
# Backup current production
git tag pre-security-update-$(date +%Y%m%d)
git push --tags

# Deploy new version
git checkout main
git pull origin main

# Install dependencies
cd backend
npm install

# Build
npm run build

# Restart server
pm2 restart artist-space-backend
# OR
systemctl restart artist-space

# Verify server started
pm2 logs artist-space-backend --lines 50
```

### Step 2: Verify Critical Endpoints

```bash
# Test login (should have rate limiting)
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test diagnostics (should require auth)
curl https://yourdomain.com/api/diagnostics/db
# Should return 401 Unauthorized

# Test mailing list (should require auth)
curl https://yourdomain.com/api/mailing-list/subscribers
# Should return 401 Unauthorized
```

### Step 3: Monitor Logs

```bash
# Watch for errors
tail -f /var/log/artist-space/error.log

# Watch application logs
pm2 logs artist-space-backend

# Check for migration errors
grep -i "migration\|error\|fail" /var/log/artist-space/error.log
```

### Step 4: Database Verification

```sql
-- Connect to production database
psql -U your_username -d artist_space_production

-- Verify migrations ran successfully
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('failed_login_attempts', 'audit_logs', 'admin_action_logs');
-- Should return 3 rows

-- Check that audit logging is working
-- (Make a test login, then check)
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;

-- Check no accounts are locked
SELECT COUNT(*) FROM users WHERE locked_until > NOW();
-- Should be 0 initially
```

---

## Post-Deployment Testing

### Test 1: Rate Limiting

```bash
# Make 10 rapid login attempts (should block after 5)
for i in {1..10}; do
  echo "Attempt $i"
  curl -X POST https://yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nHTTP Status: %{http_code}\n"
done

# Should see HTTP 429 (Too Many Requests) after attempt 5
```

### Test 2: Account Lockout

1. Create a test account
2. Make 5 failed login attempts
3. Verify account is locked:
   ```sql
   SELECT locked_until, lockout_reason FROM users WHERE email = 'test@test.com';
   ```
4. Try to login again - should get "Account locked" error
5. Wait 1 hour OR manually unlock:
   ```sql
   UPDATE users SET locked_until = NULL, lockout_reason = NULL WHERE email = 'test@test.com';
   ```

### Test 3: Audit Logging

```sql
-- Check that login attempts are being logged
SELECT event_type, event_status, COUNT(*)
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type, event_status;

-- Check failed login attempts
SELECT * FROM failed_login_attempts
WHERE attempted_at > NOW() - INTERVAL '1 hour'
ORDER BY attempted_at DESC;
```

### Test 4: Admin Access

```bash
# Try to access admin endpoint with non-admin user
curl -X GET https://yourdomain.com/api/admin/all-users \
  -H "Authorization: Bearer <non-admin-token>"
# Should return 403 Forbidden

# Try with admin user
curl -X GET https://yourdomain.com/api/admin/all-users \
  -H "Authorization: Bearer <admin-token>"
# Should return 200 OK with user list
```

### Test 5: Financial Calculations

Test a payment transaction to ensure Decimal.js is working:

```bash
curl -X POST https://yourdomain.com/api/tour-payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tour_date_id": "test-id",
    "venue_payment_amount": 1000.00,
    "booking_agent_fee_percentage": 15.5,
    "member_payouts": [
      {"user_id": "id1", "payout_amount": 422.50},
      {"user_id": "id2", "payout_amount": 422.50}
    ]
  }'
# Should calculate correctly without precision errors
```

---

## Rollback Plan

If issues arise, rollback steps:

### Immediate Rollback (Code Only)

```bash
# Rollback to previous version
git checkout <previous-commit-or-tag>

# Reinstall old dependencies
cd backend
rm -rf node_modules
npm install

# Rebuild
npm run build

# Restart
pm2 restart artist-space-backend
```

### Full Rollback (Including Database)

⚠️ **CAUTION:** Only if absolutely necessary

```sql
-- Rollback migrations (in reverse order)

-- Drop audit logging tables
DROP TABLE IF EXISTS admin_action_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP VIEW IF EXISTS recent_failed_logins;
DROP VIEW IF EXISTS recent_admin_actions;
DROP FUNCTION IF EXISTS log_authentication_event;
DROP FUNCTION IF EXISTS log_admin_action;
DROP FUNCTION IF EXISTS cleanup_old_audit_logs;

-- Drop failed login attempts tables
DROP TABLE IF EXISTS failed_login_attempts CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_failed_login_attempts;

-- Remove new columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
ALTER TABLE users DROP COLUMN IF EXISTS lockout_reason;
ALTER TABLE users DROP COLUMN IF EXISTS failed_login_count;
ALTER TABLE users DROP COLUMN IF EXISTS last_failed_login;
```

---

## Monitoring Setup

### 1. Application Metrics

Set up monitoring for:

```javascript
// In your monitoring dashboard
{
  "failed_login_rate": "Count of failed logins per hour",
  "locked_accounts": "Number of currently locked accounts",
  "rate_limit_hits": "429 responses per endpoint",
  "csrf_failures": "CSRF validation failures",
  "audit_log_size": "Growth rate of audit_logs table"
}
```

### 2. Alerts

Configure alerts for:

- Failed logins > 100/hour (potential attack)
- Locked accounts > 10/hour (unusual)
- Rate limit hits > 1000/hour on auth endpoints
- Any critical audit events
- Database connection errors
- JWT secret not set (startup)

### 3. Log Rotation

Set up log rotation for:

```bash
# /etc/logrotate.d/artist-space
/var/log/artist-space/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload artist-space > /dev/null 2>&1 || true
    endscript
}
```

---

## Database Maintenance

### Set Up Automated Cleanup

Install pg_cron extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3 AM
SELECT cron.schedule(
  'cleanup-failed-logins',
  '0 3 * * *',
  'SELECT cleanup_old_failed_login_attempts()'
);

SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 3 * * *',
  'SELECT cleanup_old_audit_logs()'
);

-- Verify scheduled jobs
SELECT * FROM cron.job;
```

If pg_cron is not available, set up a cron job:

```bash
# Add to crontab
0 3 * * * psql -U your_user -d artist_space -c "SELECT cleanup_old_failed_login_attempts(); SELECT cleanup_old_audit_logs();"
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/artist_space"

# Backup entire database
pg_dump -U your_user artist_space | gzip > "$BACKUP_DIR/full_backup_$DATE.sql.gz"

# Backup audit logs separately (important!)
pg_dump -U your_user -t audit_logs -t admin_action_logs -t failed_login_attempts artist_space \
  | gzip > "$BACKUP_DIR/audit_logs_$DATE.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

---

## Success Criteria

Deployment is successful when:

- ✅ All migrations completed without errors
- ✅ Backend server starts and responds to requests
- ✅ Rate limiting is working (5 attempts, then blocked)
- ✅ Account lockout is working (5 failed attempts = 1 hour lock)
- ✅ Audit logs are being created
- ✅ Admin-only endpoints require admin access
- ✅ Previously open endpoints now require authentication
- ✅ Financial calculations are precise
- ✅ No critical errors in logs
- ✅ All tests pass

---

## Troubleshooting

### Issue: Migration Fails

**Symptom:** Error running migration SQL

**Solutions:**
```bash
# Check if uuid-ossp extension exists
psql -U user -d db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Check PostgreSQL version (need 12+)
psql --version

# Check current user permissions
psql -U user -d db -c "SELECT current_user, current_database();"

# Try running migration statements one at a time
```

### Issue: Server Won't Start

**Symptom:** `JWT_SECRET must be set` error

**Solution:**
```bash
# Generate and set JWT_SECRET
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env

# Restart server
pm2 restart artist-space-backend
```

### Issue: Rate Limiting Not Working

**Symptom:** Can make unlimited requests

**Solutions:**
```typescript
// Check that middleware is applied
import { authRateLimiter } from '../middleware/rateLimiter.js';
router.post('/login', authRateLimiter, handler); // Must be BEFORE handler

// Check express-rate-limit is installed
npm list express-rate-limit

// Check logs for rate limiter errors
grep -i "rate limit" /var/log/artist-space/error.log
```

### Issue: Audit Logs Not Being Created

**Symptom:** `audit_logs` table is empty

**Solutions:**
```sql
-- Check table exists
SELECT * FROM information_schema.tables WHERE table_name = 'audit_logs';

-- Check permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'audit_logs';

-- Manually test logging
SELECT log_authentication_event(
  NULL, 'test@test.com', 'test_login', 'success', NULL, NULL, NULL
);
```

---

## Contacts

- **Deployment Issues:** ops@yourdomain.com
- **Security Issues:** security@yourdomain.com
- **Database Issues:** dba@yourdomain.com

---

**Checklist Version:** 1.0
**Last Updated:** January 2025
**Review Before Each Deployment**
