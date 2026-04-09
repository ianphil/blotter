import React, { useState, useEffect } from 'react';
import { AuthScreen } from './AuthScreen';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    window.electronAPI.auth.getStatus().then((status) => {
      setAuthenticated(status.authenticated);
      setChecking(false);
    });
  }, []);

  if (checking) {
    // Brief blank screen while checking credential manager
    return <div className="fixed inset-0 bg-background z-50" />;
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={() => setAuthenticated(true)} />;
  }

  return <>{children}</>;
}
