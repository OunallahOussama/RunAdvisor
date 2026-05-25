import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CoachRichMessage from './CoachRichMessage';
import { formatNumber } from '../../utils/weeklyPlanShared';

function formatSyncDate(value) {
  if (!value) {
    return 'No sync yet';
  }
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Recently synced';
  }
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <Box
      sx={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '92%',
        px: 1.5,
        py: 1,
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        bgcolor: isUser
          ? 'primary.main'
          : isSystem
            ? 'warning.main'
            : 'background.surfaceContainerHigh',
        color: isUser
          ? 'primary.contrastText'
          : isSystem
            ? 'warning.contrastText'
            : 'text.primary',
        boxShadow: 1
      }}
      data-testid={`coach-message-${message.role}`}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message.content}
      </Typography>
      {!isUser && message.richContent ? (
        <CoachRichMessage richContent={message.richContent} />
      ) : null}
    </Box>
  );
}

function ContextSkeleton() {
  return (
    <Stack spacing={1.5} sx={{ px: 2, py: 1 }}>
      <Skeleton variant="rounded" height={48} />
      <Skeleton variant="rounded" height={72} />
      <Skeleton variant="rounded" height={72} />
    </Stack>
  );
}

function ContextStrip({ context }) {
  const [expanded, setExpanded] = useState(false);
  const metrics = context?.keyMetrics;
  const nextTitle = context?.nextSession?.title;

  if (!metrics && !nextTitle) {
    return null;
  }

  const chips = [
    metrics?.totalDistanceKm != null
      ? { label: 'Distance', value: `${formatNumber(metrics.totalDistanceKm)} km` }
      : null,
    metrics?.acwr != null
      ? { label: 'ACWR', value: formatNumber(metrics.acwr, { digits: 2 }) }
      : null,
    nextTitle ? { label: 'Next', value: nextTitle } : null
  ].filter(Boolean);

  const fullMetrics = metrics
    ? [
        { label: 'Runs/week', value: formatNumber(metrics.runsPerWeek) },
        { label: 'Weekly load', value: formatNumber(metrics.weeklyLoad, { digits: 0 }) },
        { label: 'Monotony', value: formatNumber(metrics.monotony, { digits: 2 }) }
      ]
    : [];

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.surfaceContainer'
      }}
      data-testid="coach-context-strip"
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
          {chips.slice(0, 3).map((chip) => (
            <Chip
              key={chip.label}
              size="small"
              label={`${chip.label}: ${chip.value}`}
              sx={{ maxWidth: '100%' }}
            />
          ))}
        </Stack>
        <Chip
          size="small"
          variant="outlined"
          label={expanded ? 'Hide data' : 'View data'}
          onClick={() => setExpanded((v) => !v)}
          icon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          clickable
          data-testid="coach-context-toggle"
        />
      </Stack>
      <Collapse in={expanded}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {fullMetrics.map((m) => (
            <Chip key={m.label} size="small" variant="outlined" label={`${m.label}: ${m.value}`} />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

function CoachChatPanel({
  context,
  messages,
  loadingContext,
  loadingHistory,
  sending,
  error,
  suggestedPrompts,
  replySource,
  onSend,
  onRetry
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending, loadingContext]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) {
      return;
    }
    setInput('');
    onSend(text);
  };

  const handlePromptClick = (prompt) => {
    if (sending) {
      return;
    }
    onSend(prompt);
  };

  const showEmpty = !loadingContext && !loadingHistory && messages.length === 0;
  const syncLabel = formatSyncDate(context?.lastSyncAt || context?.lastSession?.date);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        bgcolor: 'background.paper'
      }}
      data-testid="coach-chat-panel"
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.surface'
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <SmartToyIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              RunAdvisor Coach
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Data copilot · Last sync {syncLabel}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {!loadingContext && context ? <ContextStrip context={context} /> : null}

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          bgcolor: 'background.default'
        }}
      >
        {loadingContext || loadingHistory ? <ContextSkeleton /> : null}

        {error ? (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'error.main',
              color: 'error.contrastText',
              opacity: 0.92
            }}
          >
            <Typography variant="body2" sx={{ flex: 1 }}>
              {error}
            </Typography>
            <IconButton size="small" color="inherit" onClick={onRetry} aria-label="Retry">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        ) : null}

        {showEmpty ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
              Chat with your training data — ask about your plan, load, or latest report.
            </Typography>
          </Box>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id || `${message.role}-${message.createdAt}`} message={message} />
        ))}

        {replySource === 'rules' && messages.some((m) => m.role === 'assistant') ? (
          <Chip
            label="Training data analysis"
            size="small"
            variant="outlined"
            sx={{ alignSelf: 'flex-start', ml: 0.5, fontSize: '0.7rem', height: 22 }}
            data-testid="coach-reply-source-chip"
          />
        ) : null}

        {replySource === 'openai' && messages.some((m) => m.role === 'assistant') ? (
          <Chip
            label="AI coach"
            size="small"
            variant="outlined"
            color="primary"
            sx={{ alignSelf: 'flex-start', ml: 0.5, fontSize: '0.7rem', height: 22 }}
            data-testid="coach-reply-source-openai"
          />
        ) : null}

        {sending ? (
          <Box sx={{ alignSelf: 'flex-start', px: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} aria-label="Coach is typing" />
            <Typography variant="caption" color="text.secondary">
              Coach is typing…
            </Typography>
          </Box>
        ) : null}
        <div ref={scrollRef} />
      </Box>

      {suggestedPrompts.length > 0 ? (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.surface',
            overflowX: 'auto',
            display: 'flex',
            gap: 0.75,
            flexWrap: 'nowrap'
          }}
          data-testid="coach-suggested-prompts-row"
        >
          {suggestedPrompts.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              size="small"
              clickable
              onClick={() => handlePromptClick(prompt)}
              disabled={sending || loadingContext}
              sx={{
                flexShrink: 0,
                bgcolor: 'background.surfaceContainer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              data-testid="coach-suggested-prompt"
            />
          ))}
        </Box>
      ) : null}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          px: 1.5,
          py: 1.25,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.surface'
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask your coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || loadingContext}
          inputProps={{ 'aria-label': 'Message to coach', maxLength: 2000 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={!input.trim() || sending || loadingContext}
                  aria-label="Send message"
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
            sx: { borderRadius: 3, bgcolor: 'background.paper' }
          }}
        />
      </Box>
    </Box>
  );
}

export default CoachChatPanel;
