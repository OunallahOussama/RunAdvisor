import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { socialApi } from '../services/api';
import { useScreenChrome } from '../context/AppShellContext';
import FeedRow from '../components/FeedRow';
import MemberUserRow from '../components/social/MemberUserRow';

function Community() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [feed, setFeed] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useScreenChrome({ title: 'Community' });

  const reload = useCallback(async () => {
    const [friendsRes, feedRes, convoRes, incomingRes] = await Promise.all([
      socialApi.getFriends(),
      socialApi.getFeed(),
      socialApi.getConversations(),
      socialApi.getIncomingFriendRequests()
    ]);
    setFriends(friendsRes.data?.friends || []);
    setFeed(feedRes.data?.feed || []);
    setConversations(convoRes.data?.conversations || []);
    setIncoming(incomingRes.data?.requests || []);
  }, []);

  useEffect(() => {
    reload().catch((err) => {
      setError(err.response?.data?.message || 'Could not load community.');
    });
  }, [reload]);

  const openThread = useCallback(async (peerId) => {
    setActivePeer(peerId);
    const res = await socialApi.getThread(peerId);
    setThread(res.data?.messages || []);
    setTab(2);
  }, []);

  useEffect(() => {
    const state = location.state;
    if (!state?.peerId && state?.tab == null) {
      return;
    }
    if (state.tab != null) {
      setTab(state.tab);
    }
    if (state.peerId) {
      openThread(state.peerId);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, openThread]);

  const sendMessage = async () => {
    if (!activePeer || !draft.trim()) return;
    await socialApi.sendMessage(activePeer, draft.trim());
    setDraft('');
    const res = await socialApi.getThread(activePeer);
    setThread(res.data?.messages || []);
    await reload();
  };

  const handleAccept = async (requestId) => {
    await socialApi.acceptFriendRequest(requestId);
    await reload();
  };

  const handleReject = async (requestId) => {
    await socialApi.rejectFriendRequest(requestId);
    await reload();
  };

  const handleFriendRequest = async (userId) => {
    await socialApi.sendFriendRequest(userId);
    await reload();
  };

  const peerUser =
    friends.find((f) => f.id === activePeer) ||
    conversations.find((c) => c.peer?.id === activePeer)?.peer;

  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <Box component="section">
      <Alert severity="info" sx={{ mb: 2 }}>
        Add friends who use RunAdvisor. Tap the search icon in the top bar to find athletes by name or email.
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Feed" />
        <Tab label={`Friends${incoming.length ? ` (${incoming.length})` : ''}`} />
        <Tab
          label={
            unreadMessages > 0 ? (
              <Badge badgeContent={unreadMessages} color="error">
                Messages
              </Badge>
            ) : (
              'Messages'
            )
          }
        />
      </Tabs>

      {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert> : null}

      {tab === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Activity from friends & people you follow
            </Typography>
            {feed.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Add friends on the Friends tab to see their shared runs here.
              </Typography>
            ) : (
              <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
                {feed.map((item) => (
                  <Box key={item._id} sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.author?.name || 'Runner'}
                    </Typography>
                    <FeedRow activity={{ ...item, _id: item._id || item.id }} />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === 1 ? (
        <Stack spacing={2}>
          {incoming.length > 0 ? (
            <Card variant="outlined" sx={{ borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Friend requests ({incoming.length})
                </Typography>
                {incoming.map((req) => (
                  <Stack key={req.requestId} direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                    <Avatar src={req.from?.picture} sx={{ width: 36, height: 36 }}>
                      {(req.from?.name || '?').slice(0, 1)}
                    </Avatar>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {req.from?.name}
                    </Typography>
                    <Button size="small" variant="contained" onClick={() => handleAccept(req.requestId)}>
                      Accept
                    </Button>
                    <Button size="small" variant="text" onClick={() => handleReject(req.requestId)}>
                      Decline
                    </Button>
                  </Stack>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Your friends ({friends.length})
              </Typography>
              {friends.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No friends yet. Use the search icon in the top bar to find someone on RunAdvisor.
                </Typography>
              ) : (
                friends.map((user) => (
                  <MemberUserRow
                    key={user.id}
                    user={user}
                    onFollow={async (id) => { await socialApi.follow(id); await reload(); }}
                    onUnfollow={async (id) => { await socialApi.unfollow(id); await reload(); }}
                    onFriendRequest={handleFriendRequest}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onMessage={openThread}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </Stack>
      ) : null}

      {tab === 2 ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Card variant="outlined" sx={{ width: { md: 280 }, flexShrink: 0 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Conversations
              </Typography>
              {conversations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Message friends after they accept your request.
                </Typography>
              ) : (
                conversations.map((convo) => (
                  <Button
                    key={convo.peer?.id}
                    fullWidth
                    variant={activePeer === convo.peer?.id ? 'contained' : 'text'}
                    sx={{ justifyContent: 'flex-start', mb: 0.5 }}
                    onClick={() => openThread(convo.peer.id)}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: 1 }}>
                      <Badge color="error" variant="dot" invisible={!convo.unreadCount}>
                        <Avatar src={convo.peer?.picture} sx={{ width: 28, height: 28 }}>
                          {(convo.peer?.name || '?').slice(0, 1)}
                        </Avatar>
                      </Badge>
                      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {convo.peer?.name}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 180, display: 'block' }}>
                          {convo.lastMessage?.body}
                        </Typography>
                      </Box>
                    </Stack>
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              {activePeer && peerUser ? (
                <>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {peerUser.name}
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 320, overflow: 'auto', mb: 2 }}>
                    {thread.map((msg) => (
                      <Box
                        key={msg.id}
                        sx={{
                          alignSelf: msg.isMine ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          bgcolor: msg.isMine ? 'primary.main' : 'action.hover',
                          color: msg.isMine ? 'primary.contrastText' : 'text.primary'
                        }}
                      >
                        <Typography variant="body2">{msg.body}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <Button variant="contained" onClick={sendMessage} disabled={!draft.trim()}>
                      Send
                    </Button>
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a friend to chat. Only mutual friends can message each other.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </Box>
  );
}

export default Community;
