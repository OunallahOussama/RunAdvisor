import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WeeklyProgressRing from './WeeklyProgressRing';
import { formatMetric, formatNumber, formatPaceLabel } from '../utils/format';

function StatChip({ label, value }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={`${label} · ${value}`}
      sx={{ fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

function ChallengeRow({ challenge }) {
  const color =
    challenge.status === 'complete'
      ? 'success'
      : challenge.status === 'closing'
        ? 'warning'
        : 'default';

  return (
    <Box data-testid={`challenge-row-${challenge.id || challenge.kind}`}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="body2" fontWeight={600}>
          {challenge.title}
        </Typography>
        <Chip size="small" color={color} label={`${Math.round(challenge.percent || 0)}%`} />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
        {challenge.detail}
      </Typography>
      {challenge.percent > 0 && challenge.percent < 100 ? (
        <LinearProgress
          variant="determinate"
          value={challenge.percent}
          sx={{ mt: 0.75, height: 4, borderRadius: 1 }}
        />
      ) : null}
    </Box>
  );
}

function TrainingGoalsCard({ progress, loading, error }) {
  if (loading && !progress) {
    return (
      <Card variant="outlined" data-testid="training-goals-card">
        <CardContent>
          <Skeleton height={28} width="60%" />
          <Skeleton height={96} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  const { month, year, week, gamification, challenges = [], nextObjectives = [], personalRecords, racePrediction } =
    progress;
  const monthGoal = month?.goalKm > 0;

  return (
    <Card variant="outlined" data-testid="training-goals-card">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1} alignItems="center">
              <EmojiEventsIcon color="primary" fontSize="small" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Goals & load
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Level {gamification?.level} · {gamification?.title}
                </Typography>
              </Box>
            </Stack>
            <Button component={RouterLink} to="/profile" size="small" variant="text">
              Edit
            </Button>
          </Stack>

          {error ? (
            <Typography variant="caption" color="text.secondary">
              {error}
            </Typography>
          ) : null}

          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="flex-start"
            flexWrap="wrap"
            useFlexGap
          >
            {monthGoal ? (
              <WeeklyProgressRing
                currentKm={month.currentKm}
                targetKm={month.goalKm}
                label="Month goal"
                size={88}
                ringTestId="month-progress-ring"
              />
            ) : (
              <Box sx={{ textAlign: 'center', minWidth: 88 }}>
                <Typography variant="h6" fontWeight={800}>
                  {formatMetric(month?.currentKm, 'km')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  This month
                </Typography>
              </Box>
            )}
            {week?.goalKm > 0 ? (
              <WeeklyProgressRing
                currentKm={week.currentKm}
                targetKm={week.goalKm}
                label="Week"
                size={72}
                ringTestId="week-progress-ring-secondary"
              />
            ) : null}
          </Stack>

          <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="center" useFlexGap>
            <StatChip label="YTD" value={formatMetric(year?.currentKm, 'km')} />
            {year?.goalKm > 0 ? (
              <StatChip label="Year goal" value={`${Math.round(year.percent || 0)}%`} />
            ) : null}
            <StatChip label="Runs (mo)" value={String(month?.runCount ?? 0)} />
            <StatChip label="Load (mo)" value={formatNumber(month?.trainingLoad, { digits: 0 })} />
            {personalRecords?.longestRunKm > 0 ? (
              <StatChip label="Longest" value={formatMetric(personalRecords.longestRunKm, 'km')} />
            ) : null}
            {personalRecords?.fastestPaceMinPerKm > 0 ? (
              <StatChip label="Best pace" value={formatPaceLabel(personalRecords.fastestPaceMinPerKm)} />
            ) : null}
          </Stack>

          {monthGoal && month.onTrack === false ? (
            <Typography variant="caption" color="warning.main" textAlign="center">
              Behind monthly pace — {formatMetric(month.remainingKm, 'km')} left with {month.daysLeftInMonth} days.
            </Typography>
          ) : null}

          {racePrediction?.predictedFinishTimeLabel ? (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Race outlook: ~{racePrediction.predictedFinishTimeLabel}
              {racePrediction.predictedPaceMinPerKm
                ? ` (${formatPaceLabel(racePrediction.predictedPaceMinPerKm)})`
                : ''}
            </Typography>
          ) : null}

          {challenges.length > 0 ? (
            <Stack spacing={1} divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
              {challenges.slice(0, 4).map((c) => (
                <ChallengeRow key={c.id || c.kind + c.title} challenge={c} />
              ))}
            </Stack>
          ) : null}

          {nextObjectives.length > 0 ? (
            <Box data-testid="next-objectives">
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" gutterBottom>
                Next up
              </Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                {nextObjectives.map((line) => (
                  <Typography key={line} component="li" variant="caption" color="text.secondary">
                    {line}
                  </Typography>
                ))}
              </Stack>
            </Box>
          ) : null}

          {gamification?.xpPercent != null ? (
            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  XP to next level
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {gamification.xpInLevel} / {gamification.xpToNextLevel} km
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={gamification.xpPercent}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default TrainingGoalsCard;
