import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import AnalyticsChartContainer from './analytics/AnalyticsChartContainer';
import { useMuiChartTheme } from './analytics/useMuiChartTheme';

function TrainingMetricsCharts({ dailyMetrics = [], trend = [], weeklyRacePaceProjection = [] }) {
  const { colors, axisSx, margin, slotProps } = useMuiChartTheme();

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

  const dailyDataset = useMemo(
    () =>
      dailyMetrics.map((d) => ({
        label: d.label,
        distanceKm: d.distanceKm ?? 0,
        avgPace: d.avgPace ?? null
      })),
    [dailyMetrics]
  );

  const weeklyDataset = useMemo(
    () =>
      trend.map((w) => ({
        label: w.label,
        totalDistanceKm: w.totalDistanceKm ?? 0,
        totalElevationM: w.totalElevationM ?? 0
      })),
    [trend]
  );

  if (!hasDailyDistance && !hasWeekly) {
    return null;
  }

  return (
    <Stack spacing={2}>
      {hasDailyDistance ? (
        <AnalyticsChartContainer
          title="Daily load & pace"
          subtitle="Last 28 days — distance and average pace"
          height={280}
        >
          <BarChart
            dataset={dailyDataset}
            xAxis={[{ scaleType: 'band', dataKey: 'label', tickLabelStyle: axisSx.tickLabelStyle }]}
            yAxis={[
              {
                id: 'distance',
                label: 'Distance (km)',
                tickLabelStyle: axisSx.tickLabelStyle,
                labelStyle: axisSx.labelStyle
              },
              {
                id: 'pace',
                position: 'right',
                label: 'Pace (min/km)',
                tickLabelStyle: axisSx.tickLabelStyle,
                labelStyle: axisSx.labelStyle
              }
            ]}
            series={[
              {
                dataKey: 'distanceKm',
                label: 'Distance (km)',
                type: 'bar',
                color: colors.primary,
                yAxisId: 'distance'
              },
              {
                dataKey: 'avgPace',
                label: 'Avg pace',
                type: 'line',
                color: colors.secondary,
                yAxisId: 'pace',
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
      ) : null}

      {hasHrDaily ? (
        <AnalyticsChartContainer title="Heart rate trend" subtitle="Days with HR data" height={240}>
          <LineChart
            xAxis={[
              {
                scaleType: 'point',
                data: dailyMetrics.map((d) => d.label),
                tickLabelStyle: axisSx.tickLabelStyle
              }
            ]}
            yAxis={[
              {
                label: 'bpm',
                tickLabelStyle: axisSx.tickLabelStyle,
                labelStyle: axisSx.labelStyle
              }
            ]}
            series={[
              {
                data: dailyMetrics.map((d) => d.avgHeartRate ?? null),
                label: 'Avg HR',
                color: colors.zones[3],
                curve: 'natural',
                showMark: true,
                area: true
              }
            ]}
            height={240}
            margin={margin}
            grid={{ horizontal: true }}
            sx={{ '& .MuiChartsGrid-line': { stroke: colors.grid } }}
            slotProps={slotProps}
          />
        </AnalyticsChartContainer>
      ) : null}

      {hasWeekly ? (
        <AnalyticsChartContainer title="Weekly volume & climbing" subtitle="Distance and elevation by week" height={280}>
          <BarChart
            dataset={weeklyDataset}
            xAxis={[{ scaleType: 'band', dataKey: 'label', tickLabelStyle: axisSx.tickLabelStyle }]}
            yAxis={[
              {
                id: 'vol',
                label: 'Distance (km)',
                tickLabelStyle: axisSx.tickLabelStyle,
                labelStyle: axisSx.labelStyle
              },
              {
                id: 'elev',
                position: 'right',
                label: 'Elevation (m)',
                tickLabelStyle: axisSx.tickLabelStyle,
                labelStyle: axisSx.labelStyle
              }
            ]}
            series={[
              {
                dataKey: 'totalDistanceKm',
                label: 'Distance (km)',
                type: 'bar',
                color: colors.primary,
                yAxisId: 'vol'
              },
              {
                dataKey: 'totalElevationM',
                label: 'Elevation (m)',
                type: 'line',
                color: colors.zones[0],
                yAxisId: 'elev',
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
      ) : null}

      {hasWeekly && trend.some((w) => w.avgHeartRate) ? (
        <AnalyticsChartContainer title="Weekly average heart rate" height={240}>
          <LineChart
            xAxis={[
              {
                scaleType: 'point',
                data: trend.map((w) => w.label),
                tickLabelStyle: axisSx.tickLabelStyle
              }
            ]}
            series={[
              {
                data: trend.map((w) => w.avgHeartRate ?? null),
                label: 'Avg HR (bpm)',
                color: colors.zones[3],
                curve: 'natural',
                showMark: true,
                area: true
              }
            ]}
            height={240}
            margin={margin}
            grid={{ horizontal: true }}
            sx={{ '& .MuiChartsGrid-line': { stroke: colors.grid } }}
            slotProps={slotProps}
          />
        </AnalyticsChartContainer>
      ) : null}

      {hasProjection ? (
        <AnalyticsChartContainer
          title="Race-pace outlook"
          subtitle="Modelled pace by week (same formula as headline prediction)"
          height={260}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, px: 0.5 }}>
            Uses each week&apos;s average pace with the same race-distance adjustment as the headline model.
          </Typography>
          <Box sx={{ height: 260 }}>
            <LineChart
              xAxis={[
                {
                  scaleType: 'point',
                  data: weeklyRacePaceProjection.map((p) => p.label),
                  tickLabelStyle: axisSx.tickLabelStyle
                }
              ]}
              yAxis={[
                {
                  reverse: true,
                  label: 'min/km',
                  tickLabelStyle: axisSx.tickLabelStyle,
                  labelStyle: axisSx.labelStyle
                }
              ]}
              series={[
                {
                  data: weeklyRacePaceProjection.map((p) => p.predictedPaceMinPerKm),
                  label: 'Modelled race pace',
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
          </Box>
        </AnalyticsChartContainer>
      ) : null}
    </Stack>
  );
}

export default TrainingMetricsCharts;
