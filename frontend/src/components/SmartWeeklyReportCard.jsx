import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  ActivityIcon,
  BoltIcon,
  CoachIcon,
  DistanceIcon,
  PaceIcon,
  RecoveryIcon,
  SyncIcon,
  TargetIcon,
  TrendIcon
} from './icons';
import { WeeklyPlanGrid } from './WeeklyPlanDayCard';

const WINDOW_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 28, label: 'Last 28 days' },
  { value: 56, label: 'Last 8 weeks' },
  { value: 84, label: 'Last 12 weeks' }
];

const READINESS_CHIP_COLOR = {
  build: 'primary',
  recover: 'warning',
  rebuild: 'info',
  taper: 'secondary',
  peak: 'success'
};

function formatPaceLabel(minPerKm) {
  const value = Number(minPerKm);
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const mins = Math.floor(value);
  const secs = Math.round((value - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function formatNumber(value, { digits = 1, suffix = '' } = {}) {
  const v = Number(value);
  if (!Number.isFinite(v)) {
    return '—';
  }
  const fixed = v.toFixed(digits).replace(/\.0+$/, '');
  return `${fixed}${suffix}`;
}

function relativeTimeFromNow(value) {
  if (!value) {
    return null;
  }
  try {
    const diffMs = Date.now() - new Date(value).getTime();
    if (Number.isNaN(diffMs)) {
      return null;
    }
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `${hours} hr ago`;
    }
    const days = Math.round(hours / 24);
    return `${days} d ago`;
  } catch (e) {
    return null;
  }
}

function readinessChipColor(phase = '') {
  return READINESS_CHIP_COLOR[String(phase).toLowerCase()] || 'default';
}

function StatTile({ label, value, sublabel, icon: Icon, accent }) {
  return (
    <Card
      variant="outlined"
      sx={{
        bgcolor: accent
          ? 'primary.main'
          : 'action.hover',
        color: accent ? 'primary.contrastText' : 'text.primary',
        minHeight: 96
      }}
    >
      <CardContent sx={{ pb: '12px !important', py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontWeight: 600,
                color: accent ? 'primary.contrastText' : 'text.secondary',
                opacity: accent ? 0.85 : 1
              }}
            >
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ mt: 0.25, lineHeight: 1.15 }}>
              {value}
            </Typography>
            {sublabel ? (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0.25,
                  color: accent ? 'primary.contrastText' : 'text.secondary',
                  opacity: accent ? 0.85 : 1
                }}
              >
                {sublabel}
              </Typography>
            ) : null}
          </Box>
          {Icon ? (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: accent ? 'rgba(255,255,255,0.18)' : 'background.paper',
                color: accent ? 'primary.contrastText' : 'primary.main',
                border: accent ? 'none' : 1,
                borderColor: 'divider'
              }}
            >
              <Icon size={16} />
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function NextSessionMini({ next }) {
  if (!next || !next.title) {
    return null;
  }
  const target = next.mainSet?.targetPace?.label || next.warmup?.targetPace?.label || null;
  const rpe = next.mainSet?.rpe || null;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: 'warning.main',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.warning.main, 0.12)
            : alpha(theme.palette.warning.main, 0.14)
      }}
    >
      <CardContent sx={{ py: 1.75, pb: '14px !important' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <BoltIcon size={14} />
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
          >
            Next session
          </Typography>
        </Stack>
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {next.title}
        </Typography>
        {next.objective ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {next.objective}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {next.durationMinutes ? (
            <Chip size="small" variant="outlined" label={`${next.durationMinutes} min`} />
          ) : null}
          {target ? <Chip size="small" variant="outlined" label={target} /> : null}
          {rpe ? <Chip size="small" color="warning" label={`RPE ${rpe}`} /> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Box sx={{ mt: 2 }} data-testid="weekly-summary-loading">
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Skeleton variant="rounded" height={32} width={140} />
        <Skeleton variant="rounded" height={32} width={110} />
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={96} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={72} sx={{ mt: 2 }} />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ flex: 1 }} />
        ))}
      </Stack>
    </Box>
  );
}

