import { toast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { isCloudStorageUrl } from '@/lib/cloud-storage-config';

// Define API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Define available languages (codes only)
export const languageCodes = ["zh", "zh_hk", "en", "es", "fr", "de", "ja", "ko", "ru"] as const;
export type LanguageCode = typeof languageCodes[number];

export const nativeLanguageNames = {
  zh: "中文",
  zh_hk: "繁體中文",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский"
};

interface TranslationResponse {
  url: string;
  error?: string;
}

// New interfaces for async translation
interface AsyncTranslationStartResponse {
  task_id: string;
  message: string;
}

interface AsyncTranslationStatusResponse {
  task_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED';
  result?: {
    translated_file_path?: string;
    download_url?: string;
  };
  error?: string;
}

/**
 * Validates if the file has a valid extension for translation
 * @param fileName - The name of the file to validate
 * @returns boolean - Whether the file has a valid extension
 */
export function validateFileExtension(fileName: string): boolean {
  const validExtensions = ['.pptx'];
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return validExtensions.includes(fileExtension);
}

/**
 * Validates if the file size is within limits
 * @param fileSize - The size of the file in bytes
 * @param maxFileSizeMB - The maximum allowed file size in MB
 * @param isPaidUser - Whether the user has a paid account
 * @returns boolean - Whether the file size is valid
 */
export function validateFileSize(fileSize: number, maxFileSizeMB: number, isPaidUser: boolean): boolean {
  const MAX_SIZE_BYTES = maxFileSizeMB * 1024 * 1024;
  // Paid users can upload files of any size
  if (isPaidUser) return true;
  // Check if file size exceeds the limit for non-paid users
  return fileSize <= MAX_SIZE_BYTES;
}

/**
 * Sends a file for translation to the backend
 * @param file - The file to translate
 * @param srcLang - The source language code
 * @param destLang - The destination language code
 * @param isGuestUser - Whether the user is a guest
 * @param onProgress - Callback for progress updates
 * @returns Promise<string> - URL to the translated file
 */
export async function translateFile(
  file: File,
  srcLang: LanguageCode,
  destLang: LanguageCode,
  isGuestUser: boolean,
  onProgress: (progress: number) => void
): Promise<string> {
  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('src_lang', srcLang);
  formData.append('dest_lang', destLang);

  // Keep track of progress locally
  let currentProgress = 0;

  // Start progress reporting
  const progressInterval = setInterval(() => {
    currentProgress += 5;
    if (currentProgress >= 90) {
      clearInterval(progressInterval);
      currentProgress = 90;
    }
    onProgress(currentProgress);
  }, 20);

  try {
    let response;
    
    if (isGuestUser) {
      // Use guest endpoint for guest users with apiClient
      try {
        response = await apiClient.post('/api/guest-translate', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'blob',
        });
        
        clearInterval(progressInterval);
      } catch (error: any) {
        clearInterval(progressInterval);
        
        // Handle specific error status codes
        if (error.response) {
          if (error.response.status === 401) {
            throw new Error('authentication_error');
          }
          
          if (error.response.status === 403) {
            // Check the errorKey to determine the specific error type
            let errorData = error.response.data;
            
            // If response data is a Blob, try to parse it as JSON
            if (errorData instanceof Blob) {
              try {
                const textData = await errorData.text();
                errorData = JSON.parse(textData);
              } catch (parseError) {
                // If parsing fails, default to weekly limit error for backward compatibility
                throw new Error('weekly_limit_reached');
              }
            }
            
            // Check errorKey to determine the specific error
            if (errorData?.errorKey === 'errors.code_already_used') {
              throw new Error('invitation_code_invalid');
            } else if (errorData?.errorKey === 'pricing.character_limit_title') {
              throw new Error('character_limit_reached');
            } else if (errorData?.errorKey === 'pricing.weekly_limit_title' || errorData?.error?.includes('limit reached')) {
              throw new Error('weekly_limit_reached');
            } else {
              // Default to weekly limit for backward compatibility
              throw new Error('weekly_limit_reached');
            }
          }

          if (error.response.status === 503) {
            throw new Error('service_unavailable');
          }
          
          // Try to parse error response if it's JSON (for other status codes)
          if (error.response.data instanceof Blob) {
            try {
              const textData = await error.response.data.text();
              const jsonData = JSON.parse(textData);
              throw new Error(jsonData.error || 'Translation failed');
            } catch (parseError) {
              throw new Error('Translation failed');
            }
          }
        }
        
        // Handle network errors
        if (error.message === 'Network Error') {
          throw new Error('service_unavailable');
        }
        
        throw error;
      }
    } else {
      // Use apiClient for authenticated users
      try {
        // We need to use raw axios for file uploads with progress
        response = await apiClient.post('/api/translate', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'blob',
        });
        
        clearInterval(progressInterval);
      } catch (error: any) {
        clearInterval(progressInterval);
        
        // Handle specific error status codes
        if (error.response) {
          if (error.response.status === 401) {
            throw new Error('authentication_error');
          }
          
          if (error.response.status === 403) {
            // Check the errorKey to determine the specific error type
            let errorData = error.response.data;
            
            // If response data is a Blob, try to parse it as JSON
            if (errorData instanceof Blob) {
              try {
                const textData = await errorData.text();
                errorData = JSON.parse(textData);
              } catch (parseError) {
                // If parsing fails, default to weekly limit error for backward compatibility
                throw new Error('weekly_limit_reached');
              }
            }
            
            // Check errorKey to determine the specific error
            if (errorData?.errorKey === 'errors.code_already_used') {
              throw new Error('invitation_code_invalid');
            } else if (errorData?.errorKey === 'pricing.character_limit_title') {
              throw new Error('character_limit_reached');
            } else if (errorData?.errorKey === 'pricing.weekly_limit_title' || errorData?.error?.includes('limit reached')) {
              throw new Error('weekly_limit_reached');
            } else {
              // Default to weekly limit for backward compatibility
              throw new Error('weekly_limit_reached');
            }
          }

          if (error.response.status === 503) {
            throw new Error('service_unavailable');
          }
          
          // Try to parse error response if it's JSON (for other status codes)
          if (error.response.data instanceof Blob) {
            try {
              const textData = await error.response.data.text();
              const jsonData = JSON.parse(textData);
              throw new Error(jsonData.error || 'Translation failed');
            } catch (parseError) {
              throw new Error('Translation failed');
            }
          }
        }
        
        // Handle network errors
        if (error.message === 'Network Error') {
          throw new Error('service_unavailable');
        }
        
        throw error;
      }
    }

    // Set progress to 100%
    onProgress(100);
    
    // Create a blob URL for the translated file
    const blob = response.data;
    return URL.createObjectURL(blob);
  } catch (error) {
    clearInterval(progressInterval);
    onProgress(0);
    throw error;
  }
}

