import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { getTrainingStatus } from '../utils/trainingStatus';

const COLOR_MAP = {
  success: 'success.main',
  warning: 'warning.main',
  info: 'info.main',
  default: 'text.secondary'
};

/** Garmin Connect–style training status — compact by default. */
function TrainingStatusBanner({ acwr, readinessPhase, compact = true }) {
  const theme = useTheme();
  const status = getTrainingStatus({ acwr, readinessPhase });
  const accent = COLOR_MAP[status.color] || COLOR_MAP.default;
  const isThemeColor = status.color !== 'default';

  if (compact) {
    return (
      <Box
        data-testid="training-status-banner"
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover'
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: accent }}>
          {status.label}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      data-testid="training-status-banner"
      sx={{
        p: 2,
        borderRadius: 3,
        border: 1,
        borderColor: isThemeColor ? alpha(theme.palette[status.color]?.main || theme.palette.divider, 0.35) : 'divider',
        bgcolor: isThemeColor
          ? alpha(theme.palette[status.color]?.main || theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)
          : 'action.hover'
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Training status
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color: accent, lineHeight: 1.2, mt: 0.25 }}>
        {status.label}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.5 }}>
        {status.detail}
      </Typography>
    </Box>
  );
}

export default TrainingStatusBanner;
