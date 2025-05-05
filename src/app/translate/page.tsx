'use client';

import {useState, useEffect, useRef} from 'react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {useToast} from '@/hooks/use-toast';
import {Icons} from '@/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {useTranslation, LocaleCode, LOCALE_CHANGE_EVENT} from '@/lib/i18n';
import LogoImage from '@/assets/Pure_logo.png';
import { DynamicHead } from '@/components/dynamic-head';
import styles from '../styles/home.module.css';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { LanguageSelector } from '@/components/language-selector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { canGuestUseTranslation, consumeGuestUsage, fetchGuestUsage } from '@/lib/guest-session';
import { RegistrationDialog } from '@/components/registration-dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaymentModal } from "@/components/payment-modal";

// Define API URL
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Define available languages (codes only)
const languageCodes = ["zh", "en", "es", "fr", "de", "ja", "ko", "ru"] as const;
type LanguageCode = typeof languageCodes[number];

// Check for browser environment
const isBrowser = typeof window !== 'undefined';

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

export default function TranslationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [translatedFileUrl, setTranslatedFileUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [srcLang, setSrcLang] = useState<LanguageCode>("zh"); // Default source language: Chinese
  const [destLang, setDestLang] = useState<LanguageCode>("en"); // Default target language: English
  const [invalidFileType, setInvalidFileType] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const {toast} = useToast();
  const {t, locale, setLocale} = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const dropZoneRef = useRef<HTMLDivElement>(null);
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
  
  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch max file size from backend config when component mounts
  useEffect(() => {
    const fetchMaxFileSize = async () => {
      try {
        // Use the API_URL constant instead of hardcoding
        const response = await fetch(`${API_URL}/config/file-size-limit`);
        if (response.ok) {
          const data = await response.json();
          if (data.maxFileSizeMB) {
            setMaxFileSizeMB(data.maxFileSizeMB);
            console.log("Max file size loaded from backend:", data.maxFileSizeMB, "MB");
          }
        }
      } catch (error) {
        console.error("Failed to fetch max file size from backend:", error);
        // Keep using the default 50MB value
      }
    };

    if (isClient) {
      fetchMaxFileSize();
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
          }
        };
        
        checkGuestStatus();
      } else {
        // When authenticated, hide guest UI but don't reset underlying guest data
        // This prevents users from bypassing usage limits by logging in/out
        setIsGuestUser(false);
        // Clear any weekly limit flags that might be set for the current session
        setWeeklyLimitReached(false);
      }
    }
  }, [isLoading, isAuthenticated]);

  // Monitor changes to translatedFileUrl
  useEffect(() => {
    console.log("translatedFileUrl changed:", translatedFileUrl);
  }, [translatedFileUrl]);
  
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
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const response = await fetch(`${API_URL}/api/membership/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setMembershipStatus(data);
        } else {
          setMembershipStatus(null);
        }
      } catch (e) {
        setMembershipStatus(null);
      } finally {
        setIsLoadingMembership(false);
      }
    };
    if (isAuthenticated) {
      fetchMembershipStatus();
    }
  }, [isAuthenticated]);

  // Helper function to get translated language name
  const getLanguageName = (code: LanguageCode): string => {
    // Using type assertion to help TypeScript understand this is a valid key
    const key = `languages.${code}` as const;
    return t(key);
  };

  // Update source/target languages when UI language changes
  useEffect(() => {
    // When UI language changes:
    // 1. Set source language to match UI language
    // 2. Set target language to English by default
    // 3. If source is English, set target to Chinese
    
    // Skip if we're in the middle of a translation
    if (isTranslating) return;
    
    // Set source language to UI language
    setSrcLang(locale as LanguageCode);
    
    // If source is English, target is Chinese, otherwise target is English
    if (locale === 'en') {
      setDestLang('zh');
    } else {
      setDestLang('en');
    }
    
    // Don't reset translation state when language changes
    // This was causing the translatedFileUrl to be reset unexpectedly
    // setTranslatedFileUrl(null);
    // setProgress(0);
  }, [locale, isTranslating]);

  // Validate file extension
  const validateFileExtension = (fileName: string): boolean => {
    const validExtensions = ['.pptx'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return validExtensions.includes(fileExtension);
  };

  // Check if file size is within limits for non-paid users
  const validateFileSize = (fileSize: number): boolean => {
    // Use max file size from backend config
    const MAX_SIZE_BYTES = maxFileSizeMB * 1024 * 1024;
    // A user is considered paid only if membershipStatus.user_type === 'paid'
    const isPaidUser = membershipStatus?.user_type === 'paid';
    if (!isPaidUser && fileSize > MAX_SIZE_BYTES) {
      setFileSizeExceeded(true);
      return false;
    }
    setFileSizeExceeded(false);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if file has a valid extension
      if (!validateFileExtension(selectedFile.name)) {
        // Show invalid file type warning
        setInvalidFileType(true);
        toast({
          title: 'Warning',
          description: t('errors.invalid_file_type'),
          variant: 'destructive',
        });
        return;
      }
      
      // Check file size limit for non-paid users
      if (!validateFileSize(selectedFile.size)) {
        // validateFileSize now handles setting fileSizeExceeded
        toast({
          title: t('errors.file_size_limit'),
          description: t('errors.file_size_exceeded', { size: maxFileSizeMB }),
          variant: 'destructive',
        });
        return;
      }
      
      // Reset validation flags
      setInvalidFileType(false);
      setFileSizeExceeded(false);
      
      // Reset weekly limit reached flag
      setWeeklyLimitReached(false);
      
      // Set the file and reset previous translation state
      setFile(selectedFile);
      setTranslatedFileUrl(null); // Reset translation URL when new file is selected
      setProgress(0);
    }
  };

  const handleRevertFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFile(null);
    setTranslatedFileUrl(null);
    setProgress(0);
    setInvalidFileType(false);
    setWeeklyLimitReached(false);
    setFileSizeExceeded(false);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTranslate = async () => {
    // Store reference to the translated file in localStorage to persist between renders
    const storeTranslatedUrl = (url: string) => {
      try {
        // Just set it in state directly, avoid localStorage for blob URLs
        console.log("Storing translated URL in state:", url);
        setTranslatedFileUrl(url);
      } catch (e) {
        console.error("Error storing translated URL:", e);
      }
    };

    if (!file) {
      toast({
        title: 'Error',
        description: t('errors.no_file'),
        variant: 'destructive',
      });
      return;
    }

    if (srcLang === destLang) {
      toast({
        title: 'Error',
        description: t('errors.same_language'),
        variant: 'destructive',
      });
      return;
    }

    // If this is a guest user, consume their free usage
    if (isGuestUser) {
      const canUse = consumeGuestUsage();
      if (!canUse) {
        // Show registration dialog if they've used their free trial
        setShowRegistrationDialog(true);
        return;
      }
    }

    setIsTranslating(true);
    setProgress(0);
    setTranslatedFileUrl(null); // Reset any previous translated file URL

    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('src_lang', srcLang); // Use selected source language
      formData.append('dest_lang', destLang); // Use selected target language

      // Simulate progress bar up to 90%
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 20);

      // Determine which endpoint to use and prepare headers
      let endpointUrl = `${API_URL}/translate`;
      let headers: HeadersInit = {};
      
      if (isGuestUser) {
        // Use guest endpoint for guest users
        endpointUrl = `${API_URL}/guest-translate`;
      } else {
        // Get auth token for authenticated users
        if (isBrowser) {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            throw new Error('Authentication required');
          }
          headers = {
            'Authorization': `Bearer ${token}`,
          };
        }
      }

      // Send the file to the Flask backend
      console.log(`Sending translation request to ${isGuestUser ? 'guest' : 'authenticated'} endpoint`);
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        if (response.status === 401) {
          // Authentication error
          toast({
            title: t('errors.authentication_error'),
            description: t('errors.session_expired'),
            variant: 'destructive',
          });
          
          // Redirect to home page on logout
          handleLogout();
          return;
        }
        
        if (response.status === 403) {
          // Weekly/usage limit reached
          const err = await response.json();
          setWeeklyLimitReached(true);
          setLimitMessage(err.message || 'Weekly translation limit reached. Please upgrade to a paid membership for unlimited translations.');
          setProgress(0);
          return;
        }
        
        const err = await response.json();
        throw new Error(err.error || 'Translation failed');
      }

      // Handle successful translation
      setProgress(100);
      
      // Create a blob URL for the translated file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      storeTranslatedUrl(url);
      
      // Show success message
      toast({
        title: t('success.title'),
        description: t('success.translation_complete'),
      });
    } catch (error) {
      console.error("Translation error:", error);
      setProgress(0);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const getButtonText = () => {
    if (isTranslating) {
      return t('buttons.translating');
    }
    
    if (translatedFileUrl) {
      return (
        <>
          <Icons.upload className="mr-1 h-4 w-4 transform rotate-180" />
          {t('buttons.download')}
        </>
      );
    }
    
    return t('buttons.translate');
  };

  const handleButtonAction = () => {
    if (isTranslating) {
      // Don't do anything while translating
      return;
    }
    
    if (translatedFileUrl) {
      // If translation exists, trigger download
      const link = document.createElement('a');
      link.href = translatedFileUrl;
      link.download = `translated_${file?.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Otherwise start translation
      handleTranslate();
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTranslating) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTranslating) return;
    
    // Only set dragging to false if the drag leaves the entire drop zone
    // Check if the related target is not contained within the dropzone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTranslating) return;
    // Set the dropEffect to 'copy' to show a copy icon
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isTranslating) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      
      // Use the same validations as in handleFileChange
      if (!validateFileExtension(droppedFile.name)) {
        setInvalidFileType(true);
        toast({
          title: 'Warning',
          description: t('errors.invalid_file_type'),
          variant: 'destructive',
        });
        return;
      }
      
      // Check file size limit for non-paid users
      if (!validateFileSize(droppedFile.size)) {
        // validateFileSize now handles setting fileSizeExceeded
        toast({
          title: t('errors.file_size_limit'),
          description: t('errors.file_size_exceeded', { size: maxFileSizeMB }),
          variant: 'destructive',
        });
        return;
      }
      
      setInvalidFileType(false);
      setFile(droppedFile);
      setTranslatedFileUrl(null);
      setProgress(0);
    }
  };

  // Add a useEffect to force rerender on locale changes
  useEffect(() => {
    // Ensure translations are updated when locale changes
    const forceUpdate = () => {
      setForceRender(prev => prev + 1);
    };
    
    if (isBrowser) {
      window.addEventListener(LOCALE_CHANGE_EVENT, forceUpdate);
      return () => {
        window.removeEventListener(LOCALE_CHANGE_EVENT, forceUpdate);
      };
    }
  }, []);

  // If still loading auth state, show a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated and not a guest user, we're redirecting, but still show a spinner
  if (!isAuthenticated && !isGuestUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Get translated texts for the dropdown menu
  const guestUserText = locale === 'zh' ? '游客用户' : 'Guest User';
  const registerLoginText = locale === 'zh' ? '注册/登录' : 'Register / Login';
  const backToHomeText = locale === 'zh' ? '返回首页' : 'Back to Home';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DynamicHead />
      
      {/* Registration dialog */}
      <RegistrationDialog 
        isOpen={showRegistrationDialog} 
        onClose={() => {
          setShowRegistrationDialog(false);
          // We don't force a page reload here anymore
          // The guest UI will be hidden via the useEffect hook that checks auth state
        }} 
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
      
      <div className="container mx-auto px-4 py-4 max-w-6xl flex flex-col h-full flex-1">
        {/* Header with user menu */}
        <div className="w-full flex justify-between items-center py-2">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center">
                <Image
                  src={LogoImage}
                  alt={t('title')} 
                  width={40}
                  height={40}
                  className="mr-2"
                />
                <h1 className="text-2xl font-bold">{t('title')}</h1>
              </div>
            </Link>
          </div>
          
          {isClient && (
            <div className="flex items-center gap-4">
              {/* Language selector */}
              <LanguageSelector width="w-[100px]" />
              
              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Icons.user className="h-4 w-4" />
                    <span className="hidden sm:inline-block">{user?.username || guestUserText}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isGuestUser ? (
                    <>
                      <DropdownMenuLabel>{guestUserText}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowRegistrationDialog(true)}>
                        <Icons.user className="mr-2 h-4 w-4" />
                        {registerLoginText}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/')}>
                        <Icons.home className="mr-2 h-4 w-4" />
                        {backToHomeText}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel>{user?.email || user?.username}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/profile')}>
                        <Icons.user className="mr-2 h-4 w-4" />
                        {t('profile.title')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout}>
                        <Icons.logout className="mr-2 h-4 w-4" />
                        {t('auth.logout')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {/* Main content area - flex-1 to take remaining height */}
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto flex-1">
          {/* Guest user banner - right above the drop zone */}
          {isClient && isGuestUser && (
            <Alert className="border-teal-500 bg-teal-50 w-full mb-8">
              <Icons.info className="h-4 w-4 text-teal-500" />
              <AlertTitle className="text-teal-700">{t('guest.free_trial')}</AlertTitle>
              <AlertDescription className="text-teal-600">
                {t('guest.free_trial_desc')}
                <span className="block mt-1 font-medium">
                  {t('guest.one_time_note')}
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Weekly limit reached banner - moved right above the drop zone */}
          {isClient && weeklyLimitReached && (
            <Alert className="border-amber-500 bg-amber-50 w-full mb-8">
              <Icons.info className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-700">{isGuestUser ? t('guest.trial_used') : t('pricing.weekly_limit_title')}</AlertTitle>
              <AlertDescription className="text-amber-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>{isGuestUser ? t('guest.register_prompt') : t('pricing.weekly_limit_message')}</span>
                <Button 
                  variant="outline" 
                  className="border-amber-500 text-amber-700 hover:bg-amber-200 hover:text-amber-900 shrink-0"
                  onClick={() => isGuestUser ? setShowRegistrationDialog(true) : setShowPaymentModal(true)}
                >
                  {isGuestUser ? t('auth.register_login') : t('buttons.upgrade')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* File size limit exceeded banner */}
          {isClient && fileSizeExceeded && (
            <Alert className="border-amber-500 bg-amber-50 w-full mb-8">
              <Icons.info className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-700">{t('errors.file_size_limit')}</AlertTitle>
              <AlertDescription className="text-amber-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>{t('errors.file_size_exceeded', { size: maxFileSizeMB })}</span>
                <Button 
                  variant="outline" 
                  className="border-amber-500 text-amber-700 hover:bg-amber-200 hover:text-amber-900 shrink-0"
                  onClick={() => setShowPaymentModal(true)}
                >
                  {t('buttons.upgrade')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Update the drop zone div to handle drag and drop events */}
          <div 
            ref={dropZoneRef}
            className={`w-full mb-8 p-10 border-2 border-dashed rounded-lg 
              transition-all duration-300 ${styles.dropZone}
              ${isDragging ? `${styles.draggingActive} border-primary` : ''}
              ${file ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center">
              {!file && (
                <>
                  <Icons.upload className={`mb-4 h-10 w-10 ${isDragging ? 'text-primary animate-bounce' : 'text-gray-400'}`} />
                  <h3 className="mb-2 text-lg font-medium">{t('upload.title')}</h3>
                  <p className="mb-4 text-sm text-gray-500">{t('upload.description')}</p>
                  {isDragging && (
                    <div className="mt-4 p-2 bg-primary/10 text-primary rounded-md">
                      <p className="text-sm font-medium">{t('upload.release')}</p>
                    </div>
                  )}
                </>
              )}
              
              {file && (
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-4">
                    <div className="flex items-center">
                      <Icons.file className="h-8 w-8 text-primary mr-2" />
                      <div>
                        <h3 className="font-medium text-sm">{file.name}</h3>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRevertFile}
                    >
                      <Icons.x className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="w-full flex items-center space-x-4">
                    <div className="flex-1">
                      <Select value={srcLang} onValueChange={(value) => setSrcLang(value as LanguageCode)}>
                        <SelectTrigger>
                          <SelectValue placeholder={getLanguageName(srcLang)} />
                        </SelectTrigger>
                        <SelectContent>
                          {languageCodes.map((code) => (
                            <SelectItem key={code} value={code}>
                              {getLanguageName(code)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Icons.arrowRight className="h-4 w-4 flex-shrink-0" />
                    
                    <div className="flex-1">
                      <Select value={destLang} onValueChange={(value) => setDestLang(value as LanguageCode)}>
                        <SelectTrigger>
                          <SelectValue placeholder={getLanguageName(destLang)} />
                        </SelectTrigger>
                        <SelectContent>
                          {languageCodes.map((code) => (
                            <SelectItem key={code} value={code}>
                              {getLanguageName(code)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full mt-6">
                <input
                  type="file"
                  id="fileInput"
                  accept=".ppt,.pptx"
                  onChange={handleFileChange}
                  className="hidden"
                  ref={fileInputRef}
                />
                
                {!file && (
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#0C8599] text-white hover:bg-[#0A6D80] transition-colors" 
                    variant="outline"
                  >
                    {t('buttons.select_file')}
                  </Button>
                )}
                
                {file && (
                  <Button 
                    onClick={handleButtonAction}
                    className={`w-full ${translatedFileUrl ? styles.shiningButton : ''}`}
                    disabled={isTranslating || invalidFileType || fileSizeExceeded}
                  >
                    {isTranslating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    {getButtonText()}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {(isTranslating || progress > 0) && (
            <div className="w-full mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center mt-2">{progress}%</p>
            </div>
          )}
          
          <p className="text-sm text-gray-500 text-center max-w-lg">
            {t('footer.description')}
          </p>
        </div>
      </div>
    </div>
  );
} 