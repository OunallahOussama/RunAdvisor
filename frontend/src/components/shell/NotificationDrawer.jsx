import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const TYPE_ICONS = {
  weekly_report_ready: EventAvailableIcon,
  recommendation_ready: NotificationsActiveIcon,
  strava_sync_completed: SyncAltIcon,
  consent_reminder: InfoOutlinedIcon,
  session_today: NotificationsActiveIcon,
  system: InfoOutlinedIcon
};

function isToday(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatRelative(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 60 * 60_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.round(diff / (60 * 60_000))} hr ago`;
  return `${Math.round(diff / (24 * 60 * 60_000))} d ago`;
}

function NotificationItem({ item, onSelect }) {
  const Icon = TYPE_ICONS[item.type] || InfoOutlinedIcon;
  const isUnread = !item.readAt;

  return (
    <ListItemButton
      onClick={() => onSelect(item)}
      sx={{
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 3,
        mx: 1,
        my: 0.5,
        backgroundColor: isUnread ? 'action.selected' : 'transparent'
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }} noWrap>
            {item.title}
          </Typography>
          {isUnread ? <Chip color="primary" label="New" size="small" /> : null}
        </Stack>
        {item.body ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {item.body}
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {formatRelative(item.createdAt)}
        </Typography>
      </Box>
    </ListItemButton>
  );
}

function NotificationDrawer({
  open,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead
}) {
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const today = notifications.filter((n) => isToday(n.createdAt));
  const earlier = notifications.filter((n) => !isToday(n.createdAt));

  const handleSelect = async (item) => {
    if (!item.readAt && onMarkRead) {
      await onMarkRead(item.id);
    }
    const route = item.data?.route;
    onClose();
    if (route) {
      navigate(route);
    }
  };

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 380,
          maxWidth: '100vw',
          maxHeight: isMobile ? '85vh' : '100vh',
          borderTopLeftRadius: isMobile ? 24 : 0,
          borderTopRightRadius: isMobile ? 24 : 0
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {isMobile ? (
          <Box
            aria-hidden
            sx={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: 'divider',
              mt: 1
            }}
          />
        ) : null}
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" component="h2" sx={{ flex: 1 }}>
              Notifications
            </Typography>
            <IconButton aria-label="Close notifications" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : notifications.length === 0
                  ? "You're all caught up."
                  : 'No new notifications'}
            </Typography>
            <Button
              size="small"
              startIcon={<CheckCircleOutlineIcon fontSize="small" />}
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          {notifications.length === 0 ? (
            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">
                When new reports, recommendations, or syncs are ready, they will show up here.
              </Typography>
            </Box>
          ) : (
            <>
              {today.length > 0 ? (
                <>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ pl: 3, pt: 1, display: 'block' }}
                  >
                    Today
                  </Typography>
                  <List disablePadding>
                    {today.map((item) => (
                      <NotificationItem key={item.id} item={item} onSelect={handleSelect} />
                    ))}
                  </List>
                </>
              ) : null}
              {earlier.length > 0 ? (
                <>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ pl: 3, pt: 1, display: 'block' }}
                  >
                    Earlier
                  </Typography>
                  <List disablePadding>
                    {earlier.map((item) => (
                      <NotificationItem key={item.id} item={item} onSelect={handleSelect} />
                    ))}
                  </List>
                </>
              ) : null}
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

export default NotificationDrawer;
