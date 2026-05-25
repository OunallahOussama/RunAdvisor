import React, { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ActivityStatStrip from './ActivityStatStrip';
import TrainingStatusBanner from './TrainingStatusBanner';
import WeeklyProgressRing from './WeeklyProgressRing';
import { BoltIcon } from './icons';
import {
  formatMetric,
  formatNumber,
  formatPaceLabel,
  getRaceCountdown
} from '../utils/format';
import { formatPlanDayLabel, planDayDate } from '../utils/weeklyPlanShared';

function getNextPlanSession(report, generatedAt) {
  const plan = Array.isArray(report?.weeklyPlan) ? report.weeklyPlan : [];
  const idx = plan.findIndex((day) => day.sessionType !== 'rest_or_xt');
  if (idx === -1) {
    return null;
  }
  return {
    day: plan[idx],
    dayIndex: idx,
    scheduledDate: planDayDate(generatedAt, idx)
  };
}

function TodayHeroCard({
  analytics,
  report,
  generatedAt,
  stravaConnected,
  weeklyTargetKm,
  goalRaceDate,
  goalRaceName
}) {
  const volume = analytics?.volume || {};
  const pace = analytics?.pace || {};
  const load = analytics?.trainingLoad || {};
  const readinessPhase = report?.executiveSummary?.readinessPhase;
  const next = useMemo(() => getNextPlanSession(report, generatedAt), [report, generatedAt]);
  const raceCountdown = getRaceCountdown(goalRaceDate);

  const statStrip = [
    { label: 'Week', value: formatMetric(volume.totalDistanceKm, 'km') },
    { label: 'Pace', value: formatPaceLabel(pace.avgPaceMinPerKm) },
    {
      label: load.acwr ? 'ACWR' : 'Load',
      value: load.acwr ? formatNumber(load.acwr, { digits: 2 }) : formatNumber(load.weeklyLoad, { digits: 0 })
    }
  ];

  return (
    <Stack spacing={1.5} data-testid="today-hero">
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <TrainingStatusBanner acwr={load.acwr} readinessPhase={readinessPhase} />
        {raceCountdown && raceCountdown.days >= 0 ? (
          <Chip
            data-testid="race-countdown-chip"
            size="small"
            variant="outlined"
            label={goalRaceName ? `${goalRaceName} · ${raceCountdown.label}` : raceCountdown.label}
          />
        ) : null}
        {weeklyTargetKm > 0 ? (
          <WeeklyProgressRing
            currentKm={volume.totalDistanceKm}
            targetKm={weeklyTargetKm}
            label="Goal"
            size={72}
          />
        ) : null}
      </Stack>

      {!stravaConnected ? (
        <Button component={RouterLink} to="/strava-connect" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
          Connect Strava
        </Button>
      ) : null}

      {next?.day ? (
        <Card
          variant="outlined"
          sx={{
            borderColor: 'warning.main',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.warning.main, 0.1)
                : alpha(theme.palette.warning.main, 0.08)
          }}
        >
          <CardContent sx={{ py: 1.5, pb: '12px !important' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={0.75} alignItems="center">
                <BoltIcon size={14} />
                <Typography variant="subtitle2" fontWeight={700}>
                  {next.day.title}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {formatPlanDayLabel(next.scheduledDate)}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <ActivityStatStrip stats={statStrip} dense />
    </Stack>
  );
}

export default TodayHeroCard;
