## RunAdvisor on EC2 with Docker

### 1) Prepare environment

1. Copy `.env.ec2.example` to `.env.ec2`.
2. Update all placeholder values.
3. Open EC2 security group ports:
   - `80` for frontend
   - `5000` only if you need direct API access (optional)

### 2) Start services

```bash
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml up -d --build
```

### 3) Verify

```bash
docker compose -f docker-compose.ec2.yml ps
curl http://localhost/health
```

### 4) Stop services

```bash
docker compose -f docker-compose.ec2.yml down
```

### Notes

- Frontend is exposed on port `80`.
- Backend is private to the Docker network and used by the frontend/app services.
- MongoDB data is persisted in the `mongodb-data` Docker volume.
