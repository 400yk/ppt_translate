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
  | 'errors.file_size_limit'
  | 'errors.file_size_exceeded'
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
  | 'errors.invitation_required'
  | 'errors.registration_failed'
  | 'errors.authentication_error'
  | 'errors.session_expired'
  | 'errors.code_already_used'
  | 'errors.code_deactivated'
  | 'errors.code_invalid'
  | 'errors.missing_fields'
  | 'errors.username_exists'
  | 'errors.email_exists'
  | 'success.title'
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
  | 'pricing.month'
  | 'pricing.monthly'
  | 'pricing.yearly'
  | 'pricing.current_plan'
  | 'pricing.recommended_plan'
  | 'pricing.upgrade'
  | 'pricing.free_user'
  | 'pricing.free_plan_desc'
  | 'pricing.paid_user'
  | 'pricing.paid_customer_email_support'
  | 'pricing.free_customer_email_support'
  | 'pricing.no_limit'
  | 'pricing.features.upload_limit'
  | 'pricing.features.char_per_file'
  | 'pricing.features.monthly_limit'
  | 'pricing.features.file_size'
  | 'pricing.features.support'
  | 'pricing.week'
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
  | 'profile.manage_billing'
  | 'payment.title'
  | 'payment.subtitle'
  | 'payment.billed_monthly'
  | 'payment.billed_yearly'
  | 'payment.pay_monthly'
  | 'payment.pay_yearly'
  | 'payment.pay'
  | 'payment.processing'
  | 'payment.success'
  | 'payment.monthly_success'
  | 'payment.yearly_success'
  | 'payment.error'
  | 'payment.error_description'
  | 'payment.secure_info'
  | 'payment.benefits'
  | 'payment.cancel_description'
  | 'payment.success_description'
  | 'payment.currency'
  | 'pricing.features.uploads'
  | 'pricing.features.char_per_file'
  | 'pricing.features.monthly_limit'
  | 'pricing.features.file_size'
  | 'pricing.features.support';

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

  // Enhanced translation function to handle parameters
  const t = (key: TranslationKey, params?: Record<string, any>): string => {
    let translation = getNestedTranslation(locales[locale], key);
    
    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      });
    }
    
    return translation;
  };

  // Function to set locale and notify listeners
  const setLocale = (newLocale: LocaleCode) => {
    if (isBrowser) {
      // Store in localStorage
      localStorage.setItem('app_locale', newLocale);
      
      // Update state
      setLocaleState(newLocale);
      
      // Set HTML lang attribute
      document.documentElement.lang = newLocale;
      
      // Dispatch custom event for other components to react to locale change
      window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
    }
  };

  return { t, locale, setLocale };
} 