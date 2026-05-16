import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const RunAdvisorProfileContext = createContext(null);

const PROFILE_POLL_MS = 60_000;

export function RunAdvisorProfileProvider({ children, enabled = false }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshProfile = useCallback(async (nextProfile) => {
    if (nextProfile) {
      setProfile(nextProfile);
      return nextProfile;
    }

    if (!enabled) {
      return null;
    }

    try {
      setLoading(true);
      const response = await authApi.getProfile();
      const user = response.data.user;
      setProfile(user);
      return user;
    } catch (error) {
      console.error('Failed to load RunAdvisor profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    refreshProfile();

    const onFocus = () => {
      refreshProfile();
    };

    window.addEventListener('focus', onFocus);
    const intervalId = window.setInterval(() => {
      refreshProfile();
    }, PROFILE_POLL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [enabled, refreshProfile]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      refreshProfile
    }),
    [profile, loading, refreshProfile]
  );

  return (
    <RunAdvisorProfileContext.Provider value={value}>
      {children}
    </RunAdvisorProfileContext.Provider>
  );
}

export function useRunAdvisorProfile() {
  const context = useContext(RunAdvisorProfileContext);

  if (!context) {
    throw new Error('useRunAdvisorProfile must be used within RunAdvisorProfileProvider');
  }

  return context;
}
