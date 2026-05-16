import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { adminApi } from '../services/api';
import AdminUsageChart from '../components/AdminUsageChart';

const WINDOW_OPTIONS = [7, 14, 30];

const EVENT_LABELS = {
  api_request: 'API',
  strava_sync: 'Strava sync',
  strava_connect: 'Strava connect',
  strava_webhook: 'Strava webhook',
  training_review: 'Training review',
  coach_feature: 'Coach',
  similar_runs: 'Similar runs',
  admin_access: 'Admin'
};

function formatEventLabel(event) {
  return EVENT_LABELS[event] || event?.replace(/_/g, ' ') || 'unknown';
}

function MetricCard({ label, value, hint, accent }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: 1,
        borderColor: accent ? 'primary.main' : 'divider',
        bgcolor: accent ? 'action.hover' : 'background.paper'
      }}
    >
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.08 }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function StatusChip({ statusCode }) {
  if (!statusCode) {
    return <Chip label="—" size="small" variant="outlined" />;
  }

  if (statusCode >= 500) {
    return <Chip label={statusCode} size="small" color="error" />;
  }

  if (statusCode >= 400) {
    return <Chip label={statusCode} size="small" color="warning" />;
  }

  return <Chip label={statusCode} size="small" color="success" variant="outlined" />;
}

