import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { applyLanguage, getStoredLanguage, LANGUAGES, type Language } from "./index";

type Ctx = {
  lang: Language;
  dir: "ltr" | "rtl";
  setLang: (lang: Language) => void;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  // Read stored/detected language after mount to avoid hydration mismatch.
  useEffect(() => {
    const stored = getStoredLanguage();
    setLangState(stored);
  }, []);

  useEffect(() => {
    applyLanguage(lang);
  }, [lang]);

  const value: Ctx = {
    lang,
    dir: LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr",
    setLang: setLangState,
  };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