function SmartWeeklyReportCard({
  data,
  loading,
  error,
  windowDays = 7,
  onWindowChange,
  onRefresh,
  refreshing = false,
  stravaConnected = false
}) {
  const analytics = data?.analytics || null;
  const report = data?.report || null;
  const exec = report?.executiveSummary;
  const load = analytics?.trainingLoad || {};
  const volume = analytics?.volume || {};
  const pace = analytics?.pace || {};
  const phase = exec?.readinessPhase;
  const fromCache = Boolean(data?.fromCache);
  const generatedRel = relativeTimeFromNow(data?.generatedAt);
  const source = data?.source;

  const acwrValue = Number(load.acwr || 0);
  const hasAcwr = Number.isFinite(acwrValue) && acwrValue > 0;

  const stats = [
    {
      label: 'Distance',
      value: formatNumber(volume.totalDistanceKm, { digits: 1, suffix: ' km' }),
      sublabel: volume.runsPerWeek ? `${formatNumber(volume.runsPerWeek)} runs/wk` : null,
      icon: DistanceIcon,
      accent: true
    },
    {
      label: 'Sessions',
      value: String(analytics?.window?.activityCount ?? '—'),
      sublabel: volume.longestRunKm
        ? `Longest ${formatNumber(volume.longestRunKm, { digits: 1, suffix: ' km' })}`
        : null,
      icon: ActivityIcon
    },
    {
      label: 'Avg pace',
      value: formatPaceLabel(pace.avgPaceMinPerKm),
      sublabel: pace.fastestPaceMinPerKm
        ? `Fastest ${formatPaceLabel(pace.fastestPaceMinPerKm)}`
        : null,
      icon: PaceIcon
    },
    hasAcwr
      ? {
          label: 'ACWR',
          value: formatNumber(load.acwr, { digits: 2 }),
          sublabel:
            load.acwr > 1.5
              ? 'Overload risk'
              : load.acwr < 0.8
                ? 'Conservative'
                : 'Healthy zone',
          icon: TrendIcon
        }
      : {
          label: 'Weekly load',
          value: formatNumber(load.weeklyLoad, { digits: 0 }) || '0',
          sublabel: load.monotony ? `Monotony ${formatNumber(load.monotony, { digits: 2 })}` : null,
          icon: TrendIcon
        }
  ];

  const isEmpty =
    !loading &&
    !error &&
    (!analytics || analytics?.window?.activityCount === 0);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ sm: 'flex-start' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Chip color="primary" icon={<CoachIcon size={14} />} label="Smart weekly summary" size="small" />
              {phase ? (
                <Chip
                  data-testid="readiness-phase-chip"
                  size="small"
                  color={readinessChipColor(phase)}
                  label={`Phase: ${phase}`}
                />
              ) : null}
              {source ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    source === 'openai'
                      ? 'AI-generated'
                      : source === 'fallback'
                        ? 'Rule-based'
                        : source === 'fallback_error'
                          ? 'Fallback (AI error)'
                          : source
                  }
                />
              ) : null}
              {fromCache ? (
                <Chip size="small" variant="outlined" label="Cached" />
              ) : null}
              {generatedRel ? (
                <Typography variant="caption" color="text.secondary">
                  Updated {generatedRel}
                </Typography>
              ) : null}
            </Stack>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 1, lineHeight: 1.2 }}>
              {exec?.headline || (loading ? 'Generating your weekly report…' : 'Smart weekly summary')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Real analytics + coach-style narrative, generated from your recent training.
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ flexShrink: 0 }}
          >
            {onWindowChange ? (
              <TextField
                select
                size="small"
                label="Window"
                value={windowDays}
                onChange={(e) => onWindowChange(Number(e.target.value))}
                disabled={loading || refreshing}
                sx={{ minWidth: 150 }}
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {onRefresh ? (
              <Tooltip arrow title={refreshing ? 'Refreshing…' : 'Refresh (bypass cache)'}>
                <span>
                  <IconButton
                    aria-label="refresh weekly summary"
                    onClick={onRefresh}
                    disabled={loading || refreshing}
                    size="small"
                  >
                    {refreshing ? <CircularProgress size={16} /> : <SyncIcon size={16} />}
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
            <Button
              component={RouterLink}
              to={`/training-report?windowDays=${windowDays}`}
              variant="contained"
              startIcon={<CoachIcon size={16} />}
            >
              View full report
            </Button>
          </Stack>
        </Stack>

        {error ? (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            action={
              onRefresh ? (
                <Button color="inherit" size="small" onClick={onRefresh}>
                  Retry
                </Button>
              ) : null
            }
          >
            {error}
          </Alert>
        ) : null}

        {loading && !data ? (
          <LoadingSkeleton />
        ) : isEmpty ? (
          <Alert
            icon={<SyncIcon size={18} />}
            severity="info"
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" size="small" component={RouterLink} to="/strava-connect">
                Connect Strava
              </Button>
            }
          >
            No activities in the last {data?.windowDays || windowDays} day(s). Connect Strava or log a few runs to
            unlock your weekly report.
          </Alert>
        ) : data ? (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }
              }}
            >
              {stats.map((s) => (
                <StatTile
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  sublabel={s.sublabel}
                  icon={s.icon}
                  accent={s.accent}
                />
              ))}
            </Box>

            {exec?.paragraph ? (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  borderLeft: 4,
                  borderColor: 'primary.main'
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  {exec.paragraph}
                </Typography>
              </Box>
            ) : null}

            {Array.isArray(report?.workloadAnalysis?.flags) && report.workloadAnalysis.flags.length > 0 ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {report.workloadAnalysis.flags.map((flag) => (
                  <Chip
                    key={flag}
                    size="small"
                    color="warning"
                    variant="outlined"
                    icon={<RecoveryIcon size={14} />}
                    label={flag}
                  />
                ))}
              </Stack>
            ) : null}

            <NextSessionMini next={report?.nextSessionDetail} />

            <WeeklyPlanGrid
              weeklyPlan={report?.weeklyPlan}
              planStartDate={data?.generatedAt || report?.generatedAt}
              nextSessionDetail={report?.nextSessionDetail}
              stravaConnected={stravaConnected}
            />

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="flex-end"
              sx={{ pt: 0.5 }}
            >
              <Button
                component={RouterLink}
                to={`/training-report?windowDays=${windowDays}`}
                size="small"
                variant="text"
                startIcon={<TargetIcon size={14} />}
              >
                Open full Training Report →
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default SmartWeeklyReportCard;
