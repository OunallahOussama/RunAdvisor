import React from 'react';
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { useMuiChartTheme } from './analytics/useMuiChartTheme';

function AdminUsageChart({ dailySeries = [] }) {
  const { colors, axisSx, margin, slotProps } = useMuiChartTheme();

  if (!dailySeries.length) {
    return null;
  }

  const dataset = dailySeries.map((row) => ({
    date: row.date,
    requests: row.requests ?? 0,
    errors: row.errors ?? 0
  }));

  return (
    <Box sx={{ width: 1, height: 1 }}>
      <BarChart
        dataset={dataset}
        xAxis={[{ scaleType: 'band', dataKey: 'date', tickLabelStyle: axisSx.tickLabelStyle }]}
        series={[
          { dataKey: 'requests', label: 'Requests', stack: 'total', color: colors.primary },
          { dataKey: 'errors', label: 'Errors', stack: 'total', color: colors.zones[2] }
        ]}
        height={280}
        margin={margin}
        grid={{ horizontal: true }}
        sx={{ '& .MuiChartsGrid-line': { stroke: colors.grid } }}
        slotProps={slotProps}
      />
    </Box>
  );
}

export default AdminUsageChart;
