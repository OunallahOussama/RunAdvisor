import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const ApiNotificationContext = createContext(null);

export function ApiNotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, severity = 'info') => {
    if (!message) {
      return;
    }

    setNotification({ message, severity });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const value = useMemo(() => ({
    showNotification,
    clearNotification
  }), [clearNotification, showNotification]);

  return (
    <ApiNotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={notification?.severity === 'error' ? 8000 : 5000}
        onClose={clearNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification ? (
          <Alert onClose={clearNotification} severity={notification.severity} variant="filled" sx={{ width: 1 }}>
            {notification.message}
          </Alert>
        ) : null}
      </Snackbar>
    </ApiNotificationContext.Provider>
  );
}

export function useApiNotification() {
  const context = useContext(ApiNotificationContext);

  if (!context) {
    throw new Error('useApiNotification must be used within ApiNotificationProvider');
  }

  return context;
}
