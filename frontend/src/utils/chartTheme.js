import { alpha } from '@mui/material/styles';

/** Chart.js color tokens derived from the active MUI theme. */
export function getChartTheme(theme) {
  const { palette } = theme;
  const isDark = palette.mode === 'dark';

  return {
    text: palette.text.secondary,
    grid: palette.divider,
    primary: palette.primary.main,
    primaryFill: alpha(palette.primary.main, isDark ? 0.45 : 0.5),
    secondary: isDark ? '#38bdf8' : '#0ea5e9',
    secondaryFill: alpha(isDark ? '#38bdf8' : '#0ea5e9', isDark ? 0.22 : 0.18),
    zones: isDark
      ? ['#34d399', '#fbbf24', '#f87171', '#a78bfa']
      : ['#10b981', '#f59e0b', '#ef4444', '#7c3aed'],
    successFill: alpha(palette.success.main, isDark ? 0.18 : 0.12),
    errorFill: alpha(palette.error.main, isDark ? 0.18 : 0.12)
  };
}

export function chartScaleOptions(theme, extra = {}) {
  const colors = getChartTheme(theme);
  return {
    ticks: { color: colors.text },
    grid: { color: colors.grid },
    title: { color: colors.text, display: true },
    ...extra
  };
}
