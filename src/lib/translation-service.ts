import { toast } from '@/hooks/use-toast';

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
    // Determine which endpoint to use and prepare headers
    let endpointUrl = `${API_URL}/translate`;
    let headers: HeadersInit = {};
    
    if (isGuestUser) {
      // Use guest endpoint for guest users
      endpointUrl = `${API_URL}/guest-translate`;
    } else {
      // Get auth token for authenticated users
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('authentication_error');
      }
      headers = {
        'Authorization': `Bearer ${token}`,
      };
    }

    // Send the file to the Flask backend
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('authentication_error');
      }
      
      if (response.status === 403) {
        // Handle weekly limit error without using console.error
        throw new Error('weekly_limit_reached');
      }
      
      const err = await response.json();
      throw new Error(err.error || 'Translation failed');
    }

    // Set progress to 100%
    onProgress(100);
    
    // Create a blob URL for the translated file
    const blob = await response.blob();
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
    const response = await fetch(`${API_URL}/config/file-size-limit`);
    if (response.ok) {
      const data = await response.json();
      if (data.maxFileSizeMB) {
        return data.maxFileSizeMB;
      }
    }
    return 50; // Default to 50MB if the API call fails
  } catch (error) {
    console.error("Failed to fetch max file size from backend:", error);
    return 50; // Default to 50MB
  }
} 