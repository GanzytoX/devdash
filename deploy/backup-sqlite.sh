#!/bin/sh
set -eu
DB_PATH="${DB_PATH:-/var/lib/docker/volumes/devdash_devdash_data/_data/devdash.db}"
BACKUP_DIR="${BACKUP_DIR:-/opt/devdash/backups}"
mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/devdash-$(date +%Y%m%d-%H%M%S).db'"
find "$BACKUP_DIR" -type f -name 'devdash-*.db' -mtime +14 -delete
