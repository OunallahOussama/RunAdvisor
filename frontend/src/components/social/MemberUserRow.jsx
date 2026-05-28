import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Compact row for member search / friends lists.
 */
function MemberUserRow({
  user,
  onFollow,
  onUnfollow,
  onFriendRequest,
  onAccept,
  onReject,
  onMessage,
  compact = false
}) {
  const avatarSize = compact ? 36 : 40;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: compact ? 0.75 : 1 }}>
      <Avatar src={user.picture} sx={{ width: avatarSize, height: avatarSize }}>
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
            {onMessage ? (
              <Button size="small" variant="outlined" onClick={() => onMessage(user.id)}>
                Message
              </Button>
            ) : null}
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
        ) : onFriendRequest ? (
          <Button size="small" variant="contained" onClick={() => onFriendRequest(user.id)}>
            Add friend
          </Button>
        ) : null}
        {!user.isFriend && user.friendRequestStatus !== 'outgoing' && onFollow && onUnfollow ? (
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

export default MemberUserRow;
