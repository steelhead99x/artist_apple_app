#!/bin/bash

# Comprehensive Production Database Fix Script
# Fixes both booking agent tables and bars->venues rename

set -e  # Exit on error

echo "🔧 Production Database Fix"
echo "========================="
echo ""
echo "This will fix TWO issues:"
echo "  1. Missing booking agent tables (user_billing_adjustments, etc.)"
echo "  2. Rename 'bars' table to 'venues'"
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
    echo ""
    echo "   Or set them manually:"
    echo "   export PGHOST=your_host"
    echo "   export PGDATABASE=your_database"
    echo "   export PGUSER=your_username"
    echo "   export PGPASSWORD=your_password"
    exit 1
fi

echo "📊 Database Configuration:"
echo "   Host: $PGHOST"
echo "   Port: ${PGPORT:-5432}"
echo "   Database: $PGDATABASE"
echo "   User: $PGUSER"
echo ""

# Ask for confirmation
read -p "⚠️  This will modify $PGDATABASE. Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 1
fi

echo ""
echo "🔨 Applying comprehensive fix..."
echo "--------------------------------"

# Build connection string
if [ -n "$PGPASSWORD" ]; then
    export PGPASSWORD="$PGPASSWORD"
    CONN_STRING="postgresql://$PGUSER@$PGHOST:${PGPORT:-5432}/$PGDATABASE"
else
    CONN_STRING="postgresql://$PGUSER@$PGHOST:${PGPORT:-5432}/$PGDATABASE"
fi

# Run the comprehensive fix
psql "$CONN_STRING" -f fix_production_database.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅✅✅ Fix applied successfully! ✅✅✅"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart your backend server:"
    echo "      pm2 restart backend"
    echo "      # OR if running with npm:"
    echo "      # cd backend && npm start"
    echo ""
    echo "   2. Log in as booking agent (jackd99x@gmail.com)"
    echo ""
    echo "   3. Verify you can see all users"
    echo ""
    echo "   4. Test creating/viewing tours (bars->venues fix)"
    echo ""
else
    echo ""
    echo "❌ Fix failed! Check the error messages above"
    echo ""
    echo "Common issues:"
    echo "  - Connection refused: Check PGHOST and PGPORT"
    echo "  - Authentication failed: Check PGUSER and PGPASSWORD"
    echo "  - Permission denied: Make sure user has ALTER TABLE permissions"
    echo ""
fi

