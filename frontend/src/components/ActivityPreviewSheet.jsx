import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ActivityRouteMap from './ActivityRouteMap';
import ShareButton from './ShareButton';
import { activitiesApi } from '../services/api';
import {
  formatNumber,
  formatPaceLabel,
  formatDurationShort,
  formatRelativeTime
} from '../utils/format';

function pickEncodedPolyline(detail) {
  if (!detail?.map) {
    return '';
  }
  return detail.map.polyline || detail.map.summary_polyline || '';
}

function PreviewBody({ activity, detail, loadingDetail }) {
  const movingSeconds = activity.movingTime || activity.duration || 0;

  return (
    <Stack spacing={2} data-testid="activity-preview-body">
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={activity.type || 'Run'} variant="outlined" />
        <Chip size="small" label={formatRelativeTime(activity.date) || '—'} variant="outlined" />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          textAlign: 'center'
        }}
      >
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Distance
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            {formatNumber((activity.distance || 0) / 1000)} km
          </Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Time
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            {formatDurationShort(movingSeconds)}
          </Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Pace
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            {activity.pace != null ? formatPaceLabel(activity.pace) : '—'}
          </Typography>
        </Box>
      </Box>

      {loadingDetail ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ '& svg': { minHeight: 120, maxHeight: 160 } }}>
          <ActivityRouteMap encodedPolyline={pickEncodedPolyline(detail)} title="" />
        </Box>
      )}

      {activity.notes ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {activity.notes}
        </Typography>
      ) : null}

      {activity.avgHeartRate ? (
        <Typography variant="caption" color="text.secondary">
          Avg heart rate {Math.round(activity.avgHeartRate)} bpm
          {activity.elevationGain > 0 ? ` · ${Math.round(activity.elevationGain)} m elev` : ''}
        </Typography>
      ) : activity.elevationGain > 0 ? (
        <Typography variant="caption" color="text.secondary">
          {Math.round(activity.elevationGain)} m elevation
        </Typography>
      ) : null}
    </Stack>
  );
}

function ActivityPreviewSheet({ activity, open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!open || !activity?._id) {
      setDetail(null);
      return undefined;
    }

    let cancelled = false;
    setLoadingDetail(true);

    activitiesApi
      .getActivity(activity._id)
      .then((res) => {
        if (!cancelled) {
          setDetail(res.data?.activity || res.data || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, activity?._id]);

  if (!activity) {
    return null;
  }

  const title = (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.25 }}>
          {activity.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Double-tap or use Open for full detail
        </Typography>
      </Box>
      <IconButton aria-label="Close preview" onClick={onClose} edge="end">
        <CloseIcon />
      </IconButton>
    </Stack>
  );

  const actions = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ width: 1 }}>
      <Button
        component={RouterLink}
        to={`/activities/${activity._id}`}
        variant="contained"
        fullWidth
        startIcon={<OpenInNewIcon />}
        onClick={onClose}
      >
        Open full activity
      </Button>
      <ShareButton activityId={activity._id} />
    </Stack>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={() => {}}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '88vh',
            pb: 'calc(12px + env(safe-area-inset-bottom, 0px))'
          }
        }}
      >
        <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mt: 1, mb: 1 }} />
        <Box sx={{ px: 2, pb: 2 }}>
          {title}
          <PreviewBody activity={activity} detail={detail} loadingDetail={loadingDetail} />
          <Box sx={{ mt: 2 }}>{actions}</Box>
        </Box>
      </SwipeableDrawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogContent sx={{ pt: 2 }}>
        {title}
        <PreviewBody activity={activity} detail={detail} loadingDetail={loadingDetail} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>{actions}</DialogActions>
    </Dialog>
  );
}

export default ActivityPreviewSheet;
