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
import {useTranslation, LocaleCode} from '@/lib/i18n';
import LogoImage from '@/assets/Pure_logo.png';
import { DynamicHead } from '@/components/dynamic-head';
import styles from './styles/home.module.css';

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

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [translatedFileUrl, setTranslatedFileUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [srcLang, setSrcLang] = useState<LanguageCode>("zh"); // Default source language: Chinese
  const [destLang, setDestLang] = useState<LanguageCode>("en"); // Default target language: English
  const [invalidFileType, setInvalidFileType] = useState(false);
  const {toast} = useToast();
  const {t, locale, setLocale} = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Reset translation state when language changes
    setTranslatedFileUrl(null);
    setProgress(0);
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
      setTranslatedFileUrl(null);
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
      }, 300);

      // Send the file to the Flask backend
      const response = await fetch('http://localhost:5000/translate', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Translation failed');
      }

      // Get the translated PPTX as a blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setTranslatedFileUrl(url);
      setProgress(100);
      toast({
        title: 'Success',
        description: t('success.translation_complete'),
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: t('errors.translation_failed'),
        variant: 'destructive',
      });
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleButtonAction = () => {
    if (translatedFileUrl) {
      // If translation is complete, download the file
      if (translatedFileUrl) {
        try {
          // Create a fetch request to get the file
          fetch(translatedFileUrl)
            .then(response => {
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              return response.blob();
            })
            .then(blob => {
              // Create a URL for the blob
              const url = window.URL.createObjectURL(blob);
              
              // Create a link element
              const a = document.createElement('a');
              a.href = url;
              a.download = 'translated-presentation.pptx';
              
              // Append to body, click, and remove
              document.body.appendChild(a);
              a.click();
              
              // Clean up
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(error => {
              console.error('Download error:', error);
              toast({
                title: 'Error',
                description: t('errors.download_failed'),
                variant: 'destructive',
              });
            });
        } catch (error) {
          console.error('Download error:', error);
          toast({
            title: 'Error',
            description: t('errors.download_failed'),
            variant: 'destructive',
          });
        }
      }
    } else {
      // If translation is not complete, start the translation
      handleTranslate();
    }
  };

  return (
    <div className={styles.container}>
      {/* Add the DynamicHead component */}
      <DynamicHead />
      
      {/* Language selector in top right corner */}
      <div className={styles.languageSelector}>
        <div className={styles.langSelectorWrapper}>
          <label className={styles.srOnly}>UI Language:</label>
          <Select value={locale} onValueChange={(value: LocaleCode) => setLocale(value)}>
            <SelectTrigger className={styles.selectWidth}>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(nativeLanguageNames).map(([code, name]) => (
                <SelectItem key={`ui-${code}`} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Image 
              src={LogoImage} 
              alt="App Logo" 
              fill 
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <h1 className={styles.title}>
            {t('title')}
          </h1>
        </div>

        <div className={styles.formWrapper}>
          <div className={styles.fileInputWrapper}>
            <label className={styles.fileInput}>
              {file ? (
                <div className={styles.fileInputLabelUploaded}>
                  <span className={styles.fileNameInButton}>
                    {t('file_uploaded')}: {file.name}
                  </span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className={styles.revertIcon}
                    onClick={handleRevertFile}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
              ) : (
                <div className={invalidFileType ? styles.fileInputLabelError : styles.fileInputLabel}>
                  {t('file_upload')}
                </div>
              )}
              <input
                type="file"
                className={styles.srOnly}
                accept=".ppt,.pptx"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </label>
            {invalidFileType && (
              <p className={styles.fileNameError}>
                {t('errors.invalid_file_type')}
              </p>
            )}
          </div>

          <div className={styles.langSelectionGrid}>
            <div className={styles.langFieldWrapper}>
              <label className={styles.label}>{t('from_label')}</label>
              <div className={styles.langSelectContainer}>
                <Select value={srcLang} onValueChange={(value: LanguageCode) => setSrcLang(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageCodes.map((code) => (
                      <SelectItem key={`src-${code}`} value={code}>
                        {getLanguageName(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={styles.langFieldWrapper}>
              <label className={styles.label}>{t('to_label')}</label>
              <div className={styles.langSelectContainer}>
                <Select value={destLang} onValueChange={(value: LanguageCode) => setDestLang(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageCodes.map((code) => (
                      <SelectItem key={`dest-${code}`} value={code}>
                        {getLanguageName(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {progress > 0 && (
            <div className={styles.progressWrapper}>
              <p className={styles.progressLabel}>{t('progress_label')}</p>
              <Progress value={progress} />
            </div>
          )}

          <div className={styles.buttonWrapper}>
            <Button
              onClick={handleButtonAction}
              disabled={isTranslating || (!translatedFileUrl && (!file || invalidFileType))}
              className={translatedFileUrl ? styles.downloadButton : styles.translateButton}
            >
              {isTranslating ? (
                <>
                  <Icons.spinner className={styles.spinnerIcon} />
                  {t('translating')}
                </>
              ) : translatedFileUrl ? (
                t('download_button')
              ) : (
                t('translate_button')
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
