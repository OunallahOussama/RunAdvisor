import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
let accessTokenGetter = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const setAccessTokenGetter = (getter) => {
  accessTokenGetter = getter;
};

// Add Auth0 access token to requests
api.interceptors.request.use(
  async (config) => {
    if (accessTokenGetter) {
      const token = await accessTokenGetter();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  error => Promise.reject(error)
);

// Auth endpoints
export const authApi = {
  syncProfile: (profile) => api.post('/auth/sync', profile),
  getProfile: () => api.get('/auth/me'),
  updatePreferences: (preferences) => api.put('/auth/preferences', preferences)
};

// Activities endpoints
export const activitiesApi = {
  getActivities: (limit = 20, skip = 0) => api.get('/activities', { params: { limit, skip } }),
  getActivity: (id) => api.get(`/activities/${id}`),
  getWeeklySummary: () => api.get('/activities/summary/weekly'),
  createActivity: (activity) => api.post('/activities', activity),
  deleteActivity: (id) => api.delete(`/activities/${id}`)
};

// Strava endpoints
export const stravaApi = {
  authenticate: (code, redirectUri) => api.post('/strava/authenticate', { code, redirectUri }),
  getStravaActivities: (limit = 10) => api.get('/strava/activities', { params: { limit } }),
  syncRecentActivities: (limit = 20) => api.post('/strava/sync-recent', { limit }),
  syncActivity: (activityId) => api.post(`/strava/sync-activity/${activityId}`),
  getTrainingPlans: () => api.get('/strava/training-plans'),
  getTrainingPlan: (planId) => api.get(`/strava/training-plans/${planId}`),
  uploadTrainingPlan: (payload) => api.post('/strava/training-plans', payload),
  deleteTrainingPlan: (planId) => api.delete(`/strava/training-plans/${planId}`)
};

// Recommendations endpoints
export const recommendationsApi = {
  getRecommendations: ({ days = 7, raceDistance, raceDate, raceName } = {}) =>
    api.get('/recommendations', {
      params: { days, raceDistance, raceDate, raceName }
    }),
  getCoachReview: ({ days = 28, raceDistance, raceDate, raceName } = {}) =>
    api.get('/recommendations/coach-review', {
      params: { days, raceDistance, raceDate, raceName }
    }),
  getSimilarActivities: (activityId, limit = 5) => api.post('/recommendations/similar', { activityId, limit }),
  updateRecommendation: (id, status, feedback) => api.put(`/recommendations/${id}`, { status, feedback })
};

// Vector search endpoints
export const vectorSearchApi = {
  search: (vector, limit = 10, userSpecific = true) => api.post('/vector-search', { vector, limit, userSpecific }),
  searchByDistance: (min, max) => api.get('/vector-search/by-distance', { params: { min, max } }),
  searchByPace: (min, max) => api.get('/vector-search/by-pace', { params: { min, max } })
};

export default api;
