import React from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CoachChatPanel from './CoachChatPanel';
import useCoachChat from '../../hooks/useCoachChat';

function CoachChatWidget({ enabled = true }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
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
    suggestedPrompts
  } = useCoachChat({ enabled });

  const hasUnreadCoachNudge = badgeCount > 0;

  if (!enabled) {
    return null;
  }

  return (
    <>
      {!open ? (
        <Fab
          color="primary"
          aria-label={badgeCount > 0 ? `Open coach chat, ${badgeCount} unread` : 'Open coach chat'}
          onClick={openPanel}
          data-testid="coach-chat-fab"
          sx={{
            position: 'fixed',
            right: isMobile ? 16 : 24,
            bottom: isMobile ? 80 : 24,
            zIndex: (t) => t.zIndex.drawer,
            ...(hasUnreadCoachNudge
              ? {
                  animation: 'coachFabPulse 2s ease-in-out infinite',
                  '@keyframes coachFabPulse': {
                    '0%, 100%': { boxShadow: `0 0 0 0 ${theme.palette.primary.main}66` },
                    '50%': { boxShadow: `0 0 0 10px ${theme.palette.primary.main}00` }
                  }
                }
              : {})
          }}
        >
          <Badge badgeContent={badgeCount} color="error" max={9} overlap="circular">
            <SmartToyIcon />
          </Badge>
        </Fab>
      ) : null}

      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            zIndex: (t) => t.zIndex.modal,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: isMobile ? '16px 16px 0 0' : 3,
            bgcolor: 'background.paper',
            ...(isMobile
              ? {
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: '90vh',
                  maxHeight: '90vh'
                }
              : {
                  right: 24,
                  bottom: 24,
                  width: 400,
                  height: 560,
                  maxHeight: 'calc(100vh - 48px)'
                })
          }}
          data-testid="coach-chat-widget"
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              px: 0.5,
              pt: 0.5,
              flexShrink: 0
            }}
          >
            <IconButton aria-label="Close coach chat" onClick={closePanel} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, mt: -1 }}>
            <CoachChatPanel
              context={context}
              messages={messages}
              loadingContext={loadingContext}
              loadingHistory={loadingHistory}
              sending={sending}
              error={error}
              suggestedPrompts={suggestedPrompts}
              replySource={replySource}
              onSend={sendMessage}
              onRetry={retry}
            />
          </Box>
        </Paper>
      </Slide>
    </>
  );
}

export default CoachChatWidget;
