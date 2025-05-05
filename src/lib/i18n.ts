import { useState, useEffect } from 'react';

// Import all locale files
import en from '@/locale/en.json';
import zh from '@/locale/zh.json';
import es from '@/locale/es.json';
import fr from '@/locale/fr.json';
import de from '@/locale/de.json';
import ja from '@/locale/ja.json';
import ko from '@/locale/ko.json';
import ru from '@/locale/ru.json';

// Define language codes
const languageCodes = ["zh", "en", "es", "fr", "de", "ja", "ko", "ru"] as const;
type LanguageCode = typeof languageCodes[number];

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a type for language translations
type LanguageKey = `languages.${LanguageCode}`;

// Helper to get the best matching locale from available options
const getBestMatchingLocale = (browserLanguages: readonly string[]): LocaleCode => {
  // First try to match full locale codes (e.g., "en-US", "zh-CN")
  for (const lang of browserLanguages) {
    // Try exact match first (e.g., "en-US")
    const baseCode = lang.split('-')[0].toLowerCase();
    if (baseCode in locales) {
      return baseCode as LocaleCode;
    }
  }
  
  // Default to English if no match found
  return 'en';
};

// Define translations type
export type TranslationKey = 
  | 'title'
  | 'slogan'
  | 'file_upload'
  | 'file_uploaded'
  | 'from_label'
  | 'to_label'
  | 'translate_button'
  | 'download_button'
  | 'translating'
  | 'progress_label'
  | 'no_file_selected'
  | 'common.loading'
  | 'progress.loading'
  | 'progress.collecting_text'
  | 'progress.extraction_complete'
  | 'progress.translation_start'
  | 'progress.translating'
  | 'progress.translation_complete'
  | 'progress.updating_shapes'
  | 'progress.updating_text_shapes'
  | 'progress.updating_tables'
  | 'progress.updating_table_cells'
  | 'progress.saving'
  | 'progress.complete'
  | 'errors.no_file'
  | 'errors.same_language'
  | 'errors.translation_failed'
  | 'errors.download_failed'
  | 'errors.invalid_file_type'
  | 'errors.unknown_error'
  | 'errors.required_fields'
  | 'errors.fill_all_fields'
  | 'errors.login_failed'
  | 'errors.password_mismatch'
  | 'errors.passwords_dont_match'
  | 'errors.invalid_invitation'
  | 'errors.enter_valid_code'
  | 'errors.verification_error'
  | 'errors.free_trial_used'
  | 'success.translation_complete'
  | 'success.registration_complete'
  | 'buttons.translate'
  | 'buttons.download'
  | 'buttons.translating'
  | 'buttons.select_file'
  | 'buttons.upgrade'
  | 'upload.title'
  | 'upload.description'
  | 'upload.release'
  | 'footer.description'
  | 'auth.login'
  | 'auth.login_subtitle'
  | 'auth.register'
  | 'auth.register_login'
  | 'auth.username'
  | 'auth.username_placeholder'
  | 'auth.email'
  | 'auth.email_placeholder'
  | 'auth.password'
  | 'auth.password_placeholder'
  | 'auth.login_success'
  | 'auth.welcome_back'
  | 'auth.logout'
  | 'auth.no_account'
  | 'auth.have_account'
  | 'auth.confirm_password'
  | 'auth.confirm_password_placeholder'
  | 'auth.invitation_code'
  | 'auth.invitation_code_optional'
  | 'auth.invitation_code_placeholder'
  | 'auth.valid_code'
  | 'auth.invalid_code'
  | 'auth.back_to_home'
  | 'auth.cancel'
  | 'auth.processing'
  | 'pricing.title'
  | 'pricing.subtitle'
  | 'pricing.free_plan'
  | 'pricing.paid_plan'
  | 'pricing.free_desc'
  | 'pricing.paid_desc'
  | 'pricing.monthly'
  | 'pricing.yearly'
  | 'pricing.current_plan'
  | 'pricing.upgrade'
  | 'pricing.free_user'
  | 'pricing.paid_user'
  | 'pricing.features.upload_limit'
  | 'pricing.features.char_per_file'
  | 'pricing.features.monthly_limit'
  | 'pricing.features.file_size'
  | 'pricing.features.support'
  | 'pricing.weekly_limit_title'
  | 'pricing.weekly_limit_message'
  | 'nav.translate_now'
  | 'nav.home'
  | 'landing.translate'
  | 'landing.powerpoint'
  | 'landing.with_translide'
  | 'landing.subtitle'
  | 'landing.get_started'
  | 'landing.simplest_way'
  | 'landing.texts'
  | 'landing.texts_desc'
  | 'landing.tables'
  | 'landing.tables_desc'
  | 'landing.styles'
  | 'landing.styles_desc'
  | 'landing.view_pricing'
  | 'landing.copyright'
  | 'guest.free_trial'
  | 'guest.free_trial_desc'
  | 'guest.register_prompt'
  | 'guest.register_title'
  | 'guest.register_subtitle'
  | 'guest.trial_used'
  | 'guest.guest_user'
  | 'guest.one_time_note'
  | LanguageKey
  | 'errors.invitation_required'
  | 'errors.registration_failed'
  | 'auth.register_success'
  | 'auth.welcome'
  | 'auth.use_without_code'
  | 'auth.no_code_warning'
  | 'profile.title'
  | 'profile.free_user'
  | 'profile.paid_member'
  | 'profile.invitation_member'
  | 'profile.membership_details'
  | 'profile.membership_start'
  | 'profile.membership_end'
  | 'profile.days_remaining'
  | 'profile.translations'
  | 'profile.invitation_code'
  | 'profile.translations_limit'
  | 'profile.translations_used'
  | 'profile.translations_remaining'
  | 'profile.reset_info'
  | 'profile.reset_daily'
  | 'profile.reset_weekly'
  | 'profile.reset_monthly'
  | 'profile.free_user_description'
  | 'profile.upgrade_membership'
  | 'profile.extend_membership'
  | 'payment.title'
  | 'payment.subtitle'
  | 'payment.billed_monthly'
  | 'payment.billed_yearly'
  | 'payment.pay_monthly'
  | 'payment.pay_yearly'
  | 'payment.processing'
  | 'payment.success'
  | 'payment.monthly_success'
  | 'payment.yearly_success'
  | 'payment.error'
  | 'payment.error_description'
  | 'payment.secure_info'
  | 'payment.benefits';

