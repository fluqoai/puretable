import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Language = "en" | "ar";

export const LANGUAGES: { code: Language; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

const STORAGE_KEY = "puretable.lang";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar") return stored;
  // Arabic is the default language of Pure Table.
  return "ar";
}

if (!i18n.isInitialized) {
  // Always init to "ar" (site default) so SSR + first client render match; the
  // LanguageProvider swaps to the stored/detected language after mount.
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: "ar",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function applyLanguage(lang: Language) {
  i18n.changeLanguage(lang);
  if (typeof document !== "undefined") {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
}

export { i18n };
