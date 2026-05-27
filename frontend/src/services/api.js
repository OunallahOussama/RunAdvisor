import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
let accessTokenGetter = null;
let accessTokenRefresher = null;
let apiNotifier = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const setAccessTokenGetter = (getter) => {
  accessTokenGetter = getter;
};

export const setAccessTokenRefresher = (refresher) => {
  accessTokenRefresher = refresher;
};

export const setApiNotifier = (notifier) => {
  apiNotifier = notifier;
};

export function shouldRetryServerError(config) {
  if (!config || config._serverRetried) {
    return false;
  }

  const method = String(config.method || 'get').toLowerCase();
  return method === 'get' || method === 'head';
}

function formatRateLimitMessage(error) {
  const retryAfter = error.response?.headers?.['retry-after'] || error.response?.data?.retryAfter;
  const base = error.response?.data?.message || 'Too many requests. Please slow down and try again.';

  if (retryAfter) {
    return `${base} Retry after ${retryAfter} seconds.`;
  }

  return base;
}

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

api.interceptors.response.use(
  response => response,
  async (error) => {
    const { config, response } = error;

    if (!response) {
      apiNotifier?.('Network error. Check your connection and try again.', 'warning');
      return Promise.reject(error);
    }

    if (response.status === 429) {
      apiNotifier?.(formatRateLimitMessage(error), 'warning');
      return Promise.reject(error);
    }

    if (response.status === 401 && config && !config._retry && accessTokenRefresher) {
      config._retry = true;

      try {
        await accessTokenRefresher();
        return api(config);
      } catch (refreshError) {
        apiNotifier?.('Your session expired. Please sign in again.', 'error');
        return Promise.reject(refreshError);
      }
    }

    if (response.status >= 500 && shouldRetryServerError(config)) {
      config._serverRetried = true;
      await new Promise((resolve) => setTimeout(resolve, 400));
      return api(config);
    }

    return Promise.reject(error);
  }
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
  getSimilarActivities: (id) => api.get(`/activities/${id}/similar`),
  getWeeklySummary: () => api.get('/activities/summary/weekly'),
  createActivity: (activity) => api.post('/activities', activity),
  deleteActivity: (id, { deleteFromStrava = true } = {}) =>
    api.delete(`/activities/${id}`, {
      params: { deleteFromStrava }
    })
};

// Strava endpoints
export const stravaApi = {
  authenticate: (code, redirectUri) => api.post('/strava/authenticate', { code, redirectUri }),
  getStravaActivities: (limit = 10) => api.get('/strava/activities', { params: { limit } }),
  syncRecentActivities: (limit = 20) => api.post('/strava/sync-recent', { limit }),
  getStravaActivityDetail: (identifier) =>
    api.get(`/strava/activities/${encodeURIComponent(identifier)}/detail`),
  getTrainingPlans: () => api.get('/strava/training-plans'),
  getTrainingPlan: (planId) => api.get(`/strava/training-plans/${planId}`),
  uploadTrainingPlan: (payload) => api.post('/strava/training-plans', payload),
  deleteTrainingPlan: (planId) => api.delete(`/strava/training-plans/${planId}`),
  getAthleteStats: () => api.get('/strava/athlete/stats'),
  getActivityStreams: (identifier) => api.get(`/strava/activities/${encodeURIComponent(identifier)}/streams`),
  getActivitySegments: (identifier) => api.get(`/strava/activities/${encodeURIComponent(identifier)}/segments`),
  logWorkout: (payload) => api.post('/strava/log-workout', payload)
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
  updateRecommendation: (id, status, feedback) => api.put(`/recommendations/${id}`, { status, feedback }),
  generateReport: ({ windowDays = 84, raceDistance, raceDate, raceName } = {}) =>
    api.post('/recommendations/report', { windowDays, raceDistance, raceDate, raceName }, { timeout: 90_000 }),
  getLatestReport: () => api.get('/recommendations/report/latest')
};

