import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Accordion from '@mui/material/Accordion';
import Box from '@mui/material/Box';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import { getTrainingGoalMeta } from '../constants/trainingGoals';

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
  goalRaceName,
  runningGoal
}) {
  const [insightOpen, setInsightOpen] = useState(true);
  const volume = analytics?.volume || {};
  const pace = analytics?.pace || {};
  const load = analytics?.trainingLoad || {};
  const exec = report?.executiveSummary || {};
  const readinessPhase = exec.readinessPhase;
  const next = getNextPlanSession(report, generatedAt);
  const raceCountdown = getRaceCountdown(goalRaceDate);
  const goalMeta = runningGoal ? getTrainingGoalMeta(runningGoal) : null;
  const flags = report?.workloadAnalysis?.flags || [];
  const nextDetail = report?.nextSessionDetail;

  const statStrip = [
    { label: 'Week', value: formatMetric(volume.totalDistanceKm, 'km') },
    { label: 'Pace', value: formatPaceLabel(pace.avgPaceMinPerKm) },
    {
      label: load.acwr ? 'ACWR' : 'Load',
      value: load.acwr ? formatNumber(load.acwr, { digits: 2 }) : formatNumber(load.weeklyLoad, { digits: 0 })
    }
  ];

  return (
    <Stack
      spacing={2}
      data-testid="today-hero"
      sx={{ maxWidth: 520, mx: 'auto', textAlign: 'center', alignItems: 'center' }}
    >
      {exec.headline ? (
        <Typography variant="h5" component="h2" fontWeight={700} sx={{ lineHeight: 1.25 }}>
          {exec.headline}
        </Typography>
      ) : (
        <Typography variant="h5" component="h2" fontWeight={700}>
          Today
        </Typography>
      )}

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap" useFlexGap>
        <TrainingStatusBanner acwr={load.acwr} readinessPhase={readinessPhase} />
        {goalMeta ? (
          <Chip size="small" variant="outlined" label={`Goal · ${goalMeta.label}`} data-testid="today-goal-chip" />
        ) : null}
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
            size={80}
          />
        ) : null}
      </Stack>

      <Box sx={{ width: 1 }}>
        <ActivityStatStrip stats={statStrip} dense />
      </Box>

      {!stravaConnected ? (
        <Button component={RouterLink} to="/strava-connect" variant="outlined" size="small">
          Connect Strava
        </Button>
      ) : null}

      {next?.day ? (
        <Card
          variant="outlined"
          sx={{
            width: 1,
            textAlign: 'left',
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
                  Next up · {next.day.title}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {formatPlanDayLabel(next.scheduledDate)}
              </Typography>
            </Stack>
            {nextDetail?.objective ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {nextDetail.objective}
              </Typography>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {(exec.paragraph || flags.length > 0) ? (
        <Accordion
          expanded={insightOpen}
          onChange={(_, expanded) => setInsightOpen(expanded)}
          disableGutters
          elevation={0}
          sx={{
            width: 1,
            textAlign: 'left',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="today-insight" id="today-insight-header">
            <Typography variant="subtitle2" fontWeight={600}>
              Coach insight
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {exec.paragraph ? (
              <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: flags.length ? 1 : 0 }}>
                {exec.paragraph}
              </Typography>
            ) : null}
            {flags.length > 0 ? (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {flags.map((flag) => (
                  <Chip key={flag} size="small" color="warning" variant="outlined" label={flag} />
                ))}
              </Stack>
            ) : null}
            <Button component={RouterLink} to="/training-report" size="small" sx={{ mt: 1.5 }}>
              Full training report
            </Button>
          </AccordionDetails>
        </Accordion>
      ) : null}
    </Stack>
  );
}

export default TodayHeroCard;
