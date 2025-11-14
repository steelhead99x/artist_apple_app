#!/bin/bash

# Apply Booking Agent Fix Script
# This script creates the missing tables needed for booking agents to see all users

set -e  # Exit on error

echo "🔧 Booking Agent Fix - Creating Missing Tables"
echo "=============================================="
echo ""

# Load environment variables
if [ -f ../.env ]; then
    echo "📄 Loading environment from ../.env"
    export $(cat ../.env | grep -v '^#' | xargs)
elif [ -f .env ]; then
    echo "📄 Loading environment from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$PGHOST" ] || [ -z "$PGDATABASE" ] || [ -z "$PGUSER" ]; then
    echo "❌ Error: Required PostgreSQL environment variables not set"
    echo "   Please ensure PGHOST, PGDATABASE, and PGUSER are set in your .env file"
    exit 1
fi

echo "📊 Database Configuration:"
echo "   Host: $PGHOST"
echo "   Port: ${PGPORT:-5432}"
echo "   Database: $PGDATABASE"
echo "   User: $PGUSER"
echo ""

# Ask for confirmation
read -p "⚠️  This will create missing tables in $PGDATABASE. Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 1
fi

echo ""
echo "🔍 Step 1: Running diagnostics..."
echo "--------------------------------"

# Build connection string
if [ -n "$PGPASSWORD" ]; then
    export PGPASSWORD="$PGPASSWORD"
    CONN_STRING="postgresql://$PGUSER@$PGHOST:${PGPORT:-5432}/$PGDATABASE"
else
    CONN_STRING="postgresql://$PGUSER@$PGHOST:${PGPORT:-5432}/$PGDATABASE"
fi

# Run diagnostic (non-critical, continue even if it fails)
psql "$CONN_STRING" -f diagnose_booking_agent_issue.sql || echo "⚠️  Diagnostic completed with warnings"

echo ""
echo "🔨 Step 2: Creating missing tables..."
echo "------------------------------------"

# Run the fix
psql "$CONN_STRING" -f fix_booking_agent_tables.sql

echo ""
echo "✅ Fix applied successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Log in as your booking agent user (jackd99x@gmail.com)"
echo "   2. Navigate to the user management page"
echo "   3. You should now see all users"
echo ""
echo "🔄 If you still have issues, try restarting your backend server:"
echo "   cd backend && npm start"
echo ""

