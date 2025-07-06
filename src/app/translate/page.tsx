'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LOCALE_CHANGE_EVENT, useTranslation } from '@/lib/i18n';
import { DynamicHead } from '@/components/dynamic-head';
import { useAuth } from '@/lib/auth-context';
import { canGuestUseTranslation, fetchGuestUsage } from '@/lib/guest-session';
import { RegistrationDialog } from '@/components/registration-dialog';
import { PaymentModal } from "@/components/payment-modal";
import { GuestExpired } from "@/components/guest-expired";
import { TranslationHeader } from '@/components/translation/TranslationHeader';
import { TranslationForm } from '@/components/translation/TranslationForm';
import { 
  GuestAlert, 
  WeeklyLimitAlert, 
  FileSizeAlert 
} from '@/components/translation/TranslationAlerts';
import { fetchMaxFileSize } from '@/lib/translation-service';
import { LanguageSelector } from '@/components/language-selector';
import { ShareModal } from '@/components/share-modal';
import { FeedbackModal } from '@/components/feedback-modal';
import apiClient from '@/lib/api-client';

// Define API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Check for browser environment
const isBrowser = typeof window !== 'undefined';

export default function TranslationPage() {
  const [isClient, setIsClient] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [weeklyLimitReached, setWeeklyLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [fileSizeExceeded, setFileSizeExceeded] = useState(false);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(50); // Default to 50MB, will be updated from backend
  const [membershipStatus, setMembershipStatus] = useState<any>(null);
  const [isLoadingMembership, setIsLoadingMembership] = useState(false);
  const [guestCheckComplete, setGuestCheckComplete] = useState(false); // New state to track guest check completion
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const {toast} = useToast();
  const {t, locale, setLocale} = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch max file size from backend when component mounts
  useEffect(() => {
    if (isClient) {
      fetchMaxFileSize()
        .then(size => setMaxFileSizeMB(size))
        .catch(error => console.error("Failed to fetch max file size:", error));
    }
  }, [isClient]);

  // Set HTML lang attribute on initial render
  useEffect(() => {
    if (isBrowser) {
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

  // Custom logout function to redirect to landing page
  const handleLogout = () => {
    logout(() => {
      // Use router for navigation to avoid redirecting with window.location
      router.push('/');
    });
  };

  // Check authentication and redirect if necessary
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // If not authenticated, check if guest can use translation by fetching from backend
        const checkGuestStatus = async () => {
          try {
            const guestUsage = await fetchGuestUsage();
            if (guestUsage.remainingUses > 0) {
              // Allow guest to use the page, but mark them as guest
              setIsGuestUser(true);
            } else {
              // If guest has used their free trial, show registration dialog
              setShowRegistrationDialog(true);
            }
          } catch (error) {
            console.error("Error checking guest status:", error);
            // Fallback to local check if API fails
            if (canGuestUseTranslation()) {
              setIsGuestUser(true);
            } else {
              setShowRegistrationDialog(true);
            }
          } finally {
            // Mark guest check as complete regardless of outcome
            setGuestCheckComplete(true);
          }
        };
        
        checkGuestStatus();
      } else {
        // When authenticated, hide guest UI but don't reset underlying guest data
        // This prevents users from bypassing usage limits by logging in/out
        setIsGuestUser(false);
        // Clear any weekly limit flags that might be set for the current session
        setWeeklyLimitReached(false);
        // Authentication is complete, so guest check is also complete
        setGuestCheckComplete(true);
      }
    }
  }, [isLoading, isAuthenticated]);
  
  // Refresh guest usage status whenever component is mounted
  useEffect(() => {
    if (isClient && !isAuthenticated) {
      // Fetch fresh guest usage status from backend
      fetchGuestUsage().then(usage => {
        console.log("Refreshed guest usage status:", usage);
        // If we have no uses left but were previously shown as a guest user,
        // update the UI to show registration dialog
        if (usage.remainingUses <= 0 && isGuestUser) {
          setIsGuestUser(false);
          setShowRegistrationDialog(true);
        }
      }).catch(err => {
        console.error("Failed to refresh guest usage status:", err);
      });
    }
  }, [isClient, isAuthenticated, isGuestUser]);

  // Fetch membership status after authentication
  useEffect(() => {
    const fetchMembershipStatus = async () => {
      if (!isAuthenticated) return;
      setIsLoadingMembership(true);
      try {
        const response = await apiClient.get('/api/membership/status');
        setMembershipStatus(response.data);
      } catch (e) {
        console.error('Error fetching membership status:', e);
        setMembershipStatus(null);
      } finally {
        setIsLoadingMembership(false);
      }
    };
    if (isAuthenticated) {
      fetchMembershipStatus();
    }
  }, [isAuthenticated]);

  // If still loading auth state, show a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated and guest check is complete but not a guest user, show the guest expired page
  if (!isAuthenticated && !isGuestUser && guestCheckComplete) {
    return (
      <GuestExpired
        locale={locale}
        onRegister={() => setShowRegistrationDialog(true)}
      />
    );
  }

  // If auth is not loading but guest check is not complete, show loading spinner
  if (!guestCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DynamicHead />
      
      {/* Registration dialog */}
      <RegistrationDialog 
        isOpen={showRegistrationDialog} 
        onClose={() => setShowRegistrationDialog(false)} 
      />
      
      {/* Payment modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setWeeklyLimitReached(false);
          toast({
            title: t('payment.success'),
            description: t(selectedPlan === 'monthly' ? 'payment.monthly_success' : 'payment.yearly_success'),
          });
        }}
      />
      
      {/* Share modal */}
      <ShareModal
        isVisible={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      
      {/* Feedback modal */}
      <FeedbackModal
        isVisible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        pageContext="translate"
      />
      
      <div className="container mx-auto px-4 py-4 max-w-6xl flex flex-col h-full flex-1">
        {/* Header with user menu */}
        {isClient && (
          <TranslationHeader 
            isGuestUser={isGuestUser} 
            onShowRegistrationDialog={() => setShowRegistrationDialog(true)} 
          />
        )}
        
        {/* Main content area - flex-1 to take remaining height */}
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto flex-1">
          {/* Alert notifications */}
          <GuestAlert 
            isVisible={isClient && isGuestUser} 
          />
          
          <WeeklyLimitAlert 
            isVisible={isClient && weeklyLimitReached} 
            isGuestUser={isGuestUser}
            onAction={() => isGuestUser ? setShowRegistrationDialog(true) : setShowPaymentModal(true)}
          />
          
          <FileSizeAlert 
            isVisible={isClient && fileSizeExceeded}
            maxFileSizeMB={maxFileSizeMB}
            onUpgrade={() => setShowPaymentModal(true)}
          />
          
          {/* Translation form */}
          {isClient && (
            <TranslationForm
              isGuestUser={isGuestUser}
              maxFileSizeMB={maxFileSizeMB}
              isPaidUser={membershipStatus?.user_type === 'paid'}
              membershipStatus={membershipStatus}
              onFileSizeExceeded={() => setFileSizeExceeded(true)}
              onWeeklyLimitReached={() => setWeeklyLimitReached(true)}
              onRegistrationRequired={() => setShowRegistrationDialog(true)}
              onSessionExpired={handleLogout}
              onShare={() => {
                setShowShareModal(true);
              }}
              onFeedback={() => {
                setShowFeedbackModal(true);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
} 