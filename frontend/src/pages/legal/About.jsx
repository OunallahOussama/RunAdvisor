import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LegalPageLayout from '../../components/LegalPageLayout';
import { siteConfig, stravaLegalLinks } from '../../config/site';

function Section({ title, children }) {
  return (
    <Stack spacing={1.5} component="section">
      <Typography component="h2" variant="h6" fontWeight={700}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function About() {
  return (
    <LegalPageLayout title="About RunAdvisor">
      <Stack spacing={4}>
        <Section title="What is RunAdvisor?">
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            {siteConfig.appName} is a running training advisor that helps you review workouts, plan race preparation,
            and receive coaching-style recommendations. You sign in with Auth0 (Google and other providers supported by
            your tenant), optionally connect Strava, and use the app on the web or as an installable mobile workspace.
          </Typography>
        </Section>

        <Section title="Contact">
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            For support, privacy requests, or questions about your account:
          </Typography>
          <List dense disablePadding>
            <ListItem disableGutters>
              <ListItemText
                primary="Support"
                secondary={
                  <Link href={`mailto:${siteConfig.contactEmail}`}>
                    {siteConfig.contactEmail}
                  </Link>
                }
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Website" secondary={siteConfig.siteUrl} />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText
                primary="Privacy inquiries"
                secondary={
                  <Link href={`mailto:${siteConfig.privacyEmail}`}>
                    {siteConfig.privacyEmail}
                  </Link>
                }
              />
            </ListItem>
          </List>
        </Section>

        <Section title="Strava connectivity">
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            Connecting Strava is optional. When you choose to connect, you are redirected to Strava to authorize
            RunAdvisor. After authorization, RunAdvisor may perform the following actions on your behalf using Strava
            API access tokens stored securely on our servers:
          </Typography>
          <List dense sx={{ pl: 1 }}>
            <ListItem disableGutters>
              <ListItemText primary="Exchange your one-time authorization code for access and refresh tokens" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Read your Strava athlete profile identifier" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="List and sync recent running activities (distance, pace, elevation, heart rate, and related fields)" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Fetch activity detail for coaching review and recommendations" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Refresh tokens when they expire so sync can continue without reconnecting each session" />
            </ListItem>
          </List>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            RunAdvisor does not post activities to Strava on your behalf unless you explicitly use a feature that
            requires it (none are enabled by default in the current release). Training plan files you upload in the app
            are stored in your RunAdvisor account, not sent to Strava.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            To connect or manage Strava inside the app, sign in and open{' '}
            <Link component={RouterLink} to="/strava-connect" fontWeight={600}>
              Strava Connect
            </Link>
            . To revoke access at any time, remove RunAdvisor from your authorized apps at{' '}
            <Link href={stravaLegalLinks.settings} target="_blank" rel="noopener noreferrer">
              Strava settings
            </Link>
            . You can also contact us to request deletion of stored Strava tokens and synced activity copies.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Strava is a trademark of Strava, Inc. RunAdvisor is not affiliated with or endorsed by Strava. See{' '}
            <Link href={stravaLegalLinks.apiAgreement} target="_blank" rel="noopener noreferrer">
              Strava API Agreement
            </Link>{' '}
            and{' '}
            <Link href={stravaLegalLinks.privacy} target="_blank" rel="noopener noreferrer">
              Strava Privacy Policy
            </Link>
            .
          </Typography>
        </Section>

        <Section title="Related policies">
          <Typography variant="body2" color="text.secondary">
            <Link component={RouterLink} to="/cookies">Cookie Policy</Link>
            {' · '}
            <Link component={RouterLink} to="/privacy">Privacy Policy</Link>
          </Typography>
        </Section>
      </Stack>
    </LegalPageLayout>
  );
}

export default About;
