import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { socialApi } from '../../services/api';
import MemberUserRow from './MemberUserRow';

const MIN_QUERY = 3;
const DEBOUNCE_MS = 350;

function MemberSearchDialog({ open, onClose }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const reset = useCallback(() => {
    setQuery('');
    setUsers([]);
    setError('');
    setSearched(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return undefined;
    }

    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setUsers([]);
      setSearched(false);
      setError('');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await socialApi.searchUsers(q);
        setUsers(res.data?.users || []);
        setSearched(true);
        setError('');
      } catch (err) {
        setUsers([]);
        setSearched(true);
        setError(err.response?.data?.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [open, query, reset]);

  const handleClose = () => {
    onClose();
    reset();
  };

  const refreshResults = async () => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      return;
    }
    const res = await socialApi.searchUsers(q);
    setUsers(res.data?.users || []);
  };

  const handleMessage = (userId) => {
    handleClose();
    navigate('/community', { state: { tab: 2, peerId: userId } });
  };

  const handleFriendRequest = async (userId) => {
    await socialApi.sendFriendRequest(userId);
    await refreshResults();
  };

  const hint =
    query.trim().length < MIN_QUERY
      ? `Type at least ${MIN_QUERY} characters to find a runner`
      : loading
        ? 'Searching…'
        : searched && users.length === 0
          ? 'No matching members'
          : null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3 } }}
    >
      <DialogTitle sx={{ pb: 1, pr: 6 }}>
        <Typography variant="h6" fontWeight={700}>
          Find athletes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Search RunAdvisor members by name or email
        </Typography>
        <IconButton
          aria-label="Close search"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={18} />
              </InputAdornment>
            ) : null
          }}
          sx={{ mb: 1.5 }}
        />

        {error ? (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}

        {hint ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {hint}
          </Typography>
        ) : null}

        {users.length > 0 ? (
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
            {users.map((user) => (
              <MemberUserRow
                key={user.id}
                user={user}
                compact
                onFollow={async (id) => {
                  await socialApi.follow(id);
                  await refreshResults();
                }}
                onUnfollow={async (id) => {
                  await socialApi.unfollow(id);
                  await refreshResults();
                }}
                onFriendRequest={handleFriendRequest}
                onAccept={async (requestId) => {
                  await socialApi.acceptFriendRequest(requestId);
                  await refreshResults();
                }}
                onReject={async (requestId) => {
                  await socialApi.rejectFriendRequest(requestId);
                  await refreshResults();
                }}
                onMessage={handleMessage}
              />
            ))}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default MemberSearchDialog;
