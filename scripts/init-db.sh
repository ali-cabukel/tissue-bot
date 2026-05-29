#!/usr/bin/env bash
# Initialize the local SQLite database from schema.sql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="${DB_PATH:-$ROOT/backend/data/tissue-bot.db}"
SCHEMA="$ROOT/scripts/db/schema.sql"

mkdir -p "$(dirname "$DB_PATH")"

if [[ -f "$DB_PATH" ]]; then
  echo "Database already exists: $DB_PATH"
  echo "Delete it first if you want a fresh start."
  exit 0
fi

sqlite3 "$DB_PATH" < "$SCHEMA"
echo "Created database: $DB_PATH"
