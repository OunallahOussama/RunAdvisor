import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import AnalyticsChartContainer from './AnalyticsChartContainer';
import { useMuiChartTheme } from './useMuiChartTheme';
import { formatPaceLabel } from '../../utils/format';

function formatDate(value) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return String(value);
  }
}

export function WeeklyLoadChartCard({ series = [] }) {
  const { colors, axisSx, margin, slotProps } = useMuiChartTheme();
  const hasData = series.length > 0;

  const dataset = useMemo(
    () =>
      series.map((row) => ({
        label: row.label,
        load: row.load ?? 0,
        totalDistanceKm: row.totalDistanceKm ?? 0
      })),
    [series]
  );

  return (
    <AnalyticsChartContainer
      title="Weekly training load"
      subtitle="TRIMP-style load (bars) and distance (line)"
      height={280}
      empty={!hasData}
      emptyMessage="Sync more activities to see weekly load trends."
      testId="stats-weekly-load-chart"
    >
      <BarChart
        dataset={dataset}
        xAxis={[
          {
            scaleType: 'band',
            dataKey: 'label',
            tickLabelStyle: axisSx.tickLabelStyle
          }
        ]}
        yAxis={[
          {
            id: 'load',
            label: 'Load (TRIMP)',
            tickLabelStyle: axisSx.tickLabelStyle,
            labelStyle: axisSx.labelStyle
          },
          {
            id: 'distance',
            position: 'right',
            label: 'Distance (km)',
            tickLabelStyle: axisSx.tickLabelStyle,
            labelStyle: axisSx.labelStyle
          }
        ]}
        series={[
          {
            dataKey: 'load',
            label: 'Weekly load',
            type: 'bar',
            color: colors.primary,
            yAxisId: 'load'
          },
          {
            dataKey: 'totalDistanceKm',
            label: 'Distance (km)',
            type: 'line',
            color: colors.secondary,
            yAxisId: 'distance',
            curve: 'natural',
            showMark: true
          }
        ]}
        height={280}
        margin={margin}
        grid={{ horizontal: true }}
        sx={{ '& .MuiChartsGrid-line': { stroke: colors.grid } }}
        slotProps={slotProps}
      />
    </AnalyticsChartContainer>
  );
}

export function IntensityDistributionChartCard({ pct = {} }) {
  const { colors, axisSx, margin, slotProps } = useMuiChartTheme();
  const values = [pct.easy || 0, pct.tempo || 0, pct.threshold || 0, pct.vo2 || 0];
  const hasData = values.some((v) => v > 0);

  return (
    <AnalyticsChartContainer
      title="Intensity distribution"
      subtitle="Share of time in each effort zone (%)"
      height={260}
      empty={!hasData}
      testId="stats-intensity-chart"
    >
      <BarChart
        xAxis={[
          {
            scaleType: 'band',
            data: ['Easy', 'Tempo', 'Threshold', 'VO2'],
            tickLabelStyle: axisSx.tickLabelStyle
          }
        ]}
        yAxis={[
          {
            min: 0,
            max: 100,
            label: '% of time',
            tickLabelStyle: axisSx.tickLabelStyle,
            labelStyle: axisSx.labelStyle
          }
        ]}
        series={[
          {
            data: values,
            label: 'Time in zone',
            color: colors.zones[0]
          }
        ]}
        colors={colors.zones}
        height={260}
        margin={margin}
        grid={{ horizontal: true }}
        sx={{ '& .MuiChartsGrid-line': { stroke: colors.grid } }}
        slotProps={slotProps}
      />
    </AnalyticsChartContainer>
  );
}

export function PaceTrendChartCard({ activities = [] }) {
  const { colors, axisSx, margin, slotProps } = useMuiChartTheme();
  const sorted = useMemo(
    () => [...(activities || [])].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [activities]
  );
  const hasData = sorted.some((a) => a.avgPaceMinPerKm > 0);

  const xLabels = sorted.map((a) => formatDate(a.date));
  const paceData = sorted.map((a) => a.avgPaceMinPerKm ?? null);

  return (
    <AnalyticsChartContainer
      title="Pace trend"
      subtitle="Average pace per run (lower is faster)"
      height={260}
      empty={!hasData}
      testId="stats-pace-chart"
    >
      <LineChart
        xAxis={[
          {
            scaleType: 'point',
            data: xLabels,
            tickLabelStyle: axisSx.tickLabelStyle
          }
        ]}
        yAxis={[
          {
            reverse: true,
            label: 'min/km',
            tickLabelStyle: axisSx.tickLabelStyle,
            labelStyle: axisSx.labelStyle,
            valueFormatter: (v) => formatPaceLabel(v)
          }
        ]}
        series={[
          {
            data: paceData,
            label: 'Avg pace',
            color: colors.secondary,
            curve: 'natural',
            showMark: true,
            area: true
          }
        ]}
        height={260}
        margin={margin}
        grid={{ horizontal: true }}
        sx={{ '& .MuiChartsGrid-line': { stroke: colors.grid } }}
        slotProps={slotProps}
      />
    </AnalyticsChartContainer>
  );
}

export function StatsChartsGrid({ analytics }) {
  const series = analytics?.weeklyLoadSeries || [];
  const intensity = analytics?.intensityDistribution || {};
  const activities = analytics?.perActivity || [];

  return (
    <Box
      component="section"
      data-testid="stats-charts-grid"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: '1fr 1fr' },
        gap: 2,
        mb: 3
      }}
    >
      <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
        <WeeklyLoadChartCard series={series} />
      </Box>
      <IntensityDistributionChartCard pct={intensity} />
      <PaceTrendChartCard activities={activities} />
    </Box>
  );
}
