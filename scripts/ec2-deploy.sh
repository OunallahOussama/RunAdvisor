#!/usr/bin/env bash
# Run ON EC2 from repo root after .env.ec2 is configured.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f .env.ec2 ]]; then
  echo "Missing .env.ec2 — run: cp .env.ec2.example .env.ec2 && nano .env.ec2"
  exit 1
fi

if docker compose version &>/dev/null; then
  COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose not found."
  exit 1
fi

echo "Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "Ensuring swap (helps small instances)..."
bash scripts/ec2-add-swap.sh 2>/dev/null || true

echo "Building and starting stack (frontend build may take 10+ minutes on t3.micro)..."
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml build backend
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build

echo ""
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml ps
echo ""
echo "Waiting for backend and frontend (up to 90s)..."
BACKEND_OK=0
FRONTEND_OK=0
for _ in $(seq 1 18); do
  if [[ "$BACKEND_OK" -eq 0 ]] && curl -sf http://127.0.0.1:5000/health >/dev/null 2>&1; then
    BACKEND_OK=1
  fi
  if [[ "$FRONTEND_OK" -eq 0 ]] && curl -sf -o /dev/null http://127.0.0.1:8080/ 2>/dev/null; then
    FRONTEND_OK=1
  fi
  if [[ "$BACKEND_OK" -eq 1 && "$FRONTEND_OK" -eq 1 ]]; then
    break
  fi
  sleep 5
done

echo ""
echo "Health checks:"
if [[ "$BACKEND_OK" -eq 1 ]]; then
  curl -sf http://127.0.0.1:5000/health | head -c 400
  echo ""
else
  echo "backend /health failed — try: ${COMPOSE[*]} --env-file .env.ec2 -f docker-compose.ec2.yml logs --tail=80 backend"
fi
echo ""
echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/ 2>/dev/null || echo 'fail')"
# Nginx uses server_name runadvisor.fit — send Host header when probing via port 80
API_CODE=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: runadvisor.fit' http://127.0.0.1/api/auth/me 2>/dev/null || echo 'fail')
echo "API via nginx (Host: runadvisor.fit): ${API_CODE} (expect 401 when not logged in)"
API_DIRECT=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5000/api/auth/me 2>/dev/null || echo 'fail')
echo "API direct (port 5000): ${API_DIRECT} (expect 401 when not logged in)"
