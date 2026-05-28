import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { alpha, useTheme } from '@mui/material/styles';
import { recommendationsApi } from '../services/api';
import WeeklyPlanDayCard from '../components/WeeklyPlanDayCard';
import { StatsChartsGrid } from '../components/analytics/StatsCharts';
import { DAY_LABELS } from '../utils/weeklyPlanShared';
import { formatNumber, formatPaceLabel, formatMetric, formatPaceDeltaSec, TRAINING_METRIC_TOOLTIPS } from '../utils/format';
import { getChartTheme } from '../utils/chartTheme';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';

const WINDOW_OPTIONS = [
  { value: 28, label: 'Last 28 days' },
  { value: 56, label: 'Last 8 weeks' },
  { value: 84, label: 'Last 12 weeks' },
  { value: 120, label: 'Last 4 months' }
];

function fmt(value, suffix = '', digits = 2) {
  return formatMetric(value, null, { digits, fallback: '—' }) === '—'
    ? '—'
    : `${formatNumber(value, { digits })}${suffix}`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return String(value);
  }
}

function reportCardSx(extra = {}) {
  return {
    borderRadius: 4,
    border: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    color: 'text.primary',
    ...extra
  };
}

function StatCard({ label, value, sublabel, tone = 'default', tooltip }) {
  const theme = useTheme();
  const toneStyles = {
    default: {},
    good: {
      bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.14 : 0.1),
      borderColor: alpha(theme.palette.success.main, 0.35)
    },
    warn: {
      bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.14 : 0.12),
      borderColor: alpha(theme.palette.warning.main, 0.35)
    },
    risk: {
      bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.14 : 0.1),
      borderColor: alpha(theme.palette.error.main, 0.35)
    }
  };

  const card = (
    <Box sx={{ ...reportCardSx({ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, minHeight: 110 }), ...toneStyles[tone] }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
        {value}
      </Typography>
      {sublabel ? (
        <Typography variant="caption" color="text.secondary">
          {sublabel}
        </Typography>
      ) : null}
    </Box>
  );

  if (!tooltip) {
    return card;
  }

  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <Box>{card}</Box>
    </Tooltip>
  );
}

function SectionHeader({ number, title, subtitle }) {
  return (
    <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1.5, mt: 3, '@media print': { mt: 2 } }}>
      <Typography variant="h3" color="primary.main" fontWeight={700} lineHeight={1}>
        {number}
      </Typography>
      <Box>
        <Typography variant="h5" fontWeight={700} lineHeight={1.25}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

function acwrTone(acwr) {
  if (acwr > 1.5) return 'risk';
  if (acwr > 1.3) return 'warn';
  if (acwr < 0.8 && acwr > 0) return 'warn';
  if (acwr === 0) return 'default';
  return 'good';
}

function monotonyTone(monotony) {
  if (monotony > 2.0) return 'risk';
  if (monotony > 1.5) return 'warn';
  if (monotony === 0) return 'default';
  return 'good';
}

function readinessChipColor(phase = '') {
  switch (phase.toLowerCase()) {
    case 'recover':
      return 'warning';
    case 'rebuild':
      return 'info';
    case 'taper':
      return 'secondary';
    case 'peak':
      return 'success';
    case 'build':
    default:
      return 'primary';
  }
}

