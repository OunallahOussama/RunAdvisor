import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, stravaApi } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { getStravaRedirectUri } from '../utils/strava';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';
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
  const { refreshProfile } = useRunAdvisorProfile();
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

    if (syncState === 'background') {
      return 'Strava connected. Recent activities are syncing in the background — you can use manual sync if needed.';
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

      const nextProfile = profileResponse.data.user;
      setProfile(nextProfile);
      refreshProfile(nextProfile);
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
  }, [refreshProfile, statusFromQuery]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (statusFromQuery) {
      setStatus(statusFromQuery);
    }
  }, [statusFromQuery]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('sync') !== 'background') {
      return undefined;
    }

    let attempts = 0;
    const initialSyncAt = profile?.stravaLastSyncAt;

    const intervalId = window.setInterval(async () => {
      attempts += 1;

      try {
        const profileResponse = await authApi.getProfile();
        const nextProfile = profileResponse.data.user;
        setProfile(nextProfile);

        if (nextProfile?.stravaLastSyncAt && nextProfile.stravaLastSyncAt !== initialSyncAt) {
          refreshProfile(nextProfile);
          setStatus('Background sync finished. Your recent Strava activities are in RunAdvisor.');
          window.clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Error polling Strava sync status:', error);
      }

      if (attempts >= 10) {
        window.clearInterval(intervalId);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [location.search, profile?.stravaLastSyncAt, refreshProfile]);

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
      setStatus(`Synced ${syncedCount} recent Strava activities. Open Training review to see refreshed insights.`);
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
      const fileName = selectedFile.name;
      setStatus(`Uploading ${fileName}...`);
      const dataUrl = await readFileAsDataUrl(selectedFile);

      await stravaApi.uploadTrainingPlan({
        fileName,
        contentType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        dataUrl,
        notes: planNotes
      });

      setSelectedFile(null);
      setPlanNotes('');
      await loadPageData();
      setStatus(`Stored ${fileName} in your RunAdvisor profile.`);
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
      <Card variant="outlined">
        <CardContent>
          <Typography color="text.secondary">Loading your Strava profile...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box component="main">
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xl: 'flex-end' }}>
            <Box>
              <Typography variant="overline" color="primary" fontWeight={700}>
                Sync workspace
              </Typography>
              <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                Strava Sync & Plan Hub
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
                Connect Strava, sync recent runs, and store your current training plan in-app for quick reference.
              </Typography>
            </Box>
            <Card variant="outlined" sx={{ bgcolor: 'action.hover', minWidth: { xl: 200 } }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Last sync
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {formatTimestamp(profile?.stravaLastSyncAt)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </CardContent>
      </Card>

      {offlineMessage && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">{offlineMessage}</Alert>
        </Box>
      )}

      {status && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">{status}</Alert>
        </Box>
      )}

      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText'
                }}
              >
                <RunAdvisorMark size={18} />
              </Box>
              <Typography variant="h5" fontWeight={600}>
                Strava account status
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" paragraph>
              {isStravaConnected
                ? 'Your Strava account is linked. Sync recent activities whenever you want a fresh coach review.'
                : 'Connect your Strava account to pull in recent training automatically and use it in coach review.'}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1.5}>
              <Button startIcon={<SyncIcon size={16} />} onClick={handleStravaConnect} variant="contained">
                {isStravaConnected ? 'Reconnect Strava' : 'Connect with Strava'}
              </Button>
              {isStravaConnected && (
                <Button
                  disabled={syncing}
                  onClick={handleManualSync}
                  startIcon={<SyncIcon size={16} />}
                  variant="outlined"
                >
                  {syncing ? 'Syncing...' : 'Sync recent activities'}
                </Button>
              )}
              <Button onClick={() => navigate('/recommendations')} startIcon={<CoachIcon size={16} />} variant="outlined">
                Open training review
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2} sx={{ width: { xl: 320 } }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Connection
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                {isStravaConnected ? 'Connected' : 'Not connected'}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Training plans stored
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                {plans.length}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Profile email
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-all' }}>
                {profile?.email || 'Unavailable'}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText'
                }}
              >
                <UploadIcon size={18} />
              </Box>
              <Typography variant="h5" fontWeight={600}>
                Upload training plan
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" paragraph>
              Store the plan file inside RunAdvisor so it stays next to your synced training data. This MVP keeps files in-app
              rather than exporting them into Strava.
            </Typography>
            <Box component="form" onSubmit={handleTrainingPlanUpload}>
              <Stack spacing={2}>
                <Button component="label" variant="outlined">
                  Choose file
                  <input hidden type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
                </Button>
                <TextField
                  fullWidth
                  label="Notes"
                  minRows={3}
                  multiline
                  onChange={(event) => setPlanNotes(event.target.value)}
                  placeholder="Example: 12-week half marathon plan from coach."
                  value={planNotes}
                />
                {selectedFile && (
                  <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                    <CardContent>
                      <Typography fontWeight={600}>{selectedFile.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(selectedFile.size)}
                      </Typography>
                    </CardContent>
                  </Card>
                )}
                <Button disabled={uploading} startIcon={<UploadIcon size={16} />} type="submit" variant="contained">
                  {uploading ? 'Uploading plan...' : 'Upload to profile'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.selected'
                }}
              >
                <TargetIcon size={18} />
              </Box>
              <Typography variant="h5" fontWeight={600}>
                Stored plans
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" paragraph>
              Download or remove any plan you have saved in-app.
            </Typography>
            <Stack spacing={2}>
              {plans.length === 0 ? (
                <Alert severity="info">No training plans uploaded yet.</Alert>
              ) : (
                plans.map((plan) => (
                  <Card key={plan.id} variant="outlined">
                    <CardContent>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ sm: 'flex-start' }}
                      >
                        <Box>
                          <Typography fontWeight={600}>{plan.fileName}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {formatFileSize(plan.sizeBytes)} • Uploaded {formatTimestamp(plan.uploadedAt)}
                          </Typography>
                          {plan.notes && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {plan.notes}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            onClick={() => handleDownloadPlan(plan.id, plan.fileName)}
                            startIcon={<DownloadIcon size={16} />}
                            variant="outlined"
                          >
                            Download
                          </Button>
                          <Button color="error" onClick={() => handleDeletePlan(plan.id)} variant="contained">
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.selected'
              }}
            >
              <InstallIcon size={18} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              How this MVP works
            </Typography>
          </Stack>
          <Stack component="ul" spacing={2} sx={{ m: 0, pl: 0, listStyle: 'none' }}>
            <Stack component="li" direction="row" spacing={2} alignItems="flex-start">
              <CalendarIcon size={18} />
              <Typography variant="body2" color="text.secondary">
                Authorize RunAdvisor with Strava. The callback now attempts an immediate recent-activity sync.
              </Typography>
            </Stack>
            <Stack component="li" direction="row" spacing={2} alignItems="flex-start">
              <SyncIcon size={18} />
              <Typography variant="body2" color="text.secondary">
                Use manual sync any time you want to refresh the activities that power coach review and recommendations.
              </Typography>
            </Stack>
            <Stack component="li" direction="row" spacing={2} alignItems="flex-start">
              <UploadIcon size={18} />
              <Typography variant="body2" color="text.secondary">
                Upload your current plan into RunAdvisor for in-app storage and easy download later.
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default StravaConnect;
