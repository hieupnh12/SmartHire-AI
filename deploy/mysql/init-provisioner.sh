#!/usr/bin/env bash
set -euo pipefail
# Separate provisioning account; tenant runtime pools never use it.
# Restrict input so no secret can alter SQL syntax.
if [[ ! "${TENANT_PROVISIONING_PASSWORD:-}" =~ ^[a-fA-F0-9]{48,128}$ ]]; then
  echo "TENANT_PROVISIONING_PASSWORD must be 48-128 hexadecimal characters" >&2
  exit 1
fi
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root <<SQL
CREATE USER IF NOT EXISTS 'smarthire_provisioner'@'%' IDENTIFIED BY '$TENANT_PROVISIONING_PASSWORD';
GRANT CREATE USER ON *.* TO 'smarthire_provisioner'@'%';
GRANT ALL PRIVILEGES ON \`smarthire\\_tenant\\_%\`.* TO 'smarthire_provisioner'@'%' WITH GRANT OPTION;
SQL
