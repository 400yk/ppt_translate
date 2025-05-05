'use client';

// Define constant for session storage keys
const GUEST_SESSION_KEY = 'guest_session';
const GUEST_USAGE_KEY = 'guest_usage';
const GUEST_LAST_USAGE_DATE = 'guest_last_usage_date';
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Define guest session interface
interface GuestSession {
  id: string;
  createdAt: string;
  lastUsedAt: string;
}

// Define guest usage interface
interface GuestUsage {
  remainingUses: number;
  totalUses: number;
}

// Define guest status interface from API
interface GuestStatus {
  user_type: string;
  translations_limit: number;
  translations_used: number;
  translations_remaining: number;
  period: string;
  reset_info: string;
}

/**
 * Creates a unique identifier based on current time
 * This isn't a true UUID but sufficient for guest tracking
 */
function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Initialize guest session if one doesn't exist
 * This still creates a local session for tracking, but usage
 * will be controlled by the backend
 */
export function initGuestSession(): GuestSession {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return {
      id: '',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };
  }

  // Check if we already have a guest session
  const existingSession = localStorage.getItem(GUEST_SESSION_KEY);
  if (existingSession) {
    try {
      const session = JSON.parse(existingSession) as GuestSession;
      // Update last used time
      session.lastUsedAt = new Date().toISOString();
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
      return session;
    } catch (e) {
      // If parse fails, create a new session
      console.error('Failed to parse guest session, creating new session');
    }
  }

  // Create a new guest session
  const newSession: GuestSession = {
    id: generateSessionId(),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };

  // Store in localStorage (just the session ID, not usage)
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newSession));

  return newSession;
}

/**
 * Get current guest session or create one
 */
export function getGuestSession(): GuestSession | null {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return null;
  }

  const sessionData = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sessionData) {
    return initGuestSession();
  }

  try {
    return JSON.parse(sessionData) as GuestSession;
  } catch (e) {
    console.error('Failed to parse guest session');
    return null;
  }
}

/**
 * Fetch guest usage status from the backend API
 * This replaces the local storage tracking with server tracking
 * Note: Guests only get ONE translation in their lifetime, not per day/period
 */
export async function fetchGuestUsage(): Promise<GuestUsage> {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return { remainingUses: 0, totalUses: 0 };
  }

  try {
    // Call the backend API to get current guest status
    const response = await fetch(`${API_URL}/api/guest/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch guest status');
    }

    const data = await response.json() as GuestStatus;
    
    // Convert API format to our local format
    const usage: GuestUsage = {
      remainingUses: data.translations_remaining,
      totalUses: data.translations_used
    };

    // Cache in localStorage for UI purposes, but backend will be source of truth
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
    return usage;
  } catch (e) {
    console.error('Error fetching guest status:', e);
    
    // Fallback to stored data if available
    const usageData = localStorage.getItem(GUEST_USAGE_KEY);
    if (usageData) {
      try {
        return JSON.parse(usageData) as GuestUsage;
      } catch (e) {
        console.error('Failed to parse stored guest usage');
      }
    }
    
    // Default to no remaining uses if we can't get status
    return { remainingUses: 0, totalUses: 0 };
  }
}

/**
 * Get guest usage (cached version for quick UI rendering)
 * This doesn't call the API, just returns cached values
 */
export function getGuestUsage(): GuestUsage {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return { remainingUses: 0, totalUses: 0 };
  }

  const usageData = localStorage.getItem(GUEST_USAGE_KEY);
  if (!usageData) {
    // Return a default, fetchGuestUsage() should be called to get accurate data
    return { remainingUses: 1, totalUses: 0 };
  }

  try {
    return JSON.parse(usageData) as GuestUsage;
  } catch (e) {
    console.error('Failed to parse guest usage');
    return { remainingUses: 0, totalUses: 0 };
  }
}

/**
 * Check if a guest can use translation based on backend state
 * This is just a quick check using cached values, for UI purposes
 */
export function canGuestUseTranslation(): boolean {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return false;
  }

  const usage = getGuestUsage();
  return usage.remainingUses > 0;
}

/**
 * Backend will handle consumption of usage in the API call
 * This function is kept for compatibility but now simply returns true
 * since the actual consumption happens on the server side
 */
export function consumeGuestUsage(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // We don't need to update local storage since the backend will track usage
  // The next call to fetchGuestUsage() will refresh our cached values
  return true;
}

/**
 * Reset guest usage after registration
 * This is needed for newly registered users
 */
export function resetGuestUsageAfterRegistration(): void {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Update cached values to show 1 free use
  const usage: GuestUsage = {
    remainingUses: 1,
    totalUses: 0
  };

  localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Clear all guest session data
 * Modified to not enable abuse by repeated login/logout cycles
 * Now it marks the guest usage as depleted instead of removing it completely
 */
export function clearGuestSession(): void {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Instead of removing the data, set remaining uses to 0
  // This prevents users from getting a fresh guest session by logging in and out
  const usage: GuestUsage = {
    remainingUses: 0,
    totalUses: 1
  };
  
  localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
} 