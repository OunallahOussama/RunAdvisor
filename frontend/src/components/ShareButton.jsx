import React, { useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { socialApi } from '../services/api';

function buildTwitterUrl(share) {
  const params = new URLSearchParams({
    text: share.text,
    url: share.url
  });
  return `https://twitter.com/intent/tweet?${params}`;
}

function buildFacebookUrl(share) {
  const params = new URLSearchParams({ u: share.url });
  return `https://www.facebook.com/sharer/sharer.php?${params}`;
}

function buildWhatsAppUrl(share) {
  const params = new URLSearchParams({ text: `${share.text} ${share.url}` });
  return `https://wa.me/?${params}`;
}

function ShareButton({ activityId, variant = 'icon', size = 'small' }) {
  const [anchor, setAnchor] = useState(null);
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(false);

  const openMenu = async (event) => {
    setAnchor(event.currentTarget);
    if (share || !activityId) {
      return;
    }

    setLoading(true);
    try {
      const res = await socialApi.getActivityShare(activityId, window.location.origin);
      setShare(res.data?.share || null);
    } catch {
      setShare({
        title: 'My run',
        text: 'Check out my run on RunAdvisor',
        url: `${window.location.origin}/activities/${activityId}`
      });
    } finally {
      setLoading(false);
    }
  };

  const close = () => setAnchor(null);

  const handleNativeShare = async () => {
    if (!share) return;
    close();
    if (navigator.share) {
      try {
        await navigator.share({ title: share.title, text: share.text, url: share.url });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard?.writeText(`${share.text}\n${share.url}`);
  };

  const openLink = (url) => {
    close();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const trigger = variant === 'button' ? (
    <Button size={size} variant="outlined" startIcon={<ShareIcon />} onClick={openMenu} disabled={!activityId}>
      Share
    </Button>
  ) : (
    <IconButton size={size} aria-label="Share activity" onClick={openMenu} disabled={!activityId}>
      <ShareIcon fontSize="small" />
    </IconButton>
  );

  return (
    <>
      {trigger}
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={handleNativeShare} disabled={loading}>
          <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={navigator.share ? 'Share…' : 'Copy link'} />
        </MenuItem>
        {share ? (
          <>
            <MenuItem onClick={() => openLink(buildTwitterUrl(share))}>
              <ListItemText primary="Post on X" />
            </MenuItem>
            <MenuItem onClick={() => openLink(buildFacebookUrl(share))}>
              <ListItemText primary="Facebook" />
            </MenuItem>
            <MenuItem onClick={() => openLink(buildWhatsAppUrl(share))}>
              <ListItemText primary="WhatsApp" />
            </MenuItem>
            <MenuItem
              onClick={async () => {
                await navigator.clipboard?.writeText(`${share.text}\n${share.url}`);
                close();
              }}
            >
              <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Copy text" />
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  );
}

export default ShareButton;
