export const FULL_MODE_LANGUAGES = [
  { value: "uk", label: "Українська" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "pl", label: "Polski" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "nl", label: "Nederlands" },
  { value: "ar", label: "العربية" },
  { value: "cs", label: "Čeština" },
  { value: "hu", label: "Magyar" },
  { value: "fi", label: "Suomi" },
  { value: "fa", label: "فارسی" },
  { value: "el", label: "Ελληνικά" },
  { value: "tr", label: "Türkçe" },
  { value: "da", label: "Dansk" },
  { value: "he", label: "עברית" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "ko", label: "한국어" },
  { value: "ur", label: "اردو" },
  { value: "te", label: "తెలుగు" },
  { value: "hi", label: "हिन्दी" },
  { value: "ca", label: "Català" },
  { value: "ml", label: "മലയാളം" },
] as const;

export const LITE_MODE_LANGUAGES = [
  { value: "en", label: "English" },
] as const;

export const DIARIZATION_LANGUAGES = [
  "en", "fr", "de", "es", "it", "ja", "zh", "nl", "uk", "pt",
  "ar", "cs", "ru", "pl", "hu", "fi", "fa", "el", "tr", "da",
  "he", "vi", "ko", "ur", "te", "hi", "ca", "ml",
] as const;

export const LLM_TRANSLATION_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "hindi", label: "Hindi" },
  { value: "spanish", label: "Spanish" },
  { value: "thai", label: "Thai" },
] as const;

export const PRESET_CATEGORIES = [
  { value: "media", label: "Медіа продакшн", icon: "🎬" },
  { value: "education", label: "Освіта", icon: "📚" },
  { value: "legal_medical", label: "Юридичне & Медичне", icon: "⚖️" },
  { value: "business", label: "Бізнес", icon: "💼" },
  { value: "cross_scenario", label: "Крос-сценарії", icon: "🔄" },
] as const;

export type LanguageOption = { value: string; label: string };
