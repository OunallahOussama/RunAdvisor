# RunAdvisor - AI-Powered Running Training Advisor

A full-stack MEARN (MongoDB, Express, React, Node.js with Vector Search) application that provides personalized running training recommendations based on Strava API data.

## Features

✨ **Core Features:**
- 🏃 **Strava Integration**: Automatically sync your running activities from Strava
- 🤖 **AI-Powered Recommendations**: Get personalized training advice based on last week's performance
- 🔍 **Vector Search**: Find similar activities using machine learning similarity algorithms
- 📊 **Activity Analytics**: Track distance, pace, elevation, heart rate, and more
- 🎯 **Training Plans**: Receive tailored training recommendations for different goals
- 🔐 **Auth0 Authentication**: Universal Login with email/password plus Google, Facebook, and other social providers
- 📱 **Responsive UI**: Beautiful React frontend with real-time updates
- 🐳 **Docker Support**: Easy local deployment with Docker Compose

## Tech Stack

### Backend
- **Node.js** 18.x
- **Express.js** - REST API framework
- **MongoDB** 7.0 - NoSQL database with vector search
- **Auth0** - Access tokens and social identity federation
- **Axios** - HTTP client for Strava API
- **ML libraries** - Vector similarity calculations

### Frontend
- **React** 18.x - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **TailwindCSS** - Styling

### DevOps
- **Docker** & **Docker Compose** - Containerization
- **MongoDB** - Database service

## Project Structure

```
RunAdvisor/
├── backend/
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── Activity.js
│   │   └── Recommendation.js
│   ├── routes/              # API endpoints
│   │   ├── auth.js
│   │   ├── activities.js
│   │   ├── recommendations.js
│   │   ├── strava.js
│   │   └── vectorSearch.js
│   ├── middleware/          # Authentication, etc
│   │   └── auth.js
│   ├── services/            # Business logic
│   │   └── mlService.js
│   ├── server.js            # Express app entry
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   ├── styles/          # CSS files
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
├── docker/
│   ├── docker-compose.yml   # Service orchestration
│   └── init-mongodb.js      # MongoDB initialization
└── README.md
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Strava API credentials

### Environment Setup

1. **Get Strava API Credentials:**
   - Go to https://www.strava.com/settings/api
   - Create an app and note your Client ID and Secret

2. **Create your Auth0 tenant and API:**
   - Create a Single Page Application for the React frontend
   - Create an API and set its identifier as `AUTH0_AUDIENCE`
   - Add `http://localhost:3000` to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins
   - Enable Google, Facebook, or other providers under Auth0 social connections

3. **Get OpenAI API Key (optional for AI recommendations):**
   - Visit https://platform.openai.com/api-keys

4. **Create `.env` file in project root:**
   ```bash
   AUTH0_DOMAIN=your-tenant.us.auth0.com
   AUTH0_CLIENT_ID=your_auth0_spa_client_id
   AUTH0_AUDIENCE=https://runadvisor-api
   REACT_APP_AUTH0_CALLBACK_URL=http://localhost:3000
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REDIRECT_URI=http://localhost:3000/callback
   OPENAI_API_KEY=your_openai_api_key
   ```

   The Auth0 callback URL must exactly match your Auth0 application settings, and the Strava redirect URI must exactly match your Strava app settings. If you change them, rebuild the frontend container with `docker-compose up --build`.

### Running with Docker

```bash
# Clone and navigate to project
cd RunAdvisor

# Build and start services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# MongoDB: localhost:27017
```

### EC2 Deployment

For production-oriented EC2 deployment (Docker, Compose fallback, Nginx reverse proxy, optional HTTPS), see `EC2-DOCKER.md`.

### Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## API Documentation

### Authentication
- `POST /api/auth/sync` - Sync the Auth0 user profile into MongoDB
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/preferences` - Update user preferences

### Activities
- `GET /api/activities` - Get user's activities
- `GET /api/activities/:id` - Get activity details
- `GET /api/activities/summary/weekly` - Get weekly summary
- `POST /api/activities` - Add manual activity
- `DELETE /api/activities/:id` - Delete activity

### Strava Integration
- `POST /api/strava/authenticate` - Authenticate with Strava
- `GET /api/strava/activities` - Fetch Strava activities
- `POST /api/strava/sync-activity/:id` - Sync specific activity

### Recommendations
- `GET /api/recommendations?days=7` - Get training recommendations
- `POST /api/recommendations/similar` - Find similar activities
- `PUT /api/recommendations/:id` - Update recommendation status

### Vector Search
- `POST /api/vector-search` - Vector similarity search
- `GET /api/vector-search/by-distance` - Search by distance
- `GET /api/vector-search/by-pace` - Search by pace range

## Vector Search Implementation

The app uses **cosine similarity** to find similar activities:

```javascript
performanceVector = [
  distance / 10000,           // Normalized distance
  moving_time / 3600,         // Duration in hours
  pace / 8,                   // Normalized pace
  elevation_gain / 100,       // Normalized elevation
  avg_heart_rate / 200,       // Normalized HR
  avg_cadence / 200           // Normalized cadence
]
```

## Recommendation Engine

The AI generates recommendations based on:
- **Recovery**: If too many intense workouts (pace < 6 min/km)
- **Endurance**: If recent runs are too short
- **Rest Day**: If activity count is too high
- **Speed Work**: If pace is too slow (> 7 min/km)

## Database Schema

### User
- auth0UserId, email, name, picture
- name, age, experience level
- Strava tokens and athlete ID
- Training goals and preferences

### Activity
- userId, stravaActivityId
- Distance, duration, pace, elevation
- Heart rate metrics, cadence
- Performance vector (for ML)
- GeoJSON coordinates (for mapping)

### Recommendation
- userId, type (training_plan, recovery, etc)
- Title, description, reasoning
- Recommended metrics (distance, pace, duration)
- Status (pending, accepted, rejected, completed)

## Performance Optimization

- **Pagination**: Activities endpoint supports limit/skip
- **Indexing**: MongoDB indexes on userId, date, performanceVector
- **Caching**: API responses cached in frontend
- **Vector Search**: Efficient cosine similarity calculations
- **Health Checks**: Docker health checks for all services

## Future Enhancements

- 🌍 Multi-region support with geo-based recommendations
- 📈 Advanced ML models (TensorFlow.js)
- 🎬 Social features (share runs, follow runners)
- 📍 Route mapping with Mapbox integration
- 🏆 Leaderboards and challenges
- 📲 Mobile app with React Native
- ⚡ Real-time notifications

## Troubleshooting

**MongoDB Connection Error:**
```bash
# Check if MongoDB container is running
docker-compose ps

# Restart services
docker-compose down && docker-compose up
```

**Port Already in Use:**
```bash
# Change ports in docker-compose.yml or kill existing processes
lsof -i :3000  # Find process on port 3000
kill -9 <PID>
```

**Strava Auth Issues:**
- Verify Client ID and Secret in .env
- Check redirect URI matches Strava app settings
- Ensure localhost:3000 is accessible

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or suggestions:
- Create an GitHub issue
- Email: support@runadvisor.local

---

**Happy Running! 🏃‍♂️💨**
