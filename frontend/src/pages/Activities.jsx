import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { activitiesApi } from '../services/api';
import ActivityCard from '../components/ActivityCard';
import DeleteActivityDialog from '../components/DeleteActivityDialog';
import {
  ActivityIcon,
  CalendarIcon,
  DistanceIcon,
  ElevationIcon,
  HeartIcon,
  PaceIcon,
  TrailIcon
} from '../components/icons';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';
import SemanticSearchBar from '../components/SemanticSearchBar';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';
import { getVisibilityLabel, VISIBILITY_OPTIONS } from '../utils/activityVisibility';

const ACTIVITIES_CACHE_KEY = 'activities-feed';

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatCreatedActivitySummary(activity) {
  if (!activity) {
    return '';
  }

  const distanceKm = Number(activity.distance || 0) / 1000;
  const durationMinutes = Math.round(Number(activity.duration || 0) / 60);
  const pace =
    activity.pace != null && Number.isFinite(activity.pace)
      ? `${Number(activity.pace).toFixed(1)} min/km`
      : null;

  return [
    activity.name,
    `${distanceKm.toFixed(2)} km`,
    `${durationMinutes} min`,
    pace,
    getVisibilityLabel(activity.visibility)
  ]
    .filter(Boolean)
    .join(' · ');
}

