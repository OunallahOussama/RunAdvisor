import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareButton from './ShareButton';
import { ActivityIcon, TrailIcon } from './icons';
import { createDoubleActivateHandler } from '../utils/tapGestures';
import { formatNumber, formatPaceLabel, formatDurationShort, formatRelativeTime } from '../utils/format';

function getActivityIcon(activityType = '') {
  return activityType.toLowerCase().includes('trail') ? TrailIcon : ActivityIcon;
}

function ActivityCard({ activity, onDelete, onPreview, compact = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const useCompact = compact || isMobile;
  const [menuAnchor, setMenuAnchor] = useState(null);
  const movingSeconds = activity.movingTime || activity.duration || 0;
  const whenLabel = formatRelativeTime(activity.date) || '—';
  const ActivityTypeIcon = getActivityIcon(activity.type);

  const activatePreview = createDoubleActivateHandler(() => onPreview?.(activity));

  const metaLine = [
    `${formatNumber(activity.distance / 1000)} km`,
    formatDurationShort(movingSeconds),
    activity.pace != null ? formatPaceLabel(activity.pace) : null
  ]
    .filter(Boolean)
    .join(' · ');

  if (useCompact) {
    return (
      <Card
        variant="outlined"
        data-testid="activity-card"
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          '&:active': { bgcolor: 'action.selected' }
        }}
        {...activatePreview}
      >
        <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flexShrink: 0
              }}
            >
              <ActivityTypeIcon size={16} />
            </Box>
            <Box
              component={RouterLink}
              to={`/activities/${activity._id}`}
              onClick={(e) => e.stopPropagation()}
              sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
            >
              <Typography variant="body1" fontWeight={600} noWrap>
                {activity.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {whenLabel} · {metaLine}
              </Typography>
            </Box>
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
            <ChevronRightIcon fontSize="small" color="action" aria-hidden />
          </Stack>
        </CardContent>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onPreview?.(activity);
            }}
          >
            Preview
          </MenuItem>
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
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      data-testid="activity-card"
      sx={{
        wordBreak: 'break-word',
        overflow: 'hidden',
        borderRadius: 3,
        transition: 'border-color 160ms ease',
        '&:hover': { borderColor: 'primary.main' }
      }}
      {...activatePreview}
    >
      <CardContent sx={{ py: 1.5, px: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
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
          <Box
            component={RouterLink}
            to={`/activities/${activity._id}`}
            onClick={(e) => e.stopPropagation()}
            sx={{ minWidth: 0, flex: 1, textDecoration: 'none', color: 'inherit' }}
          >
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {activity.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {whenLabel} · {metaLine}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25} alignItems="center">
            <ShareButton activityId={activity._id} />
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
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Double-click to preview
        </Typography>
      </CardContent>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onPreview?.(activity);
          }}
        >
          Preview
        </MenuItem>
        <MenuItem component={RouterLink} to={`/activities/${activity._id}`} onClick={() => setMenuAnchor(null)}>
          Open full page
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
    </Card>
  );
}

export default ActivityCard;
