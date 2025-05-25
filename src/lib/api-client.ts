import axios from 'axios';
import { isCloudStorageUrl } from './cloud-storage-config';

// API endpoint base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Check for browser environment
const isBrowser = typeof window !== 'undefined';

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
      
      // Log the event, but the toast and logout are handled by AuthContext's fetchWithAuth
      console.log('Token expired. AuthContext will handle logout and notification.');
            
      // Clear user data from localStorage here as a safeguard, though AuthContext also does it.
      if (isBrowser) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // We don't redirect here, AuthContext will handle it after showing the toast.
      }
      
      // Reject the promise so that fetchWithAuth can also catch it and trigger its logic.
      return Promise.reject(error); 
    }
    
    // For other errors, just reject them
    return Promise.reject(error);
  }
);

export default apiClient; 