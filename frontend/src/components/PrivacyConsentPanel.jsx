import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { usersApi } from '../services/api';

function PrivacyConsentPanel({ onReplayTour }) {
  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    usersApi
      .getConsent()
      .then((res) => {
        if (cancelled) return;
        setConsent(res?.data?.consent || null);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load your consent preferences.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const update = async (patch) => {
    setSaving(true);
    setError('');
    const next = {
      ...(consent || {}),
      ...patch,
      notifications: {
        ...(consent?.notifications || {}),
        ...(patch.notifications || {})
      }
    };
    setConsent(next);

    try {
      const res = await usersApi.updateConsent({
        shareAnonymizedTraining: next.shareAnonymizedTraining,
        marketingEmails: next.marketingEmails,
        notifications: next.notifications
      });
      setConsent(res?.data?.consent || next);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save your preferences.');
    } finally {
      setSaving(false);
    }
  };

  const resetConsent = async () => {
    setSaving(true);
    setError('');
    try {
      await usersApi.updateConsent({ acceptVersion: null });
      await usersApi.completeOnboarding({ reset: true });
      onReplayTour?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not reset consent.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !consent) {
    return (
      <Card data-testid="privacy-consent-panel">
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="rounded" height={60} />
            <Skeleton variant="rounded" height={60} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="privacy" data-testid="privacy-consent-panel">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
            aria-hidden
          >
            <ShieldOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6">Privacy &amp; notifications</Typography>
            <Typography variant="body2" color="text.secondary">
              Control what RunAdvisor sends you and how your data is used.
            </Typography>
          </Box>
        </Stack>

        {error ? <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert> : null}

        <Stack spacing={0.5} sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={consent.notifications.stravaBackgroundSync !== false}
                onChange={(_, v) => update({ notifications: { stravaBackgroundSync: v } })}
                disabled={saving}
              />
            }
            label="Background Strava sync"
          />
          <Typography variant="caption" color="text.secondary" sx={{ pl: 6, mt: -1 }}>
            While the app or PWA is open on your phone, sync recent Strava activities about every 30 minutes
            and notify you when new runs are imported.
          </Typography>
        </Stack>

        <Stack spacing={0.5} sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={consent.notifications.browser}
                onChange={(_, v) => update({ notifications: { browser: v } })}
                disabled={saving}
              />
            }
            label="Browser notifications"
          />
          <Typography variant="caption" color="text.secondary" sx={{ pl: 6, mt: -1 }}>
            Show a local browser notification when a new weekly report or recommendation lands.
          </Typography>
        </Stack>

        <Stack spacing={0.5} sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={consent.notifications.weeklyReport}
                onChange={(_, v) => update({ notifications: { weeklyReport: v } })}
                disabled={saving}
              />
            }
            label="Weekly report alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={consent.notifications.recommendations}
                onChange={(_, v) => update({ notifications: { recommendations: v } })}
                disabled={saving}
              />
            }
            label="Recommendation alerts"
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={0.5}>
          <FormControlLabel
            control={
              <Switch
                checked={consent.shareAnonymizedTraining}
                onChange={(_, v) => update({ shareAnonymizedTraining: v })}
                disabled={saving}
              />
            }
            label="Share anonymised training data"
          />
          <Typography variant="caption" color="text.secondary" sx={{ pl: 6, mt: -1 }}>
            Helps us improve our coaching models. Off by default — your data is never sold.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 3, alignItems: { sm: 'center' } }}>
          <Link component="a" href="/privacy" target="_blank" rel="noopener" sx={{ mr: 'auto' }}>
            View privacy policy
          </Link>
          <Button onClick={resetConsent} variant="outlined" disabled={saving} data-testid="reset-consent">
            Reset consent
          </Button>
        </Stack>

        {savedAt ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Saved at {savedAt}.
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default PrivacyConsentPanel;
