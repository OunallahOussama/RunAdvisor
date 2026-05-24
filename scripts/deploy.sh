#!/usr/bin/env bash
# Idempotent EC2 deploy.
#
# Run from the repo root on the EC2 box (or via the `ec2-bootstrap.sh` flow):
#   cd ~/RunAdvisor && ./scripts/deploy.sh
#
# Pulls latest origin/main, rebuilds the stack with the configured .env.ec2,
# prunes dangling images, and prints health probes. Safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.ec2}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.ec2.yml}"

err()  { echo "[deploy] ERROR: $*" >&2; }
log()  { echo "[deploy] $*"; }

# --- sanity checks ---------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  err "Missing $ENV_FILE — copy .env.ec2.example and fill it in:"
  err "  cp .env.ec2.example $ENV_FILE && nano $ENV_FILE"
  exit 1
fi

if ! grep -q '^DOMAIN=' "$ENV_FILE"; then
  err "$ENV_FILE is missing a DOMAIN=... line (needed by Caddy for TLS)."
  exit 1
fi

DOMAIN_VALUE="$(grep '^DOMAIN=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '[:space:]')"
if [[ -z "$DOMAIN_VALUE" || "$DOMAIN_VALUE" == "runadvisor.example.com" ]]; then
  err "DOMAIN in $ENV_FILE is empty or still the placeholder."
  err "Set it to your real public hostname (e.g. runadvisor.fit) and re-run."
  exit 1
fi

if ! grep -q '^LETSENCRYPT_EMAIL=' "$ENV_FILE"; then
  err "$ENV_FILE is missing LETSENCRYPT_EMAIL=... (needed for cert notifications)."
  exit 1
fi

# Prefer the modern compose plugin; fall back to the legacy v1 binary.
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  err "Docker Compose is not installed. Re-run ./scripts/ec2-bootstrap.sh."
  exit 1
fi

# Small instances OOM during the frontend build without classic builder.
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}"

# --- 1. update source ------------------------------------------------------
if [[ -d .git ]] && [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  log "Fetching origin/main..."
  git fetch --quiet origin main
  log "Resetting to origin/main..."
  git reset --hard origin/main
fi

# --- 2. ensure swap on tiny instances --------------------------------------
if [[ -x scripts/ec2-add-swap.sh ]]; then
  bash scripts/ec2-add-swap.sh >/dev/null 2>&1 || true
fi

# --- 3. validate compose ---------------------------------------------------
log "Validating compose config..."
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet

# --- 4. pull base images then build + start --------------------------------
log "Pulling base images (mongo, caddy, node)..."
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull --ignore-buildable || true

log "Building + starting stack..."
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans

# --- 5. prune dangling images ----------------------------------------------
log "Pruning dangling images..."
docker image prune -f >/dev/null 2>&1 || true

# --- 6. wait + report ------------------------------------------------------
log "Waiting up to 120s for backend /health..."
BACKEND_OK=0
for _ in $(seq 1 24); do
  if "${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T backend \
        node -e "require('http').get('http://localhost:5000/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1));" \
        >/dev/null 2>&1; then
    BACKEND_OK=1
    break
  fi
  sleep 5
done

log ""
log "Container status:"
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

log ""
log "Health probes (internal):"
if [[ "$BACKEND_OK" -eq 1 ]]; then
  "${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T backend \
    node -e "require('http').get('http://localhost:5000/health',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{process.stdout.write('backend: '+r.statusCode+' '+d.slice(0,200)+'\n')})});" \
    || log "backend health JSON read failed"
else
  err "backend /health did not return 200 after 120s."
  err "Tail logs with: ${COMPOSE[*]} --env-file $ENV_FILE -f $COMPOSE_FILE logs --tail=120 backend"
fi

log ""
log "Public probes (via Caddy):"
PUB_FRONT=$(curl -sk -o /dev/null -w '%{http_code}' "https://${DOMAIN_VALUE}/" 2>/dev/null || echo 'fail')
PUB_HEALTH=$(curl -sk -o /dev/null -w '%{http_code}' "https://${DOMAIN_VALUE}/health" 2>/dev/null || echo 'fail')
PUB_API=$(curl -sk -o /dev/null -w '%{http_code}' "https://${DOMAIN_VALUE}/api/auth/me" 2>/dev/null || echo 'fail')
log "  https://${DOMAIN_VALUE}/           → ${PUB_FRONT}     (expect 200)"
log "  https://${DOMAIN_VALUE}/health     → ${PUB_HEALTH}    (expect 200)"
log "  https://${DOMAIN_VALUE}/api/auth/me → ${PUB_API}      (expect 401 when not logged in)"

log ""
log "Done. Next steps:"
log "  - tail logs:   ${COMPOSE[*]} --env-file $ENV_FILE -f $COMPOSE_FILE logs -f"
log "  - rollback:    git log --oneline -5  &&  git reset --hard <sha>  &&  ./scripts/deploy.sh"
log "  - rebuild fe:  ${COMPOSE[*]} --env-file $ENV_FILE -f $COMPOSE_FILE up -d --build frontend"
