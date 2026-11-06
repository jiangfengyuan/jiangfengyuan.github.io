import { locales, type Locale } from '../i18n';
import messages from '../locales/client.json';

export function language(): Locale {
  const lang = document.documentElement.dataset.lang as Locale;
  return locales.includes(lang) ? lang : 'zh';
}

/** Runtime strings. The English text is the key into locales/client.json. */
export function localized(zh: string, en: string) {
  const lang = language();
  if (lang === 'zh') return zh;
  return (messages as Record<string, Record<string, string>>)[lang]?.[en] ?? en;
}
