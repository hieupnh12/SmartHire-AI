#!/usr/bin/env bash
# Backup all MySQL databases, including tenant users/grants, from the production container.
set -euo pipefail
umask 077
BACKUP_DIR="${BACKUP_DIR:-/var/backups/smarthire}"
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/mysql_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec smarthire-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --all-databases --single-transaction --routines --events --triggers --no-tablespaces --set-gtid-purged=OFF' | gzip > "$OUT"
echo "MySQL backup: $OUT"
