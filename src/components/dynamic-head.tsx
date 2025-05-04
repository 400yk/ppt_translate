'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

interface DynamicHeadProps {
  title?: string; // Optional custom title
}

export function DynamicHead({ title }: DynamicHeadProps) {
  const { t, locale } = useTranslation();
  
  useEffect(() => {
    // Update document title based on custom title or current language
    document.title = title || t('title');
    
    // Update favicon link dynamically
    // First, remove any existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => {
      document.head.removeChild(link);
    });
    
    // Create new favicon link pointing to our logo
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/logo.png'; // Logo from the public folder
    link.type = 'image/png';
    document.head.appendChild(link);

    // Add manifest link for PWA support
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }

    // Update the HTML lang attribute for accessibility and SEO
    document.documentElement.lang = locale;
    
    // Set RTL direction for Arabic, Hebrew, Persian, etc. if needed in the future
    // document.documentElement.dir = ['ar', 'he', 'fa'].includes(locale) ? 'rtl' : 'ltr';
  }, [t, locale, title]);

  return null; // This component doesn't render anything visually
} 