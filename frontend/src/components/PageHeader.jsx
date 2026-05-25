import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

/** Minimal page title — app bar already shows context; keep copy short. */
function PageHeader({ title, subtitle, action }) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        {title ? (
          <Typography variant="h5" component="h1" fontWeight={700} id="page-heading">
            {title}
          </Typography>
        ) : null}
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: title ? 0.25 : 0 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Stack>
  );
}

export default PageHeader;
