import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { getChartTheme } from '../../utils/chartTheme';

/** Shared palette + axis styling for @mui/x-charts on the Stats page. */
export function useMuiChartTheme() {
  const theme = useTheme();
  const colors = getChartTheme(theme);

  return useMemo(
    () => ({
      colors,
      axisSx: {
        tickLabelStyle: { fill: colors.text, fontSize: 11 },
        labelStyle: { fill: colors.text, fontSize: 11 }
      },
      gridColor: colors.grid,
      margin: { top: 28, right: 56, bottom: 40, left: 52 },
      slotProps: {
        legend: {
          direction: 'row',
          position: { vertical: 'bottom', horizontal: 'middle' },
          labelStyle: { fill: colors.text, fontSize: 11 }
        }
      }
    }),
    [colors]
  );
}
