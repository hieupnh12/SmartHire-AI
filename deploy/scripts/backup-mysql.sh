#!/usr/bin/env bash
# MySQL logical backup from production compose stack
# Usage: bash deploy/scripts/backup-mysql.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/deploy/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/smarthire}"
STAMP="$(date +%Y%m%d_%H%M%S)"

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

sudo mkdir -p "${BACKUP_DIR}"
OUT="${BACKUP_DIR}/smarthire_${STAMP}.sql.gz"

echo "==> Dumping MySQL to ${OUT}"
docker exec smarthire-mysql \
  mysqldump -u"${DB_USER}" -p"${DB_PASSWORD}" --single-transaction --routines --triggers "${DB_NAME}" \
  | gzip -c | sudo tee "${OUT}" >/dev/null

# Keep last 14 days
find "${BACKUP_DIR}" -name 'smarthire_*.sql.gz' -mtime +14 -delete 2>/dev/null || true

echo "Backup done: ${OUT}"
