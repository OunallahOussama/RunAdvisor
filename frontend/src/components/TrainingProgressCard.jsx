import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { TargetIcon, TrendIcon } from './icons';

function ProgressRow({ label, value, targetLabel }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {targetLabel}
        </Typography>
      </Stack>
      <LinearProgress
        aria-label={label}
        color="primary"
        sx={{ height: 10, borderRadius: 99 }}
        value={Math.min(100, Math.max(0, value))}
        variant="determinate"
      />
    </Box>
  );
}

function TrainingProgressCard({ progress, compact = false, onEnableNotifications }) {
  if (!progress) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Set your training profile to unlock weekly load tracking and progress badges.
          </Typography>
          <Button component={RouterLink} to="/profile" sx={{ mt: 2 }} variant="contained">
            Set up profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="overline" color="primary" fontWeight={700}>
                Your progress
              </Typography>
              <Typography variant={compact ? 'h6' : 'h5'} fontWeight={700}>
                Level {progress.level}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress.xp} XP · {progress.xpToNextLevel} XP to level {progress.level + 1}
              </Typography>
            </Box>
            <Chip icon={<TrendIcon size={14} />} label={`${progress.streakDays}-day streak`} size="small" />
          </Stack>

          <ProgressRow
            label="Weekly training load"
            targetLabel={`${progress.weeklyDistanceKm} / ${progress.weeklyLoadTargetKm} km`}
            value={progress.loadProgressPct}
          />

          {progress.paceProgressPct != null && (
            <ProgressRow
              label="Goal pace alignment"
              targetLabel={
                progress.avgWeekPaceMinPerKm
                  ? `${progress.avgWeekPaceMinPerKm} min/km vs ${progress.goalPaceMinPerKm} goal`
                  : `Goal ${progress.goalPaceMinPerKm} min/km`
              }
              value={progress.paceProgressPct}
            />
          )}

          {progress.badges?.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {progress.badges.map((badge) => (
                <Chip key={badge.id} label={badge.label} size="small" variant="outlined" />
              ))}
            </Stack>
          )}

          {!compact && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button component={RouterLink} to="/profile" startIcon={<TargetIcon size={16} />} variant="outlined">
                Edit goals
              </Button>
              {onEnableNotifications && (
                <Button onClick={onEnableNotifications} variant="text">
                  Enable phone alerts
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default TrainingProgressCard;
