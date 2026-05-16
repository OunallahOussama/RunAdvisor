#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if docker compose version &>/dev/null; then
  COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is not installed."
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "Cannot access Docker. Try:"
  echo "  sudo usermod -aG docker \"\$USER\" && newgrp docker"
  echo "  or run: sudo ${COMPOSE[*]} up --build -d"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — add Auth0 and Strava credentials, then re-run."
  exit 1
fi

echo "Building and starting RunAdvisor (mongodb, backend, frontend)..."
"${COMPOSE[@]}" up --build -d

echo "Waiting for services..."
for i in {1..60}; do
  if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo "Health:"
curl -s http://localhost:5000/health | head -c 500 || echo "backend /health not ready yet"
echo ""
echo ""

FRONT_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || echo '000')"
echo "Frontend HTTP status: ${FRONT_CODE}"
echo ""
"${COMPOSE[@]}" ps
echo ""
echo "Frontend:  http://localhost:3000"
echo "API:       http://localhost:5000/api"
echo "Health:    http://localhost:5000/health"
echo "Logs:      ${COMPOSE[*]} logs -f"
echo "Stop:      ${COMPOSE[*]} down"
