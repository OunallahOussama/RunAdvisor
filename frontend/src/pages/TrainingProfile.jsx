import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { Link as RouterLink } from 'react-router-dom';
import { authApi } from '../services/api';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';
import {
  getNotificationPreference,
  isNotificationSupported,
  requestNotificationPermission
} from '../utils/notifications';
import PaceInput, { paceFieldsFromDecimal } from '../components/PaceInput';
import { minSecToDecimalPace, formatMetric, getRaceCountdown } from '../utils/format';
import PrivacyConsentPanel from '../components/PrivacyConsentPanel';
import { useAppShell, useScreenChrome } from '../context/AppShellContext';

const GOAL_OPTIONS = ['endurance', 'speed', 'recovery', 'race', 'consistency'];

function TrainingProfile() {
  const { profile, refreshProfile } = useRunAdvisorProfile();
  const { openOnboarding } = useAppShell();
  const [form, setForm] = useState({
    age: '',
    experience: 'intermediate',
    preferredDistance: '10',
    goalPaceMinPerKm: '6.0',
    weeklyTrainingLoadKm: '30',
    goalRaceName: '',
    goalRaceDate: '',
    goalRaceDistanceKm: '10',
    trainingGoals: ['consistency'],
    discoverable: true,
    socialBio: ''
  });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [paceFields, setPaceFields] = useState({ minutes: '6', seconds: '00' });
  const [notificationsOn, setNotificationsOn] = useState(getNotificationPreference());

  useScreenChrome({ title: 'Profile' });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      age: profile.age ?? '',
      experience: profile.experience || 'intermediate',
      preferredDistance: String(profile.preferredDistance ?? 10),
      goalPaceMinPerKm: String(profile.goalPaceMinPerKm ?? 6),
      weeklyTrainingLoadKm: String(profile.weeklyTrainingLoadKm ?? 30),
      goalRaceName: profile.goalRaceName || '',
      goalRaceDate: profile.goalRaceDate
        ? new Date(profile.goalRaceDate).toISOString().split('T')[0]
        : '',
      goalRaceDistanceKm: String(profile.goalRaceDistanceKm ?? 10),
      trainingGoals: profile.trainingGoals?.length ? profile.trainingGoals : ['consistency'],
      discoverable: profile.discoverable !== false,
      socialBio: profile.socialBio || ''
    });
    setPaceFields(paceFieldsFromDecimal(profile.goalPaceMinPerKm ?? 6));
  }, [profile]);

  const toggleGoal = (goal) => {
    setForm((current) => {
      const exists = current.trainingGoals.includes(goal);
      const trainingGoals = exists
        ? current.trainingGoals.filter((item) => item !== goal)
        : [...current.trainingGoals, goal];

      return { ...current, trainingGoals: trainingGoals.length ? trainingGoals : ['consistency'] };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus('');

    try {
      const goalPace = minSecToDecimalPace(paceFields.minutes, paceFields.seconds);
      await authApi.updatePreferences({
        age: form.age ? Number(form.age) : undefined,
        experience: form.experience,
        preferredDistance: Number(form.preferredDistance),
        goalPaceMinPerKm: goalPace ?? Number(form.goalPaceMinPerKm),
        weeklyTrainingLoadKm: Number(form.weeklyTrainingLoadKm),
        goalRaceName: form.goalRaceName,
        goalRaceDate: form.goalRaceDate || null,
        goalRaceDistanceKm: Number(form.goalRaceDistanceKm),
        trainingGoals: form.trainingGoals,
        discoverable: form.discoverable,
        socialBio: form.socialBio
      });
      await refreshProfile();
      setStatus('Profile saved. Training insights will use your goals and load targets.');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Unable to save your profile right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotificationsOn(result === 'granted' && getNotificationPreference());

    if (result === 'granted') {
      setStatus('Phone alerts enabled for sync and goal milestones.');
    } else if (result === 'denied') {
      setStatus('Notifications are blocked in your browser settings.');
    }
  };

  return (
    <Box component="main">
      {status && (
        <Alert severity={status.includes('Unable') ? 'error' : 'success'} sx={{ mb: 2 }}>
          {status}
        </Alert>
      )}

      <Card variant="outlined" component="form" onSubmit={handleSubmit}>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight={600}>
              Goals & load
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              <PaceInput
                label="Goal pace"
                minutes={paceFields.minutes}
                seconds={paceFields.seconds}
                onChange={setPaceFields}
                helperText="Used to personalize race projections and weekly reviews."
              />
              <TextField
                fullWidth
                label="Weekly training load (km)"
                onChange={(e) => setForm({ ...form, weeklyTrainingLoadKm: e.target.value })}
                type="number"
                inputProps={{ min: 5, step: 1 }}
                value={form.weeklyTrainingLoadKm}
                helperText={
                  profile?.weeklyTrainingLoadKm
                    ? `Target: ${formatMetric(profile.weeklyTrainingLoadKm, 'km')}`
                    : undefined
                }
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Preferred distance (km)"
                onChange={(e) => setForm({ ...form, preferredDistance: e.target.value })}
                type="number"
                value={form.preferredDistance}
              />
              <TextField
                fullWidth
                label="Experience"
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                select
                value={form.experience}
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </TextField>
            </Stack>

            <Typography variant="h6" fontWeight={600}>
              Next race
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Race name"
                onChange={(e) => setForm({ ...form, goalRaceName: e.target.value })}
                value={form.goalRaceName}
              />
              <TextField
                fullWidth
                label="Race date"
                onChange={(e) => setForm({ ...form, goalRaceDate: e.target.value })}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.goalRaceDate}
              />
              <TextField
                fullWidth
                label="Race distance (km)"
                onChange={(e) => setForm({ ...form, goalRaceDistanceKm: e.target.value })}
                type="number"
                value={form.goalRaceDistanceKm}
              />
            </Stack>
            {form.goalRaceDate ? (
              <Chip
                size="small"
                variant="outlined"
                color="secondary"
                label={getRaceCountdown(form.goalRaceDate)?.label || 'Set a valid race date'}
                sx={{ alignSelf: 'flex-start' }}
              />
            ) : null}

            <Typography variant="subtitle2" color="text.secondary">
              Training focus
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {GOAL_OPTIONS.map((goal) => (
                <Chip
                  key={goal}
                  clickable
                  color={form.trainingGoals.includes(goal) ? 'primary' : 'default'}
                  label={goal}
                  onClick={() => toggleGoal(goal)}
                  variant={form.trainingGoals.includes(goal) ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>

            <TextField
              fullWidth
              label="Age (optional)"
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              type="number"
              value={form.age}
            />

            <Typography variant="h6" fontWeight={600}>
              Community
            </Typography>
            <TextField
              fullWidth
              label="Short bio"
              placeholder="e.g. Training for my first half marathon"
              value={form.socialBio}
              onChange={(e) => setForm({ ...form, socialBio: e.target.value })}
              inputProps={{ maxLength: 280 }}
              helperText="Shown when others find you via the search icon in the top bar."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.discoverable}
                  onChange={(e) => setForm({ ...form, discoverable: e.target.checked })}
                />
              }
              label="Let other RunAdvisor members find and add me as a friend"
            />
            <Typography variant="body2" color="text.secondary">
              Others can find you with the search icon (top right), like Strava athlete search.
            </Typography>
            <Button component={RouterLink} to="/community" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
              Open Community
            </Button>

            {isNotificationSupported() && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Phone & PWA alerts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Get a gentle nudge when Strava sync finishes or you hit a weekly load milestone (install the app for
                  the best experience).
                </Typography>
                <Button onClick={handleNotifications} variant="outlined">
                  {notificationsOn ? 'Notifications enabled' : 'Enable notifications'}
                </Button>
              </Box>
            )}

            <Button disabled={saving} size="large" type="submit" variant="contained">
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <PrivacyConsentPanel onReplayTour={openOnboarding} />
      </Box>
    </Box>
  );
}

export default TrainingProfile;
