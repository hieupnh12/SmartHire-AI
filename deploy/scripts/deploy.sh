#!/usr/bin/env bash
# Build & start production stack on the VPS
# Usage (from repo root on VPS):
#   bash deploy/scripts/deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ENV_FILE:-deploy/.env.production}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  echo "Copy from deploy/.env.production.example and fill secrets."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

echo "==> Pulling base images / building app"
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" pull || true
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" build --pull

echo "==> Starting stack"
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" up -d --remove-orphans

echo "==> Status"
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" ps

echo "==> Backend health (via frontend proxy on :8080)"
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:8080/actuator/health" >/dev/null 2>&1; then
    echo "Health OK"
    exit 0
  fi
  sleep 3
done

echo "WARNING: health check did not pass yet — inspect logs:"
echo "  docker compose -f docker-compose.prod.yml --env-file ${ENV_FILE} logs -f backend"
exit 1
