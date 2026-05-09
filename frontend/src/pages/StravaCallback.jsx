import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { stravaApi } from '../services/api';
import '../styles/StravaConnect.css';

function StravaCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing your Strava connection...');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus(`Strava authorization failed: ${error}`);
      return;
    }

    if (!code) {
      setStatus('No authorization code received from Strava.');
      return;
    }

    async function authenticate() {
      try {
        setStatus('Connecting your Strava account...');
        await stravaApi.authenticate(code);
        setStatus('Strava connected successfully! Redirecting...');
        setTimeout(() => navigate('/strava-connect'), 1200);
      } catch (err) {
        console.error('Strava callback error:', err.response?.data || err.message || err);
        const detail = err.response?.data?.details || err.response?.data || err.message;
        setStatus(`Failed to connect to Strava. ${detail}`);
      }
    }

    authenticate();
  }, [location.search, navigate]);

  return (
    <div className="strava-connect-container">
      <h1>Strava Callback</h1>
      <p>{status}</p>
    </div>
  );
}

export default StravaCallback;
