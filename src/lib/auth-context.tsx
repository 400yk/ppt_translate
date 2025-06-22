'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter as useNavigationRouter } from 'next/navigation';
import { clearGuestSession } from './guest-session';
import apiClient from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';

// Check for browser environment
const isBrowser = typeof window !== 'undefined';

// Types for auth context
interface User {
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  registeredWithInvitation: boolean | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, invitationCode: string) => Promise<void>;
  logout: (navigateCallback?: () => void) => void;
  signInWithGoogle: (googleToken: string, invitationCode?: string) => Promise<any>;
  verifyInvitationCode: (code: string) => Promise<{
    valid: boolean;
    remaining?: number;
    error?: string;
    errorKey?: string;
    message?: string;
    messageKey?: string;
  }>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  clearRegistrationFlag: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  registeredWithInvitation: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  signInWithGoogle: async () => {},
  verifyInvitationCode: async () => ({ valid: false }),
  fetchWithAuth: async () => new Response(),
  clearRegistrationFlag: () => {},
});

// API endpoint base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registeredWithInvitation, setRegisteredWithInvitation] = useState<boolean | null>(null);
  const { t } = useTranslation();
  
  // We can't use the router hook directly here (only in client components)
  // So we'll update the logout function to take an optional callback

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    // Skip localStorage access on server-side
    if (!isBrowser) {
      setIsLoading(false);
      return;
    }
    
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        // Clear invalid data
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
    
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.post('/api/login', {
        username, 
        password
      });

      const data = response.data;
      
      // Save auth data
      setToken(data.access_token);
      setUser({ username, email: '' }); // Email isn't returned from login
      
      // Store in localStorage for persistence (only in browser)
      if (isBrowser) {
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('auth_user', JSON.stringify({ username, email: '' }));
      }
      
      // Don't clear guest session - this prevents abuse where users could
      // log in, use quota, log out, and use guest translation again
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string, invitationCode: string) => {
    try {
      const response = await apiClient.post('/api/register', {
        username, 
        email, 
        password, 
        invitation_code: invitationCode
      });

      const data = response.data;
      
      // Save auth data after successful registration
      setToken(data.access_token);
      setUser({ username, email });
      
      // Store invitation code usage flag
      setRegisteredWithInvitation(data.has_invitation || false);
      
      // Store in localStorage for persistence (only in browser)
      if (isBrowser) {
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('auth_user', JSON.stringify({ username, email }));
      }
      
      // For new registrations, we do want to reset guest usage to give them a fresh start
      // This is handled by the resetGuestUsageAfterRegistration function in auth-tabs.tsx
      // but we don't clear the entire guest session
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = (navigateCallback?: () => void) => {
    setUser(null);
    setToken(null);
    setRegisteredWithInvitation(null);
    
    // Remove from localStorage (only in browser)
    if (isBrowser) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      // If a navigation callback is provided, use it
      if (navigateCallback) {
        navigateCallback();
      } 
      // Otherwise, do a default redirect to home page
      else if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  // Clear registration with invitation flag (to reset after showing welcome message)
  const clearRegistrationFlag = () => {
    setRegisteredWithInvitation(null);
  };

  // Fetch with auth token and automatic logout on token expiration
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Prepare headers with authentication token
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Check if token has expired
    if (!response.ok) {
      try {
        const errorData = await response.json();
        if (errorData.msg === 'Token has expired') {
          console.log('Token expired, logging out...');
          
          // Show a toast notification using createToast
          if (isBrowser && typeof window !== 'undefined') {
            // Import and execute the toast function directly
            import('@/hooks/use-toast').then(({ toast }) => {
              toast({
                title: t('errors.session_expired_title'),
                description: t('errors.session_expired_message'),
                variant: 'destructive',
              });
            }).catch(err => {
              // Fallback to alert if toast doesn't work
              console.error('Failed to show toast:', err);
              alert(t('errors.session_expired_message'));
            });
          }
          
          // Log out the user after a short delay to allow the notification to be seen
          setTimeout(() => {
            logout();
          }, 2000);
          
          throw new Error('Session expired. Please log in again.');
        }
      } catch (error) {
        // If JSON parsing fails, just continue with the response
        console.error('Error parsing response:', error);
      }
    }

    return response;
  };

  // Verify invitation code
  const verifyInvitationCode = async (code: string) => {
    try {
      const response = await apiClient.post('/api/verify-invitation', {
        code
      });

      return response.data;
    } catch (error) {
      console.error('Verify invitation code error:', error);
      return { valid: false, error: 'Failed to verify invitation code' };
    }
  };

  // Sign in with Google function
  const signInWithGoogle = async (googleToken: string, invitationCode?: string) => {
    try {
              const response = await apiClient.post('/api/auth/google', { 
          token: googleToken,
          invitation_code: invitationCode 
        });
        const data = response.data;
        
        // Save auth data
        setToken(data.access_token);
        setUser(data.user); // Assuming backend returns user object { username, email, ... }
        
        // Store invitation code usage flag for Google sign-in
        setRegisteredWithInvitation(data.has_invitation || false);
        
        // Store in localStorage for persistence (only in browser)
        if (isBrowser) {
          localStorage.setItem('auth_token', data.access_token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
        }
        
                // If invitation code was used successfully, log it
        if (data.has_invitation) {
          console.log('Invitation code successfully applied for Google OAuth user');
        }
      
        // Potentially clear guest session or perform other post-login actions
        // clearGuestSession(); // If you want to clear guest data after Google sign-in

        // Return the response data so frontend can check invitation status
        return data;

      } catch (error) {
        console.error('Google Sign-In error:', error);
        // The error object might have a response.data with errorKey for translation
        throw error; 
      }
    };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        registeredWithInvitation,
        login,
        register,
        logout,
        signInWithGoogle,
        verifyInvitationCode,
        fetchWithAuth,
        clearRegistrationFlag
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext); 