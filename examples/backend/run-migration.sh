#!/bin/bash

# Load environment variables from .env file
set -a
source ../.env
set +a

# Check if required PostgreSQL variables are set
if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGDATABASE" ]; then
    echo "❌ ERROR: Required PostgreSQL environment variables are not set in .env file"
    echo "   Required variables: PGHOST, PGUSER, PGPASSWORD, PGDATABASE"
    echo "   Optional: PGPORT (defaults to 5432)"
    exit 1
fi

# Set default port if not specified
export PGPORT=${PGPORT:-5432}

echo "🔄 Running migration: Add booking_manager_id to bands table..."
echo ""

# Run the migration using PostgreSQL environment variables
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f migration_add_booking_manager_to_bands.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo "You can now create bands from the Booking Agent Dashboard."
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi


