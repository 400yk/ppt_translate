import axios from 'axios';

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
      if (token) {
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
      originalRequest._retry = true;
      
      // Show a notification to the user
      console.log('Token expired, logging out...');
      
      if (isBrowser) {
        // Display notification using toast
        import('@/hooks/use-toast').then(({ toast }) => {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
        }).catch(err => {
          console.error('Failed to show toast:', err);
          alert('Your session has expired. Please log in again.');
        });
        
        // Clear user data from localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 