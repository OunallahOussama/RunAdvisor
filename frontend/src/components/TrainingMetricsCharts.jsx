import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Legend,
  Tooltip,
  Filler,
  Title
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Legend,
  Tooltip,
  Filler,
  Title
);

function useChartTheme() {
  const isLight = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
  return {
    text: isLight ? '#475569' : '#cbd5e1',
    muted: isLight ? '#64748b' : '#94a3b8',
    grid: isLight ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.12)'
  };
}

const baseChartOptions = (theme, { title } = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: theme.text } },
    title: title ? { display: true, text: title, color: theme.text, font: { size: 13, weight: '600' } } : { display: false }
  }
});

function axisCommon(theme) {
  return {
    ticks: { color: theme.muted },
    grid: { color: theme.grid }
  };
}

function TrainingMetricsCharts({ dailyMetrics = [], trend = [], weeklyRacePaceProjection = [] }) {
  const theme = useChartTheme();

  const hasDailyDistance = useMemo(
    () => dailyMetrics.some((d) => d.distanceKm > 0 || d.activityCount > 0),
    [dailyMetrics]
  );

  const hasWeekly = useMemo(() => trend.some((w) => w.activityCount > 0), [trend]);

  const hasHrDaily = useMemo(() => dailyMetrics.some((d) => d.avgHeartRate), [dailyMetrics]);

  const hasProjection = useMemo(
    () => weeklyRacePaceProjection.some((p) => p.predictedPaceMinPerKm != null),
    [weeklyRacePaceProjection]
  );

  const dailyMixedData = useMemo(
    () => ({
      labels: dailyMetrics.map((d) => d.label),
      datasets: [
        {
          type: 'bar',
          label: 'Distance (km)',
          data: dailyMetrics.map((d) => d.distanceKm),
          backgroundColor: 'rgba(249, 115, 22, 0.45)',
          borderColor: '#f97316',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Avg pace (min/km)',
          data: dailyMetrics.map((d) => (d.avgPace == null ? null : d.avgPace)),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: false,
          tension: 0.35,
          yAxisID: 'y1',
          spanGaps: true
        }
      ]
    }),
    [dailyMetrics]
  );

  const dailyMixedOptions = useMemo(
    () => ({
      ...baseChartOptions(theme, { title: 'Daily load & pace (last 28 days)' }),
      scales: {
        x: axisCommon(theme),
        y: {
          ...axisCommon(theme),
          position: 'left',
          title: { display: true, text: 'Distance (km)', color: theme.text }
        },
        y1: {
          ...axisCommon(theme),
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Pace (min/km)', color: theme.text }
        }
      }
    }),
    [theme]
  );

  const dailyHrData = useMemo(
    () => ({
      labels: dailyMetrics.map((d) => d.label),
      datasets: [
        {
          label: 'Avg HR (bpm)',
          data: dailyMetrics.map((d) => (d.avgHeartRate == null ? null : d.avgHeartRate)),
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167, 139, 250, 0.2)',
          fill: true,
          tension: 0.35,
          spanGaps: true
        }
      ]
    }),
    [dailyMetrics]
  );

  const dailyHrOptions = useMemo(
    () => ({
      ...baseChartOptions(theme, { title: 'Heart rate trend (days with HR data)' }),
      scales: {
        x: axisCommon(theme),
        y: {
          ...axisCommon(theme),
          title: { display: true, text: 'bpm', color: theme.text }
        }
      }
    }),
    [theme]
  );

  const weeklyVolumeData = useMemo(
    () => ({
      labels: trend.map((w) => w.label),
      datasets: [
        {
          type: 'bar',
          label: 'Distance (km)',
          data: trend.map((w) => w.totalDistanceKm),
          backgroundColor: 'rgba(249, 115, 22, 0.4)',
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Elevation (m)',
          data: trend.map((w) => (w.totalElevationM == null ? 0 : w.totalElevationM)),
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.12)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    }),
    [trend]
  );

  const weeklyVolumeOptions = useMemo(
    () => ({
      ...baseChartOptions(theme, { title: 'Weekly volume & climbing' }),
      scales: {
        x: axisCommon(theme),
        y: {
          ...axisCommon(theme),
          position: 'left',
          title: { display: true, text: 'Distance (km)', color: theme.text }
        },
        y1: {
          ...axisCommon(theme),
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Elevation (m)', color: theme.text }
        }
      }
    }),
    [theme]
  );

  const weeklyHrData = useMemo(
    () => ({
      labels: trend.map((w) => w.label),
      datasets: [
        {
          label: 'Avg HR (bpm)',
          data: trend.map((w) => (w.avgHeartRate == null ? null : w.avgHeartRate)),
          borderColor: '#f472b6',
          backgroundColor: 'rgba(244, 114, 182, 0.15)',
          fill: true,
          tension: 0.35,
          spanGaps: true
        }
      ]
    }),
    [trend]
  );

  const weeklyHrOptions = useMemo(
    () => ({
      ...baseChartOptions(theme, { title: 'Weekly average heart rate' }),
      scales: {
        x: axisCommon(theme),
        y: {
          ...axisCommon(theme),
          title: { display: true, text: 'bpm', color: theme.text }
        }
      }
    }),
    [theme]
  );

  const projectionData = useMemo(
    () => ({
      labels: weeklyRacePaceProjection.map((p) => p.label),
      datasets: [
        {
          label: 'Modelled race pace (min/km)',
          data: weeklyRacePaceProjection.map((p) => p.predictedPaceMinPerKm),
          borderColor: '#fb923c',
          backgroundColor: 'rgba(251, 146, 60, 0.15)',
          fill: true,
          tension: 0.35,
          spanGaps: true
        }
      ]
    }),
    [weeklyRacePaceProjection]
  );

  const projectionOptions = useMemo(
    () => ({
      ...baseChartOptions(theme, { title: 'Race-pace outlook by week (same formula as headline prediction)' }),
      scales: {
        x: axisCommon(theme),
        y: {
          ...axisCommon(theme),
          title: { display: true, text: 'min/km', color: theme.text }
        }
      }
    }),
    [theme]
  );

  if (!hasDailyDistance && !hasWeekly) {
    return null;
  }

  return (
    <Stack spacing={3}>
      {hasDailyDistance && (
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ height: 280 }}>
              <Chart type="bar" data={dailyMixedData} options={dailyMixedOptions} />
            </Box>
          </CardContent>
        </Card>
      )}

      {hasHrDaily && (
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ height: 240 }}>
              <Chart type="line" data={dailyHrData} options={dailyHrOptions} />
            </Box>
          </CardContent>
        </Card>
      )}

      {hasWeekly && (
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ height: 280 }}>
              <Chart type="bar" data={weeklyVolumeData} options={weeklyVolumeOptions} />
            </Box>
          </CardContent>
        </Card>
      )}

      {hasWeekly && trend.some((w) => w.avgHeartRate) && (
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ height: 240 }}>
              <Chart type="line" data={weeklyHrData} options={weeklyHrOptions} />
            </Box>
          </CardContent>
        </Card>
      )}

      {hasProjection && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Uses each week&apos;s average pace with the same race-distance adjustment as the headline model (not
              independent physiology).
            </Typography>
            <Box sx={{ height: 260 }}>
              <Chart type="line" data={projectionData} options={projectionOptions} />
            </Box>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

export default TrainingMetricsCharts;
