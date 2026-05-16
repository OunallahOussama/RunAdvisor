import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThemeToggleButton from './ThemeToggleButton';
import { RunAdvisorMark } from './icons';
import { siteConfig } from '../config/site';

function LegalPageLayout({ title, children }) {
  return (
    <Box sx={{ py: { xs: 1, sm: 2 } }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
        <ThemeToggleButton compact />
      </Box>
      <Container maxWidth="md" disableGutters sx={{ px: { xs: 0, sm: 2 } }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ display: 'inline-flex' }} aria-hidden>
              <RunAdvisorMark size={24} />
            </Box>
            <Typography component={RouterLink} to="/" variant="h5" fontWeight={700} color="primary" sx={{ textDecoration: 'none' }}>
              {siteConfig.appName}
            </Typography>
          </Stack>
          <Button
            component={RouterLink}
            to="/login"
            startIcon={<ArrowBackIcon />}
            sx={{ alignSelf: 'flex-start' }}
            variant="text"
          >
            Back to sign in
          </Button>
          <Paper elevation={2} sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Typography component="h1" variant="h4" fontWeight={700} gutterBottom>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
              Last updated: {siteConfig.lastUpdated}
            </Typography>
            {children}
          </Paper>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Questions? Contact{' '}
            <Link href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

export default LegalPageLayout;
