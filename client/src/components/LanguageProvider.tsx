import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "pagcrm.language";
const SUPPORTED: Language[] = ["ru", "en", "hi"];

function readInitialLanguage(): Language {
  if (typeof window === "undefined") return "ru";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (SUPPORTED as string[]).includes(saved)) {
      return saved as Language;
    }
  } catch {
    // ignore
  }
  return "ru";
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    if ((SUPPORTED as string[]).includes(lang)) {
      setLanguageState(lang);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    if (value === undefined) {
      let fallback: any = translations.ru;
      for (const k of keys) {
        fallback = fallback?.[k];
      }
      return fallback || key;
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
