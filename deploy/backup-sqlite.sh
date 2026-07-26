#!/bin/sh
set -eu
umask 077

DB_PATH="${DB_PATH:-/var/lib/docker/volumes/devdash_data/_data/devdash.db}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_FILE="$BACKUP_DIR/devdash-$(date +%Y%m%d-%H%M%S).db"

if [ ! -f "$DB_PATH" ]; then
  echo "No se encontró la base de datos en: $DB_PATH" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 es obligatorio para crear el respaldo." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
chmod 600 "$BACKUP_FILE"
find "$BACKUP_DIR" -type f -name 'devdash-*.db' -mtime "+$RETENTION_DAYS" -delete

echo "Respaldo creado: $BACKUP_FILE"
