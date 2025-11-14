#!/bin/bash

# Migration Verification Script
# This script verifies that all SQL migration files are present and can be copied during build

set -e

echo "=================================="
echo "🔍 Migration Verification Script"
echo "=================================="
echo ""

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$BACKEND_DIR/dist"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "$BACKEND_DIR/package.json" ]; then
    echo -e "${RED}❌ Error: Not in backend directory${NC}"
    echo "Please run this script from the backend directory"
    exit 1
fi

echo "📁 Backend directory: $BACKEND_DIR"
echo "📁 Dist directory: $DIST_DIR"
echo ""

# Count SQL files
SQL_COUNT=$(find "$BACKEND_DIR" -maxdepth 1 -name "*.sql" -type f | wc -l | tr -d ' ')
echo "📊 Found $SQL_COUNT SQL files in backend directory"
echo ""

# List all SQL files
echo "📄 SQL Files:"
find "$BACKEND_DIR" -maxdepth 1 -name "*.sql" -type f | sort | while read -r file; do
    filename=$(basename "$file")
    size=$(du -h "$file" | cut -f1)
    echo "   ✓ $filename ($size)"
done

echo ""
echo "=================================="
echo "🧪 Testing Build Process"
echo "=================================="
echo ""

# Test the copy-sql command
if [ -d "$DIST_DIR" ]; then
    echo "🧹 Cleaning existing dist directory..."
    rm -rf "$DIST_DIR"
fi

mkdir -p "$DIST_DIR"

echo "📋 Running copy-sql command..."
cd "$BACKEND_DIR"

# Run the copy command (simulate what happens during build)
if cp *.sql "$DIST_DIR/" 2>/dev/null; then
    echo -e "${GREEN}✅ SQL files copied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Some SQL files may not have been copied${NC}"
fi

# Count files in dist
DIST_SQL_COUNT=$(find "$DIST_DIR" -maxdepth 1 -name "*.sql" -type f | wc -l | tr -d ' ')

echo ""
echo "📊 Verification Results:"
echo "   SQL files in backend: $SQL_COUNT"
echo "   SQL files in dist: $DIST_SQL_COUNT"

if [ "$SQL_COUNT" -eq "$DIST_SQL_COUNT" ]; then
    echo -e "${GREEN}✅ All SQL files copied successfully!${NC}"
    exit_code=0
else
    echo -e "${RED}❌ Mismatch: Some SQL files were not copied${NC}"
    echo ""
    echo "Missing files:"
    comm -23 <(find "$BACKEND_DIR" -maxdepth 1 -name "*.sql" -type f -exec basename {} \; | sort) \
             <(find "$DIST_DIR" -maxdepth 1 -name "*.sql" -type f -exec basename {} \; | sort) | \
             while read -r file; do
                 echo "   ❌ $file"
             done
    exit_code=1
fi

echo ""
echo "=================================="
echo "✅ Verification Complete"
echo "=================================="
echo ""

exit $exit_code

