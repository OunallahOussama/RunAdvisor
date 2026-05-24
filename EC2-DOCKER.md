# RunAdvisor on EC2 (Docker + Caddy + HTTPS)

This is the canonical production deploy story for RunAdvisor on a small EC2
box. The stack is a single `docker compose` project:

```
                      ┌────────────────────────────────────────────┐
   client  ── 443 ──▶ │  caddy  (TLS, auto Let's Encrypt cert)     │
                      │   │                                        │
                      │   ├─▶ /api/*  /health  ──▶ backend :5000  │
                      │   └─▶ /*                ──▶ frontend :3000│
                      │                                            │
                      │                            mongodb :27017  │
                      └────────────────────────────────────────────┘
                              (single docker bridge network)
```

Only ports `80` and `443` are exposed on the host. Mongo, the backend API,
and the frontend bundle are all reached **through Caddy**, never directly.

> Looking for legacy host-nginx deploys? See `deploy/nginx/runadvisor.conf`
> and `scripts/ec2-deploy.sh`. They still work but are no longer the
> recommended path — the new flow below ships with managed TLS out of the box.

---

## EC2 quick start (10 steps)

1. **Launch an Ubuntu 24.04 EC2 instance.** `t3.small` (2 vCPU, 2 GB RAM) is
   the recommended minimum; `t3.medium` if you plan to enable OpenAI features
   (Smart Weekly Summary + Training Report) at high concurrency.
   Security-group inbound rules:
   - TCP `22`  – your office IP only
   - TCP `80`  – `0.0.0.0/0` (Let's Encrypt HTTP-01 challenge)
   - TCP `443` – `0.0.0.0/0`
   - UDP `443` – `0.0.0.0/0` (HTTP/3 — optional but nice)
   Leave `5000`, `3000`, `8080`, `27017` **closed** to the internet.

2. **Allocate an Elastic IP, attach it to the instance, then create an
   `A` record** at your registrar pointing your chosen `DOMAIN`
   (e.g. `runadvisor.fit`) at that IP. Wait for DNS to propagate
   (check with `dig +short runadvisor.fit`).

3. **SSH in and run the bootstrap script** (installs Docker CE + compose
   plugin, joins your user to the `docker` group, clones the repo,
   seeds an empty `.env.ec2`):
   ```bash
   ssh ubuntu@<elastic-ip>
   curl -fsSL https://raw.githubusercontent.com/OunallahOussama/RunAdvisor/main/scripts/ec2-bootstrap.sh | bash
   exit                                  # so the docker group takes effect
   ```

4. **Reconnect, edit `.env.ec2`** and fill in every value flagged
   `YOU MUST FILL` (full table in `.env.ec2.example`):
   ```bash
   ssh ubuntu@<elastic-ip>
   cd ~/RunAdvisor
   nano .env.ec2
   # generate a Strava token encryption key while you're in there:
   openssl rand -hex 32
   ```
   At minimum set: `DOMAIN`, `LETSENCRYPT_EMAIL`, `MONGO_INITDB_ROOT_PASSWORD`
   (and update `MONGODB_URI` to match), `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` /
   `AUTH0_AUDIENCE`, `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` /
   `STRAVA_WEBHOOK_VERIFY_TOKEN` / `STRAVA_TOKEN_ENCRYPTION_KEY`,
   `ADMIN_EMAILS`. Set `OPENAI_API_KEY` if you want AI summaries.

5. **Whitelist the public domain on Auth0** (Dashboard → Applications →
   your SPA → Settings). Add to all three of *Allowed Callback URLs*,
   *Allowed Logout URLs*, and *Allowed Web Origins*:
   ```
   https://<DOMAIN>
   https://<DOMAIN>/login
   ```
   (Add the `www.` variants too only if you actually serve a `www.` alias.)
   Enable *Refresh Token Rotation* + *Allow Offline Access* on the API.

6. **Configure Strava** ([API settings](https://www.strava.com/settings/api)):
   - **Authorization Callback Domain:** `<DOMAIN>` (domain only, no scheme)
   - The OAuth redirect is therefore `https://<DOMAIN>/callback`, which
     matches `STRAVA_REDIRECT_URI` in `.env.ec2`.

7. **Deploy:**
   ```bash
   cd ~/RunAdvisor
   ./scripts/deploy.sh
   ```
   The first run pulls the base images, builds the backend + frontend images
   (10–15 min on a `t3.small` for the React build — be patient), and starts
   Caddy. Caddy will provision a Let's Encrypt cert automatically on first
   request, so subsequent visits to `https://<DOMAIN>` get a real cert.

8. **Verify** (the script also prints these at the end):
   ```bash
   curl -I https://<DOMAIN>/                 # 200
   curl -I https://<DOMAIN>/health           # 200 (JSON body has mongodb/auth0/strava)
   curl -I https://<DOMAIN>/api/auth/me      # 401 (correct when not logged in)
   docker compose --env-file .env.ec2 -f docker-compose.ec2.yml ps
   ```
   If `/health` returns `DEGRADED`, check that `AUTH0_DOMAIN` /
   `AUTH0_AUDIENCE` are set and that Mongo started.

9. **Subscribe Strava to webhooks** (one-time, replaces polling for
   real-time activity sync). From any machine with `curl`:
   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=$STRAVA_CLIENT_ID \
     -F client_secret=$STRAVA_CLIENT_SECRET \
     -F callback_url=https://<DOMAIN>/api/strava/webhook \
     -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
   ```
   Verify with `GET https://www.strava.com/api/v3/push_subscriptions?...`.

10. **(Optional) cron the Mongo backup** so you don't lose user training
    history:
    ```bash
    crontab -e
    # daily at 03:15 server time, keeps last 14 snapshots in ~/backups
    15 3 * * *  /home/ubuntu/RunAdvisor/scripts/backup-mongo.sh >> /home/ubuntu/RunAdvisor/backup.log 2>&1
    ```

---

## Post-deploy smoke test

After the stack is up, walk through this in a browser at
`https://<DOMAIN>` to confirm every new feature works end-to-end:

1. **Sign up / log in via Auth0.** First-time users should land on the
   **onboarding stepper** (theme intro, running goal, Strava connect,
   notification + privacy consent).
2. **Connect Strava** from the stepper — confirm you bounce to
   `https://www.strava.com`, accept, and come back to `https://<DOMAIN>/callback`
   with the dashboard populated.
3. **Sync recent activities**, then open the **Training Report** page
   (`/training-report`) and click *Generate report* — should return a
   structured report within ~30s (uses OpenAI if `OPENAI_API_KEY` set,
   otherwise a deterministic fallback).
4. **Open the dashboard** and confirm the **Smart Weekly Summary card**
   renders with a headline + bullets + load-risk badge.
5. **Click the notification bell** in the AppShell top bar — drawer should
   open and the new `Notification` model entries (e.g. weekly report ready)
   should appear. Mark one as read and confirm the unread count drops.
6. **Toggle theme** (light/dark) from the AppShell button. The choice should
   persist across reload (`localStorage`).
7. **Open dev-tools → device mode** and confirm the AppShell layout is
   usable on mobile (375 px wide).
8. **Replay the onboarding tour** from the Profile menu → "Replay tour"
   to confirm `PUT /api/users/me/onboarding-complete { reset: true }` works.

---

## Updating

```bash
# on the EC2 box
cd ~/RunAdvisor
./scripts/deploy.sh
```

`deploy.sh` is idempotent: it runs `git fetch && git reset --hard origin/main`,
re-builds, prunes dangling images, then prints health probes.

> **Heads-up:** every `REACT_APP_*` variable is baked into the frontend image
> at *build* time. Changing any of them (e.g. moving to a new domain, rotating
> Auth0 client ID) requires rebuilding the frontend specifically:
> ```bash
> docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build frontend
> ```
> `deploy.sh` already rebuilds all services, so a normal `./scripts/deploy.sh`
> covers it too.

### GitHub Actions auto-deploy (optional)

`.github/workflows/deploy.yml` ships disabled-by-default (it only runs when the
listed repo secrets exist). To enable, add these **repository secrets**:

| Secret        | Example value                              |
|---------------|--------------------------------------------|
| `EC2_HOST`    | `runadvisor.example.com` (or Elastic IP)   |
| `EC2_USER`    | `ubuntu` (or `ec2-user` on AL2023)         |
| `EC2_SSH_KEY` | private key for a dedicated deploy user    |

Optionally add a **repository variable** `EC2_REPO_DIR` if the checkout lives
somewhere other than `~/RunAdvisor`. Once set, every push to `main` SSHes in
and runs `./scripts/deploy.sh`; you can also trigger it manually with
*Run workflow* in the Actions tab.

---

## Backups & restore

`scripts/backup-mongo.sh` runs `mongodump` *inside* the running mongo
container, copies the dump out, tars it into `~/backups/runadvisor-<stamp>.tar.gz`
and keeps the last 14 snapshots. To restore one:

```bash
cd ~/backups
tar -xzf runadvisor-20260524-031500.tar.gz
docker cp runadvisor-20260524-031500 runadvisor-mongodb:/tmp/restore
docker exec runadvisor-mongodb mongorestore \
  --username=admin --password="$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase=admin \
  --drop /tmp/restore
```

---

## Operational cheatsheet

```bash
# tail everything
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml logs -f

# just the backend
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml logs -f backend

# rebuild + restart only the frontend (after REACT_APP_* change)
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build frontend

# nuke + restart (keeps mongo volume)
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml down
./scripts/deploy.sh

# show certificate state (Caddy stores them in the named volume)
docker exec runadvisor-caddy caddy list-certificates

# completely wipe (also drops mongo data — DANGEROUS)
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml down -v
```

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `curl -I https://<DOMAIN>/` returns connection refused | Security group missing `443`, or the `caddy` container isn't running. `docker ps`; `docker logs runadvisor-caddy`. |
| HTTPS works but cert is self-signed | Caddy could not reach Let's Encrypt — verify `DOMAIN` actually resolves to this server, port `80` is open inbound, and `LETSENCRYPT_EMAIL` is set. |
| Login bounces back to Auth0 with "callback URL mismatch" | Add `https://<DOMAIN>` and `https://<DOMAIN>/login` to **Allowed Callback URLs** *and* **Allowed Logout URLs** *and* **Allowed Web Origins** in the Auth0 dashboard. |
| Strava connect returns "redirect_uri mismatch" | Strava → API → Authorization Callback Domain must equal `<DOMAIN>` (no scheme, no path). |
| `/health` returns `DEGRADED` with `mongodb: error` | Mongo creds in `.env.ec2` don't match `MONGODB_URI`. They must agree on user+password+db. |
| Backend logs spam `MongoServerError: bad auth` | Same as above. Edit `.env.ec2`, then `./scripts/deploy.sh`. |
| Frontend shows stale URLs after `.env.ec2` edit | `REACT_APP_*` is baked at build time. Rebuild the frontend: `docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build frontend`. |
| Build OOMs on `t3.micro` / `t3.small` | The bootstrap script enables a 2 GB swap; if you skipped it run `bash scripts/ec2-add-swap.sh`. Upgrade to `t3.medium` if it keeps biting. |
| Smart Weekly Summary endpoint times out | Caddy timeout is 120s, OpenAI can occasionally take longer — set `OPENAI_MODEL=gpt-4o-mini` (default), or unset `OPENAI_API_KEY` to fall back to deterministic summaries. |