// Define available locales map
export const locales = {
  en,
  zh,
  es,
  fr,
  de,
  ja,
  ko,
  ru
};

export type LocaleCode = keyof typeof locales;

// Function to get nested translation values by dot notation
const getNestedTranslation = (locale: any, key: string): string => {
  const keys = key.split('.');
  return keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : key), locale);
};

// The event name for locale changes
export const LOCALE_CHANGE_EVENT = 'app:localeChange';

// Track active listeners for the locale change event
let localeChangeListeners: (() => void)[] = [];

// Custom hook for translations
export function useTranslation() {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    // Only run browser-specific code in the browser
    if (isBrowser) {
      // Initialize from localStorage or browser language
      const savedLocale = localStorage.getItem('app_locale') as LocaleCode;
      
      // If there's a saved locale preference, use it
      if (savedLocale && savedLocale in locales) {
        return savedLocale;
      }
      
      // Otherwise, use browser language preferences
      const browserLanguages = navigator.languages || [navigator.language];
      return getBestMatchingLocale(browserLanguages);
    }
    // Default for server-side rendering
    return 'en';
  });

  useEffect(() => {
    // Skip effects on server-side rendering
    if (!isBrowser) return;
    
    // Handle locale change events
    const handleLocaleChange = () => {
      const savedLocale = localStorage.getItem('app_locale') as LocaleCode;
      if (savedLocale && savedLocale !== locale) {
        setLocaleState(savedLocale);
      }
    };

    // Add event listener for locale changes
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    
    // Add this listener to our tracking array
    const listener = handleLocaleChange;
    localeChangeListeners.push(listener);
    
    return () => {
      // Clean up
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
      localeChangeListeners = localeChangeListeners.filter(l => l !== listener);
    };
  }, [locale]);

  const t = (key: TranslationKey): string => {
    return getNestedTranslation(locales[locale], key);
  };

  // Updated locale setter to broadcast changes
  const setLocale = (newLocale: LocaleCode) => {
    // Only run browser-specific code in the browser
    if (isBrowser) {
      // Validate the locale
      if (!(newLocale in locales)) {
        console.warn(`Invalid locale: ${newLocale}, falling back to English`);
        newLocale = 'en';
      }
      
      // Update localStorage
      localStorage.setItem('app_locale', newLocale);
      
      // Update the HTML lang attribute
      document.documentElement.lang = newLocale;
      
      // Broadcast the change to all other components
      const event = new CustomEvent(LOCALE_CHANGE_EVENT);
      window.dispatchEvent(event);
    }
    
    // Update this component's state (this works in both environments)
    setLocaleState(newLocale);
  };

  return { t, locale, setLocale };
} 