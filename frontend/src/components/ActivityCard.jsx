import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ActivityStatStrip from './ActivityStatStrip';
import { ActivityIcon, TrailIcon } from './icons';
import { formatNumber, formatPaceLabel, formatDurationShort, formatRelativeTime } from '../utils/format';

function getActivityIcon(activityType = '') {
  return activityType.toLowerCase().includes('trail') ? TrailIcon : ActivityIcon;
}

function ActivityCard({ activity, onDelete }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const movingSeconds = activity.movingTime || activity.duration || 0;
  const whenLabel = formatRelativeTime(activity.date) || '—';
  const ActivityTypeIcon = getActivityIcon(activity.type);

  const statStrip = [
    { label: 'Distance', value: `${formatNumber(activity.distance / 1000)} km` },
    { label: 'Time', value: formatDurationShort(movingSeconds) },
    {
      label: 'Pace',
      value: activity.pace != null ? formatPaceLabel(activity.pace).replace(' /km', '') : 'N/A'
    },
    activity.elevationGain > 0
      ? { label: 'Elev', value: `${Math.round(activity.elevationGain)} m` }
      : activity.avgHeartRate
        ? { label: 'Avg HR', value: `${Math.round(activity.avgHeartRate)}` }
        : null
  ].filter(Boolean);

  return (
    <Card
      variant="outlined"
      sx={{
        wordBreak: 'break-word',
        overflow: 'hidden',
        transition: 'border-color 160ms ease',
        '&:hover': { borderColor: 'primary.main' }
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={`/activities/${activity._id}`}
        sx={{ alignItems: 'stretch' }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flexShrink: 0
              }}
            >
              <ActivityTypeIcon size={18} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {activity.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {whenLabel} · {activity.type || 'Run'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>

      <CardContent sx={{ pt: 0, pb: 1.5 }}>
        <ActivityStatStrip stats={statStrip} />

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
          <IconButton
            size="small"
            aria-label="Activity actions"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem component={RouterLink} to={`/activities/${activity._id}`} onClick={() => setMenuAnchor(null)}>
            Open
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onDelete(activity);
            }}
            sx={{ color: 'error.main' }}
          >
            Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}

export default ActivityCard;
