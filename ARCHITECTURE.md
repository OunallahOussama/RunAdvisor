# RunAdvisor Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RunAdvisor System Architecture            │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌─────────────────────┐
│   React Frontend │         │  External Services  │
│  (Port 3000)     │◄───────►│  - Strava API       │
│                  │         │  - OpenAI API       │
└────────┬─────────┘         └─────────────────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────────────────────────────────────┐
│         Express.js Backend API                  │
│           (Port 5000)                           │
├─────────────────────────────────────────────────┤
│  Routes:                                        │
│  - /api/auth (Authentication)                  │
│  - /api/activities (Activity Management)       │
│  - /api/recommendations (AI Recommendations)   │
│  - /api/strava (Strava Integration)            │
│  - /api/vector-search (Vector Similarity)      │
└────────┬──────────────────────────────────────┬─┘
         │                                      │
         │                                      │
    ┌────▼──────────────┐         ┌────────────▼──┐
    │   MongoDB         │         │  ML Service   │
    │   (Port 27017)    │         │  - Vector     │
    │                   │         │    Similarity │
    │  Collections:     │         │  - Cosine     │
    │  - users          │         │    Distance   │
    │  - activities     │         └───────────────┘
    │  - recommendations│
    │                   │
    │  Indexes:         │
    │  - Vector Search  │
    │  - User/Date      │
    └───────────────────┘
```

## Data Flow

### 1. User Registration/Login
```
User (React) → Register Form
              ↓
            API /auth/register
              ↓
         Hash Password
              ↓
         Save to MongoDB
              ↓
         Generate JWT Token
              ↓
        Return to Frontend ✓
```

### 2. Strava Activity Sync
```
User Clicks "Connect Strava"
         ↓
  Redirect to Strava OAuth
         ↓
  User Authorizes
         ↓
  Strava Returns Code
         ↓
  Backend Exchanges Code for Token
         ↓
  Fetch Activities from Strava API
         ↓
  Generate Performance Vector
         ↓
  Save to MongoDB with Indexes
         ↓
  Display in Frontend ✓
```

### 3. Vector Search & Recommendations
```
User Views Activity
         ↓
  Frontend Sends performanceVector
         ↓
  Backend Calculates Cosine Similarity
  with all user's activities
         ↓
  ML Service ranks by similarity score
         ↓
  Return top N similar activities
         ↓
  Generate AI Recommendations based on:
  - Pace patterns
  - Distance trends
  - Intensity levels
  - Recovery needs
         ↓
  Save to MongoDB
         ↓
  Display Recommendations ✓
```

## Component Architecture

### Backend Services

#### Auth Service
- User registration/login
- Password hashing (bcrypt)
- JWT token generation/validation
- Profile management

#### Activity Service
- CRUD operations for activities
- Weekly/monthly statistics
- Activity indexing for search

#### Strava Service
- OAuth authentication
- Activity fetching
- Token refresh
- Rate limiting

#### ML/Vector Search Service
- Performance vector generation
- Cosine similarity calculations
- Recommendation engine
- Pattern analysis

#### Database Service
- MongoDB connection management
- Collection management
- Index optimization
- Data validation

### Frontend Components

#### Pages
- **Login/Register** - Authentication UI
- **Dashboard** - Stats overview
- **Activities** - Activity list and management
- **Recommendations** - AI suggestions
- **Strava Connect** - OAuth integration

#### Components
- **Navbar** - Navigation
- **ActivityCard** - Activity display
- **StatsCard** - Statistics display
- **RecommendationCard** - Recommendation display

#### Services
- **API Client** - HTTP requests with auth
- **Auth Context** - User state management
- **Storage** - Local storage management

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  age: Number,
  experience: String (beginner|intermediate|advanced),
  stravaId: String,
  stravaAccessToken: String,
  stravaRefreshToken: String,
  trainingGoals: [String],
  preferenceVector: [Number],
  createdAt: Date,
  updatedAt: Date
}
```

