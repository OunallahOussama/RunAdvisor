## RunAdvisor on EC2 (Docker + Nginx)

This setup keeps Nginx on host ports `80/443` and exposes the frontend container on `localhost:8080`.

### 1) Install Docker on Amazon Linux

**Amazon Linux 2023** uses `dnf`. **Amazon Linux 2** uses `yum`:

```bash
# Amazon Linux 2
sudo yum -y install docker git nginx
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# log out and back in, or: newgrp docker

# Amazon Linux 2023
# sudo dnf -y install docker git nginx
```

Or run the automated bootstrap from the repo root on EC2:

```bash
chmod +x scripts/ec2-bootstrap.sh
./scripts/ec2-bootstrap.sh YOUR_PUBLIC_IP
```

### 2) Ensure Docker Compose is available

Try plugin first:

```bash
docker compose version
```

If plugin is unavailable, install standalone binary:

```bash
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose version
```

### 3) Verify buildx version and context

BuildKit/buildx should be `>= 0.17` for reliable builds.

```bash
docker buildx version
sudo docker buildx version
```

If root and user contexts differ, run compose commands consistently with the same context (all `docker ...` or all `sudo docker ...`) and recreate the builder in that context if needed:

```bash
docker buildx create --name runadvisor-builder --use || true
docker buildx inspect --bootstrap
```

### 4) Configure environment and start services

```bash
cp .env.ec2.example .env.ec2
# Replace YOUR_EC2_PUBLIC_IP (e.g. 13.222.164.158) and add Auth0/Strava secrets
nano .env.ec2
```

From your dev machine (SSH key at `~/Downloads/runadvisor-access.pem`):

```bash
chmod +x scripts/ec2-provision-from-local.sh
EC2_IP=13.222.164.158 ./scripts/ec2-provision-from-local.sh
```

For Auth0, make sure your Auth0 application allows:

- Callback URL: `http://YOUR_EC2_PUBLIC_IP`
- Logout URL: `http://YOUR_EC2_PUBLIC_IP`
- Web Origin: `http://YOUR_EC2_PUBLIC_IP`

If you later put Nginx behind a real domain and HTTPS, switch those Auth0 URLs to your final public origin.

Use `--env-file` on every compose command:

```bash
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml pull
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml ps
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml logs --tail=100
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml down
```

### 5) Configure Nginx reverse proxy

Compose publishes:

- **Frontend** on host `8080` (`8080:3000`)
- **Backend API** on host `5000` (`5000:5000`) so Nginx can proxy `/api/` to Express

Without `location /api/`, requests like `/api/strava/authenticate` hit the React app and return **502** or fail Strava with a **Network Error**.

Example server block (HTTP):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Validate upstream before relying on the domain:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/
```

Expect `200` for both. Then:

```bash
curl -i http://127.0.0.1/api/auth/me
```

Expect `401` JSON when not logged in (not `502`).

Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Frontend recovery quick path

If `frontend` is down/missing while `backend` and `mongodb` are running:

```bash
# from repo root on EC2
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build frontend
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml ps
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml logs -f --tail=200 frontend
```

Create the host nginx config if missing:

```bash
sudo tee /etc/nginx/conf.d/runadvisor.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name runadvisor.fit www.runadvisor.fit;

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Reload and validate local path:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I http://127.0.0.1:8080
curl -I http://127.0.0.1:5000/health
curl -I http://127.0.0.1/api/auth/me
```

### 6) Optional HTTPS with certbot

```bash
sudo dnf -y install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot renew --dry-run
```

### Security group guidance

- Open inbound `80` and `443` to the internet.
- Keep `8080` and `5000` closed publicly (both are localhost targets behind Nginx). Only `80`/`443` need to be open for users.
