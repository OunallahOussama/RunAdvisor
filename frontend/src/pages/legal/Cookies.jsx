import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import LegalPageLayout from '../../components/LegalPageLayout';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import Button from '@mui/material/Button';
import { siteConfig } from '../../config/site';

const cookieRows = [
  {
    name: 'Auth0 session',
    type: 'Cookie / local storage',
    purpose: 'Sign-in, session refresh, and secure API access',
    duration: 'Session to 30 days (Auth0 settings)'
  },
  {
    name: 'runadvisor-theme',
    type: 'localStorage',
    purpose: 'Remember light or dark theme',
    duration: 'Until cleared'
  },
  {
    name: 'runadvisor.cookieConsent',
    type: 'localStorage',
    purpose: 'Record that you accepted this cookie notice',
    duration: 'Until cleared'
  },
  {
    name: 'runadvisor.strava.oauth.*',
    type: 'sessionStorage',
    purpose: 'Hold Strava OAuth code briefly during connect callback',
    duration: 'Browser session'
  },
  {
    name: 'runadvisor.cache.*',
    type: 'localStorage',
    purpose: 'Optional offline snapshots of coaching data',
    duration: 'Until cleared or overwritten'
  },
  {
    name: 'Service worker cache',
    type: 'Cache storage',
    purpose: 'Offline app shell and static assets (PWA)',
    duration: 'Until app update or cleared'
  }
];

function Cookies() {
  const { hasAccepted, acceptCookies } = useCookieConsent();

  return (
    <LegalPageLayout title="Cookie Policy">
      <Stack spacing={3}>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          This policy explains how {siteConfig.appName} uses cookies and similar technologies in your browser.
          We use only what is needed to run the service, remember preferences, and support optional offline use.
        </Typography>

        <Typography component="h2" variant="h6" fontWeight={700}>
          What we use
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cookieRows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.purpose}</TableCell>
                  <TableCell>{row.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          Third-party sign-in (Auth0) and Strava may set additional cookies when you use their login or authorization
          pages. Those providers control their own cookies. See our{' '}
          <Link component={RouterLink} to="/about" fontWeight={600}>
            About & Strava
          </Link>{' '}
          page for connectivity details.
        </Typography>

        <Typography component="h2" variant="h6" fontWeight={700}>
          Your choices
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          You can clear site data in your browser settings. Note that clearing Auth0 or Strava storage will sign you out
          or require reconnecting Strava. Declining non-essential storage is not fully supported because sign-in requires
          Auth0 cookies or local storage.
        </Typography>

        {!hasAccepted && (
          <Button variant="contained" onClick={acceptCookies} sx={{ alignSelf: 'flex-start' }}>
            Accept cookies
          </Button>
        )}
        {hasAccepted && (
          <Typography variant="body2" color="success.main">
            You accepted cookies on this device.
          </Typography>
        )}
      </Stack>
    </LegalPageLayout>
  );
}

export default Cookies;
