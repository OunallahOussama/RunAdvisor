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

function mapSendError(err) {
  if (!err?.response) {
    return 'Could not reach server. Check your connection and try again.';
  }

  const { status, data } = err.response;

  if (status === 401) {
    return 'Please sign in again to continue chatting with your coach.';
  }

  if (status === 429) {
    return data?.message || data?.error || 'Too many messages — please try again later.';
  }

  return data?.message || data?.error || 'Failed to send message';
}

function buildMessagesFromSendResponse(data, optimistic, trimmed) {
  const serverMessages = Array.isArray(data?.messages) ? data.messages : [];
  if (serverMessages.length > 0) {
    return serverMessages;
  }

  const reply = String(data?.reply || '').trim();
  const richContent = data?.richContent?.type && data.richContent.type !== 'none'
    ? data.richContent
    : undefined;
  const userMessage = {
    id: optimistic.id,
    role: 'user',
    content: trimmed,
    createdAt: optimistic.createdAt
  };
  const assistantMessage = {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: reply || "Coach couldn't generate a reply. Please try again.",
    richContent,
    createdAt: new Date().toISOString()
  };

  return [userMessage, assistantMessage];
}

export function useCoachChat({ enabled = true } = {}) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [replySource, setReplySource] = useState(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const openedRef = useRef(false);
  const sendingRef = useRef(false);

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
    if (!trimmed || sendingRef.current) {
      return;
    }

    const optimistic = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    sendingRef.current = true;
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    setError(null);

    try {
      const res = await coachChatApi.sendMessage(trimmed);
      const nextMessages = buildMessagesFromSendResponse(res?.data, optimistic, trimmed);
      setReplySource(res?.data?.source || null);
      setMessages(nextMessages);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Coach chat send failed:', err);
      }
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(mapSendError(err));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, []);

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
    replySource,
    suggestedPrompts: context?.suggestedPrompts || []
  };
}

export default useCoachChat;
