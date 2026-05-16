#!/usr/bin/env bash
# Run from your dev machine to bootstrap EC2 (requires SSH key).
set -euo pipefail

EC2_HOST="${EC2_HOST:-ec2-user@34.236.149.33}"
EC2_IP="${EC2_IP:-34.236.149.33}"
SSH_KEY="${SSH_KEY:-$HOME/Downloads/runadvisor-access.pem}"
REPO_URL="${REPO_URL:-https://github.com/OunallahOussama/RunAdvisor.git}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://runadvisor.fit}"

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
  echo "Uploading .env as .env.ec2 (URLs adjusted for ${PUBLIC_BASE_URL})..."
  sed \
    -e "s|http://localhost:3000|${PUBLIC_BASE_URL}|g" \
    -e "s|http://localhost:5000/api|${PUBLIC_BASE_URL}/api|g" \
    -e "s|REACT_APP_API_BASE_URL=http://localhost:5000/api|REACT_APP_API_BASE_URL=${PUBLIC_BASE_URL}/api|g" \
    -e 's|^NODE_ENV=development|NODE_ENV=production|' \
    -e 's|^TRUST_PROXY=0|TRUST_PROXY=1|' \
    -e 's|^STRAVA_WEBHOOK_SKIP_SIGNATURE=1|STRAVA_WEBHOOK_SKIP_SIGNATURE=|' \
    .env > /tmp/runadvisor.env.ec2
  if ! grep -q '^CORS_ORIGINS=' /tmp/runadvisor.env.ec2; then
    echo "CORS_ORIGINS=${PUBLIC_BASE_URL},https://www.runadvisor.fit" >> /tmp/runadvisor.env.ec2
  fi
  if ! grep -q '^REACT_APP_SITE_URL=' /tmp/runadvisor.env.ec2; then
    echo "REACT_APP_SITE_URL=${PUBLIC_BASE_URL}" >> /tmp/runadvisor.env.ec2
  fi
  if ! grep -q '^STRAVA_REDIRECT_URI=' /tmp/runadvisor.env.ec2; then
    echo "STRAVA_REDIRECT_URI=${PUBLIC_BASE_URL}/callback" >> /tmp/runadvisor.env.ec2
  fi
  if ! grep -q '^REACT_APP_STRAVA_REDIRECT_URI=' /tmp/runadvisor.env.ec2; then
    echo "REACT_APP_STRAVA_REDIRECT_URI=${PUBLIC_BASE_URL}/callback" >> /tmp/runadvisor.env.ec2
  fi
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
echo "Done. Open ${PUBLIC_BASE_URL}/ (or http://${EC2_IP}/ before DNS/HTTPS)"
echo "Auth0 + Strava callbacks must use ${PUBLIC_BASE_URL} and ${PUBLIC_BASE_URL}/callback"
