import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong.'
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RunAdvisor UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
        <Box sx={{ maxWidth: 480, width: 1 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {this.state.message}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try reloading the page. If the problem continues, sign out and sign back in.
          </Typography>
          <Button variant="contained" onClick={this.handleReload}>
            Reload RunAdvisor
          </Button>
        </Box>
      </Box>
    );
  }
}

export default ErrorBoundary;
