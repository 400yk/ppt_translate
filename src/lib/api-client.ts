import axios from 'axios';
import { isCloudStorageUrl } from './cloud-storage-config';
import { getTranslation } from './i18n';

// API endpoint base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Check for browser environment
const isBrowser = typeof window !== 'undefined';

// Map common English error messages to translation keys
const errorMessageMap: Record<string, string> = {
  'Username already exists': 'errors.username_exists',
  'Email already exists': 'errors.email_exists',
  'Invalid invitation code': 'errors.code_invalid',
  'Invitation code not found': 'errors.code_invalid',
  'Invitation code already used': 'errors.code_already_used',
  'Invitation code deactivated': 'errors.code_deactivated',
  'User not found': 'errors.user_not_found',
  'Invalid credentials': 'errors.authentication_error',
  'Weekly limit reached': 'errors.weekly_limit_reached',
  'Translation failed': 'errors.translation_failed',
  'File not found': 'errors.file_not_found_message',
  'Task not found': 'errors.task_not_found_message',
  'Service unavailable': 'errors.service_unavailable_message',
};

// Utility function to extract translated error message from API response
export const getApiErrorMessage = (error: any): string => {
  // If it's an axios error with response data
  if (error.response && error.response.data) {
    const data = error.response.data;
    
    // If there's an errorKey, use it to get the translated message
    if (data.errorKey) {
      return getTranslation(data.errorKey as any);
    }
    
    // If there's an error message, try to map it to a translation key
    if (data.error) {
      const mappedKey = errorMessageMap[data.error];
      if (mappedKey) {
        return getTranslation(mappedKey as any);
      }
      return data.error;
    }
    
    // If there's a message field, try to map it to a translation key
    if (data.message) {
      const mappedKey = errorMessageMap[data.message];
      if (mappedKey) {
        return getTranslation(mappedKey as any);
      }
      return data.message;
    }
  }
  
  // If it's a regular Error object
  if (error instanceof Error) {
    const mappedKey = errorMessageMap[error.message];
    if (mappedKey) {
      return getTranslation(mappedKey as any);
    }
    return error.message;
  }
  
  // Fallback to a generic error message
  return getTranslation('errors.unknown_error');
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (isBrowser) {
      const token = localStorage.getItem('auth_token');
      // Only add Authorization header if the URL is NOT a cloud storage URL
      if (token && !isCloudStorageUrl(config.url || '')) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is due to an expired token
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data?.msg === 'Token has expired' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true; // Prevent infinite loops
      
      // Log the event
      console.log('Token expired. Handling logout and notification.');
            
      // Clear user data from localStorage
      if (isBrowser) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Show a toast notification using translations
        try {
          const { toast } = await import('@/hooks/use-toast');
          
          toast({
            title: getTranslation('errors.session_expired_title'),
            description: getTranslation('errors.session_expired_message'),
            variant: 'destructive',
          });
        } catch (toastError) {
          // Fallback to translated alert if toast doesn't work
          console.error('Failed to show toast:', toastError);
          alert(getTranslation('errors.session_expired_message'));
        }
        
        // Redirect to home page after a short delay to allow the notification to be seen
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
      
      // Reject the promise so that the calling code can also handle it if needed
      return Promise.reject(error); 
    }
    
    // For other errors, just reject them
    return Promise.reject(error);
  }
);

export default apiClient; 