// Vector search endpoints
export const vectorSearchApi = {
  search: (vector, limit = 10, userSpecific = true) => api.post('/vector-search', { vector, limit, userSpecific }),
  searchByDistance: (min, max) => api.get('/vector-search/by-distance', { params: { min, max } }),
  searchByPace: (min, max) => api.get('/vector-search/by-pace', { params: { min, max } })
};

export const coachApi = {
  /**
   * Generate or fetch the cached Smart Weekly Summary report.
   * Accepts either `weeklySummary(7)` (legacy: number of days) or
   * `weeklySummary({ windowDays: 7, force: true })`. Returns the full
   * structured payload: { analytics, report, summary, headline, ... }.
   */
  weeklySummary: (options = {}) => {
    const opts =
      typeof options === 'number'
        ? { windowDays: options }
        : options || {};
    const windowDays = Number(opts.windowDays) || 7;
    const force = Boolean(opts.force);
    return api.post(
      '/coach/weekly-summary',
      { windowDays, force },
      { timeout: 90_000 }
    );
  },
  semanticSearch: (q) => api.get('/coach/semantic-search', { params: { q } }),
  trackUsage: (event, metadata) => api.post('/coach/track-usage', { event, metadata })
};

export const COACH_NOTIFICATION_TYPES = [
  'coach_nudge',
  'coach_session_ready',
  'weekly_report_ready',
  'friend_request',
  'friend_accepted',
  'social_message',
  'social_follow'
];

export const coachChatApi = {
  getContext: () => api.get('/coach/chat/context'),
  getHistory: (limit = 20) => api.get('/coach/chat/history', { params: { limit } }),
  sendMessage: (message) => api.post('/coach/chat', { message }, { timeout: 60_000 }),
  markCoachNotificationsRead: () => api.post('/coach/chat/mark-read')
};

export const adminApi = {
  getMe: () => api.get('/admin/me'),
  getOverview: (days = 7) => api.get('/admin/overview', { params: { days } }),
  getUsage: (days = 7) => api.get('/admin/usage', { params: { days } }),
  getInsights: (days = 7) => api.get('/admin/insights', { params: { days } })
};

// Users (consent + onboarding) endpoints
export const usersApi = {
  getMe: () => api.get('/users/me'),
  getConsent: () => api.get('/users/me/consent'),
  updateConsent: (payload) => api.put('/users/me/consent', payload),
  completeOnboarding: ({ runningGoal, reset } = {}) =>
    api.put('/users/me/onboarding-complete', { runningGoal, reset })
};

// Notification center endpoints
export const notificationsApi = {
  list: ({ unread = false, limit = 20 } = {}) =>
    api.get('/notifications', { params: { unread: unread ? 'true' : undefined, limit } }),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all')
};

export const socialApi = {
  searchUsers: (q) => api.get('/social/users/search', { params: { q } }),
  getMembers: () => api.get('/social/members'),
  getIncomingFriendRequests: () => api.get('/social/friends/requests/incoming'),
  getFriends: () => api.get('/social/friends'),
  getFollowing: () => api.get('/social/following'),
  getFollowers: () => api.get('/social/followers'),
  getFeed: () => api.get('/social/feed'),
  follow: (userId) => api.post(`/social/follow/${userId}`),
  unfollow: (userId) => api.delete(`/social/follow/${userId}`),
  sendFriendRequest: (userId) => api.post(`/social/friends/request/${userId}`),
  acceptFriendRequest: (requestId) => api.post(`/social/friends/requests/${requestId}/accept`),
  rejectFriendRequest: (requestId) => api.post(`/social/friends/requests/${requestId}/reject`),
  getConversations: () => api.get('/social/messages'),
  getThread: (userId) => api.get(`/social/messages/${userId}`),
  sendMessage: (userId, body) => api.post(`/social/messages/${userId}`, { body }),
  getActivityShare: (activityId, origin) =>
    api.get(`/social/activities/${activityId}/share`, { params: { origin } })
};

export default api;
