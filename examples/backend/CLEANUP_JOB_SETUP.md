# Automated Account Cleanup Job Setup

## Overview

The automated cleanup job permanently deletes user accounts that have been in the deleted/suspended state for more than 30 days. This provides a recovery period for accidentally deleted accounts while ensuring data is eventually purged.

## How It Works

1. **Soft Delete**: When a booking agent deletes a user account, it's marked with `deleted_at` timestamp and status set to 'suspended'
2. **30-Day Recovery Period**: During this period, the account can be recovered by the booking agent
3. **Automated Cleanup**: After 30 days, the cleanup job permanently deletes the account and all associated data
4. **Email Notifications**: Users receive emails at deletion (with recovery info) and at permanent deletion

## Setup Instructions

### Option 1: Cron Job (Recommended for Production)

1. **Make the cleanup script executable:**
   ```bash
   chmod +x backend/src/jobs/cleanup-deleted-accounts.ts
   ```

2. **Create a shell script wrapper:**
   ```bash
   cat > backend/run-cleanup.sh << 'EOF'
   #!/bin/bash
   cd "$(dirname "$0")"
   source ../.env
   node --loader ts-node/esm src/jobs/cleanup-deleted-accounts.ts >> logs/cleanup-$(date +\%Y-\%m-\%d).log 2>&1
   EOF
   chmod +x backend/run-cleanup.sh
   ```

3. **Set up cron job:**
   ```bash
   crontab -e
   ```
   
   Add this line to run daily at 2 AM:
   ```
   0 2 * * * /path/to/artist-space/backend/run-cleanup.sh
   ```

### Option 2: systemd Timer (Linux)

1. **Create service file** `/etc/systemd/system/artistspace-cleanup.service`:
   ```ini
   [Unit]
   Description=Artist Space Account Cleanup Job
   After=postgresql.service

   [Service]
   Type=oneshot
   User=your-user
   WorkingDirectory=/path/to/artist-space/backend
   ExecStart=/usr/bin/node --loader ts-node/esm src/jobs/cleanup-deleted-accounts.ts
   EnvironmentFile=/path/to/artist-space/.env
   StandardOutput=append:/var/log/artistspace-cleanup.log
   StandardError=append:/var/log/artistspace-cleanup-error.log
   ```

2. **Create timer file** `/etc/systemd/system/artistspace-cleanup.timer`:
   ```ini
   [Unit]
   Description=Run Artist Space cleanup daily

   [Timer]
   OnCalendar=daily
   OnCalendar=02:00
   Persistent=true

   [Install]
   WantedBy=timers.target
   ```

3. **Enable and start:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable artistspace-cleanup.timer
   sudo systemctl start artistspace-cleanup.timer
   ```

### Option 3: Node.js Scheduler (Development)

Add to your main server file or create a scheduler service:

```typescript
import cron from 'node-cron';
import { cleanupDeletedAccounts } from './jobs/cleanup-deleted-accounts.js';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running automated account cleanup...');
  try {
    const result = await cleanupDeletedAccounts();
    console.log('Cleanup completed:', result);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
});
```

Install the cron package:
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

## Manual Execution

To manually run the cleanup job for testing:

```bash
cd backend
source ../.env
npx ts-node --esm src/jobs/cleanup-deleted-accounts.ts
```

Or use the provided npm script:

```bash
npm run cleanup:accounts
```

Add to `package.json`:
```json
{
  "scripts": {
    "cleanup:accounts": "node --loader ts-node/esm src/jobs/cleanup-deleted-accounts.ts"
  }
}
```

## Monitoring

### Check Cleanup Logs

View recent cleanup activity:
```bash
tail -f backend/logs/cleanup-*.log
```

### Database Query

Check accounts pending cleanup:
```sql
SELECT 
  u.id, 
  u.name, 
  u.email, 
  u.user_type, 
  u.deleted_at,
  DATE_PART('day', NOW() - u.deleted_at) as days_since_deletion,
  CASE 
    WHEN u.deleted_at > NOW() - INTERVAL '30 days' THEN 'Recoverable'
    ELSE 'Ready for Cleanup'
  END as status
FROM users u
WHERE u.deleted_at IS NOT NULL
ORDER BY u.deleted_at ASC;
```

### Email Notifications

Booking agents receive automated reports including:
- Number of accounts deleted
- Details of each deleted account
- Any failures that occurred

## Testing

### Test the Cleanup Job

1. **Create a test account and soft delete it:**
   ```sql
   -- Create test user
   INSERT INTO users (id, name, email, user_type, status, deleted_at)
   VALUES (
     uuid_generate_v4(),
     'Test User',
     'test@example.com',
     'user',
     'suspended',
     NOW() - INTERVAL '31 days'  -- Set deleted 31 days ago
   );
   ```

2. **Run the cleanup job:**
   ```bash
   npm run cleanup:accounts
   ```

3. **Verify deletion:**
   ```sql
   SELECT * FROM users WHERE email = 'test@example.com';
   -- Should return no results
   ```

## Troubleshooting

### Job Not Running

1. **Check cron service:**
   ```bash
   sudo systemctl status cron  # Ubuntu/Debian
   sudo systemctl status crond  # CentOS/RHEL
   ```

2. **Check crontab:**
   ```bash
   crontab -l
   ```

3. **Check logs:**
   ```bash
   grep CRON /var/log/syslog
   ```

### Email Notifications Failing

Ensure environment variables are set:
```bash
MAILJET_API_KEY=your_key
MAILJET_SECRET_KEY=your_secret
FROM_EMAIL=noreply@artist-space.com
FROM_NAME=Artist Space
```

### Database Connection Issues

Verify PostgreSQL connection is accessible:
```bash
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL;"
```

## Security Considerations

1. **Backup Before Cleanup**: Consider implementing automatic backups before cleanup runs
2. **Audit Logging**: All deletions are logged with timestamps and account details
3. **Email Confirmations**: Users receive final notification before permanent deletion
4. **Booking Agent Notifications**: Booking agents are notified of all cleanup activities

## Configuration

### Adjust Recovery Period

To change the 30-day period, modify the SQL query in:
- `backend/src/jobs/cleanup-deleted-accounts.ts`
- `backend/src/routes/admin.ts` (recovery endpoint check)

Example for 60 days:
```typescript
WHERE u.deleted_at < NOW() - INTERVAL '60 days'
```

## Maintenance

- Review cleanup logs weekly
- Monitor email delivery success rates
- Check for any failed deletions
- Verify database performance with deleted records cleanup

## Support

For issues or questions, contact:
- Technical Support: support@artist-space.com
- Development Team: dev@artist-space.com

