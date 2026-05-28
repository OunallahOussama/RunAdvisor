import React, { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { CalendarIcon, CheckIcon, SyncIcon, UploadIcon } from './icons';
import { stravaApi } from '../services/api';
import {
  DAY_LABELS,
  formatNumber,
  formatPaceLabel,
  formatPlanDayLabel,
  planDayDate,
  sessionTheme
} from '../utils/weeklyPlanShared';
import { buildWorkoutIcs, downloadIcsFile, formatWorkoutText } from '../utils/workoutExport';

function PaceBandChip({ targetPace }) {
  if (!targetPace) {
    return null;
  }
  const label =
    targetPace.label ||
    (targetPace.lowerMinPerKm && targetPace.upperMinPerKm
      ? `${formatPaceLabel(targetPace.lowerMinPerKm)} – ${formatPaceLabel(targetPace.upperMinPerKm)}`
      : null);
  if (!label) {
    return null;
  }
  return <Chip size="small" variant="outlined" label={label} />;
}

function SessionBlock({ label, block }) {
  if (!block) {
    return null;
  }
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25 }}>
        {block.durationMinutes || 0} min
      </Typography>
      {block.description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {block.description}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        <PaceBandChip targetPace={block.targetPace} />
        {block.hrZone ? <Chip size="small" variant="outlined" label={block.hrZone} /> : null}
        {block.rpe ? <Chip size="small" color="warning" label={`RPE ${block.rpe}`} /> : null}
      </Stack>
    </Box>
  );
}

