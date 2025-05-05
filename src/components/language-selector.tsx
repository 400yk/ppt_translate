'use client';

import { useTranslation, LocaleCode } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Define available languages (codes only)
const languageCodes = ["zh", "en", "es", "fr", "de", "ja", "ko", "ru"] as const;

// Helper to display language names in their native language
const nativeLanguageNames = {
  zh: "中文",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский"
};

interface LanguageSelectorProps {
  className?: string;
  width?: string;
  onValueChange?: (value: string) => void;
}

export function LanguageSelector({ className = "", width = "w-[100px]", onValueChange }: LanguageSelectorProps) {
  const { locale, setLocale } = useTranslation();

  const handleChange = (value: string) => {
    setLocale(value as LocaleCode);
    
    // If onValueChange is provided, call it as well
    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className={`${width} ${className}`}>
        <SelectValue placeholder={nativeLanguageNames[locale as keyof typeof nativeLanguageNames]} />
      </SelectTrigger>
      <SelectContent>
        {languageCodes.map((code) => (
          <SelectItem key={code} value={code}>
            {nativeLanguageNames[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 