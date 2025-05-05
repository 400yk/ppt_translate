'use client';

// Define constant for session storage keys
const GUEST_SESSION_KEY = 'guest_session';
const GUEST_USAGE_KEY = 'guest_usage';
const GUEST_LAST_USAGE_DATE = 'guest_last_usage_date';

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

/**
 * Creates a unique identifier based on current time
 * This isn't a true UUID but sufficient for guest tracking
 */
function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Initialize guest session if one doesn't exist
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

  // Initialize usage with 1 free use
  const newUsage: GuestUsage = {
    remainingUses: 1,
    totalUses: 0
  };

  // Store in localStorage
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newSession));
  localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(newUsage));
  localStorage.setItem(GUEST_LAST_USAGE_DATE, new Date().toISOString());

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
 * Get remaining guest usage
 */
export function getGuestUsage(): GuestUsage {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return { remainingUses: 0, totalUses: 0 };
  }

  const usageData = localStorage.getItem(GUEST_USAGE_KEY);
  if (!usageData) {
    const initialUsage: GuestUsage = {
      remainingUses: 1,
      totalUses: 0
    };
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(initialUsage));
    return initialUsage;
  }

  try {
    return JSON.parse(usageData) as GuestUsage;
  } catch (e) {
    console.error('Failed to parse guest usage');
    return { remainingUses: 0, totalUses: 0 };
  }
}

/**
 * Consume one usage attempt for the guest
 * Returns true if successful, false if no attempts remaining
 */
export function consumeGuestUsage(): boolean {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return false;
  }

  const usage = getGuestUsage();
  
  // Check if user has any attempts left
  if (usage.remainingUses <= 0) {
    return false;
  }

  // Update usage
  const updatedUsage: GuestUsage = {
    remainingUses: usage.remainingUses - 1,
    totalUses: usage.totalUses + 1
  };

  // Update last usage date
  localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(updatedUsage));
  localStorage.setItem(GUEST_LAST_USAGE_DATE, new Date().toISOString());

  return true;
}

/**
 * Reset guest usage after registration
 * This gives newly registered users one more free use
 */
export function resetGuestUsageAfterRegistration(): void {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return;
  }

  const usage: GuestUsage = {
    remainingUses: 1,
    totalUses: 0
  };

  localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
  localStorage.setItem(GUEST_LAST_USAGE_DATE, new Date().toISOString());
}

/**
 * Check if the guest can use the translation service
 */
export function canGuestUseTranslation(): boolean {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return false;
  }

  const usage = getGuestUsage();
  return usage.remainingUses > 0;
} 