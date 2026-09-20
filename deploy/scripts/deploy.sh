#!/usr/bin/env bash
# Pull pre-built images from Docker Hub and start the production stack.
# Usage: IMAGE_TAG=<git-sha> bash deploy/scripts/deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ENV_FILE:-deploy/.env.production}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  echo "Copy from deploy/.env.production.example and fill secrets."
  exit 1
fi


echo "==> Pulling Docker images (tag: ${IMAGE_TAG:-latest})"
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" pull

echo "==> Starting stack"
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" up -d --remove-orphans

echo "==> Status"
docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}" ps

echo "==> Backend liveness (direct on :8081)"
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:8081/actuator/health/liveness" >/dev/null 2>&1; then
    echo "Liveness OK"
    exit 0
  fi
  sleep 3
done

echo "WARNING: backend liveness check did not pass yet — inspect logs:"
echo "  docker compose -f docker-compose.prod.yml --env-file ${ENV_FILE} logs -f backend"
exit 1
