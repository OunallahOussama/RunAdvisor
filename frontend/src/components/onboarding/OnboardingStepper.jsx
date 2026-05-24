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
import { coachApi, usersApi } from '../../services/api';

const STEPS = ['Welcome', 'Connect Strava', 'Choose your goal', 'Notifications & consent', 'Ready to go'];

const GOAL_CHOICES = [
  { value: '5k', label: '5K' },
  { value: '10k', label: '10K' },
  { value: 'half', label: 'Half marathon' },
  { value: 'marathon', label: 'Marathon' },
  { value: 'general_fitness', label: 'General fitness' }
];

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
      weeklyReport: true
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

  const renderStepBody = () => {
    switch (active) {
      case 0:
        return (
          <Stack spacing={2}>
            <Typography variant="body1">
              Welcome to RunAdvisor. We turn your runs into a personal weekly coach report with clear next steps.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In under a minute, we will connect your data, ask what you are training for, and tune notifications.
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
          <Stack spacing={2}>
            <Typography variant="body1">What are you training for right now?</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {GOAL_CHOICES.map((choice) => (
                <Chip
                  key={choice.value}
                  label={choice.label}
                  color={goal === choice.value ? 'primary' : 'default'}
                  onClick={() => setGoal(choice.value)}
                  variant={goal === choice.value ? 'filled' : 'outlined'}
                  sx={{ minHeight: 40 }}
                />
              ))}
            </Stack>
          </Stack>
        );
      case 3:
        return (
          <Stack spacing={1.5}>
            <Typography variant="body1">Choose how RunAdvisor talks to you and what it can share.</Typography>
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
        <Box>{renderStepBody()}</Box>
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