function WeeklyPlanDayCard({
  day,
  dayIndex = 0,
  dayLabel,
  planStartDate,
  nextSessionDetail,
  stravaConnected = false,
  variant = 'grid'
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaResult, setStravaResult] = useState(null);
  const [stravaError, setStravaError] = useState('');

  const session = sessionTheme(day?.sessionType, theme.palette.mode);
  const label = dayLabel || DAY_LABELS[dayIndex % 7];
  const scheduledDate = useMemo(
    () => planDayDate(planStartDate, dayIndex),
    [planStartDate, dayIndex]
  );
  const showSessionBlocks = dayIndex === 0 && nextSessionDetail;

  const workoutText = useMemo(
    () =>
      formatWorkoutText(day, {
        nextSessionDetail: showSessionBlocks ? nextSessionDetail : null,
        scheduledDate
      }),
    [day, showSessionBlocks, nextSessionDetail, scheduledDate]
  );

  const handleOpen = () => {
    setCopyDone(false);
    setStravaResult(null);
    setStravaError('');
    setOpen(true);
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(workoutText);
      setCopyDone(true);
    } catch (e) {
      setStravaError('Could not copy to clipboard.');
    }
  }, [workoutText]);

  const handleIcsDownload = useCallback(() => {
    const ics = buildWorkoutIcs(day, {
      scheduledDate,
      dayIndex,
      descriptionText: workoutText
    });
    const safeTitle = (day?.title || 'workout').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    downloadIcsFile(ics, `runadvisor-${safeTitle || 'session'}.ics`);
  }, [day, scheduledDate, dayIndex, workoutText]);

  const handleLogToStrava = useCallback(async () => {
    setStravaLoading(true);
    setStravaError('');
    setStravaResult(null);
    try {
      const res = await stravaApi.logWorkout({
        title: day?.title || session.label,
        description: day?.description,
        durationMinutes: day?.durationMinutes || 30,
        distanceKm: day?.distanceKm,
        targetPace: day?.targetPace,
        sessionType: day?.sessionType,
        scheduledDate: scheduledDate.toISOString(),
        rpe: day?.rpe,
        hrZone: day?.hrZone,
        sessionBlocks: showSessionBlocks ? nextSessionDetail : undefined
      });
      setStravaResult(res.data);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'SCOPE_REQUIRED') {
        setStravaError(
          data.message ||
            'Reconnect Strava with write access (activity:write) to log workouts.'
        );
      } else {
        setStravaError(data?.message || err.message || 'Failed to log workout to Strava.');
      }
    } finally {
      setStravaLoading(false);
    }
  }, [day, session.label, scheduledDate, showSessionBlocks, nextSessionDetail]);

  const compactCard = (
    <Card
      data-testid="weekly-plan-day"
      variant="outlined"
      sx={{
        borderLeft: `4px solid ${session.color}`,
        borderRadius: 1.5,
        bgcolor: open ? 'action.selected' : 'background.paper',
        height: '100%'
      }}
    >
      <CardActionArea onClick={handleOpen} sx={{ height: '100%', minHeight: 48 }}>
        <CardContent sx={{ py: 1, px: 1.25, pb: '8px !important' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              {label}
            </Typography>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: session.color }} />
          </Stack>
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
            {day?.title || session.label}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
            <Typography variant="caption" color="text.secondary">
              {day?.durationMinutes ? `${day.durationMinutes} min` : '—'}
              {day?.distanceKm ? ` · ${formatNumber(day.distanceKm, { suffix: ' km' })}` : ''}
            </Typography>
            {day?.rpe ? (
              <Chip size="small" color="warning" label={`RPE ${day.rpe}`} sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 10 } }} />
            ) : null}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  const timelineCard = (
    <Box className={`relative pl-10 pb-5 ${day?.sessionType === 'rest_or_xt' ? 'opacity-80' : ''}`}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 4,
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontSize: 10,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          left: 14,
          top: 32,
          bottom: 0,
          width: 1,
          bgcolor: 'divider'
        }}
      />
      <Card variant="outlined" data-testid="weekly-plan-day">
        <CardActionArea onClick={handleOpen}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {day?.title || session.label}
                </Typography>
                <Chip size="small" label={session.label} sx={{ mt: 0.5, bgcolor: session.bgTint, color: session.color }} />
              </Box>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {day?.durationMinutes ? (
                  <Chip size="small" variant="outlined" label={`${day.durationMinutes} min`} />
                ) : null}
                {day?.distanceKm ? (
                  <Chip size="small" variant="outlined" label={formatNumber(day.distanceKm, { suffix: ' km' })} />
                ) : null}
                {day?.rpe ? <Chip size="small" color="warning" label={`RPE ${day.rpe}`} /> : null}
              </Stack>
            </Stack>
            {day?.description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {day.description}
              </Typography>
            ) : null}
            <Box sx={{ mt: 1 }}>
              <PaceBandChip targetPace={day?.targetPace} />
            </Box>
            <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block', fontWeight: 600 }}>
              Tap for full details →
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
  );

  return (
    <>
      {variant === 'timeline' ? timelineCard : compactCard}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        aria-labelledby="weekly-plan-day-dialog-title"
      >
        <DialogTitle id="weekly-plan-day-dialog-title" sx={{ pb: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              {formatPlanDayLabel(scheduledDate)} · {label}
            </Typography>
            <Typography variant="h6" fontWeight={700} component="span">
              {day?.title || session.label}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={session.label} sx={{ bgcolor: session.bgTint, color: session.color }} />
              {day?.durationMinutes ? (
                <Chip size="small" variant="outlined" label={`${day.durationMinutes} min`} />
              ) : null}
              {day?.distanceKm ? (
                <Chip size="small" variant="outlined" label={formatNumber(day.distanceKm, { suffix: ' km' })} />
              ) : null}
              {day?.rpe ? <Chip size="small" color="warning" label={`RPE ${day.rpe}`} /> : null}
              {day?.hrZone ? <Chip size="small" variant="outlined" label={day.hrZone} /> : null}
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {day?.description ? (
            <Typography variant="body2" sx={{ lineHeight: 1.7, mb: 2 }}>
              {day.description}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Target pace
            </Typography>
            <PaceBandChip targetPace={day?.targetPace} />
          </Stack>

          {showSessionBlocks ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Session breakdown
              </Typography>
              <Stack spacing={1.5}>
                <SessionBlock label="Warm-up" block={nextSessionDetail.warmup} />
                <SessionBlock label="Main set" block={nextSessionDetail.mainSet} />
                <SessionBlock label="Cool-down" block={nextSessionDetail.cooldown} />
              </Stack>
            </Box>
          ) : null}

          {stravaError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {stravaError}
              {stravaError.includes('Reconnect') || stravaError.includes('write') ? (
                <Button component={RouterLink} to="/strava-connect" size="small" sx={{ mt: 1, display: 'block' }}>
                  Reconnect Strava
                </Button>
              ) : null}
            </Alert>
          ) : null}

          {stravaResult?.success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Saved to Strava.{' '}
              {stravaResult.url ? (
                <Button href={stravaResult.url} target="_blank" rel="noopener noreferrer" size="small">
                  View activity
                </Button>
              ) : null}
            </Alert>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, py: 1.5 }}>
          <Tooltip title="Copy full workout text">
            <Button
              startIcon={copyDone ? <CheckIcon size={16} /> : null}
              onClick={handleCopy}
              variant="outlined"
              size="medium"
              sx={{ minHeight: 48 }}
            >
              {copyDone ? 'Copied' : 'Copy workout'}
            </Button>
          </Tooltip>
          <Tooltip title="Download calendar event (.ics)">
            <Button
              startIcon={<CalendarIcon size={16} />}
              onClick={handleIcsDownload}
              variant="outlined"
              size="medium"
              sx={{ minHeight: 48 }}
            >
              Add to calendar
            </Button>
          </Tooltip>
          {stravaConnected ? (
            <Tooltip title="Creates a manual Strava activity with workout details (requires activity:write)">
              <span>
                <Button
                  startIcon={stravaLoading ? null : <UploadIcon size={16} />}
                  onClick={handleLogToStrava}
                  variant="contained"
                  color="primary"
                  disabled={stravaLoading}
                  size="medium"
                  sx={{ minHeight: 48 }}
                >
                  {stravaLoading ? 'Logging…' : 'Log to Strava'}
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              component={RouterLink}
              to="/strava-connect"
              variant="contained"
              startIcon={<SyncIcon size={16} />}
              size="medium"
              sx={{ minHeight: 48 }}
            >
              Connect Strava
            </Button>
          )}
          <IconButton aria-label="Close" onClick={() => setOpen(false)} sx={{ ml: 'auto' }}>
            ✕
          </IconButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function WeeklyPlanGrid({
  weeklyPlan = [],
  planStartDate,
  nextSessionDetail,
  stravaConnected,
  hideHeader = false
}) {
  const days = weeklyPlan.slice(0, 7);
  if (days.length === 0) {
    return null;
  }

  return (
    <Box>
      {!hideHeader ? (
        <>
          <Typography
            variant="caption"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontWeight: 700,
              color: 'text.secondary',
              display: 'block',
              mb: 1
            }}
          >
            Next 7 days plan
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Tap a day for full session details, calendar export, or Strava logging.
          </Typography>
        </>
      ) : null}
      <Box
        data-testid="weekly-plan-timeline"
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(4, 1fr)',
            md: 'repeat(7, 1fr)'
          }
        }}
      >
        {days.map((day, idx) => (
          <WeeklyPlanDayCard
            key={day.day ?? idx}
            day={day}
            dayIndex={idx}
            planStartDate={planStartDate}
            nextSessionDetail={idx === 0 ? nextSessionDetail : null}
            stravaConnected={stravaConnected}
          />
        ))}
      </Box>
    </Box>
  );
}

export default WeeklyPlanDayCard;
