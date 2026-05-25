import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { formatNumber } from '../utils/format';

/**
 * Garmin Connect–style weekly distance ring vs target.
 */
function WeeklyProgressRing({ currentKm = 0, targetKm = 0, label = 'Weekly distance', size = 96 }) {
  const theme = useTheme();
  const safeTarget = Number(targetKm) > 0 ? Number(targetKm) : 0;
  const safeCurrent = Math.max(0, Number(currentKm) || 0);
  const pct = safeTarget > 0 ? Math.min(100, (safeCurrent / safeTarget) * 100) : 0;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Box
      data-testid="weekly-progress-ring"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        minWidth: size
      }}
    >
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.palette.divider}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.palette.primary.main}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 400ms ease' }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(pct)}%
          </Typography>
          {safeTarget > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, mt: 0.25 }}>
              {formatNumber(safeCurrent)} km
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: size + 24 }}>
        {label}
        {safeTarget > 0 ? (
          <>
            <br />
            {formatNumber(safeCurrent)} / {formatNumber(safeTarget)} km
          </>
        ) : null}
      </Typography>
    </Box>
  );
}

export default WeeklyProgressRing;
