'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { useAuth } from '@/lib/auth-context';
import { DynamicHead } from '@/components/dynamic-head';
import LogoImage from '@/assets/Pure_logo.png';
import Image from 'next/image';
import { useTranslation, LocaleCode, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Define available languages (codes only)
const languageCodes = ["zh", "en", "es", "fr", "de", "ja", "ko", "ru"] as const;

// Helper to display language names in their native language
const nativeLanguageNames = {
  zh: "中文",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский"
};

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [forceRender, setForceRender] = useState(0);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();

  // Force component re-render on locale change
  useEffect(() => {
    const handleLocaleChange = () => {
      // Increment to force a re-render
      setForceRender(prev => prev + 1);
    };
    
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, []);

  // Handle language change
  const handleLanguageChange = (value: string) => {
    setLocale(value as LocaleCode);
    // Force an immediate re-render of the page
    setForceRender(prev => prev + 1);
  };

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // If still loading, show a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <DynamicHead title="Authentication" />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
        {/* Language selector - positioned in the top right corner */}
        <div className="absolute top-4 right-4">
          <Select value={locale} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={nativeLanguageNames[locale as keyof typeof nativeLanguageNames]} />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(nativeLanguageNames) as Array<keyof typeof nativeLanguageNames>).map((code) => (
                <SelectItem key={code} value={code}>
                  {nativeLanguageNames[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="mb-8">
          <Image
            src={LogoImage}
            alt="Logo"
            width={120}
            height={120}
            className="mx-auto"
          />
        </div>
        
        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full max-w-md mx-auto"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
            <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm />
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.no_account')}{' '}
                <button
                  onClick={() => setActiveTab('register')}
                  className="text-primary hover:underline"
                >
                  {t('auth.register')}
                </button>
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="register">
            <RegisterForm />
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.have_account')}{' '}
                <button
                  onClick={() => setActiveTab('login')}
                  className="text-primary hover:underline"
                >
                  {t('auth.login')}
                </button>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
} 