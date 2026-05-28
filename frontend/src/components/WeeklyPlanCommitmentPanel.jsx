import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import { usersApi } from '../services/api';
import { buildReportKey } from '../utils/weeklyPlanCommitment';

function WeeklyPlanCommitmentPanel({
  reportId,
  generatedAt,
  planCommitment,
  onUpdated,
  compact = false
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reportKey = buildReportKey({ reportId, generatedAt });
  const commitment = planCommitment?.commitment;
  const needsDecision = planCommitment?.needsDecision ?? true;
  const adherence = planCommitment?.adherence;
  const status = commitment?.reportKey === reportKey ? commitment?.status : 'pending';
  const isFollowing = status === 'following';
  const isDeclined = status === 'declined';

  const saveStatus = async (nextStatus) => {
    setSaving(true);
    setError('');
    try {
      await usersApi.updateWeeklyPlanCommitment({
        reportId,
        generatedAt,
        status: nextStatus
      });
      onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your choice.');
    } finally {
      setSaving(false);
    }
  };

  if (!reportId && !generatedAt) {
    return null;
  }

  return (
    <Box
      data-testid="weekly-plan-commitment"
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        border: 1,
        borderColor: isFollowing ? 'success.main' : 'divider',
        bgcolor: isFollowing ? 'success.main' : 'action.hover',
        ...(isFollowing
          ? { bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)') }
          : {})
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <RouteOutlinedIcon fontSize="small" color={isFollowing ? 'success' : 'action'} />
          <Typography variant="subtitle2" fontWeight={700}>
            Training plan
          </Typography>
          {isFollowing ? (
            <Chip size="small" color="success" icon={<CheckCircleOutlineIcon />} label="Following" />
          ) : isDeclined ? (
            <Chip size="small" variant="outlined" icon={<HighlightOffOutlinedIcon />} label="Not following" />
          ) : needsDecision ? (
            <Chip size="small" color="primary" variant="outlined" label="New plan" />
          ) : null}
        </Stack>

        {isFollowing && adherence?.appliedNote ? (
          <Typography variant="body2" color="text.secondary">
            {adherence.appliedNote}
            {adherence.appliedScore != null ? ` (${adherence.appliedScore}% of planned run days)` : ''}
          </Typography>
        ) : null}

        {!isFollowing && !isDeclined && needsDecision ? (
          <Typography variant="body2" color="text.secondary">
            Your coach built a rolling 7-day program from your recent training. Accept to follow it — we&apos;ll
            check Strava against each planned day from when this plan was created.
          </Typography>
        ) : null}

        {isDeclined ? (
          <Typography variant="body2" color="text.secondary">
            You&apos;re training on your own this week. You can accept the coach plan anytime below.
          </Typography>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap>
          {needsDecision || isDeclined ? (
            <Button
              variant="contained"
              size="small"
              disabled={saving}
              onClick={() => saveStatus('following')}
              data-testid="accept-weekly-plan"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckCircleOutlineIcon />}
            >
              Follow this plan
            </Button>
          ) : null}
          {needsDecision ? (
            <Button
              variant="outlined"
              size="small"
              disabled={saving}
              onClick={() => saveStatus('declined')}
              data-testid="decline-weekly-plan"
            >
              Not this week
            </Button>
          ) : null}
          {isFollowing ? (
            <Button
              variant="text"
              size="small"
              color="inherit"
              disabled={saving}
              onClick={() => saveStatus('declined')}
            >
              Stop following
            </Button>
          ) : null}
          {isDeclined && !needsDecision ? (
            <Button
              variant="outlined"
              size="small"
              disabled={saving}
              onClick={() => saveStatus('following')}
            >
              Follow plan now
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

export default WeeklyPlanCommitmentPanel;
