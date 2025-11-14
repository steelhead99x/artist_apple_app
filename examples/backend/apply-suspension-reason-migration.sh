#!/bin/bash

# Script to apply suspension_reason migration
# This adds the ability to track WHY a user is suspended

echo "🔧 Applying suspension_reason migration..."
echo ""

# Use PostgreSQL standard environment variables or defaults
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${PGDATABASE:-artist_space}"
export PGUSER="${PGUSER:-postgres}"
# PGPASSWORD should be set in environment

# Apply the migration
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f migration_add_suspension_reason.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Restart your backend server"
    echo "  2. Test payment suspension flow"
    echo "  3. Verify admin deletions still work"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

