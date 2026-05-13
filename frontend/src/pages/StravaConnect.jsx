import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, stravaApi } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { getStravaRedirectUri } from '../utils/strava';
import {
  CalendarIcon,
  CoachIcon,
  DownloadIcon,
  InstallIcon,
  RunAdvisorMark,
  SyncIcon,
  TargetIcon,
  UploadIcon
} from '../components/icons';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';

const STRAVA_CACHE_KEY = 'strava-hub';

function formatTimestamp(value) {
  if (!value) {
    return 'Not yet synced';
  }

  return new Date(value).toLocaleString();
}

function formatFileSize(sizeBytes) {
  if (!sizeBytes) {
    return '0 KB';
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function StravaConnect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [planNotes, setPlanNotes] = useState('');
  const [offlineMessage, setOfflineMessage] = useState('');

  const stravaClientId = process.env.REACT_APP_STRAVA_CLIENT_ID || '';
  const stravaRedirectUri = getStravaRedirectUri();
  const isStravaConnected = Boolean(profile?.stravaId);
  const statusFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const syncState = params.get('sync');
    const count = params.get('count');

    if (syncState === 'success') {
      return `Strava connected and ${count || 0} recent activities synced into RunAdvisor.`;
    }

    if (syncState === 'manual') {
      return 'Strava connected, but the automatic sync did not finish. Use the manual sync button below.';
    }

    return '';
  }, [location.search]);

  const STRAVA_AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&response_type=code&redirect_uri=${encodeURIComponent(stravaRedirectUri)}&scope=activity:read_all`;

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileResponse, plansResponse] = await Promise.all([
        authApi.getProfile(),
        stravaApi.getTrainingPlans()
      ]);

      setProfile(profileResponse.data.user);
      setPlans(plansResponse.data.plans || []);
      saveSnapshot(STRAVA_CACHE_KEY, {
        plans: plansResponse.data.plans || [],
        profile: profileResponse.data.user
      });
      setOfflineMessage('');

      if (!statusFromQuery) {
        setStatus(profileResponse.data.user.stravaId
          ? 'Strava is connected. You can sync fresh activities or manage your in-app training plans here.'
          : 'Connect Strava to sync recent activities, then review your training and upload supporting plans in this workspace.');
      }
    } catch (error) {
      console.error('Error loading Strava page data:', error);
      const cachedData = loadSnapshot(STRAVA_CACHE_KEY);

      if (cachedData?.data) {
        setProfile(cachedData.data.profile || null);
        setPlans(cachedData.data.plans || []);
        setStatus('Showing your last saved Strava workspace details.');
        setOfflineMessage(`Using your saved Strava workspace from ${formatSnapshotTimestamp(cachedData.savedAt)}.`);
      } else {
        setStatus('Unable to load your Strava profile details right now.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFromQuery]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (statusFromQuery) {
      setStatus(statusFromQuery);
    }
  }, [statusFromQuery]);

  const handleStravaConnect = () => {
    if (!stravaClientId) {
      setStatus('Missing Strava configuration. Check your frontend environment variables.');
      return;
    }

    setStatus('Redirecting to Strava for authorization...');
    window.location.href = STRAVA_AUTH_URL;
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setStatus('Syncing your recent Strava activities...');
      const response = await stravaApi.syncRecentActivities(20);
      const syncedCount = response?.data?.syncedCount || 0;
      await loadPageData();
      setStatus(`Synced ${syncedCount} recent Strava activities. Open Coach Review to see refreshed insights.`);
    } catch (error) {
      console.error('Error syncing Strava activities:', error);
      setStatus(error.response?.data?.message || 'Unable to sync Strava activities right now.');
    } finally {
      setSyncing(false);
    }
  };

  const handleTrainingPlanUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setStatus('Choose a file before uploading a training plan.');
      return;
    }

    try {
      setUploading(true);
      setStatus(`Uploading ${selectedFile.name}...`);
      const dataUrl = await readFileAsDataUrl(selectedFile);

      await stravaApi.uploadTrainingPlan({
        fileName: selectedFile.name,
        contentType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        dataUrl,
        notes: planNotes
      });

      setSelectedFile(null);
      setPlanNotes('');
      await loadPageData();
      setStatus(`Stored ${selectedFile.name} in your RunAdvisor profile.`);
    } catch (error) {
      console.error('Error uploading training plan:', error);
      setStatus(error.response?.data?.message || 'Unable to upload this training plan.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPlan = async (planId, fileName) => {
    try {
      const response = await stravaApi.getTrainingPlan(planId);
      const link = document.createElement('a');
      link.href = response.data.plan.dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatus(`Downloaded ${fileName}.`);
    } catch (error) {
      console.error('Error downloading training plan:', error);
      setStatus('Unable to download that training plan right now.');
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await stravaApi.deleteTrainingPlan(planId);
      setPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== planId));
      setStatus('Training plan removed from your profile.');
    } catch (error) {
      console.error('Error deleting training plan:', error);
      setStatus('Unable to delete that training plan right now.');
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <section className="section-card">
          <p className="empty-state">Loading your Strava profile...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <section className="section-card mb-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">Sync workspace</p>
            <h1 className="section-heading">Strava Sync & Plan Hub</h1>
            <p className="section-subtitle">Connect Strava, sync recent runs, and store your current training plan in-app for quick reference.</p>
          </div>
          <div className="metric-panel">
            <p className="metric-title">Last sync</p>
            <p className="mt-2">{formatTimestamp(profile?.stravaLastSyncAt)}</p>
          </div>
        </div>
      </section>

      {offlineMessage && (
        <section className="mb-8">
          <div className="page-banner">{offlineMessage}</div>
        </section>
      )}

      {status && (
        <section className="mb-8 page-banner">
          <p>{status}</p>
        </section>
      )}

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="section-card">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="icon-shell">
                  <RunAdvisorMark size={18} />
                </span>
                <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Strava account status</h2>
              </div>
              <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
                {isStravaConnected
                  ? 'Your Strava account is linked. Sync recent activities whenever you want a fresh coach review.'
                  : 'Connect your Strava account to pull in recent training automatically and use it in coach review.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleStravaConnect}
                className="btn-primary"
                type="button"
              >
                <SyncIcon size={16} />
                {isStravaConnected ? 'Reconnect Strava' : 'Connect with Strava'}
              </button>
              {isStravaConnected && (
                <button
                  onClick={handleManualSync}
                  className="btn-secondary"
                  type="button"
                  disabled={syncing}
                >
                  <SyncIcon size={16} />
                  {syncing ? 'Syncing...' : 'Sync recent activities'}
                </button>
              )}
              <button
                onClick={() => navigate('/recommendations')}
                className="btn-secondary"
                type="button"
              >
                <CoachIcon size={16} />
                Open Coach Review
              </button>
            </div>
          </div>
        </div>

        <div className="section-card space-y-4">
          <div className="metric-panel">
            <p className="metric-title">Connection</p>
            <p className="metric-emphasis">{isStravaConnected ? 'Connected' : 'Not connected'}</p>
          </div>
          <div className="metric-panel">
            <p className="metric-title">Training plans stored</p>
            <p className="metric-emphasis">{plans.length}</p>
          </div>
          <div className="metric-panel">
            <p className="metric-title">Profile email</p>
            <p className="mt-2 break-all text-sm" style={{ color: 'var(--text-primary)' }}>{profile?.email || 'Unavailable'}</p>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="section-card">
          <div className="flex items-center gap-3">
            <span className="icon-shell">
              <UploadIcon size={18} />
            </span>
            <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Upload training plan</h2>
          </div>
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Store the plan file inside RunAdvisor so it stays next to your synced training data. This MVP keeps files in-app rather than exporting them into Strava.</p>

          <form onSubmit={handleTrainingPlanUpload} className="mt-5 grid gap-4">
            <label className="field-label">
              <span>Plan file</span>
              <input
                type="file"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="input-shell"
              />
            </label>

            <label className="field-label">
              <span>Notes</span>
              <textarea
                value={planNotes}
                onChange={(event) => setPlanNotes(event.target.value)}
                placeholder="Example: 12-week half marathon plan from coach."
                rows={3}
                className="textarea-shell"
              />
            </label>

            {selectedFile && (
              <div className="note-box text-sm">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedFile.name}</p>
                <p className="mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={uploading}>
              <UploadIcon size={16} />
              {uploading ? 'Uploading plan...' : 'Upload to profile'}
            </button>
          </form>
        </div>

        <div className="section-card">
          <div className="flex items-center gap-3">
            <span className="icon-shell icon-shell-soft">
              <TargetIcon size={18} />
            </span>
            <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Stored plans</h2>
          </div>
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Download or remove any plan you have saved in-app.</p>

          <div className="mt-5 grid gap-4">
            {plans.length === 0 ? (
              <div className="note-box">
                <p>No training plans uploaded yet.</p>
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="note-box">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.fileName}</p>
                      <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        {formatFileSize(plan.sizeBytes)} • Uploaded {formatTimestamp(plan.uploadedAt)}
                      </p>
                      {plan.notes && <p className="mt-3 text-sm">{plan.notes}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDownloadPlan(plan.id, plan.fileName)}
                        className="btn-secondary"
                        type="button"
                      >
                        <DownloadIcon size={16} />
                        Download
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="btn-danger"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="flex items-center gap-3">
          <span className="icon-shell icon-shell-soft">
            <InstallIcon size={18} />
          </span>
          <h3 className="m-0 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>How this MVP works</h3>
        </div>
        <ul className="coach-list mt-4">
          <li className="coach-list-item">
            <span className="icon-shell icon-shell-soft">
              <CalendarIcon size={14} />
            </span>
            <span>Authorize RunAdvisor with Strava. The callback now attempts an immediate recent-activity sync.</span>
          </li>
          <li className="coach-list-item">
            <span className="icon-shell icon-shell-soft">
              <SyncIcon size={14} />
            </span>
            <span>Use manual sync any time you want to refresh the activities that power coach review and recommendations.</span>
          </li>
          <li className="coach-list-item">
            <span className="icon-shell icon-shell-soft">
              <UploadIcon size={14} />
            </span>
            <span>Upload your current plan into RunAdvisor for in-app storage and easy download later.</span>
          </li>
        </ul>
      </section>
    </main>
  );
}

export default StravaConnect;
