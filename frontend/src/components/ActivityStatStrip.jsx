import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

/**
 * Strava-style horizontal activity metrics — bold value, muted label, dividers.
 */
function ActivityStatStrip({ stats = [], dense = false, highlightIndex = 0 }) {
  const theme = useTheme();
  const visible = stats.filter((s) => s?.value != null && s.value !== '' && s.value !== 'N/A');

  if (visible.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.05),
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      {visible.map((stat, index) => (
        <Box
          key={stat.label}
          sx={{
            flex: 1,
            minWidth: 0,
            px: dense ? 1 : 1.5,
            py: dense ? 1 : 1.25,
            textAlign: 'center',
            borderLeft: index > 0 ? 1 : 0,
            borderColor: 'divider'
          }}
        >
          <Typography
            variant={dense ? 'body2' : 'subtitle1'}
            fontWeight={700}
            sx={{
              lineHeight: 1.2,
              fontVariantNumeric: 'tabular-nums',
              color: index === highlightIndex ? 'primary.main' : 'text.primary'
            }}
          >
            {stat.value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.25, textTransform: 'uppercase', letterSpacing: 0.04, fontSize: 10 }}
          >
            {stat.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default ActivityStatStrip;