/**
 * Fetches the maximum allowed file size from the backend
 * @returns Promise<number> - Maximum file size in MB
 */
export async function fetchMaxFileSize(): Promise<number> {
  try {
    const response = await apiClient.get('/api/config/file-size-limit');
    if (response.data.maxFileSizeMB) {
      return response.data.maxFileSizeMB;
    }
    return 50; // Default to 50MB if the value is not in the response
  } catch (error) {
    console.error("Failed to fetch max file size from backend:", error);
    return 50; // Default to 50MB
  }
}

/**
 * Starts an async translation task
 * @param file - The file to translate
 * @param srcLang - The source language code
 * @param destLang - The destination language code
 * @param isGuestUser - Whether the user is a guest
 * @returns Promise<string> - Task ID for polling
 */
export async function startAsyncTranslation(
  file: File,
  srcLang: LanguageCode,
  destLang: LanguageCode,
  isGuestUser: boolean
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('src_lang', srcLang);
  formData.append('dest_lang', destLang);

  try {
    let response;
    
    if (isGuestUser) {
      response = await apiClient.post('/api/guest-translate-async-start', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      response = await apiClient.post('/api/translate_async_start', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }

    const data: AsyncTranslationStartResponse = response.data;
    return data.task_id;
  } catch (error: any) {
    // Handle specific error status codes
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('authentication_error');
      }
      
      if (error.response.status === 403) {
        // Check the errorKey to determine the specific error type
        const errorData = error.response.data;
        
        // Check errorKey to determine the specific error
        if (errorData?.errorKey === 'errors.code_already_used') {
          throw new Error('invitation_code_invalid');
        } else if (errorData?.errorKey === 'pricing.character_limit_title') {
          throw new Error('character_limit_reached');
        } else if (errorData?.errorKey === 'pricing.weekly_limit_title' || errorData?.error?.includes('limit reached')) {
          throw new Error('weekly_limit_reached');
        } else {
          // Default to weekly limit for backward compatibility
          throw new Error('weekly_limit_reached');
        }
      }

      if (error.response.status === 503) {
        throw new Error('service_unavailable');
      }
      
      // Try to parse error response
      if (error.response.data?.error) {
        throw new Error(error.response.data.error);
      }
    }
    
    // Handle network errors
    if (error.message === 'Network Error') {
      throw new Error('service_unavailable');
    }
    
    throw error;
  }
}

/**
 * Polls the status of an async translation task
 * @param taskId - The task ID to check
 * @param isGuestUser - Whether the user is a guest
 * @returns Promise<AsyncTranslationStatusResponse> - Current task status
 */
