import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip as ChartTooltip
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  DAY_LABELS,
  formatNumber,
  formatPaceLabel,
  sessionTheme
} from '../../utils/weeklyPlanShared';
import { getChartTheme } from '../../utils/chartTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip);

const READINESS_CHIP_COLOR = {
  build: 'primary',
  recover: 'warning',
  rebuild: 'info',
  taper: 'secondary',
  peak: 'success'
};

function StatTile({ label, value, sublabel }) {
  return (
    <Card
      variant="outlined"
      sx={{
        bgcolor: 'action.hover',
        minHeight: 72
      }}
    >
      <CardContent sx={{ py: 1, px: 1.25, '&:last-child': { pb: 1 } }}>
        <Typography
          variant="caption"
          sx={{
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: 600,
            color: 'text.secondary'
          }}
        >
          {label}
        </Typography>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.25 }}>
          {value}
        </Typography>
        {sublabel ? (
          <Typography variant="caption" color="text.secondary">
            {sublabel}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MiniLoadChart({ series }) {
  const theme = useTheme();
  const colors = getChartTheme(theme);

  if (!series?.length) {
    return null;
  }

  const data = {
    labels: series.map((s) => s.label),
    datasets: [
      {
        label: 'Load',
        data: series.map((s) => s.load),
        backgroundColor: colors.primaryFill,
        borderColor: colors.primary,
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        ticks: { color: colors.text, font: { size: 9 }, maxRotation: 0 },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { color: colors.text, font: { size: 9 }, maxTicksLimit: 4 },
        grid: { color: colors.grid }
      }
    }
  };

  return (
    <Box sx={{ height: 80, mt: 1 }} data-testid="coach-mini-load-chart">
      <Bar data={data} options={options} />
    </Box>
  );
}

function MetricsRichCard({ data }) {
  const keyMetrics = data?.keyMetrics || {};
  const intensity = keyMetrics.intensityPct || {};
  const easyPct = intensity.easy ?? 0;

  const tiles = [
    {
      label: 'Distance',
      value: `${formatNumber(keyMetrics.totalDistanceKm)} km`,
      sublabel: `${formatNumber(keyMetrics.runsPerWeek, { digits: 1 })} runs/wk`
    },
    {
      label: 'ACWR',
      value: formatNumber(keyMetrics.acwr, { digits: 2 }),
      sublabel: keyMetrics.acwr > 1.5 ? 'Overload risk' : keyMetrics.acwr < 0.8 ? 'Conservative' : 'Healthy'
    },
    {
      label: 'Weekly load',
      value: formatNumber(keyMetrics.weeklyLoad, { digits: 0 }),
      sublabel: keyMetrics.monotony ? `Monotony ${formatNumber(keyMetrics.monotony, { digits: 2 })}` : null
    },
    {
      label: 'Avg pace',
      value: formatPaceLabel(keyMetrics.avgPaceMinPerKm),
      sublabel: easyPct ? `${Math.round(easyPct)}% easy` : null
    }
  ];

  return (
    <Box data-testid="coach-rich-metrics">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1
        }}
      >
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </Box>
      <MiniLoadChart series={data?.weeklyLoadSeries} />
    </Box>
  );
}

function WeeklyPlanRichCard({ data }) {
  const theme = useTheme();
  const days = data?.days || [];
  const highlight = data?.highlightNextSession;

  return (
    <Stack spacing={0.75} data-testid="coach-rich-weekly-plan">
      {highlight?.title ? (
        <Chip
          size="small"
          color="primary"
          label={`Next: ${highlight.title}`}
          sx={{ alignSelf: 'flex-start', mb: 0.5 }}
        />
      ) : null}
      {days.map((day, index) => {
        const accent = sessionTheme(day.sessionType, theme.palette.mode);
        return (
          <Stack
            key={day.day ?? index}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              py: 0.5,
              px: 0.75,
              borderRadius: 1.5,
              bgcolor: alpha(accent.color, theme.palette.mode === 'dark' ? 0.12 : 0.08)
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: accent.color,
                flexShrink: 0
              }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {DAY_LABELS[index] || `Day ${day.day ?? index + 1}`}
              </Typography>
              <Typography variant="body2" fontWeight={600} noWrap>
                {day.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[day.durationMinutes ? `${day.durationMinutes} min` : null, day.distanceKm != null ? `${day.distanceKm} km` : null, day.rpe ? `RPE ${day.rpe}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

function ReportSummaryRichCard({ data }) {
  const phase = String(data?.readinessPhase || 'build').toLowerCase();
  const chipColor = READINESS_CHIP_COLOR[phase] || 'default';

  return (
    <Box data-testid="coach-rich-report-summary">
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
        {data?.headline || 'Weekly report'}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
        <Chip size="small" color={chipColor} label={phase} />
        {data?.injuryRiskLevel ? (
          <Chip size="small" variant="outlined" label={`Risk: ${data.injuryRiskLevel}`} />
        ) : null}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {data?.executiveParagraph}
      </Typography>
    </Box>
  );
}

function NextSessionRichCard({ data }) {
  const session = data?.session || data?.firstPlanDay;
  if (!session) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="coach-rich-next-session">
        No next session planned yet.
      </Typography>
    );
  }

  const paceLabel = session.mainSet?.targetPace?.label
    || session.targetPace?.label
    || (session.mainSet?.targetPace?.centerMinPerKm
      ? formatPaceLabel(session.mainSet.targetPace.centerMinPerKm)
      : null);

  return (
    <Card variant="outlined" data-testid="coach-rich-next-session">
      <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {session.title}
        </Typography>
        {session.objective ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {session.objective}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {session.durationMinutes ? (
            <Chip size="small" label={`${session.durationMinutes} min`} />
          ) : null}
          {paceLabel ? <Chip size="small" variant="outlined" label={paceLabel} /> : null}
          {session.rpe ? <Chip size="small" color="warning" label={`RPE ${session.rpe}`} /> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function CoachRichMessage({ richContent }) {
  if (!richContent || richContent.type === 'none' || !richContent.data) {
    return null;
  }

  const { type, data } = richContent;

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.25,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider'
      }}
      data-testid={`coach-rich-${type}`}
    >
      {type === 'metrics' ? <MetricsRichCard data={data} /> : null}
      {type === 'weekly_plan' ? <WeeklyPlanRichCard data={data} /> : null}
      {type === 'report_summary' ? <ReportSummaryRichCard data={data} /> : null}
      {type === 'next_session' ? <NextSessionRichCard data={data} /> : null}
    </Box>
  );
}

export default CoachRichMessage;
