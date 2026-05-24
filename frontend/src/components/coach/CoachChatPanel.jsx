import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        px: 1.5,
        py: 1,
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        bgcolor: isUser ? 'primary.main' : 'background.surfaceContainerHigh',
        color: isUser ? 'primary.contrastText' : 'text.primary',
        boxShadow: 1
      }}
      data-testid={`coach-message-${message.role}`}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message.content}
      </Typography>
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

function CoachChatPanel({
  context,
  messages,
  loadingContext,
  loadingHistory,
  sending,
  error,
  suggestedPrompts,
  onSend,
  onRetry
}) {
  const [input, setInput] = React.useState('');
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
        <Typography variant="subtitle1" fontWeight={700}>
          Running Coach
        </Typography>
        {context?.lastSession ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            Last run: {context.lastSession.name}
            {context.lastSession.distanceKm ? ` · ${context.lastSession.distanceKm} km` : ''}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Sync a run to get personalized feedback
          </Typography>
        )}
      </Box>

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
              Ask about your last session or what to improve next.
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
              {suggestedPrompts.map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  size="small"
                  clickable
                  onClick={() => handlePromptClick(prompt)}
                  sx={{
                    bgcolor: 'background.surfaceContainer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  data-testid="coach-suggested-prompt"
                />
              ))}
            </Stack>
          </Box>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id || `${message.role}-${message.createdAt}`} message={message} />
        ))}

        {sending ? (
          <Box sx={{ alignSelf: 'flex-start', px: 1 }}>
            <CircularProgress size={20} aria-label="Coach is typing" />
          </Box>
        ) : null}
        <div ref={scrollRef} />
      </Box>

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
