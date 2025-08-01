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
import { initGuestSession, canGuestUseTranslation, fetchGuestUsage } from '@/lib/guest-session';
import { ShareModal } from '@/components/share-modal';
import { MembershipUpgradeModal } from '@/components/membership-upgrade-modal';
import { FeedbackModal } from '@/components/feedback-modal';

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
  const { user, isAuthenticated, isLoading, logout, fetchWithAuth } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [guestStatusLoaded, setGuestStatusLoaded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
    
    // Initialize guest session on first visit
    if (typeof window !== 'undefined') {
      initGuestSession();
      
      // Fetch guest usage status from the backend
      const loadGuestStatus = async () => {
        await fetchGuestUsage();
        setGuestStatusLoaded(true);
      };
      
      loadGuestStatus();
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
      // For guest users, first make sure we have latest status from backend
      fetchGuestUsage().then(usage => {
        if (usage.remainingUses > 0) {
          // If they can use their free trial, send them to the translation page
          router.push('/translate');
        } else {
          // If they've used their free trial, show registration dialog
          setShowRegistrationDialog(true);
        }
      }).catch(err => {
        console.error("Error fetching guest status:", err);
        // Fallback to cached check if API fails
        if (canGuestUseTranslation()) {
          router.push('/translate');
        } else {
          setShowRegistrationDialog(true);
        }
      });
    }
  };

  // Handle clicking translate now in the navbar
  const handleTranslateNow = () => {
    if (isAuthenticated) {
      // Authenticated users go straight to translation page
      router.push('/translate');
    } else {
      // For guest users, first make sure we have latest status from backend
      fetchGuestUsage().then(usage => {
        if (usage.remainingUses > 0) {
          // If they can use their free trial, send them to the translation page
          router.push('/translate');
        } else {
          // If they've used their free trial, show registration dialog
          setShowRegistrationDialog(true);
        }
      }).catch(err => {
        console.error("Error fetching guest status:", err);
        // Fallback to cached check if API fails
        if (canGuestUseTranslation()) {
          router.push('/translate');
        } else {
          setShowRegistrationDialog(true);
        }
      });
    }
  };

  // Handle invite friends click
  const handleInviteFriends = async () => {
    if (!isAuthenticated) {
      setShowRegistrationDialog(true);
      return;
    }

    try {
      // Use fetchWithAuth from auth context for proper authentication
      const response = await fetchWithAuth('/api/membership/status');
      
      if (response.ok) {
        const membershipStatus = await response.json();
        console.log('Membership status:', membershipStatus); // Debug log
        
        // Check if user has paid membership or invitation membership
        if (membershipStatus.user_type === 'paid' || membershipStatus.user_type === 'invitation') {
          setShowShareModal(true);
        } else {
          console.log('User type not eligible:', membershipStatus.user_type); // Debug log
          setShowUpgradePrompt(true);
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText); // Debug log
        setShowUpgradePrompt(true);
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
      setShowUpgradePrompt(true);
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
      
      {/* Share modal */}
      <ShareModal 
        isVisible={showShareModal} 
        onClose={() => setShowShareModal(false)} 
      />
      
      {/* Membership upgrade modal */}
      <MembershipUpgradeModal 
        isVisible={showUpgradePrompt} 
        onClose={() => setShowUpgradePrompt(false)} 
      />
      
      {/* Feedback modal */}
      <FeedbackModal
        isVisible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        pageContext="landing"
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
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <Icons.user className="h-4 w-4" />
                      {t('profile.title')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleInviteFriends}>
                      <Icons.share className="h-4 w-4" />
                      {t('auth.invite_friends')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowFeedbackModal(true)}>
                      <Icons.messageSquare className="h-4 w-4" />
                      {t('feedback.title')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <Icons.logout className="h-4 w-4" />
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
      <section className="py-20 px-4 bg-gradient-to-b from-primary/20 to-background">
        <div className="mt-16 container mx-auto max-w-6xl">
          <div className="text-center mb-10">
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
      <section className="pt-4 pb-16 bg-background">
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
            <div className="text-sm text-muted-foreground flex flex-col md:flex-row items-center">
              <span className="mb-2 md:mb-0 md:mr-4">&copy; {new Date().getFullYear()} {t('landing.copyright')}</span>
              <Link href="/privacy-policy" className="hover:text-primary transition">
                {t('landing.privacy_policy')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 