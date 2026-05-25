import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { formatNumber, formatPaceLabel, formatRelativeTime } from '../utils/format';

/** Compact activity row — same pattern on home feed and lists. */
function FeedRow({ activity, to }) {
  const href = to || `/activities/${activity._id || activity.stravaActivityId}`;
  const distance = formatNumber((activity.distance || 0) / 1000);

  return (
    <Stack
      component={RouterLink}
      to={href}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{
        py: 1.25,
        textDecoration: 'none',
        color: 'inherit',
        '&:hover .feed-row-title': { color: 'primary.main' }
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography className="feed-row-title" variant="subtitle2" fontWeight={600} noWrap>
          {activity.name || 'Run'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {[activity.date ? formatRelativeTime(activity.date) : null, `${distance} km`, activity.pace != null ? formatPaceLabel(activity.pace) : null]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      </Box>
    </Stack>
  );
}

export default FeedRow;
