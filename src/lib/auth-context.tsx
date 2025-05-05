'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter as useNavigationRouter } from 'next/navigation';
import { clearGuestSession } from './guest-session';

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
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, invitationCode: string) => Promise<void>;
  logout: (navigateCallback?: () => void) => void;
  verifyInvitationCode: (code: string) => Promise<{
    valid: boolean;
    remaining?: number;
    error?: string;
  }>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  verifyInvitationCode: async () => ({ valid: false }),
});

// API endpoint base URL
const API_URL = process.env.API_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      
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
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, invitation_code: invitationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      
      // Save auth data after successful registration
      setToken(data.access_token);
      setUser({ username, email });
      
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

  // Verify invitation code
  const verifyInvitationCode = async (code: string) => {
    try {
      const response = await fetch(`${API_URL}/api/verify-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify invitation code');
      }

      return await response.json();
    } catch (error) {
      console.error('Verify invitation code error:', error);
      return { valid: false, error: 'Failed to verify invitation code' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        verifyInvitationCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext); 