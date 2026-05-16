import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';
import { getStravaConnectionStatus } from '../utils/stravaStatus';
import { SyncIcon } from './icons';

function StravaStatusIndicator({ compact = false }) {
  const { profile, loading } = useRunAdvisorProfile();
  const status = getStravaConnectionStatus(profile);

  const chipLabel = status.connected
    ? `Strava · ${status.shortLabel}`
    : 'Strava · Not linked';

  const chip = (
    <Chip
      clickable
      color={status.severity}
      component={RouterLink}
      icon={
        <Box component="span" sx={{ display: 'flex', pl: 0.5 }}>
          {loading && !profile ? (
            <CircularProgress color="inherit" size={14} />
          ) : (
            <SyncIcon size={16} />
          )}
        </Box>
      }
      label={loading && !profile ? 'Strava…' : (compact ? status.shortLabel : chipLabel)}
      size="small"
      to="/strava-connect"
      variant={status.connected ? 'outlined' : 'filled'}
      sx={{
        fontWeight: 600,
        maxWidth: compact ? 120 : 220,
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }}
    />
  );

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Strava sync
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {status.detail}
          </Typography>
          <Typography variant="caption" color="inherit" sx={{ display: 'block', mt: 1, opacity: 0.85 }}>
            Click to open Strava sync & plans
          </Typography>
        </Box>
      }
      arrow
      placement="bottom"
    >
      {chip}
    </Tooltip>
  );
}

export default StravaStatusIndicator;
