import { useCallback, useEffect, useRef, useState } from 'react';
import {
  coachChatApi,
  notificationsApi,
  COACH_NOTIFICATION_TYPES
} from '../services/api';

const POLL_INTERVAL_MS = 60_000;

function filterCoachNotifications(notifications = []) {
  return notifications.filter((n) => COACH_NOTIFICATION_TYPES.includes(n.type) && !n.readAt);
}

export function useCoachChat({ enabled = true } = {}) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const openedRef = useRef(false);

  const fetchBadgeCount = useCallback(async () => {
    if (!enabled) {
      return;
    }
    try {
      const res = await notificationsApi.list({ unread: true, limit: 50 });
      const coachUnread = filterCoachNotifications(res?.data?.notifications || []);
      setBadgeCount(coachUnread.length);
    } catch {
      /* ignore polling errors */
    }
  }, [enabled]);

  const loadContext = useCallback(async () => {
    if (!enabled) {
      return null;
    }
    setLoadingContext(true);
    setError(null);
    try {
      const res = await coachChatApi.getContext();
      const payload = res?.data || {};
      setContext(payload);
      return payload;
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load coach context');
      return null;
    } finally {
      setLoadingContext(false);
    }
  }, [enabled]);

  const loadHistory = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await coachChatApi.getHistory(20);
      setMessages(res?.data?.messages || []);
    } catch {
      /* history is optional on first open */
    } finally {
      setLoadingHistory(false);
    }
  }, [enabled]);

  const markCoachRead = useCallback(async () => {
    try {
      await coachChatApi.markCoachNotificationsRead();
    } catch {
      /* still clear badge locally */
    }
    setBadgeCount(0);
  }, []);

  const openPanel = useCallback(async () => {
    setOpen(true);
    if (!openedRef.current) {
      openedRef.current = true;
      await Promise.all([loadContext(), loadHistory()]);
    } else {
      loadContext();
    }
    markCoachRead();
  }, [loadContext, loadHistory, markCoachRead]);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || sending) {
      return;
    }

    const optimistic = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    setError(null);

    try {
      const res = await coachChatApi.sendMessage(trimmed);
      setMessages(res?.data?.messages || []);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [sending]);

  const retry = useCallback(async () => {
    setError(null);
    await Promise.all([loadContext(), loadHistory()]);
  }, [loadContext, loadHistory]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    fetchBadgeCount();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !open) {
        fetchBadgeCount();
      }
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !open) {
        fetchBadgeCount();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, open, fetchBadgeCount]);

  return {
    open,
    openPanel,
    closePanel,
    context,
    messages,
    loadingContext,
    loadingHistory,
    sending,
    error,
    badgeCount,
    sendMessage,
    retry,
    suggestedPrompts: context?.suggestedPrompts || []
  };
}

export default useCoachChat;
