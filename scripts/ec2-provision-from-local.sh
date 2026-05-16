#!/usr/bin/env bash
# Run from your dev machine to bootstrap EC2 (requires SSH key).
set -euo pipefail

EC2_HOST="${EC2_HOST:-ec2-user@13.222.164.158}"
EC2_IP="${EC2_IP:-13.222.164.158}"
SSH_KEY="${SSH_KEY:-$HOME/Downloads/runadvisor-access.pem}"
REPO_URL="${REPO_URL:-https://github.com/OunallahOussama/RunAdvisor.git}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [[ -f "$SSH_KEY" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
  chmod 400 "$SSH_KEY" 2>/dev/null || true
fi

echo "Provisioning ${EC2_HOST}..."

ssh "${SSH_OPTS[@]}" "$EC2_HOST" "command -v git >/dev/null || sudo yum -y install git"

ssh "${SSH_OPTS[@]}" "$EC2_HOST" "test -d ~/RunAdvisor || git clone ${REPO_URL} ~/RunAdvisor"

echo "Syncing repo..."
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude node_modules \
  --exclude frontend/node_modules \
  --exclude frontend/build \
  --exclude .env \
  --exclude .env.ec2 \
  --exclude .git \
  ./ "$EC2_HOST:~/RunAdvisor/" 2>/dev/null || {
  echo "rsync failed; pulling on server instead..."
  ssh "${SSH_OPTS[@]}" "$EC2_HOST" "cd ~/RunAdvisor && git pull origin main"
}

if [[ -f .env ]]; then
  echo "Uploading .env as .env.ec2 (URLs adjusted for ${EC2_IP})..."
  sed \
    -e "s|http://localhost:3000|http://${EC2_IP}|g" \
    -e "s|http://localhost:5000/api|http://${EC2_IP}/api|g" \
    -e "s|REACT_APP_API_BASE_URL=http://localhost:5000/api|REACT_APP_API_BASE_URL=http://${EC2_IP}/api|g" \
    .env > /tmp/runadvisor.env.ec2
  if ! grep -q '^MONGO_INITDB_ROOT_USERNAME=' /tmp/runadvisor.env.ec2; then
    cat >> /tmp/runadvisor.env.ec2 <<'EOF'

MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password
MONGO_INITDB_DATABASE=runadvisor
EOF
  fi
  scp "${SSH_OPTS[@]}" /tmp/runadvisor.env.ec2 "$EC2_HOST:~/RunAdvisor/.env.ec2"
  rm -f /tmp/runadvisor.env.ec2
fi

ssh "${SSH_OPTS[@]}" "$EC2_HOST" "bash ~/RunAdvisor/scripts/ec2-bootstrap.sh ${EC2_IP}"

echo ""
echo "Deploying containers (requires .env.ec2 on server)..."
ssh "${SSH_OPTS[@]}" "$EC2_HOST" "cd ~/RunAdvisor && chmod +x scripts/*.sh && ./scripts/ec2-deploy.sh"

echo ""
echo "Done. Open http://${EC2_IP}/"
echo "Auth0 + Strava callbacks must use http://${EC2_IP} and http://${EC2_IP}/callback"
