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

function Privacy() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <Stack spacing={3}>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          {siteConfig.appName} respects your privacy. This summary describes what we collect and why. For cookie
          specifics, see the{' '}
          <Link component={RouterLink} to="/cookies" fontWeight={600}>
            Cookie Policy
          </Link>
          .
        </Typography>

        <Typography component="h2" variant="h6" fontWeight={700}>
          Information we collect
        </Typography>
        <List dense>
          <ListItem disableGutters>
            <ListItemText
              primary="Account data"
              secondary="Email, name, and profile picture from Auth0 when you sign in."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Training preferences"
              secondary="Goals, experience level, and preferences you save in the app."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Strava data"
              secondary="Activity summaries and details you authorize via Strava Connect, plus tokens needed to sync."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Uploaded training plans"
              secondary="Files and notes you attach to your account."
            />
          </ListItem>
        </List>

        <Typography component="h2" variant="h6" fontWeight={700}>
          How we use it
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          We use your data to authenticate you, display activities, generate coaching recommendations, and improve
          reliability of the service. We do not sell your personal information.
        </Typography>

        <Typography component="h2" variant="h6" fontWeight={700}>
          Strava
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          When you connect Strava, their privacy policy also applies to data held by Strava. See our{' '}
          <Link component={RouterLink} to="/about" fontWeight={600}>
            About page
          </Link>{' '}
          for a list of Strava-related actions RunAdvisor performs. Revoke access via{' '}
          <Link href={stravaLegalLinks.settings} target="_blank" rel="noopener noreferrer">
            Strava authorized apps
          </Link>
          .
        </Typography>

        <Typography component="h2" variant="h6" fontWeight={700}>
          Contact & requests
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
          To request access, correction, or deletion of your data, email{' '}
          <Link href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</Link>.
        </Typography>
      </Stack>
    </LegalPageLayout>
  );
}

export default Privacy;
