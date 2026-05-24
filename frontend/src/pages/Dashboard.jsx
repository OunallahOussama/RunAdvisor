import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { activitiesApi, coachApi } from '../services/api';
import SmartWeeklyReportCard from '../components/SmartWeeklyReportCard';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';
import { useScreenChrome } from '../context/AppShellContext';

const HOME_WEEKLY_REPORT_KEY = 'home-weekly-report';
const HOME_RECENT_ACTIVITIES_KEY = 'home-recent-activities';

function paceLabel(value) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    return '—';
  }
  const mins = Math.floor(v);
  const secs = Math.round((v - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function acwrStatus(acwr) {
  const v = Number(acwr) || 0;
  if (v === 0) return { label: 'ACWR n/a', color: 'default' };
  if (v > 1.5) return { label: 'ACWR overload', color: 'error' };
  if (v > 1.3) return { label: 'ACWR watch', color: 'warning' };
  if (v < 0.8) return { label: 'ACWR low', color: 'warning' };
  return { label: 'ACWR healthy', color: 'success' };
}

function nextSessionHoursAway(report) {
  // Best-effort: the structured report's weeklyPlan is day-based, not
  // a date. We approximate the next non-rest day as "today + N days".
  const plan = Array.isArray(report?.weeklyPlan) ? report.weeklyPlan : [];
  const idx = plan.findIndex((day) => day.sessionType !== 'rest_or_xt');
  if (idx === -1) return null;
  return idx * 24;
}

function Dashboard() {
  const { profile } = useRunAdvisorProfile();
  const [weeklyReport, setWeeklyReport] = useState(() => loadSnapshot(HOME_WEEKLY_REPORT_KEY)?.data || null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportRefreshing, setReportRefreshing] = useState(false);
  const [reportError, setReportError] = useState('');
  const [recentActivities, setRecentActivities] = useState(() => loadSnapshot(HOME_RECENT_ACTIVITIES_KEY)?.data || []);
  const [recentLoading, setRecentLoading] = useState(true);

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
        setReportError(`Showing your saved report from ${formatSnapshotTimestamp(cached.savedAt)}.`);
      } else {
        setReportError(err?.response?.data?.message || err.message || 'Failed to generate your weekly report.');
      }
    } finally {
      setReportLoading(false);
      setReportRefreshing(false);
    }
  }, []);

  useScreenChrome({
    title: 'Today',
    primaryAction: {
      label: 'Generate new report',
      icon: <AutoAwesomeIcon />,
      onClick: () => loadWeeklyReport({ force: true })
    }
  });

  useEffect(() => {
    loadWeeklyReport();
  }, [loadWeeklyReport]);

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
  const sessionCount = analytics?.window?.activityCount ?? null;
  const acwr = analytics?.trainingLoad?.acwr ?? 0;
  const status = acwrStatus(acwr);
  const nextHrs = nextSessionHoursAway(report);

  return (
    <Box component="section" aria-labelledby="home-heading">
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary" sx={{ letterSpacing: 1 }}>
          Your week
        </Typography>
        <Typography variant="h4" component="h1" id="home-heading">
          Weekly training overview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          A single coach-style insight for this week. Tap a recommendation to dig deeper.
        </Typography>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <SmartWeeklyReportCard
          data={weeklyReport}
          loading={reportLoading}
          refreshing={reportRefreshing}
          error={reportError}
          windowDays={7}
          onRefresh={() => loadWeeklyReport({ force: true })}
          stravaConnected={Boolean(profile?.stravaId)}
        />
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          color={status.color === 'default' ? undefined : status.color}
          label={status.label}
          variant={status.color === 'default' ? 'outlined' : 'filled'}
          data-testid="insight-chip-acwr"
        />
        <Chip
          color={sessionCount ? 'success' : 'default'}
          label={sessionCount != null ? `${sessionCount} session${sessionCount === 1 ? '' : 's'} this week` : 'No sessions yet'}
          variant={sessionCount ? 'filled' : 'outlined'}
          data-testid="insight-chip-sessions"
        />
        {nextHrs != null ? (
          <Chip
            color="primary"
            label={nextHrs === 0 ? 'Next session today' : `Next session in ~${nextHrs} h`}
            variant="outlined"
            data-testid="insight-chip-next"
          />
        ) : null}
        <Chip
          color={weeklyReport ? 'success' : 'default'}
          label={weeklyReport ? 'Weekly data loaded' : 'Awaiting first sync'}
          variant={weeklyReport ? 'outlined' : 'outlined'}
        />
      </Stack>

      {reportError && weeklyReport ? (
        <Alert severity="info" sx={{ mb: 2 }}>{reportError}</Alert>
      ) : null}

      <Accordion
        defaultExpanded={false}
        elevation={0}
        sx={{ borderRadius: 3, border: 1, borderColor: 'divider', mb: 2, '&:before': { display: 'none' } }}
        data-testid="home-recent-accordion"
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Recent activities
            </Typography>
            <Chip size="small" label={recentActivities.length} />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {recentLoading && recentActivities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Loading your latest runs…</Typography>
          ) : recentActivities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent activities. Sync Strava or log a run to start your week.
            </Typography>
          ) : (
            <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />} spacing={0}>
              {recentActivities.slice(0, 3).map((activity) => (
                <Stack
                  key={activity._id || activity.stravaActivityId}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  sx={{ py: 1.5 }}
                  component={RouterLink}
                  to={`/activities/${activity._id || activity.stravaActivityId}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{activity.name || 'Run'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {activity.date ? new Date(activity.date).toLocaleDateString() : ''} · {activity.type || 'run'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: { xs: 0.5, sm: 0 } }}>
                    <Chip size="small" variant="outlined" label={`${((activity.distance || 0) / 1000).toFixed(1)} km`} />
                    <Chip size="small" variant="outlined" label={paceLabel(activity.pace)} />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          component={RouterLink}
          to="/training-report"
          variant="text"
        >
          Open full training report →
        </Button>
      </Box>
    </Box>
  );
}

export default Dashboard;
