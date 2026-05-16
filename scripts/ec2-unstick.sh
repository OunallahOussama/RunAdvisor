#!/usr/bin/env bash
# Recover when EC2 Docker build is stuck (often frontend npm run build on small instances).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

if docker compose version &>/dev/null; then
  COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose not found."
  exit 1
fi

echo "Stopping RunAdvisor stack..."
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml down --remove-orphans 2>/dev/null || true

echo "Stopping stuck build containers (if any)..."
sudo docker ps -q --filter status=running | xargs -r sudo docker inspect -f '{{.Name}} {{.Config.Image}}' 2>/dev/null | grep -E 'build|node' || true
sudo docker ps -q | xargs -r sudo docker stop 2>/dev/null || true

if [[ -f scripts/ec2-add-swap.sh ]]; then
  bash scripts/ec2-add-swap.sh || true
fi

git pull origin main

echo "Rebuilding (backend first, then frontend — can take 10–15 min on t3.micro)..."
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml build backend
"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build

"${COMPOSE[@]}" --env-file .env.ec2 -f docker-compose.ec2.yml ps
curl -sf http://127.0.0.1:5000/health | head -c 300 || echo "backend not ready yet"
echo ""
curl -s -o /dev/null -w "frontend 8080: %{http_code}\n" http://127.0.0.1:8080/ || true
curl -s -o /dev/null -w "nginx 80: %{http_code}\n" http://127.0.0.1/ || true
