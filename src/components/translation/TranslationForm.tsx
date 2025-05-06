import { useState, useRef } from 'react';
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
  translateFile
} from '@/lib/translation-service';
import { consumeGuestUsage } from '@/lib/guest-session';

interface TranslationFormProps {
  isGuestUser: boolean;
  maxFileSizeMB: number;
  isPaidUser: boolean;
  onFileSizeExceeded: () => void;
  onWeeklyLimitReached: () => void;
  onRegistrationRequired: () => void;
  onSessionExpired: () => void;
}

export function TranslationForm({
  isGuestUser,
  maxFileSizeMB,
  isPaidUser,
  onFileSizeExceeded,
  onWeeklyLimitReached,
  onRegistrationRequired,
  onSessionExpired,
}: TranslationFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [translatedFileUrl, setTranslatedFileUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [srcLang, setSrcLang] = useState<LanguageCode>("zh"); // Default source language: Chinese
  const [destLang, setDestLang] = useState<LanguageCode>("en"); // Default target language: English
  const [invalidFileType, setInvalidFileType] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileSizeExceeded, setFileSizeExceeded] = useState(false);
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Helper function to get translated language name
  const getLanguageName = (code: LanguageCode): string => {
    // Using type assertion to help TypeScript understand this is a valid key
    const key = `languages.${code}` as const;
    return t(key);
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
    }
  };

  const handleRevertFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFile(null);
    setTranslatedFileUrl(null);
    setProgress(0);
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
        onRegistrationRequired();
        return;
      }
    }

    setIsTranslating(true);
    setProgress(0);
    setTranslatedFileUrl(null); // Reset any previous translated file URL

    try {
      // Use the translation service
      const url = await translateFile(
        file,
        srcLang,
        destLang,
        isGuestUser,
        setProgress
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
        
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: String(error),
          variant: 'destructive',
        });
      }
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
  );
} 