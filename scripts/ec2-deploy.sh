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
git pull origin main

echo "Building and starting stack..."
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build

echo ""
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml ps
echo ""
echo "Health checks:"
curl -sf http://127.0.0.1:5000/health | head -c 400 || echo "backend /health failed"
echo ""
echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/ || echo 'fail')"
echo "API via nginx: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/auth/me || echo 'fail')"
