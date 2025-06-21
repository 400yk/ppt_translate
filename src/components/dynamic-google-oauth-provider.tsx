'use client';

import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useTranslation } from '@/lib/i18n';

interface DynamicGoogleOAuthProviderProps {
  clientId: string;
  children: React.ReactNode;
}

export function DynamicGoogleOAuthProvider({ clientId, children }: DynamicGoogleOAuthProviderProps) {
  const { locale } = useTranslation();

  // Track whether the GIS script has loaded for current locale
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(locale);

  useEffect(() => {
    // Helper to inject script with desired locale
    const injectScript = (loc: string) => {
      const script = document.createElement('script');
      script.src = `https://accounts.google.com/gsi/client?hl=${loc}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Once loaded, mark ready so provider can render children
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        console.error(`Failed to load Google Identity script for locale ${loc}`);
        // Even if it fails, unblock rendering to avoid infinite spinner
        setIsScriptLoaded(true);
      };
      document.head.appendChild(script);
    };

    // If locale has changed, remove existing script & reload
    if (currentLocale !== locale) {
      setCurrentLocale(locale);

      // Remove any existing GIS script tags
      document.querySelectorAll('script[src*="accounts.google.com/gsi/client"]').forEach((el) => el.parentNode?.removeChild(el));
      // Clean cached global to force re-init with new language
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).google) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete (window as any).google;
      }
      setIsScriptLoaded(false);
      injectScript(locale);
    } else if (!isScriptLoaded) {
      // Initial load
      injectScript(locale);
    }
  }, [locale, currentLocale, isScriptLoaded]);

  // Optional: simple fallback until script loads
  if (!isScriptLoaded) {
    return <div style={{ display: 'none' }} />;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
}
