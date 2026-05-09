import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Auth endpoints
export const authApi = {
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  login: (email, password) => api.post('/auth/login', { email, password }),
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
  authenticate: (code, userId) => api.post('/strava/authenticate', { code, userId }),
  getStravaActivities: (limit = 10) => api.get('/strava/activities', { params: { limit } }),
  syncActivity: (activityId) => api.post(`/strava/sync-activity/${activityId}`)
};

// Recommendations endpoints
export const recommendationsApi = {
  getRecommendations: ({ days = 7, raceDistance, raceDate, raceName } = {}) =>
    api.get('/recommendations', {
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
