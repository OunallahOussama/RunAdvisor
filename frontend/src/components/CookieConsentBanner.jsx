import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CookieIcon from '@mui/icons-material/Cookie';
import { siteConfig } from '../config/site';

function CookieConsentBanner({ open, onAccept }) {
  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        role="dialog"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
        sx={{
          position: 'fixed',
          bottom: { xs: 12, sm: 24 },
          left: { xs: 12, sm: 24 },
          right: { xs: 12, sm: 'auto' },
          zIndex: (theme) => theme.zIndex.snackbar + 1,
          maxWidth: { sm: 480 },
          p: 2.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider'
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <CookieIcon color="primary" sx={{ mt: 0.25 }} />
            <Box>
              <Typography id="cookie-consent-title" variant="subtitle1" fontWeight={700}>
                Cookies & local storage
              </Typography>
              <Typography id="cookie-consent-description" variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                {siteConfig.appName} uses cookies and browser storage for sign-in (Auth0), theme preferences,
                optional offline coaching data, and Strava connection state. See our{' '}
                <Link component={RouterLink} to="/cookies" fontWeight={600}>
                  Cookie Policy
                </Link>{' '}
                for details.
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button fullWidth variant="contained" onClick={onAccept}>
              Accept
            </Button>
            <Button fullWidth component={RouterLink} to="/cookies" variant="outlined">
              Manage preferences
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Slide>
  );
}

export default CookieConsentBanner;