function AdminDashboard() {
  const [access, setAccess] = useState({
    loading: true,
    isAdmin: false,
    email: null,
    auth0UserId: null
  });
  const [days, setDays] = useState(7);
  const [overview, setOverview] = useState(null);
  const [insights, setInsights] = useState(null);
  const [usage, setUsage] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadMetrics = useCallback(async (windowDays) => {
    setLoadingMetrics(true);
    setError('');

    try {
      const [overviewRes, insightsRes, usageRes] = await Promise.all([
        adminApi.getOverview(windowDays),
        adminApi.getInsights(windowDays),
        adminApi.getUsage(windowDays)
      ]);

      setOverview(overviewRes.data.overview);
      setInsights(insightsRes.data.insights);
      setUsage(usageRes.data.events || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load admin metrics.');
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const me = await adminApi.getMe();
        if (cancelled) {
          return;
        }

        if (!me.data.isAdmin) {
          setAccess({
            loading: false,
            isAdmin: false,
            email: me.data.email || me.data.claimEmail || null,
            auth0UserId: me.data.auth0UserId || null
          });
          return;
        }

        setAccess({
          loading: false,
          isAdmin: true,
          email: me.data.email || me.data.claimEmail || null,
          auth0UserId: me.data.auth0UserId || null
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Unable to load admin dashboard.');
          setAccess({ loading: false, isAdmin: false });
        }
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (access.isAdmin) {
      loadMetrics(days);
    }
  }, [access.isAdmin, days, loadMetrics]);

  const activity = overview?.activity || {};
  const totals = overview?.totals || {};
  const stravaRate = totals.users
    ? Math.round((totals.stravaConnected / totals.users) * 100)
    : 0;

  const featureTotal = useMemo(
    () => (overview?.usageByEvent || []).reduce((sum, row) => sum + row.count, 0),
    [overview?.usageByEvent]
  );

  const handleRefresh = () => {
    if (access.isAdmin) {
      loadMetrics(days);
    }
  };

  if (access.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!access.isAdmin) {
    return (
      <Box component="main" sx={{ maxWidth: 640, mx: 'auto', pt: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Admin access is not enabled for this account.
          {access.email && (
            <>
              {' '}
              Signed in as <strong>{access.email}</strong>.
            </>
          )}
          {!access.email && ' No email is stored for your profile yet — sign out and sign in again.'}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add that email to <code>ADMIN_EMAILS</code> in <code>.env</code>
          {access.auth0UserId && (
            <>
              {' '}
              or set <code>ADMIN_AUTH0_IDS={access.auth0UserId}</code>
            </>
          )}
          , then restart the backend: <code>sudo docker compose up -d --build backend</code>.
        </Typography>
        <Button component={RouterLink} to="/dashboard" variant="contained">
          Back to dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box component="main">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Chip label="Admin" size="small" color="primary" />
            {access.email && <Chip label={access.email} size="small" variant="outlined" />}
          </Stack>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Admin · Metrics & usage
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
            Application health, API traffic, feature adoption, and error signals for RunAdvisor.
          </Typography>
          {lastRefresh && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
              {overview?.generatedAt && ` · snapshot ${format(parseISO(overview.generatedAt), 'PPp')}`}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tabs
            value={days}
            onChange={(_e, value) => setDays(value)}
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5 } }}
          >
            {WINDOW_OPTIONS.map((option) => (
              <Tab key={option} label={`${option}d`} value={option} />
            ))}
          </Tabs>
          <Tooltip title="Refresh metrics">
            <span>
              <IconButton onClick={handleRefresh} disabled={loadingMetrics} aria-label="Refresh metrics">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {loadingMetrics && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {overview && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard label="Users" value={totals.users} hint={`${activity.newUsers ?? 0} new in ${days}d`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="Activities"
                value={totals.activities}
                hint={`${activity.newActivities ?? 0} logged in ${days}d`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="Strava connected"
                value={totals.stravaConnected}
                hint={`${stravaRate}% of users`}
                accent
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label={`API requests (${days}d)`}
                value={activity.requestsWindow ?? activity.requests7d ?? 0}
                hint={`${activity.requests24h ?? 0} in last 24h`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="Active users"
                value={activity.activeUsers ?? activity.activeUsers7d ?? 0}
                hint={`Distinct in ${days}d`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="Error rate"
                value={`${activity.errorRatePct ?? 0}%`}
                hint={`${activity.clientErrors ?? 0} client · ${activity.serverErrors ?? 0} server`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="Avg latency"
                value={insights ? `${insights.latency.avgMs} ms` : '—'}
                hint={insights ? `Peak ${insights.latency.maxMs} ms` : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                label="Server errors"
                value={insights?.serverErrors7d ?? activity.serverErrors ?? 0}
                hint={`HTTP 5xx in ${days}d`}
              />
            </Grid>
          </Grid>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Daily API traffic
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Stacked requests and error responses per day.
              </Typography>
              <Box sx={{ height: 280 }}>
                {overview.dailySeries?.length ? (
                  <AdminUsageChart dailySeries={overview.dailySeries} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No traffic recorded for this period yet.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <Card variant="outlined" sx={{ height: 1 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Usage by feature ({days}d)
                  </Typography>
                  <Stack spacing={1.5}>
                    {(overview.usageByEvent || []).length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No feature events yet.
                      </Typography>
                    )}
                    {(overview.usageByEvent || []).map((row) => {
                      const share = featureTotal ? Math.round((row.count / featureTotal) * 100) : 0;
                      return (
                        <Box key={row.event}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {formatEventLabel(row.event)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {row.count} · {row.uniqueUsers} users
                              {row.avgDurationMs ? ` · ~${row.avgDurationMs} ms` : ''}
                            </Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={share} sx={{ height: 8, borderRadius: 1 }} />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Card variant="outlined" sx={{ height: 1 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Health & top paths ({days}d)
                  </Typography>
                  {insights && (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {(insights.statusBreakdown || []).map((row) => (
                          <Chip
                            key={row.bucket}
                            label={`${row.bucket}: ${row.count}`}
                            size="small"
                            color={row.bucket === '5xx' ? 'error' : row.bucket === '4xx' ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Top API paths
                      </Typography>
                      {(insights.topPaths || []).slice(0, 8).map((row) => (
                        <Stack key={row.path} direction="row" justifyContent="space-between">
                          <Typography variant="body2" sx={{ wordBreak: 'break-all', pr: 1 }}>
                            {row.path}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {row.count}
                          </Typography>
                        </Stack>
                      ))}
                      {(insights.topPaths || []).length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No path data yet.
                        </Typography>
                      )}
                      <Typography variant="subtitle2" fontWeight={600} sx={{ pt: 1 }}>
                        Slowest requests
                      </Typography>
                      {(insights.slowRequests || []).slice(0, 5).map((row) => (
                        <Stack key={`${row.path}-${row.createdAt}`} spacing={0.25}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {row.method} {row.path}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.durationMs} ms · {row.statusCode} · {formatEventLabel(row.event)}
                          </Typography>
                        </Stack>
                      ))}
                      {(insights.slowRequests || []).length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No slow requests over 2s.
                        </Typography>
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recent usage events
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing {Math.min(usage.length, 50)} of {usage.length}
                </Typography>
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Event</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Path</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usage.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            No events in this window.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {usage.slice(0, 50).map((event) => (
                      <TableRow key={`${event._id}-${event.createdAt}`} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {event.createdAt
                            ? format(parseISO(event.createdAt), 'MMM d HH:mm')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip label={formatEventLabel(event.event)} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{event.method || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 280, wordBreak: 'break-all' }}>
                          {event.path}
                        </TableCell>
                        <TableCell>
                          <StatusChip statusCode={event.statusCode} />
                        </TableCell>
                        <TableCell align="right">
                          {event.durationMs != null ? `${event.durationMs} ms` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

export default AdminDashboard;
