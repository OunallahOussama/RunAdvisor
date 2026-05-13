import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { stravaApi } from '../services/api';
import { getStravaConnectionErrorMessage, getStravaRedirectUri } from '../utils/strava';
import '../styles/StravaConnect.css';

function StravaCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing your Strava connection...');
  const stravaRedirectUri = getStravaRedirectUri();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      setStatus(`Strava authorization failed: ${errorDescription || error}`);
      return;
    }

    if (!code) {
      setStatus('No authorization code received from Strava.');
      return;
    }

    async function authenticate() {
      try {
        setStatus('Connecting your Strava account...');
        await stravaApi.authenticate(code, stravaRedirectUri);
        setStatus('Strava connected. Syncing your recent activities...');

        try {
          const syncResponse = await stravaApi.syncRecentActivities(20);
          const syncedCount = syncResponse?.data?.syncedCount || 0;
          setStatus(`Strava connected and ${syncedCount} recent activities synced. Redirecting...`);
          setTimeout(() => navigate(`/strava-connect?sync=success&count=${syncedCount}`), 1200);
        } catch (syncError) {
          console.error('Post-connect sync error:', syncError.response?.data || syncError.message || syncError);
          setStatus('Strava connected, but recent activities could not be synced automatically. Redirecting so you can trigger a manual sync.');
          setTimeout(() => navigate('/strava-connect?sync=manual'), 1400);
        }
      } catch (err) {
        console.error('Strava callback error:', err.response?.data || err.message || err);
        const detail = getStravaConnectionErrorMessage(err);
        setStatus(`Failed to connect to Strava. ${detail}`);
      }
    }

    authenticate();
  }, [location.search, navigate, stravaRedirectUri]);

  return (
    <div className="strava-connect-container">
      <h1>Strava Callback</h1>
      <p>{status}</p>
    </div>
  );
}

export default StravaCallback;
