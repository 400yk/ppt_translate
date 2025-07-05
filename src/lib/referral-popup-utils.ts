'use client';

// Cookie name for tracking popup dismissal
const POPUP_DISMISSED_COOKIE = 'translide_popup_dismissed';

/**
 * Check if the popup has been permanently dismissed by the user
 */
export function isPopupPermanentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const dismissed = localStorage.getItem(POPUP_DISMISSED_COOKIE);
    return dismissed === 'true';
  } catch (error) {
    console.error('Error checking popup dismissal status:', error);
    return false;
  }
}

/**
 * Mark the popup as permanently dismissed (don't show again)
 */
export function setPopupPermanentlyDismissed(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(POPUP_DISMISSED_COOKIE, 'true');
  } catch (error) {
    console.error('Error setting popup dismissal status:', error);
  }
}

/**
 * Reset the popup dismissal status (for testing purposes)
 */
export function resetPopupDismissal(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(POPUP_DISMISSED_COOKIE);
  } catch (error) {
    console.error('Error resetting popup dismissal status:', error);
  }
}

/**
 * Check if user has active membership for showing the popup
 * Only users with active membership should see the popup
 */
export function canShowReferralPopup(membershipStatus: any): boolean {
  if (!membershipStatus) return false;
  
  // Show popup only for users with active membership
  // This excludes guests, free users, and expired memberships
  return membershipStatus.is_active === true && 
         (membershipStatus.user_type === 'paid' || membershipStatus.user_type === 'invitation');
}

/**
 * Determine if popup should be shown based on translation progress and conditions
 */
export function shouldShowPopup(
  progress: number, 
  isTranslating: boolean, 
  membershipStatus: any,
  hasBeenShown: boolean
): boolean {
  // Don't show if already shown in this session
  if (hasBeenShown) return false;
  
  // Don't show if permanently dismissed
  if (isPopupPermanentlyDismissed()) return false;
  
  // Only show for users with active membership
  if (!canShowReferralPopup(membershipStatus)) return false;
  
  // Show when translation is in progress and progress reaches 40%
  return isTranslating && progress >= 20;
} 