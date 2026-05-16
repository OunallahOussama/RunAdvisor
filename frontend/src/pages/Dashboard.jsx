import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { activitiesApi } from '../services/api';
import StatsCard from '../components/StatsCard';
import {
  ActivityIcon,
  ClockIcon,
  CoachIcon,
  DistanceIcon,
  ElevationIcon,
  HeartIcon,
  PaceIcon,
  SyncIcon,
  TargetIcon,
  TrendIcon
} from '../components/icons';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';

const DASHBOARD_CACHE_KEY = 'dashboard-summary';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchWeeklySummary();
  }, []);

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      const response = await activitiesApi.getWeeklySummary();
      setSummary(response.data.summary);
      saveSnapshot(DASHBOARD_CACHE_KEY, response.data.summary);
      setStatusMessage('');
    } catch (error) {
      console.error('Error fetching summary:', error);
      const cachedSummary = loadSnapshot(DASHBOARD_CACHE_KEY);

      if (cachedSummary?.data) {
        setSummary(cachedSummary.data);
        setStatusMessage(`Showing your last saved weekly snapshot from ${formatSnapshotTimestamp(cachedSummary.savedAt)}.`);
      } else {
        setStatusMessage('Unable to load your dashboard right now. Sync or log a run once you are back online.');
      }
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      description: 'Connect Strava, refresh recent workouts, and keep your mobile activity history current.',
      icon: SyncIcon,
      title: 'Sync recent runs',
      to: '/strava-connect'
    },
    {
      description: 'Log a session with distance, duration, heart rate, and notes built for touch entry.',
      icon: ActivityIcon,
      title: 'Add a manual activity',
      to: '/activities'
    },
    {
      description: 'Review readiness, risk, and next focus with richer training context.',
      icon: CoachIcon,
      title: 'Open coach review',
      to: '/recommendations'
    },
    {
      description: 'Turn your recent data into a sharper race plan and pacing recommendation.',
      icon: TargetIcon,
      title: 'Plan the next race',
      to: '/recommendations'
    }
  ];

  const statCards = summary
    ? [
        {
          hint: 'Total distance recorded this week.',
          icon: DistanceIcon,
          title: 'Total Distance',
          value: `${summary.totalDistance.toFixed(1)} km`
        },
        {
          hint: 'Time spent moving across all sessions.',
          icon: ClockIcon,
          title: 'Total Time',
          value: `${(summary.totalDuration / 60).toFixed(1)} hrs`
        },
        {
          hint: 'How many sessions fueled your week.',
          icon: ActivityIcon,
          title: 'Activities',
          value: summary.activityCount
        },
        {
          hint: 'Average rhythm across your logged runs.',
          icon: PaceIcon,
          title: 'Avg Pace',
          value: `${summary.avgPace.toFixed(1)} min/km`
        },
        {
          hint: 'Climbing load across the week.',
          icon: ElevationIcon,
          title: 'Elevation Gain',
          value: `${summary.totalElevation.toFixed(0)} m`
        },
        {
          hint: 'Heart rate trend for aerobic control.',
          icon: HeartIcon,
          title: 'Avg HR',
          value: `${summary.avgHeartRate.toFixed(0)} bpm`
        }
      ]
    : [];

  const totalHours = summary ? (summary.totalDuration / 60).toFixed(1) : null;
  const dataStatusLabel = summary ? 'Weekly data loaded' : 'Awaiting first sync';
  const weeklyFocusTitle = summary ? `${summary.activityCount} sessions logged` : 'Build this week’s baseline';
  const weeklyFocusDescription = summary
    ? `You have ${summary.totalDistance.toFixed(1)} km across ${totalHours} hours this week. Review coach guidance to turn that load into pacing, recovery, and race-day decisions.`
    : 'Sync Strava or add a manual activity to unlock weekly load, pacing, and recovery guidance across the app.';
  const overviewMetrics = [
    {
      label: 'This week',
      supporting: summary ? `${summary.activityCount} sessions logged` : 'Sync Strava or add a run',
      value: summary ? `${summary.totalDistance.toFixed(1)} km` : 'No data yet'
    },
    {
      label: 'Training time',
      supporting: summary ? `${summary.totalElevation.toFixed(0)} m elevation gain` : 'Duration and elevation appear here',
      value: summary ? `${totalHours} hrs` : 'Ready to track'
    },
    {
      label: 'Coach review',
      supporting: summary ? 'Readiness, pacing, and recovery insights' : 'Unlock guidance after your first sync',
      value: summary ? 'Available now' : 'Pending data'
    }
  ];

  return (
    <Box component="main">
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            justifyContent="space-between"
            alignItems={{ md: 'flex-start' }}
          >
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                <Chip label="Dashboard" size="small" variant="outlined" />
                <Chip
                  color={summary ? 'success' : 'default'}
                  icon={<SyncIcon size={14} />}
                  label={dataStatusLabel}
                  size="small"
                />
              </Stack>
              <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                Weekly training overview
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
                Monitor weekly load, keep your training data current, and move quickly between logging, syncing, and coach
                review.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={RouterLink}
                startIcon={<CoachIcon size={18} />}
                to="/recommendations"
                variant="contained"
              >
                Open coach review
              </Button>
              <Button component={RouterLink} startIcon={<ActivityIcon size={18} />} to="/activities" variant="outlined">
                Log activity
              </Button>
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
            {overviewMetrics.map((metric) => (
              <Card key={metric.label} variant="outlined" sx={{ flex: 1, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {metric.supporting}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ mb: 3 }} alignItems="stretch">
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip color="primary" icon={<TargetIcon size={14} />} label="Weekly focus" size="small" />
              <Chip
                color={summary ? 'success' : 'default'}
                icon={<SyncIcon size={14} />}
                label={summary ? 'Current week loaded' : 'Ready for first sync'}
                size="small"
              />
            </Stack>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {weeklyFocusTitle}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {weeklyFocusDescription}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip icon={<DistanceIcon size={14} />} label={summary ? `${summary.totalDistance.toFixed(1)} km this week` : 'Weekly load tracking'} variant="outlined" />
              <Chip icon={<ClockIcon size={14} />} label={summary ? `${totalHours} hours logged` : 'Training time overview'} variant="outlined" />
              <Chip icon={<TrendIcon size={14} />} label="Trend-aware coaching" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>
        <Stack spacing={2} sx={{ width: { lg: 360 } }}>
          <SupportLinkCard
            description="Readiness, risk, and next workout guidance in one focused workflow."
            icon={CoachIcon}
            title={summary ? 'Review this training week' : 'Open when your data is ready'}
            to="/recommendations"
            subtitle="Coach review"
          />
          <SupportLinkCard
            description="Refresh Strava and keep your mobile activity history accurate."
            icon={SyncIcon}
            title="Keep workouts current"
            to="/strava-connect"
            subtitle="Data sync"
          />
          <SupportLinkCard
            description="Capture distance, duration, heart rate, and notes without leaving the dashboard flow."
            icon={ActivityIcon}
            title="Add a session fast"
            to="/activities"
            subtitle="Run log"
          />
        </Stack>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary" fontWeight={700}>
          Weekly metrics
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          Current training snapshot
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mt: 0.5 }}>
          Volume, pace, elevation, and heart-rate trends for the current week.
        </Typography>
      </Box>

      {statusMessage && (
        <Box sx={{ mb: 2 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2">{statusMessage}</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {loading ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">Loading your weekly stats...</Typography>
          </CardContent>
        </Card>
      ) : summary ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }
          }}
        >
          {statCards.map((card) => (
            <StatsCard key={card.title} hint={card.hint} icon={card.icon} title={card.title} value={card.value} />
          ))}
        </Box>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">
              No activities this week. Start by adding activities or connecting Strava.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-end' }}>
            <Box>
              <Typography variant="overline" color="primary" fontWeight={700}>
                Workflows
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Common training actions
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
              Jump straight into the actions you are most likely to need during the week, with larger touch targets and
              clearer entry points.
            </Typography>
          </Stack>
          <Box
            sx={{
              mt: 3,
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
            }}
          >
            {quickActions.map(({ description, icon: Icon, title, to }) => (
              <Card
                key={title}
                component={RouterLink}
                to={to}
                variant="outlined"
                sx={{
                  textDecoration: 'none',
                  height: '100%',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      mb: 1.5
                    }}
                  >
                    <Icon size={18} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary" gutterBottom>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function SupportLinkCard({ subtitle, title, description, to, icon: Icon }) {
  return (
    <Card
      component={RouterLink}
      to={to}
      variant="outlined"
      sx={{
        textDecoration: 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              flexShrink: 0
            }}
          >
            <Icon size={18} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              {subtitle}
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary" display="block" sx={{ mt: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
