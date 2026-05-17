import React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getGoogleAuthRestrictionMessage, getPreferredBrowserName } from '../utils/authBrowser';

function SecureBrowserAuthNotice({ onOpenInBrowser, severity = 'warning', sx }) {
  const browserName = getPreferredBrowserName();

  return (
    <Alert
      severity={severity}
      sx={sx}
      action={
        onOpenInBrowser ? (
          <Button color="inherit" size="small" startIcon={<OpenInNewIcon />} onClick={onOpenInBrowser}>
            Open in {browserName}
          </Button>
        ) : null
      }
    >
      {getGoogleAuthRestrictionMessage()}
    </Alert>
  );
}

export default SecureBrowserAuthNotice;
