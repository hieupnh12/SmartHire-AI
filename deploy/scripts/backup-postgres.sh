#!/usr/bin/env bash
# The master registry backup must be retained together with TENANT_CREDENTIALS_KEY.
set -euo pipefail
umask 077
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/deploy/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/smarthire}"
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/master_$(date +%Y%m%d_%H%M%S).dump"
docker compose -f "$ROOT_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE" exec -T postgres \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" -d smarthire_master -Fc' > "$OUT"
echo "PostgreSQL master backup: $OUT"