function Activities() {
  const location = useLocation();
  const { profile } = useRunAdvisorProfile();
  const stravaConnected = Boolean(profile?.stravaId);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listAlert, setListAlert] = useState(null);
  const [formFeedback, setFormFeedback] = useState({ status: 'idle' });
  const formFeedbackRef = useRef(null);
  const [postToStrava, setPostToStrava] = useState(true);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'run',
    distance: '',
    duration: '',
    date: new Date().toISOString().split('T')[0],
    elevationGain: '',
    avgHeartRate: '',
    notes: '',
    visibility: 'everyone'
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    if (location.state?.deleteAlert) {
      setListAlert(location.state.deleteAlert);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activitiesApi.getActivities(50);
      setActivities(response.data.activities);
      saveSnapshot(ACTIVITIES_CACHE_KEY, response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      const cachedActivities = loadSnapshot(ACTIVITIES_CACHE_KEY);

      if (cachedActivities?.data) {
        setActivities(cachedActivities.data);
        setListAlert({
          severity: 'warning',
          message: `Showing your saved activity feed from ${formatSnapshotTimestamp(cachedActivities.savedAt)} while offline.`
        });
      } else {
        setListAlert({
          severity: 'error',
          message: 'Unable to load activities right now.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const runActivities = activities.filter((activity) => activity.type?.toLowerCase().includes('run'));
  const paceValues = runActivities.filter((activity) => activity.pace).map((activity) => activity.pace);
  const averagePace = paceValues.length ? (paceValues.reduce((sum, pace) => sum + pace, 0) / paceValues.length).toFixed(1) : null;
  const totalDistance = runActivities.length ? (runActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0) / 1000).toFixed(1) : '0.0';
  const longestRun = runActivities.length ? (Math.max(...runActivities.map((activity) => activity.distance || 0)) / 1000).toFixed(1) : '0.0';
  const totalElevation = runActivities.reduce((sum, activity) => sum + (activity.elevationGain || 0), 0);

  const handleAddActivity = async (e) => {
    e.preventDefault();
    setFormFeedback({ status: 'submitting' });

    try {
      const uploadToStrava = stravaConnected && postToStrava;
      const activityData = {
        ...newActivity,
        distance: parseFloat(newActivity.distance),
        duration: parseInt(newActivity.duration, 10) * 60,
        elevationGain: newActivity.elevationGain ? parseInt(newActivity.elevationGain, 10) : 0,
        avgHeartRate: newActivity.avgHeartRate ? parseInt(newActivity.avgHeartRate, 10) : null,
        uploadToStrava
      };

      const response = await activitiesApi.createActivity(activityData);
      const savedActivity = response.data?.activity;
      const stravaResult = response.data?.strava;

      setNewActivity({
        name: '',
        type: 'run',
        distance: '',
        duration: '',
        date: new Date().toISOString().split('T')[0],
        elevationGain: '',
        avgHeartRate: '',
        notes: '',
        visibility: 'everyone'
      });

      setFormFeedback({
        status: 'success',
        activity: savedActivity,
        strava: stravaResult,
        uploadRequested: uploadToStrava,
        serverMessage: response.data?.message || null
      });

      if (savedActivity) {
        setActivities((prev) => [savedActivity, ...prev.filter((item) => item._id !== savedActivity._id)]);
      }

      await fetchActivities();

      requestAnimationFrame(() => {
        formFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      setFormFeedback({
        status: 'error',
        message: getApiErrorMessage(error, 'Unable to save this activity right now.')
      });
    }
  };

  const handleDeleteRequest = (activity) => {
    setActivityToDelete(activity);
  };

  const handleConfirmDelete = async ({ deleteFromStrava }) => {
    if (!activityToDelete?._id) {
      return;
    }

    setDeletingActivity(true);

    try {
      const response = await activitiesApi.deleteActivity(activityToDelete._id, { deleteFromStrava });
      const strava = response.data?.strava;
      let severity = 'success';
      let message = response.data?.message || 'Activity removed from your log.';

      if (deleteFromStrava && activityToDelete.stravaActivityId && strava && !strava.deleted) {
        severity = 'warning';
        message = strava.message || message;
      }

      setListAlert({ severity, message });
      setActivityToDelete(null);
      await fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      setListAlert({
        severity: 'error',
        message: getApiErrorMessage(error, 'Unable to delete that activity right now.')
      });
    } finally {
      setDeletingActivity(false);
    }
  };

  return (
    <Box component="main">
      <DeleteActivityDialog
        activity={activityToDelete}
        deleting={deletingActivity}
        onClose={() => {
          if (!deletingActivity) {
            setActivityToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        open={Boolean(activityToDelete)}
        stravaConnected={stravaConnected}
      />
      <SemanticSearchBar />
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="primary" fontWeight={700}>
                Run log
              </Typography>
              <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                Run Log & Training Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
                A mobile-first racing and run tracking experience with pace, distance, and recovery insights.
              </Typography>
            </Box>
            <Card variant="outlined" sx={{ maxWidth: 360, bgcolor: 'action.hover' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Mobile tip
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Tap &quot;View details&quot; on any activity card to expand notes, pace insights, and recovery cues.
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems="flex-start">
        <Stack spacing={3} sx={{ flex: 1, width: 1 }}>
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
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText'
                  }}
                >
                  <ActivityIcon size={18} />
                </Box>
                <Typography variant="h5" component="h2" fontWeight={600}>
                  Manual run log
                </Typography>
              </Stack>

              <Box ref={formFeedbackRef} sx={{ mb: formFeedback.status !== 'idle' ? 2 : 0 }}>
                {formFeedback.status === 'submitting' && (
                  <Alert severity="info" icon={<CircularProgress size={18} color="inherit" />}>
                    <AlertTitle>Saving activity</AlertTitle>
                    {stravaConnected && postToStrava
                      ? 'Saving to RunAdvisor and posting to Strava…'
                      : 'Sending your run to the server…'}
                  </Alert>
                )}
                {formFeedback.status === 'success' && (
                  <Stack spacing={1.5}>
                    <Alert
                      severity="success"
                      onClose={() => setFormFeedback({ status: 'idle' })}
                    >
                      <AlertTitle>Activity added</AlertTitle>
                      {formFeedback.activity ? (
                        <>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {formatCreatedActivitySummary(formFeedback.activity)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            RunAdvisor ID {formFeedback.activity._id || '—'}
                            {formFeedback.serverMessage ? ` · ${formFeedback.serverMessage}` : ''}
                          </Typography>
                          {formFeedback.strava?.posted && formFeedback.strava.url && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Posted to Strava:{' '}
                              <Link href={formFeedback.strava.url} target="_blank" rel="noopener noreferrer">
                                View on strava.com
                              </Link>
                              {formFeedback.strava.activityId ? ` (ID ${formFeedback.strava.activityId})` : ''}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2">
                          The server accepted your activity. Your log has been refreshed below.
                        </Typography>
                      )}
                    </Alert>
                    {formFeedback.uploadRequested && !formFeedback.strava?.posted && formFeedback.strava?.message && (
                      <Alert severity={formFeedback.strava.needsReconnect ? 'warning' : 'info'}>
                        <AlertTitle>Strava upload</AlertTitle>
                        {formFeedback.strava.message}
                        {formFeedback.strava.needsReconnect && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <Link component={RouterLink} to="/strava-connect">
                              Reconnect Strava
                            </Link>{' '}
                            to grant upload permission, then add the activity again or sync from Strava.
                          </Typography>
                        )}
                      </Alert>
                    )}
                  </Stack>
                )}
                {formFeedback.status === 'error' && (
                  <Alert
                    severity="error"
                    onClose={() => setFormFeedback({ status: 'idle' })}
                  >
                    <AlertTitle>Could not add activity</AlertTitle>
                    {formFeedback.message}
                  </Alert>
                )}
              </Box>

              <Box component="form" onSubmit={handleAddActivity}>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }
                  }}
                >
                  <TextField
                    fullWidth
                    label="Activity name"
                    onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                    placeholder="Morning run, long run, recovery jog"
                    required
                    value={newActivity.name}
                  />
                  <TextField
                    fullWidth
                    label="Activity type"
                    onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                    select
                    value={newActivity.type}
                  >
                    <MenuItem value="run">Run</MenuItem>
                    <MenuItem value="walk">Walk</MenuItem>
                    <MenuItem value="trail run">Trail Run</MenuItem>
                  </TextField>
                  <TextField
                    fullWidth
                    label="Distance (km)"
                    onChange={(e) => setNewActivity({ ...newActivity, distance: e.target.value })}
                    placeholder="8.5"
                    required
                    type="number"
                    value={newActivity.distance}
                  />
                  <TextField
                    fullWidth
                    label="Duration (minutes)"
                    onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                    placeholder="52"
                    required
                    type="number"
                    value={newActivity.duration}
                  />
                  <TextField
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    label="Date"
                    onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                    required
                    type="date"
                    value={newActivity.date}
                  />
                  <TextField
                    fullWidth
                    label="Elevation gain (m)"
                    onChange={(e) => setNewActivity({ ...newActivity, elevationGain: e.target.value })}
                    placeholder="120"
                    type="number"
                    value={newActivity.elevationGain}
                  />
                  <TextField
                    fullWidth
                    label="Avg Heart Rate (bpm)"
                    onChange={(e) => setNewActivity({ ...newActivity, avgHeartRate: e.target.value })}
                    placeholder="148"
                    type="number"
                    value={newActivity.avgHeartRate}
                  />
                  <TextField
                    fullWidth
                    label="Strava visibility"
                    onChange={(e) => setNewActivity({ ...newActivity, visibility: e.target.value })}
                    select
                    value={newActivity.visibility}
                    helperText={
                      VISIBILITY_OPTIONS.find((option) => option.value === newActivity.visibility)?.description
                    }
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                    {stravaConnected ? (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={postToStrava}
                            onChange={(e) => setPostToStrava(e.target.checked)}
                          />
                        }
                        label="Also post this activity to Strava"
                      />
                    ) : (
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        <Typography variant="body2">
                          Connect Strava to upload manual activities.{' '}
                          <Link component={RouterLink} to="/strava-connect">
                            Open Strava settings
                          </Link>
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                  <TextField
                    fullWidth
                    label="Notes"
                    minRows={3}
                    multiline
                    onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                    placeholder="How did it feel? Any pacing notes, terrain, or recovery reminders?"
                    sx={{ gridColumn: { sm: '1 / -1' } }}
                    value={newActivity.notes}
                  />
                  <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Button
                        disabled={formFeedback.status === 'submitting'}
                        startIcon={
                          formFeedback.status === 'submitting' ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            <ActivityIcon size={18} />
                          )
                        }
                        type="submit"
                        variant="contained"
                        size="large"
                      >
                        {formFeedback.status === 'submitting' ? 'Saving…' : 'Add activity'}
                      </Button>
                      {formFeedback.status === 'submitting' && (
                        <Typography variant="body2" color="text.secondary">
                          {stravaConnected && postToStrava
                            ? 'Waiting for RunAdvisor and Strava…'
                            : 'Waiting for server response…'}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
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
                  <CalendarIcon size={18} />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  Upcoming race preview
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Use Coach Review to attach these activities to your next race and see readiness, risk, and pacing suggestions.
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Card variant="outlined" sx={{ width: { xl: 320 }, flexShrink: 0, position: { xl: 'sticky' }, top: { xl: 16 } }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Run summary
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your recent training metrics for goal pacing and race readiness.
            </Typography>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
              <SummaryMetric icon={ActivityIcon} label="Runs logged" value={runActivities.length} />
              <SummaryMetric icon={PaceIcon} label="Average pace" value={averagePace ? `${averagePace} min/km` : 'N/A'} />
              <SummaryMetric icon={DistanceIcon} label="Distance" value={`${totalDistance} km`} />
              <SummaryMetric icon={TrailIcon} label="Longest run" value={`${longestRun} km`} />
              <SummaryMetric icon={ElevationIcon} label="Elevation" value={`${totalElevation} m`} />
              <SummaryMetric
                icon={HeartIcon}
                label="Recovery check"
                value={runActivities.length ? 'Ready for review' : 'Add data first'}
              />
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Box sx={{ mt: 3 }}>
        {listAlert && (
          <Alert
            severity={listAlert.severity}
            sx={{ mb: 2 }}
            onClose={() => setListAlert(null)}
          >
            {listAlert.message}
          </Alert>
        )}
        {loading ? (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary">Loading activities...</Typography>
            </CardContent>
          </Card>
        ) : activities.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary">
                No activities found. Start by syncing with Strava or adding a manual activity.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {activities.map((activity) => (
              <ActivityCard key={activity._id} activity={activity} onDelete={handleDeleteRequest} />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function SummaryMetric({ icon: Icon, label, value }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Icon size={14} />
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}

export default Activities;
