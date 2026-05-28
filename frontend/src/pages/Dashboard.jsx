import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { activitiesApi, coachApi, trainingApi } from '../services/api';
import TrainingGoalsCard from '../components/TrainingGoalsCard';
import FeedRow from '../components/FeedRow';
import SmartWeeklyReportCard from '../components/SmartWeeklyReportCard';
import TodayHeroCard from '../components/TodayHeroCard';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';
import { useScreenChrome } from '../context/AppShellContext';

const HOME_WEEKLY_REPORT_KEY = 'home-weekly-report';
const HOME_RECENT_ACTIVITIES_KEY = 'home-recent-activities';

function Dashboard() {
  const { profile, refreshProfile } = useRunAdvisorProfile();
  const [weeklyReport, setWeeklyReport] = useState(() => loadSnapshot(HOME_WEEKLY_REPORT_KEY)?.data || null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportRefreshing, setReportRefreshing] = useState(false);
  const [reportError, setReportError] = useState('');
  const [recentActivities, setRecentActivities] = useState(() => loadSnapshot(HOME_RECENT_ACTIVITIES_KEY)?.data || []);
  const [recentLoading, setRecentLoading] = useState(true);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState('');

  const loadWeeklyReport = useMemo(() => async ({ force = false } = {}) => {
    if (force) setReportRefreshing(true); else setReportLoading(true);
    setReportError('');
    try {
      const response = await coachApi.weeklySummary({ windowDays: 7, force });
      const payload = response?.data || null;
      setWeeklyReport(payload);
      if (payload) saveSnapshot(HOME_WEEKLY_REPORT_KEY, payload);
    } catch (err) {
      const cached = loadSnapshot(HOME_WEEKLY_REPORT_KEY);
      if (cached?.data) {
        setWeeklyReport(cached.data);
        setReportError(`Offline · saved ${formatSnapshotTimestamp(cached.savedAt)}`);
      } else {
        setReportError(err?.response?.data?.message || err.message || 'Could not load report.');
      }
    } finally {
      setReportLoading(false);
      setReportRefreshing(false);
    }
  }, []);

  useScreenChrome({
    title: 'Today',
    primaryAction: {
      label: 'Refresh',
      icon: <AutoAwesomeIcon />,
      onClick: () => loadWeeklyReport({ force: true })
    }
  });

  useEffect(() => {
    loadWeeklyReport();
  }, [loadWeeklyReport]);

  useEffect(() => {
    let cancelled = false;
    setProgressLoading(true);
    trainingApi
      .getProgress()
      .then((res) => {
        if (cancelled) return;
        setTrainingProgress(res?.data?.progress || null);
        setProgressError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setProgressError(err?.response?.data?.error || err.message || '');
      })
      .finally(() => {
        if (!cancelled) setProgressLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    activitiesApi
      .getActivities(3, 0)
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.activities || [];
        setRecentActivities(list);
        if (list.length > 0) saveSnapshot(HOME_RECENT_ACTIVITIES_KEY, list);
      })
      .catch(() => {
        if (cancelled) return;
        const cached = loadSnapshot(HOME_RECENT_ACTIVITIES_KEY);
        if (cached?.data) setRecentActivities(cached.data);
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const analytics = weeklyReport?.analytics || null;
  const report = weeklyReport?.report || null;
  const stravaConnected = Boolean(profile?.stravaId);

  return (
    <Box component="section" sx={{ maxWidth: { xs: 480, md: 640 }, mx: 'auto' }}>
      {reportError && weeklyReport ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>{reportError}</Alert>
      ) : null}

      <Box sx={{ mb: 2 }}>
        <TrainingGoalsCard
          progress={trainingProgress}
          loading={progressLoading}
          error={progressError}
        />
      </Box>

      {!reportLoading && weeklyReport ? (
        <Box sx={{ mb: 2 }}>
          <TodayHeroCard
            analytics={analytics}
            report={report}
            generatedAt={weeklyReport?.generatedAt}
            stravaConnected={stravaConnected}
            weeklyTargetKm={profile?.weeklyTrainingLoadKm}
            goalRaceDate={profile?.goalRaceDate}
            goalRaceName={profile?.goalRaceName}
            runningGoal={profile?.runningGoal}
          />
        </Box>
      ) : null}

      <SmartWeeklyReportCard
        compact
        data={weeklyReport}
        loading={reportLoading}
        refreshing={reportRefreshing}
        error={reportError && !weeklyReport ? reportError : ''}
        windowDays={7}
        onRefresh={() => loadWeeklyReport({ force: true })}
        stravaConnected={stravaConnected}
        onPlanCommitmentUpdated={() => {
          refreshProfile();
          loadWeeklyReport({ force: true });
        }}
      />

      <Card variant="outlined" sx={{ mt: 2 }} data-testid="home-recent-feed">
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Recent
            </Typography>
            <Button component={RouterLink} to="/activities" size="small" variant="text">
              All
            </Button>
          </Stack>
          {recentLoading && recentActivities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          ) : recentActivities.length === 0 ? (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">No runs yet.</Typography>
              <Button
                component={RouterLink}
                to={stravaConnected ? '/activities' : '/strava-connect'}
                size="small"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              >
                {stravaConnected ? 'Log a run' : 'Connect Strava'}
              </Button>
            </Stack>
          ) : (
            <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
              {recentActivities.slice(0, 3).map((activity) => (
                <FeedRow key={activity._id || activity.stravaActivityId} activity={activity} />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Dashboard;
