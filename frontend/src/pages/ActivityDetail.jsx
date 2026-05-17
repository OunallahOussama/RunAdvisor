import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ActivityRouteMap from '../components/ActivityRouteMap';
import DeleteActivityDialog from '../components/DeleteActivityDialog';
import SimilarRunsPanel from '../components/SimilarRunsPanel';
import ActivityStreamsChart from '../components/ActivityStreamsChart';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';
import {
  ActivityIcon,
  ClockIcon,
  DistanceIcon,
  ElevationIcon,
  HeartIcon,
  PaceIcon
} from '../components/icons';
import { activitiesApi, stravaApi } from '../services/api';
import { getVisibilityChipColor, getVisibilityLabel } from '../utils/activityVisibility';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function formatDuration(seconds) {
  const s = Number(seconds || 0);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const min = m % 60;

  if (h > 0) {
    return `${h}h ${min}m`;
  }

  return `${m}m`;
}

function pickEncodedPolyline(detail) {
  if (!detail?.map) {
    return '';
  }

  return detail.map.polyline || detail.map.summary_polyline || '';
}

function MetricTile({ icon: Icon, label, value }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
        <Icon size={14} />
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.06 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body1" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}

function SplitsElevationChart({ splits }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(splits) || !splits.length) {
      return null;
    }

    let cumulative = 0;
    const labels = [];
    const data = [];

    splits.forEach((split, index) => {
      const delta = Number(split.elevation_difference || 0);
      cumulative += delta;
      labels.push(`Km ${index + 1}`);
      data.push(Number(cumulative.toFixed(1)));
    });

    return {
      labels,
      datasets: [
        {
          label: 'Cumulative elev. (m, by km)',
          data,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 2
        }
      ]
    };
  }, [splits]);

  if (!chartData) {
    return null;
  }

  return (
    <Box sx={{ mt: 3, height: 260 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Elevation trend (metric splits)
      </Typography>
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
              grid: { display: false }
            },
            y: { beginAtZero: false }
          }
        }}
      />
    </Box>
  );
}

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useRunAdvisorProfile();
  const stravaConnected = Boolean(profile?.stravaId);
  const [localActivity, setLocalActivity] = useState(null);
  const [stravaDetail, setStravaDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stravaMessage, setStravaMessage] = useState('');
  const [error, setError] = useState('');
  const [segmentEfforts, setSegmentEfforts] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setStravaMessage('');
      setStravaDetail(null);

      try {
        const res = await activitiesApi.getActivity(id);
        const activity = res.data.activity;

        if (cancelled) {
          return;
        }

        setLocalActivity(activity);

        if (!activity?.stravaActivityId) {
          setStravaMessage('This activity is not linked to Strava. Showing your saved log data only.');
          return;
        }

        try {
          const stravaRes = await stravaApi.getStravaActivityDetail(id);
          if (!cancelled) {
            setStravaDetail(stravaRes.data.detail);
          }

          try {
            const segRes = await stravaApi.getActivitySegments(id);
            if (!cancelled) {
              setSegmentEfforts(segRes.data.segmentEfforts || []);
            }
          } catch {
            if (!cancelled) {
              setSegmentEfforts([]);
            }
          }
        } catch (stravaErr) {
          if (cancelled) {
            return;
          }

          const msg = stravaErr.response?.data?.message || stravaErr.message || 'Could not load Strava details.';
          setStravaMessage(msg);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || err.message || 'Failed to load activity.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const detail = stravaDetail;
  const encoded = pickEncodedPolyline(detail);
  const displayName = detail?.name || localActivity?.name || 'Activity';
  const displayType = detail?.type || localActivity?.type || '';
  const distanceM = detail?.distance ?? localActivity?.distance ?? 0;
  const moving = detail?.moving_time ?? localActivity?.movingTime ?? localActivity?.duration ?? 0;
  const elapsed = detail?.elapsed_time ?? localActivity?.duration ?? moving;
  const elev = detail?.total_elevation_gain ?? localActivity?.elevationGain ?? 0;
  const avgHr = detail?.average_heartrate ?? localActivity?.avgHeartRate;
  const maxHr = detail?.max_heartrate ?? localActivity?.maxHeartRate;
  const paceMinPerKm = localActivity?.pace;
  const startDate = detail?.start_date || localActivity?.date;
  const dateLabel = startDate ? new Date(startDate).toLocaleString() : '';

  const handleConfirmDelete = async ({ deleteFromStrava }) => {
    if (!localActivity?._id) {
      return;
    }

    setDeletingActivity(true);
    setDeleteMessage(null);

    try {
      const response = await activitiesApi.deleteActivity(localActivity._id, { deleteFromStrava });
      const strava = response.data?.strava;
      const succeededOnStrava = !deleteFromStrava || !localActivity.stravaActivityId || strava?.deleted;

      navigate('/activities', {
        replace: true,
        state: {
          deleteAlert: {
            severity: succeededOnStrava ? 'success' : 'warning',
            message: response.data?.message || 'Activity deleted.'
          }
        }
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      setDeleteMessage({
        severity: 'error',
        text: getApiErrorMessage(error, 'Unable to delete this activity right now.')
      });
    } finally {
      setDeletingActivity(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Box component="main">
      <DeleteActivityDialog
        activity={localActivity}
        deleting={deletingActivity}
        onClose={() => {
          if (!deletingActivity) {
            setDeleteDialogOpen(false);
          }
        }}
        onConfirm={handleConfirmDelete}
        open={deleteDialogOpen}
        stravaConnected={stravaConnected}
      />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button component={RouterLink} to="/activities" variant="text" size="small">
          Back to run log
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {deleteMessage && (
        <Alert severity={deleteMessage.severity} sx={{ mb: 2 }} onClose={() => setDeleteMessage(null)}>
          {deleteMessage.text}
        </Alert>
      )}

      {loading && (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">Loading activity…</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !localActivity && !error && (
        <Alert severity="warning">Activity not found.</Alert>
      )}

      {!loading && localActivity && (
        <>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" color="primary" fontWeight={700}>
                    Activity
                  </Typography>
                  <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                    {displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {displayType}
                    {dateLabel ? ` • ${dateLabel}` : ''}
                    {detail?.timezone ? ` • ${detail.timezone}` : ''}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {displayType && <Chip size="small" label={String(displayType)} variant="outlined" />}
                  {localActivity?.visibility && (
                    <Chip
                      color={getVisibilityChipColor(localActivity.visibility)}
                      label={getVisibilityLabel(localActivity.visibility)}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {detail?.device_name && <Chip size="small" label={detail.device_name} variant="outlined" />}
                </Stack>
              </Stack>

              {stravaMessage && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {stravaMessage}
                </Alert>
              )}

              <Box
                sx={{
                  mt: 2,
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }
                }}
              >
                <MetricTile icon={DistanceIcon} label="Distance" value={`${(Number(distanceM) / 1000).toFixed(2)} km`} />
                <MetricTile icon={ClockIcon} label="Moving time" value={formatDuration(moving)} />
                <MetricTile icon={ClockIcon} label="Elapsed" value={formatDuration(elapsed)} />
                <MetricTile icon={ElevationIcon} label="Elevation gain" value={`${Math.round(Number(elev))} m`} />
                <MetricTile
                  icon={PaceIcon}
                  label="Pace (saved)"
                  value={paceMinPerKm != null ? `${Number(paceMinPerKm).toFixed(1)} min/km` : 'N/A'}
                />
                {avgHr != null && <MetricTile icon={HeartIcon} label="Avg HR" value={`${Math.round(avgHr)} bpm`} />}
                {maxHr != null && <MetricTile icon={HeartIcon} label="Max HR" value={`${Math.round(maxHr)} bpm`} />}
                {detail?.calories != null && (
                  <MetricTile icon={ActivityIcon} label="Calories" value={`${detail.calories}`} />
                )}
                {detail?.average_cadence != null && (
                  <MetricTile icon={PaceIcon} label="Avg cadence" value={`${detail.average_cadence.toFixed(0)} spm`} />
                )}
              </Box>

              {(detail?.location_city || detail?.location_state || detail?.location_country) && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {[detail.location_city, detail.location_state, detail.location_country].filter(Boolean).join(', ')}
                </Typography>
              )}

              {detail?.description && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {detail.description}
                  </Typography>
                </>
              )}

              {localActivity?.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Your notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {localActivity.notes}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          {localActivity?._id && (
            <SimilarRunsPanel activityId={localActivity._id} />
          )}

          {detail && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <ActivityRouteMap encodedPolyline={encoded} title="Map" />
                <ActivityStreamsChart activityId={id} />
                <SplitsElevationChart splits={detail.splits_metric} />
                {segmentEfforts.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Segment efforts
                    </Typography>
                    <Stack spacing={0.5}>
                      {segmentEfforts.map((seg) => (
                        <Typography key={seg.id} variant="body2">
                          {seg.name}
                          {seg.prRank ? ` · PR #${seg.prRank}` : ''}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
                {(detail.kudos_count != null || detail.comment_count != null) && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    {detail.kudos_count != null && `${detail.kudos_count} kudos`}
                    {detail.kudos_count != null && detail.comment_count != null ? ' · ' : ''}
                    {detail.comment_count != null && `${detail.comment_count} comments`}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={() => navigate('/activities')}>
              Close
            </Button>
            <Button color="error" variant="outlined" onClick={() => setDeleteDialogOpen(true)}>
              Delete activity
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}

export default ActivityDetail;
