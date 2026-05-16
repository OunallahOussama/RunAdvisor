#!/usr/bin/env bash
# Run ON the EC2 instance (Amazon Linux 2) as ec2-user after cloning the repo.
set -euo pipefail

EC2_IP="${1:-$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '')}"
REPO_DIR="${REPO_DIR:-$HOME/RunAdvisor}"
SERVER_NAME="${SERVER_NAME:-${EC2_IP:-_}}"

echo "RunAdvisor EC2 bootstrap (Amazon Linux 2)"
echo "  Repo: ${REPO_DIR}"
echo "  Public IP: ${EC2_IP:-unknown}"
echo "  Nginx server_name: ${SERVER_NAME}"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run as ec2-user, not root."
  exit 1
fi

if command -v dnf &>/dev/null; then
  PKG="dnf"
else
  PKG="yum"
fi

echo "Installing Docker and Git..."
sudo "$PKG" -y install docker git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

if ! command -v nginx &>/dev/null; then
  echo "Installing Nginx (Amazon Linux Extras on AL2)..."
  if command -v amazon-linux-extras &>/dev/null; then
    sudo amazon-linux-extras install -y nginx1
  else
    sudo "$PKG" -y install nginx
  fi
fi
sudo systemctl enable --now nginx

if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  echo "Installing docker-compose..."
  sudo curl -fsSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
    -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  COMPOSE="docker-compose"
fi

# Older hosts may lack buildx 0.17+ required by default compose builds.
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-0}"

if [[ ! -d "$REPO_DIR" ]]; then
  echo "Clone the repo into ${REPO_DIR} first, e.g.:"
  echo "  git clone https://github.com/OunallahOussama/RunAdvisor.git ${REPO_DIR}"
  exit 1
fi

cd "$REPO_DIR"

if [[ ! -f .env.ec2 ]]; then
  cp .env.ec2.example .env.ec2
  if [[ -n "$EC2_IP" ]]; then
    sed -i "s/YOUR_EC2_PUBLIC_IP/${EC2_IP}/g" .env.ec2
  fi
  echo ""
  echo "Created .env.ec2 — edit secrets before deploy:"
  echo "  nano ${REPO_DIR}/.env.ec2"
  echo ""
fi

NGINX_CONF="/etc/nginx/conf.d/runadvisor.conf"
sudo cp deploy/nginx/runadvisor.conf "$NGINX_CONF"
sudo sed -i "s/RUNADVISOR_SERVER_NAME/${SERVER_NAME}/g" "$NGINX_CONF"
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo ""
echo "Bootstrap done. Next (log out/in if docker group was added, then):"
echo "  cd ${REPO_DIR}"
echo "  ${COMPOSE} --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build"
echo ""
echo "Verify:"
echo "  curl -s http://127.0.0.1:5000/health"
echo "  curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/"
echo "  curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/auth/me"
