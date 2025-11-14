#!/bin/bash

# Security Migrations Application Script
# This script applies all security-related database migrations
# Author: Security Team
# Date: January 2025

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Security Migrations Application"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Please create a .env file with database connection details."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required environment variables
if [ -z "$PGHOST" ] || [ -z "$PGDATABASE" ] || [ -z "$PGUSER" ]; then
    echo -e "${RED}ERROR: Missing required environment variables!${NC}"
    echo "Please ensure PGHOST, PGDATABASE, and PGUSER are set in .env"
    exit 1
fi

echo -e "${YELLOW}Database Connection:${NC}"
echo "  Host: $PGHOST"
echo "  Port: ${PGPORT:-5432}"
echo "  Database: $PGDATABASE"
echo "  User: $PGUSER"
echo ""

# Prompt for confirmation
read -p "Apply security migrations to this database? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Function to run SQL file
run_migration() {
    local file=$1
    local description=$2

    echo -e "${YELLOW}Running: $description${NC}"

    if [ ! -f "$file" ]; then
        echo -e "${RED}ERROR: Migration file not found: $file${NC}"
        return 1
    fi

    # Run migration
    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -f "$file"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $description completed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ $description failed${NC}"
        return 1
    fi
}

# Verify PostgreSQL connection
echo -e "${YELLOW}Testing database connection...${NC}"
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Cannot connect to database!${NC}"
    echo "Please check your database connection settings."
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Check for uuid-ossp extension
echo -e "${YELLOW}Checking for uuid-ossp extension...${NC}"
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ uuid-ossp extension available${NC}"
else
    echo -e "${RED}ERROR: Cannot create uuid-ossp extension${NC}"
    echo "This extension is required for the migrations."
    exit 1
fi
echo ""

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_FILE="backup_before_security_migrations_$(date +%Y%m%d_%H%M%S).sql"
PGPASSWORD=$PGPASSWORD pg_dump -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER $PGDATABASE > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}WARNING: Backup failed, but continuing...${NC}"
fi
echo ""

# Run migrations
echo "=================================="
echo "Running Migrations"
echo "=================================="
echo ""

# Migration 1: Failed Login Attempts
run_migration "migration_failed_login_attempts.sql" "Migration 1: Failed Login Attempts & Account Lockout"
MIGRATION1_STATUS=$?

echo ""

# Migration 2: Audit Logging
run_migration "migration_audit_logging.sql" "Migration 2: Audit Logging System"
MIGRATION2_STATUS=$?

echo ""

# Verify migrations
echo "=================================="
echo "Verifying Migrations"
echo "=================================="
echo ""

echo -e "${YELLOW}Checking created tables...${NC}"

# Check failed_login_attempts table
TABLE_CHECK=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='failed_login_attempts';")

if [ "$TABLE_CHECK" -eq 1 ]; then
    echo -e "${GREEN}✓ failed_login_attempts table exists${NC}"
else
    echo -e "${RED}✗ failed_login_attempts table NOT found${NC}"
fi

# Check audit_logs table
TABLE_CHECK=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='audit_logs';")

if [ "$TABLE_CHECK" -eq 1 ]; then
    echo -e "${GREEN}✓ audit_logs table exists${NC}"
else
    echo -e "${RED}✗ audit_logs table NOT found${NC}"
fi

# Check admin_action_logs table
TABLE_CHECK=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='admin_action_logs';")

if [ "$TABLE_CHECK" -eq 1 ]; then
    echo -e "${GREEN}✓ admin_action_logs table exists${NC}"
else
    echo -e "${RED}✗ admin_action_logs table NOT found${NC}"
fi

# Check new columns on users table
echo -e "${YELLOW}Checking new columns on users table...${NC}"

COLUMNS=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name IN ('locked_until', 'lockout_reason', 'failed_login_count', 'last_failed_login');")

if [ "$COLUMNS" -eq 4 ]; then
    echo -e "${GREEN}✓ All 4 new columns added to users table${NC}"
else
    echo -e "${RED}✗ Expected 4 new columns, found $COLUMNS${NC}"
fi

echo ""

# Final summary
echo "=================================="
echo "Migration Summary"
echo "=================================="
echo ""

if [ $MIGRATION1_STATUS -eq 0 ] && [ $MIGRATION2_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All migrations completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review DEPLOYMENT_CHECKLIST.md"
    echo "  2. Test the application thoroughly"
    echo "  3. Monitor audit logs: SELECT * FROM audit_logs;"
    echo "  4. Set up automated cleanup jobs (see SECURITY_IMPROVEMENTS.md)"
    echo ""
    echo "Backup saved to: $BACKUP_FILE"
    exit 0
else
    echo -e "${RED}✗ Some migrations failed!${NC}"
    echo ""
    echo "Please review the errors above."
    echo "You can restore from backup: $BACKUP_FILE"
    echo ""
    echo "To restore:"
    echo "  PGPASSWORD=\$PGPASSWORD psql -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER $PGDATABASE < $BACKUP_FILE"
    exit 1
fi