function SplitsTable({ activities }) {
  const theme = useTheme();
  const colors = getChartTheme(theme);

  if (!activities || activities.length === 0) {
    return (
      <Box sx={reportCardSx({ p: 3 })}>
        <Typography variant="body2" color="text.secondary">
          Not enough split data yet. Sync more activities from Strava to see per-kilometre commentary.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {activities.map((a) => (
        <Box key={a.activityId} sx={reportCardSx({ p: 2 })}>
          <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {a.name || 'Unnamed run'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(a.date)} • {fmt(a.distanceKm, ' km', 2)} • {formatPaceLabel(a.avgPaceMinPerKm)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`${a.splitProfile || 'even'} split`}
                color={a.splitProfile === 'negative' ? 'success' : a.splitProfile === 'positive' ? 'warning' : 'default'}
              />
              {a.estimatedRpe ? (
                <Chip size="small" variant="outlined" label={`RPE ${a.estimatedRpe}`} />
              ) : null}
              {a.hrDriftBpm != null ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`HR drift ${a.hrDriftBpm > 0 ? '+' : ''}${a.hrDriftBpm} bpm`}
                />
              ) : null}
            </Stack>
          </Stack>
          {a.comment ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontStyle: 'italic' }}>
              {a.comment}
            </Typography>
          ) : null}
          {Array.isArray(a.splits) && a.splits.length ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ minWidth: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Km', 'Pace', 'HR', 'Δ elev'].map((heading) => (
                      <Box
                        component="th"
                        key={heading}
                        sx={{
                          textAlign: 'left',
                          py: 0.75,
                          pr: 1.5,
                          textTransform: 'uppercase',
                          letterSpacing: 0.6,
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                          fontWeight: 600
                        }}
                      >
                        {heading}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {(a.splits || []).map((s) => {
                    const isFast = a.fastestKm && s.km === a.fastestKm.km;
                    const isSlow = a.slowestKm && s.km === a.slowestKm.km;
                    return (
                      <Box
                        component="tr"
                        key={s.km}
                        sx={{
                          borderTop: 1,
                          borderColor: 'divider',
                          bgcolor: isFast ? colors.successFill : isSlow ? colors.errorFill : 'transparent'
                        }}
                      >
                        <Box component="td" sx={{ py: 0.75, pr: 1.5, fontWeight: 500 }}>{s.km}</Box>
                        <Box component="td" sx={{ py: 0.75, pr: 1.5, fontFamily: 'monospace' }}>{formatPaceLabel(s.pace)}</Box>
                        <Box component="td" sx={{ py: 0.75, pr: 1.5 }}>{s.avgHr ?? '—'}</Box>
                        <Box component="td" sx={{ py: 0.75, pr: 1.5 }}>{s.elevDiffM != null ? `${s.elevDiffM} m` : '—'}</Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Per-km splits not available for this activity.
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

function PaceBandPill({ band }) {
  const theme = useTheme();
  if (!band) {
    return (
      <Typography component="span" variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
        color: theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.info.dark,
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        border: 1,
        borderColor: alpha(theme.palette.info.main, 0.35)
      }}
    >
      {formatPaceLabel(band.lowerMinPerKm)} – {formatPaceLabel(band.upperMinPerKm)}
    </Box>
  );
}

function NextSessionCard({ next }) {
  const theme = useTheme();
  if (!next) {
    return null;
  }
  return (
    <Box
      sx={{
        ...reportCardSx({ p: 2.5 }),
        borderColor: alpha(theme.palette.warning.main, 0.4),
        bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)
      }}
    >
      <Typography variant="caption" color="warning.main" sx={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, display: 'block', mb: 0.5 }}>
        Next session detail
      </Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        {next.title}
      </Typography>
      {next.objective ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {next.objective}
        </Typography>
      ) : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {['warmup', 'mainSet', 'cooldown'].map((key) => {
          const block = next[key];
          if (!block) return null;
          const labelMap = { warmup: 'Warm-up', mainSet: 'Main set', cooldown: 'Cool-down' };
          return (
            <Box
              key={key}
              sx={{
                borderRadius: 3,
                bgcolor: 'background.paper',
                p: 1.5,
                border: 1,
                borderColor: alpha(theme.palette.warning.main, 0.35)
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                {labelMap[key]}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {block.durationMinutes || 0} min
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {block.description}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <PaceBandPill band={block.targetPace} />
                {block.hrZone ? <Chip size="small" label={block.hrZone} variant="outlined" /> : null}
                {block.rpe ? <Chip size="small" color="warning" label={`RPE ${block.rpe}`} /> : null}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function FourWeekOutlook({ outlook }) {
  if (!outlook || outlook.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
      {outlook.map((week) => (
        <Box key={week.week} sx={reportCardSx({ p: 2 })}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
            Week {week.week}
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
            {week.focus}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {fmt(week.volumeKm, ' km')} • {week.qualitySessions || 0} quality
          </Typography>
          {week.notes ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {week.notes}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

function ParagraphCard({ children }) {
  return (
    <Box sx={reportCardSx({ p: 2.5 })}>
      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
        {children}
      </Typography>
    </Box>
  );
}

function TrainingReport() {
  const { profile } = useRunAdvisorProfile();
  const [windowDays, setWindowDays] = useState(84);
  const [report, setReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const loadLatest = useCallback(async () => {
    try {
      setError('');
      const res = await recommendationsApi.getLatestReport();
      if (res.data?.report) {
        setReport(res.data.report);
        setAnalytics(res.data.analytics);
        setGeneratedAt(res.data.generatedAt);
        setSource(res.data.source || res.data.report?.source || '');
        if (res.data.windowDays) {
          setWindowDays(res.data.windowDays);
        }
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || err.message || 'Failed to load latest report.');
      }
    }
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await recommendationsApi.generateReport({ windowDays });
      if (res.data?.report) {
        setReport(res.data.report);
        setAnalytics(res.data.analytics);
        setGeneratedAt(res.data.generatedAt);
        setSource(res.data.report?.source || '');
      } else {
        setReport(null);
        setAnalytics(res.data?.analytics || null);
        setInfo(res.data?.message || 'No report generated.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const load = useMemo(() => analytics?.trainingLoad || {}, [analytics]);
  const volume = useMemo(() => analytics?.volume || {}, [analytics]);
  const trends = useMemo(() => analytics?.trends || {}, [analytics]);
  const exec = report?.executiveSummary;

  return (
    <Box className="training-report-page" sx={{ maxWidth: 1152, mx: 'auto', px: 2, pb: 5 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .training-report-page { max-width: none !important; padding: 0 !important; }
          .print-break { page-break-before: always; }
          .training-report-page,
          .training-report-page * {
            color: #1f1b16 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .training-report-page .MuiBox-root,
          .training-report-page .MuiPaper-root {
            background: #ffffff !important;
            border-color: #e2e8f0 !important;
          }
        }
      `}</style>

      <Box className="no-print" sx={{ mb: 2 }}>
        <Paper elevation={0} sx={reportCardSx({ p: 2, bgcolor: 'background.surfaceVariant' })}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                Training Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Coach-style report with statistical analytics and a day-by-day plan, grounded in your real Strava history.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <TextField
                select
                size="small"
                label="Window"
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                sx={{ minWidth: 160 }}
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerate}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {loading ? 'Generating…' : 'Generate new report'}
              </Button>
              <Button variant="outlined" onClick={handlePrint} disabled={!report}>
                Download PDF
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print">
          {error}
        </Alert>
      ) : null}
      {info ? (
        <Alert severity="info" sx={{ mb: 2 }} className="no-print">
          {info}
        </Alert>
      ) : null}

      {!report && !loading && !analytics ? (
        <Paper elevation={0} sx={reportCardSx({ p: 4, textAlign: 'center' })}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            No report yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate your first professional training report using your most recent Strava activities.
          </Typography>
        </Paper>
      ) : null}

      {report ? (
        <Box>
          <Box sx={reportCardSx({ p: 3, mb: 2 })}>
            <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="baseline" spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Coach report • {windowDays}-day window
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  {exec?.headline || 'Training report'}
                </Typography>
                {exec?.goalRace ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Goal race: {exec.goalRace}
                  </Typography>
                ) : null}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {exec?.readinessPhase ? (
                  <Chip
                    label={`Phase: ${exec.readinessPhase}`}
                    color={readinessChipColor(exec.readinessPhase)}
                  />
                ) : null}
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Generated ${formatDate(generatedAt || report.generatedAt)}`}
                />
                {source ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={source === 'openai' ? 'AI-generated' : source === 'fallback' ? 'Rule-based (no OpenAI key)' : `Source: ${source}`}
                  />
                ) : null}
              </Stack>
            </Stack>
            {exec?.paragraph ? (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
                {exec.paragraph}
              </Typography>
            ) : null}
          </Box>

          {analytics ? (
            <Container maxWidth="lg" disableGutters sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2, fontWeight: 700, display: 'block', mb: 1.5 }}>
                Analytics overview
              </Typography>
              <StatsChartsGrid analytics={analytics} />
            </Container>
          ) : null}

          <SectionHeader number="01" title="Workload Analysis" subtitle="Acute load, ACWR, monotony & strain" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 1.5 }}>
            <StatCard
              label="Weekly load (TRIMP)"
              value={fmt(load.weeklyLoad, '', 0)}
              sublabel={`vs ${fmt(trends.previousWeekLoad, '', 0)} last week`}
              tooltip={TRAINING_METRIC_TOOLTIPS.weeklyLoad}
            />
            <StatCard
              label="ACWR (7d : 28d)"
              value={fmt(load.acwr, '', 2)}
              tone={acwrTone(load.acwr)}
              tooltip="Acute (7d) load divided by chronic (28d weekly avg) load. 0.8–1.3 is the typical safe zone."
              sublabel={load.acwr > 1.5 ? 'Overload risk' : load.acwr < 0.8 ? 'Conservative' : 'Healthy build zone'}
            />
            <StatCard
              label="Monotony"
              value={fmt(load.monotony, '', 2)}
              tone={monotonyTone(load.monotony)}
              tooltip="Mean daily load ÷ stdev. > 2 suggests fatigue accumulation."
              sublabel={load.monotony > 2 ? 'Add a true rest day' : 'Sustainable variation'}
            />
            <StatCard
              label="Strain"
              value={fmt(load.strain, '', 0)}
              sublabel="Weekly load × monotony"
              tooltip={TRAINING_METRIC_TOOLTIPS.strain}
            />
          </Box>
          <ParagraphCard>{report.workloadAnalysis?.paragraph || '—'}</ParagraphCard>
          {Array.isArray(report.workloadAnalysis?.flags) && report.workloadAnalysis.flags.length ? (
            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap sx={{ mt: 1.5 }}>
              {report.workloadAnalysis.flags.map((flag, idx) => (
                <Chip key={idx} label={flag} color="warning" variant="outlined" />
              ))}
            </Stack>
          ) : null}
          <SectionHeader number="02" title="Pace & Effort Analysis" subtitle="Intensity distribution and effort pattern" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 1.5 }}>
            <StatCard
              label="Average pace"
              value={formatPaceLabel(analytics?.pace?.avgPaceMinPerKm)}
              sublabel={
                formatPaceDeltaSec(trends.paceDeltaSecPerKmWoW) ||
                `${fmt(volume.totalDistanceKm, ' km')} over ${analytics?.window?.activityCount || 0} runs`
              }
              tooltip={TRAINING_METRIC_TOOLTIPS.avgPace}
            />
            <StatCard label="Fastest pace" value={formatPaceLabel(analytics?.pace?.fastestPaceMinPerKm)} />
            <StatCard
              label="Avg heart rate"
              value={analytics?.heartRate?.avgHeartRate ? `${analytics.heartRate.avgHeartRate} bpm` : '—'}
              sublabel={analytics?.dataQuality?.hasHeartRate ? 'Live HR data' : 'No HR data — using pace proxy'}
            />
            <StatCard label="Total elevation" value={`${fmt(volume.totalElevationM, ' m', 0)}`} />
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <ParagraphCard>
              {report.paceEffortAnalysis?.paragraph || '—'}
              {report.paceEffortAnalysis?.intensityComment ? (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  <Box component="span" fontWeight={600}>Coach note: </Box>
                  {report.paceEffortAnalysis.intensityComment}
                </Typography>
              ) : null}
            </ParagraphCard>
          </Box>

          <SectionHeader number="03" title="Split Analysis" subtitle="Per-activity pacing, HR drift, and effort" />
          <ParagraphCard>{report.splitAnalysis?.paragraph || '—'}</ParagraphCard>
          <Box sx={{ mt: 1.5 }}>
            <SplitsTable activities={report.splitAnalysis?.activities || analytics?.perActivity || []} />
          </Box>

          <SectionHeader number="04" title="Risk & Recovery" subtitle="Injury risk and recovery checklist" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 1.5, mb: 1.5 }}>
            <Box>
              <ParagraphCard>{report.riskAndRecovery?.paragraph || '—'}</ParagraphCard>
            </Box>
            <Box sx={reportCardSx({ p: 2.5 })}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', mb: 0.5 }}>
                Injury risk
              </Typography>
              <Chip
                label={(report.riskAndRecovery?.injuryRiskLevel || 'low').toUpperCase()}
                color={
                  report.riskAndRecovery?.injuryRiskLevel === 'high'
                    ? 'error'
                    : report.riskAndRecovery?.injuryRiskLevel === 'moderate'
                    ? 'warning'
                    : 'success'
                }
                sx={{ fontWeight: 700 }}
              />
              {Array.isArray(report.riskAndRecovery?.recoveryActions) ? (
                <Box component="ul" sx={{ mt: 1.5, pl: 2, m: 0 }}>
                  {report.riskAndRecovery.recoveryActions.map((action, idx) => (
                    <Typography component="li" variant="body2" color="text.secondary" key={idx} sx={{ mb: 0.5 }}>
                      {action}
                    </Typography>
                  ))}
                </Box>
              ) : null}
            </Box>
          </Box>

          <SectionHeader number="05" title="Training Plan Timeline" subtitle="Day-by-day plan for the next 7 days" />
          <Box sx={reportCardSx({ p: 2.5 })}>
            <Box sx={{ position: 'relative' }}>
              {(report.weeklyPlan || []).map((d, idx) => (
                <WeeklyPlanDayCard
                  key={d.day || idx}
                  day={d}
                  dayIndex={idx}
                  dayLabel={DAY_LABELS[idx % 7]}
                  planStartDate={generatedAt || report.generatedAt}
                  nextSessionDetail={idx === 0 ? report.nextSessionDetail : null}
                  stravaConnected={Boolean(profile?.stravaId)}
                  variant="timeline"
                />
              ))}
            </Box>
          </Box>

          <SectionHeader number="06" title="Next Session Detail" subtitle="Warm-up, main set, cool-down" />
          <NextSessionCard next={report.nextSessionDetail} />

          <SectionHeader number="07" title="4-Week Outlook" subtitle="Month-long progression strategy" />
          <FourWeekOutlook outlook={report.fourWeekOutlook} />

          <Box sx={{ mt: 4, '@media print': { mt: 6 } }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              Report generated {formatDate(generatedAt || report.generatedAt)} • Window: {windowDays} days • Activities analyzed: {analytics?.window?.activityCount || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Heart-rate zones, ACWR thresholds, and RPE estimates use industry-standard defaults. When HR is missing, intensity is estimated from pace relative to your recent average.
            </Typography>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export default TrainingReport;
