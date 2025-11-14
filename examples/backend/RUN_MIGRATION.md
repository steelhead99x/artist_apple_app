# Fix Band Creation - Database Migration

## Problem
The `bands` table in your database is missing the `booking_manager_id` column.

## Solution
Run the migration SQL file to add the missing column.

## How to Run the Migration

### Option 1: Using psql command line
```bash
# Navigate to the backend directory
cd backend

# Run the migration using PostgreSQL environment variables
# Make sure PGHOST, PGUSER, PGPASSWORD, PGDATABASE are set
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f migration_add_booking_manager_to_bands.sql
```

### Option 2: Using a PostgreSQL GUI (pgAdmin, TablePlus, etc.)
1. Open your PostgreSQL database in your preferred GUI tool
2. Open the file `migration_add_booking_manager_to_bands.sql`
3. Execute the SQL script

### Option 3: Using Node/CLI script
```bash
# From the backend directory
cd backend

# Run this command with explicit credentials
export PGHOST='your_host'
export PGPORT='5432'
export PGUSER='your_user'
export PGPASSWORD='your_password'
export PGDATABASE='your_database'
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f migration_add_booking_manager_to_bands.sql
```

## Verify the Migration
After running the migration, you should see:
```
NOTICE:  Column booking_manager_id added to bands table
```

And a table showing the new column details.

## Test
After running the migration, try creating a band again from the Booking Agent Dashboard. It should work now!


