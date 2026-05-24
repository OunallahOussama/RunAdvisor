import React, { useCallback, useEffect, useRef, useState } from 'react';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import NotificationDrawer from './NotificationDrawer';
import { notificationsApi } from '../../services/api';

const POLL_INTERVAL_MS = 60_000;
const SHOWN_BROWSER_TAGS_KEY = 'runadvisor.notifications.shownBrowserTags';

function loadShownTags() {
  try {
    const raw = window.localStorage.getItem(SHOWN_BROWSER_TAGS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistShownTags(set) {
  try {
    const arr = Array.from(set).slice(-50);
    window.localStorage.setItem(SHOWN_BROWSER_TAGS_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

function NotificationBell({ enabled = true, consent }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const shownTagsRef = useRef(loadShownTags());
  const browserOptInRef = useRef(false);
  const browserOptIn = Boolean(consent?.notifications?.browser);

  useEffect(() => {
    browserOptInRef.current = browserOptIn;
  }, [browserOptIn]);

  const fetchNotifications = useCallback(async ({ surfaceBrowser = false } = {}) => {
    if (!enabled) {
      return;
    }
    try {
      const res = await notificationsApi.list({ limit: 20 });
      const next = res?.data?.notifications || [];
      setItems(next);
      setUnreadCount(Number(res?.data?.unreadCount || 0));

      if (
        surfaceBrowser &&
        browserOptInRef.current &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        const shown = shownTagsRef.current;
        const fresh = next.filter((n) => !n.readAt && !shown.has(String(n.id)));
        const latest = fresh[0];
        if (latest) {
          try {
            // eslint-disable-next-line no-new
            new window.Notification(latest.title || 'RunAdvisor', {
              body: latest.body || '',
              tag: `runadvisor-${latest.id}`,
              icon: '/icon-192.svg'
            });
            shown.add(String(latest.id));
            persistShownTags(shown);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore — show no toast for polling errors */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    fetchNotifications({ surfaceBrowser: true });

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications({ surfaceBrowser: true });
      }
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications({ surfaceBrowser: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, fetchNotifications]);

  const handleOpen = async () => {
    setOpen(true);

    if (
      browserOptInRef.current &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'default'
    ) {
      try {
        await window.Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }

    fetchNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
    } catch {
      /* still update locally */
    }
    setItems((current) => current.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* ignore */
    }
    setItems((current) => current.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          color="inherit"
          onClick={handleOpen}
          data-testid="notification-bell"
        >
          <Badge badgeContent={unreadCount} color="primary" max={9} overlap="circular">
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <NotificationDrawer
        open={open}
        onClose={() => setOpen(false)}
        notifications={items}
        unreadCount={unreadCount}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />
    </>
  );
}

export default NotificationBell;
