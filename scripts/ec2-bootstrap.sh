#!/usr/bin/env bash
# One-shot bootstrap for a fresh EC2 box.
#
# Default target: Ubuntu 24.04 (also supports Amazon Linux 2023).
# Installs Docker CE + Compose plugin from the official repos, joins the
# current user to the `docker` group, installs git, ensures the repo is
# cloned to ~/RunAdvisor, and seeds an empty .env.ec2 from .env.ec2.example.
#
# Safe to re-run.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/OunallahOussama/RunAdvisor/main/scripts/ec2-bootstrap.sh | bash
#   OR (if you already cloned manually):
#     bash ~/RunAdvisor/scripts/ec2-bootstrap.sh
#
# Env overrides:
#   REPO_URL   git URL (default: https://github.com/OunallahOussama/RunAdvisor.git)
#   REPO_DIR   target dir (default: $HOME/RunAdvisor)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/OunallahOussama/RunAdvisor.git}"
REPO_DIR="${REPO_DIR:-$HOME/RunAdvisor}"

log() { echo "[bootstrap] $*"; }
err() { echo "[bootstrap] ERROR: $*" >&2; }

if [[ "$(id -u)" -eq 0 ]]; then
  err "Do not run this as root. Run as ubuntu / ec2-user."
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  err "Cannot detect OS — /etc/os-release missing."
  exit 1
fi
# shellcheck disable=SC1091
. /etc/os-release
DISTRO_ID="${ID:-}"

log "Detected distro: ${PRETTY_NAME:-$DISTRO_ID}"

install_docker_ubuntu() {
  log "Installing Docker CE on Ubuntu..."
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg lsb-release git

  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  fi

  sudo apt-get update -y
  sudo apt-get install -y \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker_amazon_linux_2023() {
  log "Installing Docker on Amazon Linux 2023..."
  sudo dnf -y install docker git
  # The compose plugin is shipped as a separate dnf package on AL2023.
  sudo dnf -y install docker-compose-plugin || {
    log "docker-compose-plugin dnf package not found — falling back to manual install."
    DEST=/usr/libexec/docker/cli-plugins
    sudo mkdir -p "$DEST"
    sudo curl -fsSL \
      "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
      -o "$DEST/docker-compose"
    sudo chmod +x "$DEST/docker-compose"
  }
}

case "$DISTRO_ID" in
  ubuntu|debian)
    install_docker_ubuntu
    ;;
  amzn|amazon)
    if [[ "${VERSION_ID:-}" == "2023" ]]; then
      install_docker_amazon_linux_2023
    else
      err "Unsupported Amazon Linux version ${VERSION_ID:-}. Use 2023 or Ubuntu 24.04."
      exit 1
    fi
    ;;
  *)
    err "Unsupported distro: $DISTRO_ID. Use Ubuntu 24.04 or Amazon Linux 2023."
    exit 1
    ;;
esac

# --- enable + join docker group --------------------------------------------
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

# Verify versions (use sudo because the new group is not yet active in this shell).
log "Docker version:"
sudo docker --version
log "Compose version:"
sudo docker compose version

# --- swap for tiny instances -----------------------------------------------
if [[ -x "$REPO_DIR/scripts/ec2-add-swap.sh" ]]; then
  sudo bash "$REPO_DIR/scripts/ec2-add-swap.sh" || true
fi

# --- clone repo ------------------------------------------------------------
if [[ ! -d "$REPO_DIR/.git" ]]; then
  log "Cloning $REPO_URL → $REPO_DIR ..."
  git clone "$REPO_URL" "$REPO_DIR"
else
  log "Repo already cloned at $REPO_DIR — pulling latest main..."
  git -C "$REPO_DIR" fetch --quiet origin main
  git -C "$REPO_DIR" checkout main >/dev/null 2>&1 || true
  git -C "$REPO_DIR" reset --hard origin/main
fi

# Ensure scripts are executable.
chmod +x "$REPO_DIR"/scripts/*.sh 2>/dev/null || true

# --- seed .env.ec2 ---------------------------------------------------------
if [[ ! -f "$REPO_DIR/.env.ec2" ]]; then
  cp "$REPO_DIR/.env.ec2.example" "$REPO_DIR/.env.ec2"
  log "Created $REPO_DIR/.env.ec2 from .env.ec2.example."
fi

cat <<EOF

================================================================================
 BOOTSTRAP COMPLETE
================================================================================

Next steps (in order):

  1. If this is the first time you joined the docker group, log out and back in
     so 'docker ...' works without sudo:
        exit && ssh ...
     (or run 'newgrp docker' in the current shell)

  2. Open the new env file and fill in every value flagged "YOU MUST FILL":
        nano $REPO_DIR/.env.ec2

     Generate a strong Strava token encryption key while you're there:
        openssl rand -hex 32

  3. Whitelist the public domain on Auth0 + Strava (see EC2-DOCKER.md §4).

  4. Deploy the stack:
        cd $REPO_DIR
        ./scripts/deploy.sh

  5. Caddy will auto-provision a Let's Encrypt cert for the DOMAIN you set.
     Verify with:
        curl -I https://\$(grep ^DOMAIN= $REPO_DIR/.env.ec2 | cut -d= -f2-)/health

================================================================================
EOF
