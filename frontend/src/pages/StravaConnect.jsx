import React, { useState, useEffect } from 'react';
import { authApi, recommendationsApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

function StravaConnect() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);

  const stravaClientId = process.env.REACT_APP_STRAVA_CLIENT_ID || '';
  const stravaRedirectUri = process.env.REACT_APP_STRAVA_REDIRECT_URI || `${window.location.origin}/callback`;
  const STRAVA_AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&response_type=code&redirect_uri=${encodeURIComponent(stravaRedirectUri)}&scope=activity:read_all`;

  useEffect(() => {
    checkStravaConnection();
  }, []);

  const checkStravaConnection = async () => {
    try {
      const response = await authApi.getProfile();
      if (response.data.user.stravaId) {
        setIsStravaConnected(true);
        setStatus('✅ Strava is connected to your account.');
      } else {
        setStatus('Click "Connect with Strava" to authorize the app and sync your activities.');
      }
    } catch (error) {
      setStatus('Unable to check connection status. Please try connecting Strava.');
    }
  };

  const handleStravaConnect = () => {
    if (!stravaClientId) {
      setStatus('⚠️ Missing Strava configuration. Check your environment variables.');
      return;
    }

    setStatus('Redirecting to Strava for authorization...');
    window.location.href = STRAVA_AUTH_URL;
  };

  const handleGeneratePlan = async () => {
    try {
      setPlanLoading(true);
      setStatus('Generating a Strava-based training plan...');
      const response = await recommendationsApi.getRecommendations({ days: 14 });
      const recommendationCount = response?.data?.recommendations?.length || 0;
      setStatus(`Generated ${recommendationCount} training recommendations from your synced data.`);
      navigate('/recommendations');
    } catch (error) {
      setStatus('Unable to generate training plan right now. Please sync activities and try again.');
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <section className="section-card mb-8">
        <h1 className="section-heading">Connect Strava</h1>
        <p className="section-subtitle">Sync your running activities automatically from your Strava account.</p>
      </section>

      <section className="grid gap-6">
        <div className="section-card">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">Strava Account Status</h2>
              <p className="mt-3 text-slate-300">
                {isStravaConnected 
                  ? 'Your Strava account is linked. Your activities will be automatically synced to RunAdvisor.'
                  : 'Connect your Strava account to automatically sync your running activities with RunAdvisor.'}
              </p>
            </div>

            <button
              onClick={handleStravaConnect}
              className="btn-primary w-full sm:w-auto"
            >
              🔗 {isStravaConnected ? 'Reconnect Strava' : 'Connect with Strava'}
            </button>
            {isStravaConnected && (
              <button
                onClick={handleGeneratePlan}
                className="btn-secondary w-full sm:w-auto"
                type="button"
                disabled={planLoading}
              >
                {planLoading ? 'Generating Plan...' : 'Generate Training Plan'}
              </button>
            )}

            {status && (
              <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4 text-slate-300">
                <p>{status}</p>
              </div>
            )}
          </div>
        </div>

        <div className="section-card">
          <h3 className="text-xl font-semibold text-white">How it works</h3>
          <ul className="mt-4 space-y-3 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-orange-400">1.</span>
              <span>Click the button above to authorize RunAdvisor with your Strava account.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-400">2.</span>
              <span>Your recent running activities will be synced automatically.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-400">3.</span>
              <span>RunAdvisor will use your activities to provide personalized training recommendations.</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

export default StravaConnect;
