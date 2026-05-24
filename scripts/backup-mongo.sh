#!/usr/bin/env bash
# Snapshot the RunAdvisor MongoDB into ~/backups/runadvisor-YYYYMMDD-HHMMSS.tar.gz.
#
# Runs `mongodump` inside the runadvisor-mongodb container, copies the dump out
# of the container, tars it, and keeps the most recent 14 snapshots.
#
# Wire it into cron for daily backups (3:15am server time):
#   crontab -e
#   15 3 * * *  /home/ubuntu/RunAdvisor/scripts/backup-mongo.sh >> /home/ubuntu/RunAdvisor/backup.log 2>&1
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.ec2}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ec2.yml}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP="${KEEP:-14}"
CONTAINER="${MONGO_CONTAINER:-runadvisor-mongodb}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[backup] Missing $ENV_FILE — cannot read Mongo credentials." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
DB="${MONGO_INITDB_DATABASE:-runadvisor}"
USER_NAME="${MONGO_INITDB_ROOT_USERNAME:-admin}"
PASS="${MONGO_INITDB_ROOT_PASSWORD:?MONGO_INITDB_ROOT_PASSWORD missing in $ENV_FILE}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP_NAME="runadvisor-${STAMP}"
DUMP_TGZ="${BACKUP_DIR}/${DUMP_NAME}.tar.gz"

echo "[backup] Dumping ${DB} from container ${CONTAINER} ..."
docker exec "$CONTAINER" sh -c "rm -rf /tmp/${DUMP_NAME} && mongodump \
  --username='${USER_NAME}' --password='${PASS}' --authenticationDatabase=admin \
  --db='${DB}' --out=/tmp/${DUMP_NAME}" >/dev/null

echo "[backup] Copying dump out of container..."
docker cp "${CONTAINER}:/tmp/${DUMP_NAME}" "${BACKUP_DIR}/${DUMP_NAME}"

echo "[backup] Compressing → ${DUMP_TGZ}"
tar -C "$BACKUP_DIR" -czf "$DUMP_TGZ" "$DUMP_NAME"
rm -rf "${BACKUP_DIR:?}/${DUMP_NAME}"
docker exec "$CONTAINER" rm -rf "/tmp/${DUMP_NAME}" || true

echo "[backup] Rotating — keeping ${KEEP} most recent snapshots."
ls -1t "${BACKUP_DIR}"/runadvisor-*.tar.gz 2>/dev/null \
  | tail -n +"$((KEEP + 1))" \
  | xargs -r rm -f

echo "[backup] Done:"
ls -lh "$DUMP_TGZ"
