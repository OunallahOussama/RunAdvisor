import { useCallback, useEffect, useMemo, useState } from 'react';

function getStandaloneState() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function usePwaInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(getStandaloneState);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    const handleInstalled = () => {
      setInstallPromptEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptToInstall = useCallback(async () => {
    if (!installPromptEvent) {
      return false;
    }

    installPromptEvent.prompt();
    const result = await installPromptEvent.userChoice;

    if (result.outcome === 'accepted') {
      setInstallPromptEvent(null);
      setIsInstalled(true);
      return true;
    }

    return false;
  }, [installPromptEvent]);

  return useMemo(() => ({
    canInstall: Boolean(installPromptEvent) && !isInstalled,
    isInstalled,
    promptToInstall
  }), [installPromptEvent, isInstalled, promptToInstall]);
}
