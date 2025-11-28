import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import styles from '@/app/styles/home.module.css';
import { 
  LanguageCode, 
  languageCodes,
  validateFileExtension, 
  validateFileSize,
  translateFileAsync
} from '@/lib/translation-service';
import { consumeGuestUsage } from '@/lib/guest-session';
import { getApiErrorMessage } from '@/lib/api-client';
import { ReferralPopup } from '@/components/referral-popup';
import { shouldShowPopup, setPopupPermanentlyDismissed } from '@/lib/referral-popup-utils';

interface TranslationFormProps {
  isGuestUser: boolean;
  maxFileSizeMB: number;
  isPaidUser: boolean;
  membershipStatus: any; // Membership status for popup eligibility
  onFileSizeExceeded: () => void;
  onWeeklyLimitReached: () => void;
  onRegistrationRequired: () => void;
  onSessionExpired: () => void;
  onShare?: () => void; // Callback for share button
  onFeedback?: () => void; // Callback for feedback button
}

export function TranslationForm({
  isGuestUser,
  maxFileSizeMB,
  isPaidUser,
  membershipStatus,
  onFileSizeExceeded,
  onWeeklyLimitReached,
  onRegistrationRequired,
  onSessionExpired,
  onShare,
  onFeedback,
}: TranslationFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [translatedFileUrl, setTranslatedFileUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [invalidFileType, setInvalidFileType] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileSizeExceeded, setFileSizeExceeded] = useState(false);
  
  // Referral popup state
  const [showPopup, setShowPopup] = useState(false);
  const [popupShownThisSession, setPopupShownThisSession] = useState(false);

  // Set default languages based on current locale
  const getDefaultLanguages = () => {
    // Source language defaults to current page locale
    const defaultSrc = locale as LanguageCode;
    // Destination language defaults to English, unless current locale is English, then use Chinese
    const defaultDest: LanguageCode = locale === 'en' ? 'zh' : 'en';
    return { defaultSrc, defaultDest };
  };

  const { defaultSrc, defaultDest } = getDefaultLanguages();
  const [srcLang, setSrcLang] = useState<LanguageCode>(defaultSrc);
  const [destLang, setDestLang] = useState<LanguageCode>(defaultDest);

  // Update languages when locale changes
  useEffect(() => {
    const { defaultSrc: newDefaultSrc, defaultDest: newDefaultDest } = getDefaultLanguages();
    setSrcLang(newDefaultSrc);
    setDestLang(newDefaultDest);
  }, [locale]);

  // Monitor translation progress and show popup at 20%
  useEffect(() => {
    const shouldShow = shouldShowPopup(progress, isTranslating, membershipStatus, popupShownThisSession);
    if (shouldShow && !showPopup) {
      setShowPopup(true);
      setPopupShownThisSession(true);
    }
  }, [progress, isTranslating, membershipStatus, popupShownThisSession, showPopup]);

  // Helper function to get translated language name
  const getLanguageName = (code: LanguageCode): string => {
    // Using type assertion to help TypeScript understand this is a valid key
    const key = `languages.${code}` as const;
    return t(key);
  };

  // Handle popup close
  const handlePopupClose = () => {
    setShowPopup(false);
    // Don't mark as permanently dismissed on regular close
    // Only use setPopupPermanentlyDismissed() if implementing "don't show again"
  };

  // Handle share button click
  const handleShare = () => {
    setShowPopup(false);
    onShare?.();
  };

  // Handle feedback button click  
  const handleFeedback = () => {
    setShowPopup(false);
    onFeedback?.();
  };

  // Function to swap source and destination languages
  const handleSwapLanguages = () => {
    if (isTranslating) return; // Don't allow swapping while translating
    
    const tempSrcLang = srcLang;
    setSrcLang(destLang);
    setDestLang(tempSrcLang);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if file has a valid extension
      if (!validateFileExtension(selectedFile.name)) {
        // Show invalid file type warning
        setInvalidFileType(true);
        toast({
          title: t('errors.warning_title'),
          description: t('errors.invalid_file_type'),
          variant: 'destructive',
        });
        return;
      }
      
      // Check file size limit for non-paid users
      if (!validateFileSize(selectedFile.size, maxFileSizeMB, isPaidUser)) {
        setFileSizeExceeded(true);
        onFileSizeExceeded();
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
      
      // Set the file and reset previous translation state
      setFile(selectedFile);
      setTranslatedFileUrl(null); // Reset translation URL when new file is selected
      setProgress(0);
      setStatusMessage('');
    }
  };

  const handleRevertFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFile(null);
    setTranslatedFileUrl(null);
    setProgress(0);
    setStatusMessage('');
    setInvalidFileType(false);
    setFileSizeExceeded(false);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTranslate = async () => {
    if (!file) {
      toast({
        title: t('errors.generic_error_title'),
        description: t('errors.no_file'),
        variant: 'destructive',
      });
      return;
    }

    if (srcLang === destLang) {
      toast({
        title: t('errors.generic_error_title'),
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
        onRegistrationRequired();
        return;
      }
    }

    setIsTranslating(true);
    setProgress(0);
    setStatusMessage('');
    setTranslatedFileUrl(null); // Reset any previous translated file URL

    try {
      // Prepare translated status messages
      const statusMessages = {
        starting: t('progress.starting_translation'),
        inProgress: t('progress.translation_in_progress'),
        processing: t('progress.processing'),
        downloading: t('progress.downloading_file'),
        complete: t('progress.complete'),
        timeout: t('progress.timeout_error')
      };

      // Prepare translated error messages
      const errorMessages = {
        noDownloadUrl: t('errors.no_download_url'),
        translationFailed: t('errors.translation_failed_fallback')
      };

      // Use the async translation service
      const url = await translateFileAsync(
        file,
        srcLang,
        destLang,
        isGuestUser,
        setProgress,
        setStatusMessage,
        statusMessages,
        errorMessages
      );
      
      // Store the translated file URL
      setTranslatedFileUrl(url);
      
      // Show success message
      toast({
        title: t('success.title'),
        description: t('success.translation_complete'),
      });
    } catch (error) {
      // Don't log to console for expected errors
      setProgress(0);
      setStatusMessage('');
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === 'authentication_error') {
          onSessionExpired();
          return;
        }
        
        if (error.message === 'weekly_limit_reached') {
          onWeeklyLimitReached();
          return;
        }

        if (error.message === 'invitation_code_invalid') {
          toast({
            title: t('errors.generic_error_title'),
            description: t('errors.code_already_used'),
            variant: 'destructive',
          });
          return;
        }

        if (error.message === 'character_limit_reached') {
          toast({
            title: t('pricing.character_limit_title'),
            description: getApiErrorMessage(error),
            variant: 'destructive',
          });
          return;
        }

        if (error.message === 'service_unavailable') {
          toast({
            title: t('errors.service_unavailable_title'),
            description: t('errors.service_unavailable_message'),
            variant: 'destructive',
          });
          return;
        }

        if (error.message === 'task_not_found') {
          toast({
            title: t('errors.generic_error_title'),
            description: t('errors.task_not_found_message'),
            variant: 'destructive',
          });
          return;
        }

        if (error.message === 'file_not_found') {
          toast({
            title: t('errors.generic_error_title'),
            description: t('errors.file_not_found_message'),
            variant: 'destructive',
          });
          return;
        }
        
        toast({
          title: t('errors.generic_error_title'),
          description: getApiErrorMessage(error),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('errors.generic_error_title'),
          description: getApiErrorMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setIsTranslating(false);
      setStatusMessage('');
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
          title: t('errors.warning_title'),
          description: t('errors.invalid_file_type'),
          variant: 'destructive',
        });
        return;
      }
      
      // Check file size limit for non-paid users
      if (!validateFileSize(droppedFile.size, maxFileSizeMB, isPaidUser)) {
        setFileSizeExceeded(true);
        onFileSizeExceeded();
        toast({
          title: t('errors.file_size_limit'),
          description: t('errors.file_size_exceeded', { size: maxFileSizeMB }),
          variant: 'destructive',
        });
        return;
      }
      
      setInvalidFileType(false);
      setFileSizeExceeded(false);
      setFile(droppedFile);
      setTranslatedFileUrl(null);
      setProgress(0);
      setStatusMessage('');
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
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
              
              <div className="w-full flex items-end space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('from_label')}
                  </label>
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
                
                <button
                  type="button"
                  onClick={handleSwapLanguages}
                  disabled={isTranslating}
                  className={`p-2 rounded-full transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isTranslating ? '' : 'hover:bg-primary/10'
                  } mb-1`}
                  title={t('buttons.swap_languages')}
                >
                  <Icons.arrowLeftRight className="h-4 w-4 flex-shrink-0" />
                </button>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('to_label')}
                  </label>
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
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-600">{statusMessage}</p>
            <p className="text-xs text-gray-500">{progress}%</p>
          </div>
        </div>
      )}
      
      <p className="text-sm text-gray-500 text-center max-w-lg">
        {t('footer.description')}
      </p>

      {/* Referral Popup */}
      <ReferralPopup
        isVisible={showPopup}
        onClose={handlePopupClose}
        onShare={handleShare}
        onFeedback={handleFeedback}
      />
    </div>
  );
} 