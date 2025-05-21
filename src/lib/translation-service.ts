import { toast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';

// Define API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Define available languages (codes only)
export const languageCodes = ["zh", "en", "es", "fr", "de", "ja", "ko", "ru"] as const;
export type LanguageCode = typeof languageCodes[number];

export const nativeLanguageNames = {
  zh: "中文",
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
        response = await apiClient.post('/guest-translate', formData, {
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
            throw new Error('weekly_limit_reached');
          }

          if (error.response.status === 503) {
            throw new Error('service_unavailable');
          }
          
          // Try to parse error response if it's JSON
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
        response = await apiClient.post('/translate', formData, {
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
            throw new Error('weekly_limit_reached');
          }

          if (error.response.status === 503) {
            throw new Error('service_unavailable');
          }
          
          // Try to parse error response if it's JSON
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
    const response = await apiClient.get('/config/file-size-limit');
    if (response.data.maxFileSizeMB) {
      return response.data.maxFileSizeMB;
    }
    return 50; // Default to 50MB if the value is not in the response
  } catch (error) {
    console.error("Failed to fetch max file size from backend:", error);
    return 50; // Default to 50MB
  }
} 