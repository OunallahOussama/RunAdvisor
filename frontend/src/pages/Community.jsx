import React, { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { socialApi } from '../services/api';
import { useScreenChrome } from '../context/AppShellContext';
import FeedRow from '../components/FeedRow';

function UserRow({ user, onFollow, onUnfollow, onFriendRequest, onAccept, onReject, onMessage }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
      <Avatar src={user.picture} sx={{ width: 40, height: 40 }}>
        {(user.name || '?').slice(0, 1)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {user.name}
        </Typography>
        {user.socialBio ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            {user.socialBio}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            RunAdvisor member
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
        {user.isFriend ? (
          <>
            <Chip size="small" label="Friend" color="success" />
            <Button size="small" variant="outlined" onClick={() => onMessage(user.id)}>
              Message
            </Button>
          </>
        ) : user.friendRequestStatus === 'incoming' ? (
          <>
            <Button size="small" variant="contained" onClick={() => onAccept(user.incomingRequestId)}>
              Accept
            </Button>
            <Button size="small" variant="text" onClick={() => onReject(user.incomingRequestId)}>
              Decline
            </Button>
          </>
        ) : user.friendRequestStatus === 'outgoing' ? (
          <Chip size="small" label="Requested" variant="outlined" />
        ) : (
          <Button size="small" variant="contained" onClick={() => onFriendRequest(user.id)}>
            Add friend
          </Button>
        )}
        {!user.isFriend && user.friendRequestStatus !== 'outgoing' ? (
          user.isFollowing ? (
            <Button size="small" variant="text" onClick={() => onUnfollow(user.id)}>
              Following
            </Button>
          ) : (
            <Button size="small" variant="text" onClick={() => onFollow(user.id)}>
              Follow
            </Button>
          )
        ) : null}
      </Stack>
    </Stack>
  );
}

function Community() {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [feed, setFeed] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useScreenChrome({ title: 'Community' });

  const reload = useCallback(async () => {
    const [friendsRes, feedRes, convoRes, incomingRes, membersRes] = await Promise.all([
      socialApi.getFriends(),
      socialApi.getFeed(),
      socialApi.getConversations(),
      socialApi.getIncomingFriendRequests(),
      socialApi.getMembers()
    ]);
    setFriends(friendsRes.data?.friends || []);
    setFeed(feedRes.data?.feed || []);
    setConversations(convoRes.data?.conversations || []);
    setIncoming(incomingRes.data?.requests || []);
    setMembers(membersRes.data?.members || []);
  }, []);

  useEffect(() => {
    reload().catch((err) => {
      setError(err.response?.data?.message || 'Could not load community.');
    });
  }, [reload]);

  const searchUsers = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError('');
    try {
      const res = await socialApi.searchUsers(query.trim());
      setUsers(res.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (peerId) => {
    setActivePeer(peerId);
    const res = await socialApi.getThread(peerId);
    setThread(res.data?.messages || []);
    setTab(2);
  };

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
    setUsers([]);
    await reload();
  };

  const handleReject = async (requestId) => {
    await socialApi.rejectFriendRequest(requestId);
    await reload();
  };

  const handleFriendRequest = async (userId) => {
    await socialApi.sendFriendRequest(userId);
    if (query.trim().length >= 2) {
      await searchUsers();
    }
    await reload();
  };

  const peerUser =
    friends.find((f) => f.id === activePeer) ||
    users.find((u) => u.id === activePeer) ||
    members.find((m) => m.id === activePeer) ||
    conversations.find((c) => c.peer?.id === activePeer)?.peer;

  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <Box component="section">
      <Alert severity="info" sx={{ mb: 2 }}>
        Add friends who signed in to RunAdvisor. Search by name or email — this is separate from Strava sync.
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search members"
                  placeholder="Name or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button variant="contained" onClick={searchUsers} disabled={loading || query.trim().length < 2}>
                  Search
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Your friends ({friends.length})
              </Typography>
              {friends.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No friends yet. Search above or add someone from recent members.
                </Typography>
              ) : (
                friends.map((user) => (
                  <UserRow
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

          {users.length > 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Search results
                </Typography>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onFollow={async (id) => { await socialApi.follow(id); await searchUsers(); await reload(); }}
                    onUnfollow={async (id) => { await socialApi.unfollow(id); await searchUsers(); }}
                    onFriendRequest={handleFriendRequest}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onMessage={openThread}
                  />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Recent members
                </Typography>
                {members.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No other members visible yet. Invite someone to sign up to RunAdvisor.
                  </Typography>
                ) : (
                  members.map((user) => (
                    <UserRow
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
          )}
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
