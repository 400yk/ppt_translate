'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';

interface GoogleSignInButtonProps {
  /** Optional invitation code passed during registration */
  invitationCode?: string;
  /** Optional width in px (defaults to automatic) */
  width?: number;
}

// Extend the Window type so TypeScript knows about the Google Identity object that
// the GIS script attaches at runtime.
declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Lightweight wrapper around the new Google Identity Services JS SDK.
 * Loads the SDK with the current locale (e.g. `?hl=ja`) and renders a
 *   "Sign in with Google" button that will automatically translate.
 * We avoid the `@react-oauth/google` package because it always loads the
 * SDK in English and ignores the locale, which caused UX issues.
 */
export default function GoogleSignInButton({ invitationCode, width }: GoogleSignInButtonProps) {
  const { locale, t } = useTranslation();
  const { toast } = useToast();
  const { signInWithGoogle } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);

  // Map app locales to Google-supported locale codes.
  const mapToGoogleLocale = (appLocale: string): string => {
    switch (appLocale) {
      case 'zh':
        return 'zh-CN';
      case 'pt':
        return 'pt-BR';
      case 'es':
        return 'es-419';
      default:
        return appLocale; // ja, ko, en, fr, de … all match directly
    }
  };

  useEffect(() => {
    const googleLocale = mapToGoogleLocale(locale);

    // Helper – ensure GIS is initialised with our client id
    const initialiseGoogle = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) return;

      // Clear any previously rendered button so we can re-render with new locale
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID!,
        callback: async (credentialResponse: any) => {
          const { credential } = credentialResponse || {};
          if (!credential) {
            toast({
              title: t('errors.google_signin_failed'),
              description: t('errors.google_no_credential'),
              variant: 'destructive',
            });
            return;
          }

          try {
            await signInWithGoogle(credential, invitationCode);
          } catch (err) {
            toast({
              title: t('errors.google_signin_failed'),
              description: getApiErrorMessage(err),
              variant: 'destructive',
            });
          }
        },
      });

      window.google.accounts.id.renderButton(containerRef.current as HTMLElement, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        locale: googleLocale,
        width,
      });
    };

    // Check if there's an existing script with a different locale
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]') as HTMLScriptElement;
    const currentScriptLocale = existing?.src.match(/[?&]hl=([^&]*)/)?.[1];
    
    // If script exists with wrong locale, remove it and clear google object
    if (existing && currentScriptLocale && currentScriptLocale !== googleLocale) {
      existing.remove();
      if (window.google) {
        delete window.google;
      }
    }

    // 1) SDK already present with correct locale? Just (re)initialise.
    if (window.google && window.google.accounts && window.google.accounts.id && 
        (!existing || currentScriptLocale === googleLocale)) {
      initialiseGoogle();
      return; // done
    }

    // 2) SDK not present or wrong locale – inject script with correct hl param.
    const newScript = document.createElement('script');
    newScript.id = 'gsi-sdk';
    newScript.src = `https://accounts.google.com/gsi/client?hl=${googleLocale}`;
    newScript.async = true;
    newScript.defer = true;
    newScript.onload = initialiseGoogle;
    newScript.onerror = () => {
      toast({
        title: 'Google SDK load failed',
        description: 'Unable to load Google authentication resources.',
        variant: 'destructive',
      });
    };
    document.body.appendChild(newScript);

    // Clean up listeners
    return () => {
      newScript.removeEventListener('load', initialiseGoogle);
    };
  }, [locale, invitationCode, signInWithGoogle, toast, t, width]);

  return <div ref={containerRef} style={{ width: width ? `${width}px` : '100%', display: 'flex', justifyContent: 'center' }} />;
} 