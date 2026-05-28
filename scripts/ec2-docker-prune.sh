#!/usr/bin/env bash
# Free disk before EC2 Docker builds (t3.micro often fills /var/lib/docker).
set -euo pipefail

echo "Disk before cleanup:"
df -h / /var/lib/docker 2>/dev/null || df -h /

echo "Stopping stale build containers..."
sudo docker ps -q --filter status=running 2>/dev/null | while read -r id; do
  name=$(sudo docker inspect -f '{{.Name}}' "$id" 2>/dev/null || true)
  if [[ "$name" == *build* ]] || [[ "$name" == *npm* ]]; then
    sudo docker stop "$id" 2>/dev/null || true
  fi
done

echo "Pruning unused Docker data..."
sudo docker container prune -f 2>/dev/null || true
sudo docker image prune -af 2>/dev/null || true
sudo docker builder prune -af 2>/dev/null || true
sudo docker volume prune -f 2>/dev/null || true

# Classic builder left on EC2 (DOCKER_BUILDKIT=0) can leave dangling layers
sudo docker system prune -af 2>/dev/null || true

echo "Disk after cleanup:"
df -h / /var/lib/docker 2>/dev/null || df -h /

avail_kb=$(df -Pk / | awk 'NR==2 {print $4}')
if [[ -n "$avail_kb" && "$avail_kb" -lt 1500000 ]]; then
  echo "WARNING: Less than ~1.5 GB free on /. Frontend build may still fail."
  echo "Consider: sudo yum clean all && journalctl --vacuum-time=3d"
  exit 1
fi

echo "OK: enough free space to attempt a build."
