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

// Create a type for language translations
type LanguageKey = `languages.${LanguageCode}`;

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
  | 'errors.no_file'
  | 'errors.same_language'
  | 'errors.translation_failed'
  | 'errors.download_failed'
  | 'errors.invalid_file_type'
  | 'success.translation_complete'
  | LanguageKey;

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

// Custom hook for translations
export function useTranslation() {
  const [locale, setLocale] = useState<LocaleCode>('en');

  useEffect(() => {
    // Get browser language
    const browserLang = navigator.language.split('-')[0] as LocaleCode;
    // Use browser language if it's available in our locales, otherwise default to English
    setLocale(locales[browserLang] ? browserLang : 'en');
  }, []);

  const t = (key: TranslationKey): string => {
    return getNestedTranslation(locales[locale], key);
  };

  return { t, locale, setLocale };
} 