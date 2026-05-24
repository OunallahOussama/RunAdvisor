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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Legend,
  Tooltip as ChartTooltip
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { recommendationsApi } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Legend,
  ChartTooltip
);

const WINDOW_OPTIONS = [
  { value: 28, label: 'Last 28 days' },
  { value: 56, label: 'Last 8 weeks' },
  { value: 84, label: 'Last 12 weeks' },
  { value: 120, label: 'Last 4 months' }
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function paceLabel(minPerKm) {
  const v = Number(minPerKm);
  if (!Number.isFinite(v) || v <= 0) {
    return '—';
  }
  const mins = Math.floor(v);
  const secs = Math.round((v - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function fmt(value, suffix = '', digits = 1) {
  const v = Number(value);
  if (!Number.isFinite(v)) {
    return '—';
  }
  return `${v.toFixed(digits).replace(/\.0+$/, '')}${suffix}`;
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

function StatCard({ label, value, sublabel, tone = 'default', tooltip }) {
  const toneStyles = {
    default: 'bg-white border-slate-200',
    good: 'bg-emerald-50 border-emerald-200',
    warn: 'bg-amber-50 border-amber-200',
    risk: 'bg-rose-50 border-rose-200'
  };

  const card = (
    <div className={`rounded-2xl border ${toneStyles[tone] || toneStyles.default} p-4 flex flex-col gap-1 min-h-[110px]`}>
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
      {sublabel ? <div className="text-xs text-slate-500">{sublabel}</div> : null}
    </div>
  );

  if (!tooltip) {
    return card;
  }

  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <div>{card}</div>
    </Tooltip>
  );
}

function SectionHeader({ number, title, subtitle }) {
  return (
    <div className="flex items-baseline gap-3 mb-3 mt-6 print:mt-4">
      <div className="text-3xl font-bold text-orange-500 leading-none">{number}</div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">{title}</h2>
        {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function ChartCard({ children, height = 280 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div style={{ height }}>{children}</div>
    </div>
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

function WeeklyLoadChart({ series }) {
  const data = {
    labels: series.map((s) => s.label),
    datasets: [
      {
        type: 'bar',
        label: 'Weekly load',
        data: series.map((s) => s.load),
        backgroundColor: 'rgba(249, 115, 22, 0.5)',
        borderColor: '#f97316',
        borderWidth: 1,
        yAxisID: 'load'
      },
      {
        type: 'line',
        label: 'Distance (km)',
        data: series.map((s) => s.totalDistanceKm),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.18)',
        fill: false,
        tension: 0.35,
        yAxisID: 'distance'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom' } },
    scales: {
      load: {
        position: 'left',
        title: { display: true, text: 'Load (TRIMP)' },
        beginAtZero: true
      },
      distance: {
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Distance (km)' },
        beginAtZero: true
      }
    }
  };

  return <Bar data={data} options={options} />;
}

function IntensityDistributionChart({ pct }) {
  const data = {
    labels: ['Easy', 'Tempo', 'Threshold', 'VO2'],
    datasets: [
      {
        label: 'Time in zone (%)',
        data: [pct.easy || 0, pct.tempo || 0, pct.threshold || 0, pct.vo2 || 0],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#7c3aed']
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } } }
  };

  return <Bar data={data} options={options} />;
}

function PaceTrendChart({ activities }) {
  const sorted = [...(activities || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const data = {
    labels: sorted.map((a) => formatDate(a.date)),
    datasets: [
      {
        label: 'Avg pace (min/km)',
        data: sorted.map((a) => a.avgPaceMinPerKm),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        reverse: true,
        title: { display: true, text: 'min/km' }
      }
    }
  };

  return <Line data={data} options={options} />;
}

function SplitsTable({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Not enough split data yet. Sync more activities from Strava to see per-kilometre commentary.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((a) => (
        <div key={a.activityId} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <div>
              <div className="text-base font-semibold text-slate-900">{a.name || 'Unnamed run'}</div>
              <div className="text-xs text-slate-500">{formatDate(a.date)} • {fmt(a.distanceKm, ' km', 2)} • {paceLabel(a.avgPaceMinPerKm)}</div>
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </div>
          {a.comment ? (
            <div className="text-sm text-slate-700 mb-3 italic">{a.comment}</div>
          ) : null}
          {Array.isArray(a.splits) && a.splits.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="text-left py-1.5 pr-3">Km</th>
                    <th className="text-left py-1.5 pr-3">Pace</th>
                    <th className="text-left py-1.5 pr-3">HR</th>
                    <th className="text-left py-1.5 pr-3">Δ elev</th>
                  </tr>
                </thead>
                <tbody>
                  {(a.splits || []).map((s) => {
                    const isFast = a.fastestKm && s.km === a.fastestKm.km;
                    const isSlow = a.slowestKm && s.km === a.slowestKm.km;
                    return (
                      <tr
                        key={s.km}
                        className={`border-t border-slate-100 ${isFast ? 'bg-emerald-50' : ''} ${isSlow ? 'bg-rose-50' : ''}`}
                      >
                        <td className="py-1.5 pr-3 font-medium">{s.km}</td>
                        <td className="py-1.5 pr-3 font-mono">{paceLabel(s.pace)}</td>
                        <td className="py-1.5 pr-3">{s.avgHr ?? '—'}</td>
                        <td className="py-1.5 pr-3">{s.elevDiffM != null ? `${s.elevDiffM} m` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Per-km splits not available for this activity.</div>
          )}
        </div>
      ))}
    </div>
  );
}

function PaceBandPill({ band }) {
  if (!band) {
    return <span className="text-slate-500">—</span>;
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-mono border border-sky-200">
      {paceLabel(band.lowerMinPerKm)} – {paceLabel(band.upperMinPerKm)}
    </span>
  );
}

function NextSessionCard({ next }) {
  if (!next) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
      <div className="text-xs uppercase tracking-wide text-orange-700 font-semibold mb-1">Next session detail</div>
      <div className="text-xl font-bold text-slate-900 mb-1">{next.title}</div>
      {next.objective ? (
        <div className="text-sm text-slate-700 mb-3">{next.objective}</div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['warmup', 'mainSet', 'cooldown'].map((key) => {
          const block = next[key];
          if (!block) return null;
          const labelMap = { warmup: 'Warm-up', mainSet: 'Main set', cooldown: 'Cool-down' };
          return (
            <div key={key} className="rounded-xl bg-white p-3 border border-orange-200">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{labelMap[key]}</div>
              <div className="text-sm font-semibold mb-1">{block.durationMinutes || 0} min</div>
              <div className="text-sm text-slate-700 mb-2">{block.description}</div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <PaceBandPill band={block.targetPace} />
                {block.hrZone ? <Chip size="small" label={block.hrZone} variant="outlined" /> : null}
                {block.rpe ? <Chip size="small" color="warning" label={`RPE ${block.rpe}`} /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineDay({ day, dayLabel }) {
  if (!day) return null;
  const sessionEmoji = {
    easy_run: 'EASY',
    long_run: 'LONG',
    tempo: 'TEMPO',
    threshold: 'THRES',
    intervals: 'INT',
    rest_or_xt: 'REST',
    race_pace: 'RACE',
    fartlek: 'FART'
  };

  const isRest = day.sessionType === 'rest_or_xt';

  return (
    <div className={`relative pl-10 pb-5 ${isRest ? 'opacity-80' : ''}`}>
      <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
        {dayLabel}
      </div>
      <div className="absolute left-3.5 top-8 bottom-0 w-px bg-orange-200" />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <div>
            <div className="text-base font-semibold text-slate-900">{day.title}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">{sessionEmoji[day.sessionType] || day.sessionType}</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Chip size="small" variant="outlined" label={`${day.durationMinutes || 0} min`} />
            {day.distanceKm ? (
              <Chip size="small" variant="outlined" label={`${fmt(day.distanceKm, ' km', 1)}`} />
            ) : null}
            {day.rpe ? <Chip size="small" color="warning" label={`RPE ${day.rpe}`} /> : null}
          </div>
        </div>
        {day.description ? (
          <div className="text-sm text-slate-700 mb-2">{day.description}</div>
        ) : null}
        <PaceBandPill band={day.targetPace} />
      </div>
    </div>
  );
}

function FourWeekOutlook({ outlook }) {
  if (!outlook || outlook.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {outlook.map((week) => (
        <div key={week.week} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Week {week.week}</div>
          <div className="text-base font-bold text-slate-900 mb-1">{week.focus}</div>
          <div className="text-sm text-slate-700">{fmt(week.volumeKm, ' km', 1)} • {week.qualitySessions || 0} quality</div>
          {week.notes ? <div className="text-xs text-slate-500 mt-2">{week.notes}</div> : null}
        </div>
      ))}
    </div>
  );
}

function ParagraphCard({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-800">
      {children}
    </div>
  );
}

function TrainingReport() {
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

  const intensity = useMemo(() => analytics?.intensityDistribution || {}, [analytics]);
  const load = useMemo(() => analytics?.trainingLoad || {}, [analytics]);
  const volume = useMemo(() => analytics?.volume || {}, [analytics]);
  const trends = useMemo(() => analytics?.trends || {}, [analytics]);
  const exec = report?.executiveSummary;

  return (
    <Box className="training-report-page max-w-6xl mx-auto px-4 pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .training-report-page { max-width: none !important; padding: 0 !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="no-print mb-4">
        <Paper elevation={0} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            <div className="flex-1">
              <Typography variant="h5" fontWeight={800}>
                Training Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Coach-style report with statistical analytics and a day-by-day plan, grounded in your real Strava history.
              </Typography>
            </div>
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
      </div>

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
        <Paper elevation={0} className="p-8 rounded-2xl border border-slate-200 bg-white text-center">
          <Typography variant="h6" fontWeight={700} className="mb-2">
            No report yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate your first professional training report using your most recent Strava activities.
          </Typography>
        </Paper>
      ) : null}

      {report ? (
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">
                  Coach report • {windowDays}-day window
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {exec?.headline || 'Training report'}
                </h1>
                {exec?.goalRace ? (
                  <div className="text-sm text-slate-600 mt-1">Goal race: {exec.goalRace}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
              </div>
            </div>
            {exec?.paragraph ? (
              <p className="text-base text-slate-700 mt-3 leading-relaxed">{exec.paragraph}</p>
            ) : null}
          </div>

          <SectionHeader number="01" title="Workload Analysis" subtitle="Acute load, ACWR, monotony & strain" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard
              label="Weekly load (TRIMP)"
              value={fmt(load.weeklyLoad, '', 0)}
              sublabel={`vs ${fmt(trends.previousWeekLoad, '', 0)} last week`}
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
            />
          </div>
          <ParagraphCard>{report.workloadAnalysis?.paragraph || '—'}</ParagraphCard>
          {Array.isArray(report.workloadAnalysis?.flags) && report.workloadAnalysis.flags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {report.workloadAnalysis.flags.map((flag, idx) => (
                <Chip key={idx} label={flag} color="warning" variant="outlined" />
              ))}
            </div>
          ) : null}
          <div className="mt-4">
            {analytics?.weeklyLoadSeries?.length ? (
              <ChartCard height={260}>
                <WeeklyLoadChart series={analytics.weeklyLoadSeries} />
              </ChartCard>
            ) : null}
          </div>

          <SectionHeader number="02" title="Pace & Effort Analysis" subtitle="Intensity distribution and effort pattern" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatCard
              label="Average pace"
              value={paceLabel(analytics?.pace?.avgPaceMinPerKm)}
              sublabel={`${fmt(volume.totalDistanceKm, ' km', 1)} over ${analytics?.window?.activityCount || 0} runs`}
            />
            <StatCard label="Fastest pace" value={paceLabel(analytics?.pace?.fastestPaceMinPerKm)} />
            <StatCard
              label="Avg heart rate"
              value={analytics?.heartRate?.avgHeartRate ? `${analytics.heartRate.avgHeartRate} bpm` : '—'}
              sublabel={analytics?.dataQuality?.hasHeartRate ? 'Live HR data' : 'No HR data — using pace proxy'}
            />
            <StatCard label="Total elevation" value={`${fmt(volume.totalElevationM, ' m', 0)}`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ChartCard height={240}>
              <IntensityDistributionChart pct={intensity} />
            </ChartCard>
            <ChartCard height={240}>
              <PaceTrendChart activities={analytics?.perActivity || []} />
            </ChartCard>
          </div>
          <div className="mt-3">
            <ParagraphCard>
              {report.paceEffortAnalysis?.paragraph || '—'}
              {report.paceEffortAnalysis?.intensityComment ? (
                <span className="block mt-2 text-slate-700">
                  <span className="font-semibold">Coach note: </span>
                  {report.paceEffortAnalysis.intensityComment}
                </span>
              ) : null}
            </ParagraphCard>
          </div>

          <SectionHeader number="03" title="Split Analysis" subtitle="Per-activity pacing, HR drift, and effort" />
          <ParagraphCard>{report.splitAnalysis?.paragraph || '—'}</ParagraphCard>
          <div className="mt-3">
            <SplitsTable activities={report.splitAnalysis?.activities || analytics?.perActivity || []} />
          </div>

          <SectionHeader number="04" title="Risk & Recovery" subtitle="Injury risk and recovery checklist" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <ParagraphCard>{report.riskAndRecovery?.paragraph || '—'}</ParagraphCard>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1 font-semibold">Injury risk</div>
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
                <ul className="mt-3 space-y-1 text-sm text-slate-700 list-disc list-inside">
                  {report.riskAndRecovery.recoveryActions.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <SectionHeader number="05" title="Training Plan Timeline" subtitle="Day-by-day plan for the next 7 days" />
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="relative">
              {(report.weeklyPlan || []).map((d, idx) => (
                <TimelineDay key={d.day || idx} day={d} dayLabel={DAY_LABELS[idx % 7]} />
              ))}
            </div>
          </div>

          <SectionHeader number="06" title="Next Session Detail" subtitle="Warm-up, main set, cool-down" />
          <NextSessionCard next={report.nextSessionDetail} />

          <SectionHeader number="07" title="4-Week Outlook" subtitle="Month-long progression strategy" />
          <FourWeekOutlook outlook={report.fourWeekOutlook} />

          <div className="mt-8 text-xs text-slate-500 print:mt-12">
            <Divider sx={{ mb: 2 }} />
            <div>Report generated {formatDate(generatedAt || report.generatedAt)} • Window: {windowDays} days • Activities analyzed: {analytics?.window?.activityCount || 0}</div>
            <div className="mt-1">Heart-rate zones, ACWR thresholds, and RPE estimates use industry-standard defaults. When HR is missing, intensity is estimated from pace relative to your recent average.</div>
          </div>
        </div>
      ) : null}
    </Box>
  );
}

export default TrainingReport;
