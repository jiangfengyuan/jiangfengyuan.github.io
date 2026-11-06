// Build-time only: importing this from a client script would ship every catalog to the browser.
import type { Locale } from '../i18n';
import ar from './ar.json';
import de from './de.json';
import fr from './fr.json';
import ja from './ja.json';
import ko from './ko.json';
import ru from './ru.json';

export type Localized = { zh: string; en: string };

/** Keyed by the English source string, so content files only ever carry zh and en. */
const catalogs: Partial<Record<Locale, Record<string, string>>> = { ar, de, fr, ja, ko, ru };

/**
 * Picks a string for the page locale. A new zh/en string without a translation yet falls back
 * to English with a build warning, so publishing an update from the CMS never breaks the
 * deploy; I18N_STRICT=1 turns the warning into a failure when auditing the catalogs.
 */
export function t(text: Localized, locale: Locale): string {
  if (locale === 'zh') return text.zh;
  if (locale === 'en') return text.en;
  const translated = catalogs[locale]?.[text.en];
  if (translated !== undefined) return translated;
  // Same text in both source languages means a name or user content, not UI copy.
  if (text.zh !== text.en) {
    const message = `[i18n] missing ${locale} translation: ${JSON.stringify(text.en)}`;
    if (process.env.I18N_STRICT) throw new Error(message);
    console.warn(message);
  }
  return text.en;
}
