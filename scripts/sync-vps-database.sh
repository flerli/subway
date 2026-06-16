#!/bin/bash
# Sync database from VPS to local development environment
# Usage: ./scripts/sync-vps-database.sh

set -e

VPS_HOST="subway"
VPS_DB_PATH="/home/swaibian/subway/backend/data/subway.sqlite"
LOCAL_DB_PATH="backend/data/subway.sqlite"
BACKUP_PATH="backend/data/subway.backup.$(date +%Y%m%d_%H%M%S).sqlite"

echo "🔄 Starting VPS database sync..."

# Create backup of current local database
if [ -f "$LOCAL_DB_PATH" ]; then
  echo "📦 Backing up current database to $BACKUP_PATH"
  cp "$LOCAL_DB_PATH" "$BACKUP_PATH"
fi

# Copy database from VPS
echo "⬇️  Downloading database from VPS..."
if scp -o ConnectTimeout=30 "$VPS_HOST:$VPS_DB_PATH" "$LOCAL_DB_PATH"; then
  echo "✅ Database downloaded successfully"
  
  # Restart backend to pick up new database
  echo "🔄 Restarting backend container..."
  docker compose restart backend
  docker compose exec -T backend node -e "
    console.log('Backend restarted, checking database...');
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync('/app/data/subway.sqlite');
    const events = db.prepare('SELECT COUNT(*) as cnt FROM calendar_events').get().cnt;
    console.log('✅ Calendar events in database:', events);
  "
  echo "✅ Sync complete!"
else
  echo "❌ Failed to download from VPS (connection timeout)"
  echo "ℹ️  Using local backup: $BACKUP_PATH"
  exit 1
fi
