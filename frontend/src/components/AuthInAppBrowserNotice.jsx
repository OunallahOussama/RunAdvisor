import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  getPublicLoginUrl,
  getRestrictedAuthBrowserMessage,
  isRestrictedAuthBrowser
} from '../utils/authBrowser';

function AuthInAppBrowserNotice({ loginPath = '/login' }) {
  const [copied, setCopied] = useState(false);

  if (!isRestrictedAuthBrowser()) {
    return null;
  }

  const loginUrl = getPublicLoginUrl(loginPath);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Alert severity="warning" sx={{ width: 1, textAlign: 'left' }}>
      <AlertTitle>Google sign-in needs a full browser</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {getRestrictedAuthBrowserMessage()}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button href={loginUrl} rel="noopener noreferrer" size="small" target="_blank" variant="outlined">
          Open in browser
        </Button>
        <Button onClick={handleCopy} size="small" variant="text">
          {copied ? 'Link copied' : 'Copy site link'}
        </Button>
      </Stack>
    </Alert>
  );
}

export default AuthInAppBrowserNotice;
