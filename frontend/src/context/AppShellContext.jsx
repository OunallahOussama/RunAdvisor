import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Cross-cutting state for the M3 app shell: the screen title shown in
 * the top bar, the page-defined "primary action" (rendered as a FAB on
 * mobile / contained button on desktop), and a small bus for triggering
 * the onboarding stepper from anywhere (e.g. profile menu -> Replay
 * tour).
 */
const AppShellContext = createContext(null);

export function AppShellProvider({ children }) {
  const [title, setTitle] = useState('RunAdvisor');
  const [primaryAction, setPrimaryActionState] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const titleRef = useRef('RunAdvisor');

  const setScreenTitle = useCallback((value) => {
    titleRef.current = value || 'RunAdvisor';
    setTitle(titleRef.current);
  }, []);

  const setPrimaryAction = useCallback((action) => {
    setPrimaryActionState(action || null);
  }, []);

  const openOnboarding = useCallback(() => setOnboardingOpen(true), []);
  const closeOnboarding = useCallback(() => setOnboardingOpen(false), []);

  const value = useMemo(() => ({
    title,
    setScreenTitle,
    primaryAction,
    setPrimaryAction,
    onboardingOpen,
    openOnboarding,
    closeOnboarding
  }), [title, setScreenTitle, primaryAction, setPrimaryAction, onboardingOpen, openOnboarding, closeOnboarding]);

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    return {
      title: 'RunAdvisor',
      setScreenTitle: () => {},
      primaryAction: null,
      setPrimaryAction: () => {},
      onboardingOpen: false,
      openOnboarding: () => {},
      closeOnboarding: () => {}
    };
  }
  return ctx;
}

/**
 * Convenience hook: pages call this in a useEffect to declare their
 * screen title and (optionally) primary action for the AppShell.
 *
 * The hook keeps the action up-to-date even when callers pass an
 * inline-object on every render: we re-read the latest action through a
 * ref, so React effects don't loop on identity changes.
 */
export function useScreenChrome({ title, primaryAction } = {}) {
  const { setScreenTitle, setPrimaryAction } = useAppShell();
  const actionRef = useRef(primaryAction);
  actionRef.current = primaryAction;

  useEffect(() => {
    if (title) {
      setScreenTitle(title);
    }
  }, [title, setScreenTitle]);

  const hasAction = Boolean(primaryAction);
  const label = primaryAction?.label;

  useEffect(() => {
    if (!hasAction) {
      setPrimaryAction(null);
      return undefined;
    }

    setPrimaryAction({
      label,
      icon: actionRef.current?.icon,
      onClick: (...args) => actionRef.current?.onClick?.(...args)
    });

    return () => setPrimaryAction(null);
  }, [hasAction, label, setPrimaryAction]);
}
