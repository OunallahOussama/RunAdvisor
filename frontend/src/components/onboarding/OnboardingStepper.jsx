import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SyncIcon from '@mui/icons-material/Sync';
import { coachApi, usersApi } from '../../services/api';
import { TRAINING_GOAL_CHOICES, getTrainingGoalMeta } from '../../constants/trainingGoals';

const STEPS = ['Welcome', 'Connect Strava', 'Choose your goal', 'Notifications & consent', 'Ready to go'];

const centeredStepSx = {
  maxWidth: 480,
  mx: 'auto',
  textAlign: 'center',
  alignItems: 'center'
};

function OnboardingStepper({ open, user, onComplete, onSkip }) {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [goal, setGoal] = useState(user?.runningGoal || 'general_fitness');
  const [consent, setConsent] = useState({
    notifications: {
      browser: true,
      recommendations: true,
      weeklyReport: true,
      stravaBackgroundSync: true
    },
    shareAnonymizedTraining: false,
    privacyAccepted: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateConsent = (path, value) => {
    setConsent((current) => {
      if (path.startsWith('notifications.')) {
        const key = path.split('.')[1];
        return { ...current, notifications: { ...current.notifications, [key]: value } };
      }
      return { ...current, [path]: value };
    });
  };

  const persistConsentAndOnboarding = async () => {
    await usersApi.updateConsent({
      shareAnonymizedTraining: consent.shareAnonymizedTraining,
      notifications: consent.notifications,
      acceptVersion: consent.privacyAccepted ? '2026-05-24' : undefined
    });
    await usersApi.completeOnboarding({ runningGoal: goal });
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError('');
    try {
      await persistConsentAndOnboarding();
      try {
        await coachApi.weeklySummary({ windowDays: 7, force: true });
      } catch {
        // weekly summary failure is non-fatal — onboarding still completes
      }
      onComplete?.();
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not save your preferences.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      await usersApi.completeOnboarding({});
    } finally {
      setSubmitting(false);
      onSkip?.();
    }
  };

  const next = () => setActive((a) => Math.min(a + 1, STEPS.length - 1));
  const back = () => setActive((a) => Math.max(a - 1, 0));
  const selectedGoal = getTrainingGoalMeta(goal);

  const renderStepBody = () => {
    switch (active) {
      case 0:
        return (
          <Stack spacing={2} sx={centeredStepSx}>
            <Typography variant="h6" fontWeight={700}>
              Welcome to RunAdvisor
            </Typography>
            <Typography variant="body1">
              Your runs become a weekly coach report with clear next steps — pace, load, and what to do next.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect Strava, pick a goal, and tune notifications in under a minute.
            </Typography>
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={2}>
            <Typography variant="body1">
              Connect Strava so RunAdvisor can analyse your real activities. You can do this later from the
              Strava page — your weekly report will use manual logs in the meantime.
            </Typography>
            <Button
              variant="contained"
              startIcon={<DirectionsRunIcon />}
              onClick={() => navigate('/strava-connect')}
            >
              Open Strava connect
            </Button>
            <Typography variant="caption" color="text.secondary">
              We request only the scopes needed to read your activities.
            </Typography>
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={2.5} sx={centeredStepSx} data-testid="onboarding-goals">
            <Typography variant="h6" fontWeight={700}>
              What are you training for?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tap a goal — we tailor your weekly plan and home screen around it.
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              justifyContent="center"
              sx={{ width: 1 }}
            >
              {TRAINING_GOAL_CHOICES.map((choice) => (
                <Chip
                  key={choice.value}
                  label={choice.label}
                  color={goal === choice.value ? 'primary' : 'default'}
                  onClick={() => setGoal(choice.value)}
                  variant={goal === choice.value ? 'filled' : 'outlined'}
                  sx={{ minHeight: 44, px: 0.5, fontWeight: goal === choice.value ? 700 : 500 }}
                />
              ))}
            </Stack>
            <Box
              sx={{
                width: 1,
                textAlign: 'left',
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover'
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {selectedGoal.label} · {selectedGoal.subtitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 1 }}>
                {selectedGoal.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Typical volume: {selectedGoal.weeklyKm}
              </Typography>
            </Box>
          </Stack>
        );
      case 3:
        return (
          <Stack spacing={1.5} sx={{ maxWidth: 520, mx: 'auto' }}>
            <Typography variant="h6" fontWeight={700} textAlign="center">
              Notifications &amp; sync
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 1 }}>
              Stay updated when reports land and keep Strava in sync while the app is open on your phone.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={consent.notifications.stravaBackgroundSync}
                  onChange={(_, v) => updateConsent('notifications.stravaBackgroundSync', v)}
                />
              }
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <SyncIcon fontSize="small" color="action" />
                  <span>Background Strava sync (every ~30 min)</span>
                </Stack>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ pl: 6, mt: -1, display: 'block' }}>
              When RunAdvisor is open or installed on your home screen, we quietly pull your latest Strava
              activities — like a light cron job on your device. Add to home screen on mobile for best results.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={consent.notifications.browser}
                  onChange={(_, v) => updateConsent('notifications.browser', v)}
                />
              }
              label="Browser notifications for new reports"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={consent.notifications.recommendations}
                  onChange={(_, v) => updateConsent('notifications.recommendations', v)}
                />
              }
              label="Recommendation alerts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={consent.notifications.weeklyReport}
                  onChange={(_, v) => updateConsent('notifications.weeklyReport', v)}
                />
              }
              label="Weekly report alerts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={consent.shareAnonymizedTraining}
                  onChange={(_, v) => updateConsent('shareAnonymizedTraining', v)}
                />
              }
              label="Share anonymised training data to improve coaching models"
            />
            <FormControlLabel
              required
              control={
                <Switch
                  checked={consent.privacyAccepted}
                  onChange={(_, v) => updateConsent('privacyAccepted', v)}
                  data-testid="onboarding-privacy"
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the <Link href="/privacy" target="_blank" rel="noopener">privacy policy</Link>.
                </Typography>
              }
            />
          </Stack>
        );
      case 4:
      default:
        return (
          <Stack spacing={2}>
            <Typography variant="h6">You are all set.</Typography>
            <Typography variant="body2" color="text.secondary">
              We will generate your first weekly report now. It opens automatically when ready.
            </Typography>
          </Stack>
        );
    }
  };

  const canAdvance = active === 3 ? consent.privacyAccepted : true;

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="onboarding-title"
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}
    >
      <DialogTitle id="onboarding-title" sx={{ pt: 3, pb: 1 }}>
        Get RunAdvisor ready
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stepper
          activeStep={active}
          orientation={isMobile ? 'vertical' : 'horizontal'}
          sx={{ mb: 3 }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderStepBody()}
        </Box>
        {error ? (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={handleSkip} disabled={submitting} data-testid="onboarding-skip">
          Skip for now
        </Button>
        <Box sx={{ flex: 1 }} />
        {active > 0 ? (
          <Button onClick={back} disabled={submitting}>
            Back
          </Button>
        ) : null}
        {active < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={next}
            disabled={!canAdvance || submitting}
            data-testid="onboarding-next"
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleFinish}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            data-testid="onboarding-finish"
          >
            Generate my first report
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default OnboardingStepper;
