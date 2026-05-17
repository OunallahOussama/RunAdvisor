import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';

function DeleteActivityDialog({
  open,
  activity,
  stravaConnected,
  deleting = false,
  onClose,
  onConfirm
}) {
  const hasStravaLink = Boolean(activity?.stravaActivityId);
  const [deleteFromStrava, setDeleteFromStrava] = useState(hasStravaLink);

  useEffect(() => {
    if (open) {
      setDeleteFromStrava(hasStravaLink);
    }
  }, [open, hasStravaLink]);

  if (!activity) {
    return null;
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={deleting ? undefined : onClose} open={open}>
      <DialogTitle>Delete activity?</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Remove <strong>{activity.name}</strong> from your RunAdvisor log?
        </Typography>
        {hasStravaLink ? (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteFromStrava}
                  disabled={!stravaConnected || deleting}
                  onChange={(event) => setDeleteFromStrava(event.target.checked)}
                />
              }
              label="Also delete from Strava"
              sx={{ mt: 1, display: 'flex', alignItems: 'flex-start' }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -0.5 }}>
              Strava activity ID {activity.stravaActivityId}. This cannot be undone on Strava.
            </Typography>
            {!stravaConnected && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Strava is not connected. The activity will only be removed from RunAdvisor unless you reconnect
                Strava first.
              </Alert>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This entry is not linked to Strava, so it will only be removed from RunAdvisor.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button disabled={deleting} onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="error"
          disabled={deleting}
          onClick={() => onConfirm({ deleteFromStrava: hasStravaLink && deleteFromStrava })}
          variant="contained"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteActivityDialog;
