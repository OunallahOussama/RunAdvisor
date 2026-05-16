import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  ActivityIcon,
  CalendarIcon,
  ClockIcon,
  DistanceIcon,
  ElevationIcon,
  HeartIcon,
  PaceIcon,
  RecoveryIcon,
  TrailIcon
} from './icons';

function getActivityIcon(activityType = '') {
  return activityType.toLowerCase().includes('trail') ? TrailIcon : ActivityIcon;
}

function getEffortLabel(activity) {
  if (activity.avgHeartRate >= 168 || activity.pace <= 4.7) {
    return 'High effort';
  }

  if (activity.avgHeartRate >= 150 || activity.pace <= 5.5) {
    return 'Steady effort';
  }

  if ((activity.movingTime || activity.duration || 0) / 60 >= 75) {
    return 'Long aerobic';
  }

  return 'Easy control';
}

function getRecoveryCue(activity) {
  const durationMinutes = Math.floor((activity.movingTime || activity.duration || 0) / 60);

  if (activity.avgHeartRate >= 168) {
    return 'Treat this as a quality day and add an easy recovery session next.';
  }

  if (activity.elevationGain >= 180) {
    return 'Climbing load was meaningful, so your legs may need extra recovery.';
  }

  if (durationMinutes >= 85) {
    return 'Long-duration work is in the bank. Keep the next run relaxed.';
  }

  return 'This effort fits well into a normal training week.';
}

function ActivityCard({ activity, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const distance = (activity.distance / 1000).toFixed(2);
  const duration = Math.floor((activity.movingTime || activity.duration || 0) / 60);
  const date = new Date(activity.date).toLocaleDateString();
  const ActivityTypeIcon = getActivityIcon(activity.type);
  const effortLabel = getEffortLabel(activity);
  const recoveryCue = getRecoveryCue(activity);

  return (
    <Card variant="outlined" sx={{ wordBreak: 'break-word' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 44,
                height: 44,
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
            <Box>
              <Typography variant="h6" component="h3">
                {activity.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {activity.type} • {date}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={activity.type?.toUpperCase()} size="small" variant="outlined" />
            <Chip color="primary" label={effortLabel} size="small" variant="filled" />
          </Stack>
        </Stack>

        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gap: 1,
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(auto-fit, minmax(120px, 1fr))' }
          }}
        >
          <MetricBox icon={DistanceIcon} label="Distance" value={`${distance} km`} />
          <MetricBox icon={ClockIcon} label="Duration" value={`${duration} mins`} />
          <MetricBox icon={PaceIcon} label="Pace" value={activity.pace != null ? `${activity.pace.toFixed(1)} min/km` : 'N/A'} />
          <MetricBox icon={CalendarIcon} label="Date" value={date} />
          {activity.elevationGain > 0 && (
            <MetricBox icon={ElevationIcon} label="Elevation" value={`${activity.elevationGain} m`} />
          )}
          {activity.avgHeartRate && (
            <MetricBox icon={HeartIcon} label="Avg HR" value={`${activity.avgHeartRate} bpm`} />
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
          <Button component={RouterLink} to={`/activities/${activity._id}`} variant="contained" type="button">
            Open full page
          </Button>
          <Button variant="outlined" onClick={() => setExpanded((prev) => !prev)} type="button">
            {expanded ? 'Hide details' : 'View details'}
          </Button>
          <Button color="error" variant="outlined" onClick={() => onDelete(activity._id)} type="button">
            Delete
          </Button>
        </Stack>

        <Collapse in={expanded}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider'
              }}
            >
              <Typography fontWeight={600} gutterBottom>
                Activity details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activity.notes || 'No extra notes for this activity.'}
              </Typography>
            </Box>
            <Box
              sx={{
                width: { lg: 280 },
                p: 2,
                borderRadius: 2,
                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(251,146,60,0.12)' : 'rgba(230,81,0,0.08)'),
                border: 1,
                borderColor: 'primary.dark'
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.selected',
                    flexShrink: 0
                  }}
                >
                  <RecoveryIcon size={16} />
                </Box>
                <Box>
                  <Typography fontWeight={600} gutterBottom>
                    Recovery cue
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {recoveryCue}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

function MetricBox({ icon: Icon, label, value }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default'
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
        <Icon size={14} />
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.06 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body1" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}

export default ActivityCard;
