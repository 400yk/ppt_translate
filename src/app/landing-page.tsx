'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useTranslation, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import LogoImage from '@/assets/Pure_logo.png';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { LanguageSelector } from '@/components/language-selector';
import { DynamicHead } from '@/components/dynamic-head';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// File format icons
import { FileText, FileImage, FileVideo, FileAudio, CreditCard } from 'lucide-react';
import TextLogo from '@/assets/text_logo.png';
import TableLogo from '@/assets/table_logo.png';
import StyleLogo from '@/assets/style_logo.png';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegistrationDialog } from '@/components/registration-dialog';
import { initGuestSession, canGuestUseTranslation } from '@/lib/guest-session';

// Define available languages (codes only)
const languageCodes = ["zh", "en", "es", "fr", "de", "ja", "ko", "ru"] as const;
type LanguageCode = typeof languageCodes[number];

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

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
    
    // Initialize guest session on first visit
    if (typeof window !== 'undefined') {
      initGuestSession();
    }
  }, []);

  // Set HTML lang attribute on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]); // Update when locale changes
  
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

  // Custom logout function that stays on the landing page
  const handleLogout = () => {
    if (isAuthenticated) {
      logout(() => {
        // Force a page reload on the landing page to reset all state
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });
    }
  };

  // Handle the "Get Started" or "免费开始使用" button click
  const handleGetStarted = () => {
    if (isAuthenticated) {
      // Authenticated users go straight to translation page
      router.push('/translate');
    } else {
      // For guest users, check if they can use the free trial
      if (canGuestUseTranslation()) {
        // If they can use their free trial, send them to the translation page
        router.push('/translate');
      } else {
        // If they've used their free trial, show registration dialog
        setShowRegistrationDialog(true);
      }
    }
  };

  // Handle clicking translate now in the navbar
  const handleTranslateNow = () => {
    if (isAuthenticated) {
      // Authenticated users go straight to translation page
      router.push('/translate');
    } else {
      // For guest users, check if they can use the free trial
      if (canGuestUseTranslation()) {
        // If they can use their free trial, send them to the translation page
        router.push('/translate');
      } else {
        // If they've used their free trial, show registration dialog
        setShowRegistrationDialog(true);
      }
    }
  };

  if (!isClient) {
    return <div className="min-h-screen"></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DynamicHead />
      
      {/* Registration dialog */}
      <RegistrationDialog 
        isOpen={showRegistrationDialog} 
        onClose={() => setShowRegistrationDialog(false)} 
      />
      
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Image src={LogoImage} alt={t('title')} width={40} height={40} />
              <span className="text-2xl font-bold">{t('title')}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center space-x-8">
                <button 
                  onClick={handleTranslateNow} 
                  className="text-foreground hover:text-primary transition"
                >
                  {t('nav.translate_now')}
                </button>
                <Link href="/pricing" className="text-foreground hover:text-primary transition">
                  {t('pricing.title')}
                </Link>
              </nav>
              
            {/* Language selector */}
            {isClient && (
                <div className="ml-6">
                  <LanguageSelector />
                </div>
              )}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="hidden md:flex items-center gap-2">
                      <Icons.user className="h-4 w-4" />
                      <span>{user?.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user?.email || user?.username}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/pricing')}>
                      <Icons.pricing className="mr-2 h-4 w-4" />
                      {t('pricing.title')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <Icons.logout className="mr-2 h-4 w-4" />
                      {t('auth.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => setShowRegistrationDialog(true)} variant="outline" className="hidden md:flex">
                  {t('auth.login')}
                </Button>
              )}
              

              
              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Icons.menu className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/20 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="mr-2">{t('landing.translate')}</span>
              <span className="text-orange-500">{t('landing.powerpoint')}</span>
              <span className="block mt-2">{t('landing.with_translide')}</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-16">
              {t('landing.subtitle')}
            </p>
            <Button 
              onClick={handleGetStarted} 
              size="lg" 
              className="rounded-full px-8 py-6 text-lg bg-teal-600 hover:bg-teal-700 text-white"
            >
              {t('landing.get_started')}
              <Icons.arrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-0 pb-16 bg-background">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t('landing.simplest_way')}
          </h2>
          
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Text Translator */}
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
              <div className="bg-primary/20 p-2 rounded-md w-fit mb-4 flex items-center justify-center">
                <Image src={TextLogo} alt="Text" width={36} height={36} />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('landing.texts')}</h3>
              <p className="text-muted-foreground">
                {t('landing.texts_desc')}
              </p>
            </div>
            
            {/* Table Translator */}
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
              <div className="bg-primary/20 p-2 rounded-md w-fit mb-4 flex items-center justify-center">
                <Image src={TableLogo} alt="Table" width={36} height={36} />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('landing.tables')}</h3>
              <p className="text-muted-foreground">
                {t('landing.tables_desc')}
              </p>
            </div>
            
            {/* Style Translator */}
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
              <div className="bg-primary/20 p-2 rounded-md w-fit mb-4 flex items-center justify-center">
                <Image src={StyleLogo} alt="Style" width={36} height={36} />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('landing.styles')}</h3>
              <p className="text-muted-foreground">
                {t('landing.styles_desc')}
              </p>
            </div>
          </div>
          
          <div className="text-center mt-16">
            <Button onClick={() => router.push('/pricing')} variant="outline" className="rounded-full px-8 border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-700">
              {t('landing.view_pricing')}
              <CreditCard className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image src={LogoImage} alt={t('title')} width={30} height={30} className="mr-2" />
              <span className="font-medium">{t('title')}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t('landing.copyright')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 