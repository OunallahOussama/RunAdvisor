#!/usr/bin/env bash
# Add 2G swap on small EC2 instances so frontend Docker builds do not OOM/hang.
set -euo pipefail

if swapon --show | grep -q /swapfile; then
  echo "Swap already active:"
  swapon --show
  exit 0
fi

if [[ ! -f /swapfile ]]; then
  echo "Creating 2G swap file..."
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
fi

sudo swapon /swapfile
echo "Swap enabled:"
swapon --show
free -h
