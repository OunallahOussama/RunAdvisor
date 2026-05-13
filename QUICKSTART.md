# RunAdvisor Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Prerequisites
- ✅ Docker & Docker Compose installed
- ✅ Strava Account (optional, but recommended)
- ✅ Git (to clone the repo)

### Step 2: Setup Environment
```bash
# Clone the repository
git clone https://github.com/yourusername/RunAdvisor.git
cd RunAdvisor

# Copy environment template
cp .env.example .env

# Edit .env with your credentials (see below)
```

### Step 3: Get Strava API Credentials
1. Go to https://www.strava.com/settings/api
2. Create an App
3. Copy your Client ID and Secret
4. Paste into `.env`:
   ```
   STRAVA_CLIENT_ID=your_id_here
   STRAVA_CLIENT_SECRET=your_secret_here
   STRAVA_REDIRECT_URI=http://localhost:3000/callback
   ```

   Make sure this callback URL exactly matches your Strava app settings. If you change it from the default, rebuild the frontend image with `docker-compose up --build`.

### Step 4: Start the Application
```bash
# On macOS/Linux:
bash start.sh

# On Windows:
start.bat

# Or manually:
docker-compose up --build
```

### Step 5: Access the App
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **MongoDB**: localhost:27017

## 📱 First Steps in the App

1. **Register** - Create a new account
2. **Connect Strava** (Optional) - Click "Strava Connect" to import your activities
3. **Add Activities** - Manually add runs if not using Strava
4. **View Dashboard** - See your weekly stats
5. **Get Recommendations** - Check AI-powered training advice

## 🔧 Development Tips

### View Logs
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# MongoDB logs
docker-compose logs -f mongodb
```

### Rebuild Services
```bash
# Rebuild all services
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend
```

### Access MongoDB
```bash
# Using MongoDB client
mongosh mongodb://admin:password@localhost:27017

# Or use MongoDB Compass GUI
# Connection string: mongodb://admin:password@localhost:27017
```

### Stop Services
```bash
docker-compose down          # Stop but keep volumes
docker-compose down -v       # Stop and remove volumes
```

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or change port in docker-compose.yml
# - "3000:3000" -> - "3001:3000"
```

### MongoDB Connection Error
```bash
# Check MongoDB is running
docker-compose ps

# Restart MongoDB
docker-compose restart mongodb

# Check logs
docker-compose logs mongodb
```

### Strava Authentication Fails
- Verify Client ID/Secret in `.env`
- Check redirect URI in Strava app settings matches `http://localhost:3000/callback`
- Clear browser cookies and try again

### Docker Compose Not Found
```bash
# Install Docker Compose
# macOS:
brew install docker-compose

# Windows: Install Docker Desktop which includes Compose
```

## 📊 Features to Try

### 1. Dashboard
- View weekly statistics
- See total distance, time, activities
- Check average pace and heart rate

### 2. Activities
- View all synced activities from Strava
- Add manual activities
- Delete activities you no longer want

### 3. Vector Search
- Find similar runs to a selected activity
- Search by distance range
- Search by pace range

### 4. Recommendations
- Get AI-powered training suggestions
- Accept or reject recommendations
- Filter by time period (7, 14, 30 days)

### 5. Strava Integration
- One-click Strava connection
- Automatic activity sync
- Access to all your Strava data

## 🎯 Performance Vectors

Each run is represented by a 6-dimensional vector:
```
[distance, duration, pace, elevation, heart_rate, cadence]
```

This enables machine learning algorithms to find similar runs and make recommendations.

## 📈 API Examples

### Get Recommendations
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recommendations?days=7
```

### Search by Pace
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/vector-search/by-pace?min=5&max=7"
```

### Add Manual Activity
```bash
curl -X POST http://localhost:5000/api/activities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Run",
    "type": "run",
    "distance": 10,
    "duration": 50,
    "date": "2024-01-15"
  }'
```

## 🚀 Production Deployment

When ready for production:

1. **Security Updates**
   - Change JWT_SECRET in .env
   - Update MongoDB credentials
   - Use HTTPS for frontend/API

2. **Database**
   - Use managed MongoDB (Atlas, Azure Cosmos DB)
   - Enable backups
   - Set up monitoring

3. **Deployment Options**
   - Docker Hub registry
   - Kubernetes with Helm
   - AWS ECS, Google Cloud Run, Azure Container Apps
   - DigitalOcean App Platform

4. **Monitoring**
   - Set up logging (ELK, Datadog)
   - Monitor application health
   - Track vector search performance

## 📚 Additional Resources

- [Strava API Docs](https://developers.strava.com/docs/reference/)
- [MongoDB Vector Search](https://www.mongodb.com/docs/manual/core/vector-search/)
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)

## 💬 Support & Contributing

- Report bugs via GitHub Issues
- Submit feature requests
- Contribute improvements with Pull Requests

---

**Enjoy using RunAdvisor! Happy running! 🏃‍♂️**
