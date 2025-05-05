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
  
  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

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
      // Force a direct navigation to the home page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    });
  };

  // Check authentication and redirect if necessary
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isLoading, isAuthenticated, router]);

  // Monitor changes to translatedFileUrl
  useEffect(() => {
    console.log("translatedFileUrl changed:", translatedFileUrl);
  }, [translatedFileUrl]);

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
    const validExtensions = ['.pptx', '.ppt'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return validExtensions.includes(fileExtension);
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
      
      // Reset invalid file type flag
      setInvalidFileType(false);
      
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

      // Get auth token from localStorage
      let token;
      if (isBrowser) {
        token = localStorage.getItem('auth_token');
      }
      
      if (!token) {
        throw new Error('Authentication required');
      }

      // Send the file to the Flask backend
      console.log("Sending translation request to backend");
      const response = await fetch('http://localhost:5000/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        if (response.status === 401) {
          // Authentication error
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please login again.',
            variant: 'destructive',
          });
          
          // Redirect to home page on logout
          handleLogout();
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
        title: 'Success',
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
      
      // Use the same validation as in handleFileChange
      if (validateFileExtension(droppedFile.name)) {
        setInvalidFileType(false);
        setFile(droppedFile);
        setTranslatedFileUrl(null);
        setProgress(0);
      } else {
        setInvalidFileType(true);
        toast({
          title: 'Warning',
          description: t('errors.invalid_file_type'),
          variant: 'destructive',
        });
      }
    }
  };

  // If still loading auth state, show a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, we're redirecting, but still show a spinner
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12">
      <DynamicHead />
      
      {/* Header with user menu */}
      <div className="w-full flex justify-between items-center mb-8">
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
                  <span className="hidden sm:inline-block">{user?.username}</span>
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
          </div>
        )}
      </div>
      
      <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
        {/* Update the drop zone div to handle drag and drop events */}
        <div 
          ref={dropZoneRef}
          className={`w-full mb-8 p-8 border-2 border-dashed rounded-lg 
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
            
            <div className="w-full mt-4">
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
                  className="w-full" 
                  variant="outline"
                >
                  {t('buttons.select_file')}
                </Button>
              )}
              
              {file && (
                <Button 
                  onClick={handleButtonAction}
                  className={`w-full ${translatedFileUrl ? styles.shiningButton : ''}`}
                  disabled={isTranslating || invalidFileType}
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
    </main>
  );
} 