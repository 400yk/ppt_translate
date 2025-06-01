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
  | 'progress.starting_translation'
  | 'progress.translation_in_progress'
  | 'progress.processing'
  | 'progress.downloading_file'
  | 'progress.timeout_error'
  | 'errors.no_file'
  | 'errors.same_language'
  | 'errors.translation_failed'
  | 'errors.download_failed'
  | 'errors.invalid_file_type'
  | 'errors.file_size_limit'
  | 'errors.file_size_exceeded'
  | 'errors.unknown_error'
  | 'errors.generic_error_title'
  | 'errors.warning_title'
  | 'errors.service_unavailable_title'
  | 'errors.service_unavailable_message'
  | 'errors.task_not_found_message'
  | 'errors.file_not_found_message'
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
  | 'errors.session_expired_title'
  | 'errors.session_expired_message'
  | 'errors.session_expired'
  | 'errors.code_already_used'
  | 'errors.code_deactivated'
  | 'errors.code_invalid'
  | 'errors.missing_fields'
  | 'errors.username_exists'
  | 'errors.email_exists'
  | 'errors.no_download_url'
  | 'errors.translation_failed_fallback'
  | 'errors.user_not_found'
  | 'errors.invalid_request_format'
  | 'errors.empty_request_data'
  | 'errors.missing_plan_type'
  | 'errors.invalid_plan_type'
  | 'errors.no_subscription_found'
  | 'errors.no_active_subscription'
  | 'errors.failed_create_checkout'
  | 'errors.failed_create_portal'
  | 'errors.failed_create_payment_intent'
  | 'errors.no_session_id'
  | 'errors.invalid_session_metadata'
  | 'errors.failed_process_payment'
  | 'errors.missing_payment_intent_id'
  | 'errors.invalid_payment_intent'
  | 'errors.stripe_error'
  | 'errors.failed_confirm_payment'
  | 'errors.invalid_signature'
  | 'errors.webhook_handling_failed'
  | 'errors.plan_type_required'
  | 'errors.plan_type_monthly_yearly'
  | 'errors.request_must_be_json'
  | 'errors.no_data_provided'
  | 'errors.google_signin_failed'
  | 'errors.google_no_credential'
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
  | 'auth.or_continue_with'
  | 'auth.google_signin'
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
  | 'landing.privacy_policy'
  | 'privacy.last_updated'
  | 'privacy.intro'
  | 'privacy.personal_info_collect'
  | 'privacy.device_info_desc'
  | 'privacy.collect_tech_intro'
  | 'privacy.cookies_desc'
  | 'privacy.log_files_desc'
  | 'privacy.web_beacons_desc'
  | 'privacy.provided_info_desc'
  | 'privacy.personal_info_definition'
  | 'privacy.how_we_use'
  | 'privacy.how_we_use_desc'
  | 'privacy.sharing_info'
  | 'privacy.google_analytics_desc'
  | 'privacy.third_party_policies'
  | 'privacy.longway_services'
  | 'privacy.longway_contract_desc'
  | 'privacy.cookie_definition'
  | 'privacy.cookie_info_collected'
  | 'privacy.longway_data_usage'
  | 'privacy.longway_privacy_links'
  | 'privacy.legal_sharing'
  | 'privacy.behavioral_advertising'
  | 'privacy.behavioral_desc'
  | 'privacy.opt_out_intro'
  | 'privacy.opt_out_additional'
  | 'privacy.do_not_track'
  | 'privacy.do_not_track_desc'
  | 'privacy.your_rights'
  | 'privacy.eu_rights_desc'
  | 'privacy.eu_processing_desc'
  | 'privacy.data_retention'
  | 'privacy.data_deletion_desc'
  | 'privacy.google_services_desc'
  | 'privacy.minors'
  | 'privacy.minors_desc'
  | 'privacy.changes'
  | 'privacy.changes_desc'
  | 'privacy.contact_us'
  | 'privacy.contact_desc'
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
  | 'profile.characters_used'
  | 'profile.characters_remaining'
  | 'profile.monthly_character_limit'
  | 'profile.unlimited'
  | 'profile.next_character_reset'
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
  | 'payment.error_unknown'
  | 'payment.error_invalid_session'
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

// Utility function to get translations outside of React components
export const getTranslation = (key: TranslationKey, params?: Record<string, any>): string => {
  // Only run in browser environment
  if (!isBrowser) {
    return key; // Fallback to key if not in browser
  }
  
  // Get current locale from localStorage or default to English
  const savedLocale = localStorage.getItem('app_locale') as LocaleCode;
  const currentLocale = (savedLocale && savedLocale in locales) ? savedLocale : 'en';
  
  // Get the translation
  let translation = getNestedTranslation(locales[currentLocale], key);
  
  // Replace parameters if provided
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
    });
  }
  
  return translation;
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