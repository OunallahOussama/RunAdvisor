import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

function AuthLegalNotice() {
  return (
    <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ lineHeight: 1.6 }}>
      By continuing, you agree to our{' '}
      <Link component={RouterLink} to="/cookies" underline="hover">
        Cookie Policy
      </Link>
      ,{' '}
      <Link component={RouterLink} to="/privacy" underline="hover">
        Privacy Policy
      </Link>
      , and{' '}
      <Link component={RouterLink} to="/about" underline="hover">
        Strava connectivity terms
      </Link>
      .
    </Typography>
  );
}

export default AuthLegalNotice;