### Activities Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  stravaActivityId: String,
  name: String,
  type: String (run|walk|trail_run),
  distance: Number (meters),
  duration: Number (seconds),
  movingTime: Number (seconds),
  pace: Number (min/km),
  elevationGain: Number (meters),
  avgHeartRate: Number (bpm),
  avgCadence: Number,
  performanceVector: [Number], // 6D vector
  date: Date,
  polyline: String,
  coordinates: {
    type: String (LineString),
    coordinates: [[Number]]
  },
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.activities.createIndex({ userId: 1, date: -1 })
db.activities.createIndex({ performanceVector: 1 })
```

### Recommendations Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  description: String,
  type: String,
  basedOnActivities: [ObjectId],
  reasoning: String,
  priority: String (low|medium|high),
  recommendedDistance: Number (km),
  recommendedPace: Number (min/km),
  recommendedDuration: Number (minutes),
  status: String (pending|accepted|rejected|completed),
  feedback: String,
  createdAt: Date,
  validUntil: Date,
  updatedAt: Date
}

// Indexes
db.recommendations.createIndex({ userId: 1, createdAt: -1 })
```

## Vector Search Algorithm

### Performance Vector (6 dimensions)
```
[
  distance / 10000,        // [0, 1] normalized distance
  moving_time / 3600,      // [0, 1] normalized time
  pace / 8,                // [0, 1] normalized pace
  elevation_gain / 100,    // [0, 1] normalized elevation
  avg_heart_rate / 200,    // [0, 1] normalized HR
  avg_cadence / 200        // [0, 1] normalized cadence
]
```

### Cosine Similarity
```
similarity = (vec1 · vec2) / (|vec1| × |vec2|)

where:
- vec1 · vec2 = sum of element-wise multiplication
- |vec| = sqrt(sum of squared elements)
```

### Recommendation Rules

1. **Recovery Needed**
   - If avgPace < 6 and activityCount >= 3
   - Priority: HIGH

2. **Build Endurance**
   - If avgDistance < 10
   - Priority: MEDIUM

3. **Rest Day**
   - If activityCount >= 5 per week
   - Priority: HIGH

4. **Speed Work**
   - If avgPace > 7 and activityCount >= 2
   - Priority: MEDIUM

## API Endpoints

### Authentication (5 endpoints)
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/preferences

### Activities (5 endpoints)
- GET /api/activities
- GET /api/activities/:id
- GET /api/activities/summary/weekly
- POST /api/activities
- DELETE /api/activities/:id

### Strava (3 endpoints)
- POST /api/strava/authenticate
- GET /api/strava/activities
- POST /api/strava/sync-activity/:id

### Recommendations (3 endpoints)
- GET /api/recommendations
- POST /api/recommendations/similar
- PUT /api/recommendations/:id

### Vector Search (3 endpoints)
- POST /api/vector-search
- GET /api/vector-search/by-distance
- GET /api/vector-search/by-pace

## Deployment Architecture

### Local Development
```
Docker Host Machine
  ├─ Frontend Container (React, port 3000)
  ├─ Backend Container (Express, port 5000)
  └─ MongoDB Container (port 27017)
```

### Production Deployment Options

#### Option 1: Kubernetes
```
Kubernetes Cluster
  ├─ Frontend Service → React Pods
  ├─ Backend Service → Express Pods
  ├─ MongoDB StatefulSet
  └─ Ingress → Load Balancer
```

#### Option 2: Cloud Platforms
```
Azure Container Apps / AWS ECS / GCP Cloud Run
  ├─ Frontend App Container
  ├─ Backend App Container
  └─ Managed MongoDB (Cosmos DB / Atlas)
```

## Performance Considerations

### Database
- Vector search indexes for performanceVector
- Compound indexes on userId + date
- Pagination (limit/skip) for activity lists

### Frontend
- React memo for expensive components
- Lazy loading of routes
- Local caching of API responses

### Backend
- Connection pooling for MongoDB
- Request rate limiting
- Response compression (gzip)

### Strava Integration
- Token caching
- Exponential backoff on failures
- Batch processing of activities

## Security Measures

1. **Authentication**
   - JWT tokens with expiration
   - Refresh token rotation
   - Secure password hashing (bcrypt)

2. **Data Protection**
   - HTTPS/TLS encryption
   - MongoDB authentication
   - CORS configuration
   - Input validation

3. **API Security**
   - Rate limiting
   - Request validation
   - CSRF protection (if needed)
   - SQL injection prevention

## Monitoring & Logging

- Application logs (stdout)
- MongoDB query performance
- API response times
- Error tracking
- Docker health checks

---

This architecture is designed to be scalable, maintainable, and easy to extend for additional features.
