import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import WeeklyPlanCommitmentPanel from './WeeklyPlanCommitmentPanel';
import TrainingPlanSessionList from './TrainingPlanSessionList';
import {
  extractPlanKeyElements,
  formatRollingPlanPeriod,
  summarizeWeeklyPlan
} from '../utils/weeklyPlanCommitment';
import { formatNumber } from '../utils/format';

function RollingTrainingPlanCard({
  weeklyPlan = [],
  planStartDate,
  planPeriod,
  phase,
  reportId,
  generatedAt,
  planCommitment,
  onPlanCommitmentUpdated
}) {
  const [open, setOpen] = useState(false);
  const keyPlan = useMemo(() => extractPlanKeyElements(weeklyPlan, phase), [weeklyPlan, phase]);
  const summary = useMemo(() => summarizeWeeklyPlan(weeklyPlan), [weeklyPlan]);
  const periodLabel = formatRollingPlanPeriod(planPeriod, planStartDate);

  if (!weeklyPlan.length) {
    return null;
  }

  return (
    <>
      <Card
        variant="outlined"
        data-testid="training-plan-offer"
        sx={{
          borderColor: 'primary.main',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.05)')
        }}
      >
        <CardActionArea onClick={() => setOpen(true)} aria-label="View training plan details">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <RouteOutlinedIcon color="primary" sx={{ mt: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  This week&apos;s program fits the key elements of your training plan
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                  {periodLabel}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {keyPlan.elements.map((el) => (
                    <Chip key={el.id} size="small" variant="outlined" label={el.label} />
                  ))}
                </Stack>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                  <Chip size="small" label={`${summary.runDays} run days`} />
                  {summary.plannedKm > 0 ? (
                    <Chip size="small" label={`~${formatNumber(summary.plannedKm)} km`} />
                  ) : null}
                </Stack>
              </Box>
              <ChevronRightIcon color="action" />
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        data-testid="training-plan-detail-dialog"
      >
        <DialogTitle sx={{ pr: 6 }}>
          7-day training program
          <IconButton
            aria-label="Close"
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Built from your last {planPeriod?.basedOnLastDays ?? 7} days of training. Each day is scheduled from
              when this plan was created — not a Mon–Sun calendar grid.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {periodLabel}
            </Typography>

            <WeeklyPlanCommitmentPanel
              reportId={reportId}
              generatedAt={generatedAt}
              planCommitment={planCommitment}
              onUpdated={() => {
                onPlanCommitmentUpdated?.();
              }}
              compact
            />

            <TrainingPlanSessionList weeklyPlan={weeklyPlan} planStartDate={planStartDate} />
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RollingTrainingPlanCard;
