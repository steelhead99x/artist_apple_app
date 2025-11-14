#!/bin/bash
# Script to apply subscription signup fix to production database
# Usage: ./apply_subscription_fix.sh

set -e

echo "🔧 Applying Subscription Signup Fix..."
echo ""

# Check if required PostgreSQL variables are set
if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGDATABASE" ]; then
    echo "❌ Error: Required PostgreSQL environment variables are not set"
    echo "   Please set the following:"
    echo "   export PGHOST='your-host'"
    echo "   export PGUSER='your-user'"
    echo "   export PGPASSWORD='your-password'"
    echo "   export PGDATABASE='your-database'"
    echo "   export PGPORT='5432'  # optional, defaults to 5432"
    exit 1
fi

# Set default port if not specified
export PGPORT=${PGPORT:-5432}

echo "✅ PostgreSQL connection variables are set"
echo ""

# Backup reminder
echo "⚠️  IMPORTANT: This script will modify your database schema"
echo "   Make sure you have a backup before proceeding!"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Aborted."
    exit 0
fi

# Run the migration
echo "📝 Running migration..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f migration_subscription_payment_methods.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🎉 Subscription signup should now work for:"
    echo "   - Free plans"
    echo "   - Gift card payments"
    echo "   - PayPal payments"
    echo "   - All other payment methods"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Test signup at /register-subscription?plan=artist_free"
    echo "   2. Verify with: node verify_subscription_fix.js"
    echo "   3. Monitor backend logs for any errors"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

