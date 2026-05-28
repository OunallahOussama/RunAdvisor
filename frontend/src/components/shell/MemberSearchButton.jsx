import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import MemberSearchDialog from '../social/MemberSearchDialog';

function MemberSearchButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Find athletes">
        <IconButton
          aria-label="Find athletes"
          color="inherit"
          size="small"
          onClick={() => setOpen(true)}
          data-testid="member-search-button"
        >
          <SearchIcon />
        </IconButton>
      </Tooltip>
      <MemberSearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default MemberSearchButton;