export async function pollTranslationStatus(taskId: string, isGuestUser: boolean = false): Promise<AsyncTranslationStatusResponse> {
  try {
    const endpoint = isGuestUser ? `/api/guest-translate-status/${taskId}` : `/api/translate_status/${taskId}`;
    const response = await apiClient.get(endpoint);
    return response.data as AsyncTranslationStatusResponse;
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('authentication_error');
      }
      
      if (error.response.status === 404) {
        throw new Error('task_not_found');
      }

      if (error.response.status === 503) {
        throw new Error('service_unavailable');
      }
    }
    
    if (error.message === 'Network Error') {
      throw new Error('service_unavailable');
    }
    
    throw error;
  }
}

/**
 * Downloads the translated file from the server
 * @param downloadUrl - The URL to download the file from
 * @param fileName - The original file name for the download
 * @returns Promise<string> - Blob URL for the downloaded file
 */
export async function downloadTranslatedFile(downloadUrl: string, fileName: string): Promise<string> {
  try {
    // Check if this is a cloud storage URL (S3, OSS, etc.)
    const isCloudStorage = isCloudStorageUrl(downloadUrl);

    let response;
    
    if (isCloudStorage) {
      // For cloud storage URLs, use direct fetch without apiClient
      response = await fetch(downloadUrl);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('authentication_error');
        }
        
        if (response.status === 404) {
          throw new Error('file_not_found');
        }

        if (response.status === 503) {
          throw new Error('service_unavailable');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } else {
      // For backend URLs, use apiClient
      response = await apiClient.get(downloadUrl, {
        responseType: 'blob',
      });
      
      const blob = response.data;
      return URL.createObjectURL(blob);
    }
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('authentication_error');
      }
      
      if (error.response.status === 404) {
        throw new Error('file_not_found');
      }

      if (error.response.status === 503) {
        throw new Error('service_unavailable');
      }
    }
    
    if (error.message === 'Network Error') {
      throw new Error('service_unavailable');
    }
    
    throw error;
  }
}

/**
 * Complete async translation workflow with polling
 * @param file - The file to translate
 * @param srcLang - The source language code
 * @param destLang - The destination language code
 * @param isGuestUser - Whether the user is a guest
 * @param onProgress - Callback for progress updates
 * @param onStatusUpdate - Callback for status updates
 * @param statusMessages - Object containing translated status messages
 * @param errorMessages - Object containing translated error messages
 * @returns Promise<string> - URL to the translated file
 */
export async function translateFileAsync(
  file: File,
  srcLang: LanguageCode,
  destLang: LanguageCode,
  isGuestUser: boolean,
  onProgress: (progress: number) => void,
  onStatusUpdate?: (status: string) => void,
  statusMessages?: {
    starting: string;
    inProgress: string;
    processing: string;
    downloading: string;
    complete: string;
    timeout: string;
  },
  errorMessages?: {
    noDownloadUrl: string;
    translationFailed: string;
  }
): Promise<string> {
  // Use provided messages or fallback to English
  const messages = statusMessages || {
    starting: 'Starting translation...',
    inProgress: 'Translation in progress...',
    processing: 'Processing...',
    downloading: 'Downloading file...',
    complete: 'Complete!',
    timeout: 'Translation timeout - please try again'
  };

  const errors = errorMessages || {
    noDownloadUrl: 'No download URL provided',
    translationFailed: 'Translation failed'
  };

  // Start the translation task
  onStatusUpdate?.(messages.starting);
  onProgress(10);
  
  const taskId = await startAsyncTranslation(file, srcLang, destLang, isGuestUser);
  
  onStatusUpdate?.(messages.inProgress);
  onProgress(20);
  
  // Poll for completion
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes with 5-second intervals
  const pollInterval = 5000; // 5 seconds
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        
        if (attempts > maxAttempts) {
          reject(new Error(messages.timeout));
          return;
        }
        
        const status = await pollTranslationStatus(taskId, isGuestUser);
        
        // Update progress based on status
        if (status.status === 'PENDING') {
          const progressValue = Math.min(20 + (attempts * 2), 80);
          onProgress(progressValue);
          onStatusUpdate?.(messages.processing);
        }
        
        if (status.status === 'SUCCESS') {
          onProgress(90);
          onStatusUpdate?.(messages.downloading);
          
          if (status.result?.download_url) {
            try {
              const fileUrl = await downloadTranslatedFile(status.result.download_url, file.name);
              onProgress(100);
              onStatusUpdate?.(messages.complete);
              resolve(fileUrl);
            } catch (downloadError) {
              reject(downloadError);
            }
          } else {
            reject(new Error(errors.noDownloadUrl));
          }
          return;
        }
        
        if (status.status === 'FAILURE') {
          reject(new Error(status.error || errors.translationFailed));
          return;
        }
        
        // Continue polling
        setTimeout(poll, pollInterval);
      } catch (error) {
        reject(error);
      }
    };
    
    // Start polling
    setTimeout(poll, pollInterval);
  });
} 