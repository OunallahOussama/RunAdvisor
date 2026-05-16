import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { siteConfig } from '../config/site';

const footerLinks = [
  { label: 'About', to: '/about' },
  { label: 'Cookies', to: '/cookies' },
  { label: 'Privacy', to: '/privacy' }
];

function AppFooter({ compact = false }) {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: compact ? 2 : 3,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={compact ? 1 : 2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} {siteConfig.appName}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {footerLinks.map(({ label, to }) => (
              <Link key={to} component={RouterLink} to={to} variant="caption" underline="hover">
                {label}
              </Link>
            ))}
            <Link href={`mailto:${siteConfig.contactEmail}`} variant="caption" underline="hover">
              Contact
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

export default AppFooter;
