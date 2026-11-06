export const locales = ['zh', 'en', 'fr', 'ko', 'de', 'ru', 'ar', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';
/** Locales served under a /<locale>/ prefix; the default locale lives at the root. */
export const prefixedLocales = locales.filter((locale) => locale !== defaultLocale);
/** The whole site exists in these; every other locale only has the DHGT page. */
export const siteLocales: readonly Locale[] = ['zh', 'en'];
export const dhgtOnlyLocales = locales.filter((locale) => !siteLocales.includes(locale));

export const localeMeta: Record<
  Locale,
  { label: string; tag: string; hreflang: string; og: string; dir: 'ltr' | 'rtl' }
> = {
  zh: { label: '中文', tag: 'zh-CN', hreflang: 'zh-CN', og: 'zh_CN', dir: 'ltr' },
  en: { label: 'English', tag: 'en', hreflang: 'en-US', og: 'en_US', dir: 'ltr' },
  fr: { label: 'Français', tag: 'fr', hreflang: 'fr', og: 'fr_FR', dir: 'ltr' },
  ko: { label: '한국어', tag: 'ko', hreflang: 'ko', og: 'ko_KR', dir: 'ltr' },
  de: { label: 'Deutsch', tag: 'de', hreflang: 'de', og: 'de_DE', dir: 'ltr' },
  ru: { label: 'Русский', tag: 'ru', hreflang: 'ru', og: 'ru_RU', dir: 'ltr' },
  ar: { label: 'العربية', tag: 'ar', hreflang: 'ar', og: 'ar_AR', dir: 'rtl' },
  ja: { label: '日本語', tag: 'ja', hreflang: 'ja', og: 'ja_JP', dir: 'ltr' },
};

const prefixPattern = new RegExp(`^/(${prefixedLocales.join('|')})(?=/|$)`);

type PathParts = {
  pathname: string;
  search: string;
  hash: string;
};

function splitPath(path: string): PathParts {
  const match = path.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  return {
    pathname: match?.[1] ?? path,
    search: match?.[2] ?? '',
    hash: match?.[3] ?? '',
  };
}

export function localeFromPath(pathname: string): Locale {
  const { pathname: base } = splitPath(pathname);
  return (base.match(prefixPattern)?.[1] as Locale | undefined) ?? defaultLocale;
}

export function pathForLocale(path: string, locale: Locale): string {
  const { pathname, search, hash } = splitPath(path);
  const bare = pathname.replace(prefixPattern, '') || '/';
  const target = locale === defaultLocale ? bare : `/${locale}${bare}`;
  return `${target}${search}${hash}`;
}

export function isDhgtPath(path: string): boolean {
  return /^\/dhgt(\/|\.html)?$/.test(splitPath(pathForLocale(path, defaultLocale)).pathname);
}

function isNonPagePath(href: string): boolean {
  const { pathname: base } = splitPath(href);
  const lower = base.toLowerCase();

  if (base.startsWith('/assets/') || base.startsWith('/_astro/') || base.startsWith('/api/')) {
    return true;
  }

  const endpointPaths = [
    '/rss.xml',
    '/rss',
    '/feed',
    '/sitemap.xml',
    '/sitemap-index.xml',
    '/robots.txt',
    '/favicon.ico',
  ];
  if (endpointPaths.includes(lower)) return true;

  // Static file assets (images, fonts, documents, JSON endpoints) are not locale pages.
  const extMatch = lower.match(/\.([a-z0-9]+)$/);
  if (extMatch) {
    const ext = extMatch[0];
    if (ext !== '.html') return true;
  }

  return false;
}

export function hrefFor(href: string, locale: Locale): string {
  if (typeof href !== 'string') return href;

  // Leave absolute URLs, protocol links and network-path references untouched.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return href;

  // Same-page anchors should never be rewritten.
  if (href.startsWith('#')) return href;

  // Only rewrite site-internal absolute paths.
  if (!href.startsWith('/')) return href;

  // Evaluate resource status without any locale prefix, so that /en/assets/... is treated
  // the same as /assets/... and not forced through locale rewriting.
  if (isNonPagePath(pathForLocale(href, defaultLocale))) return href;

  // Pages that do not exist in a DHGT-only locale open in English.
  if (!siteLocales.includes(locale) && !isDhgtPath(href)) return pathForLocale(href, 'en');
  return pathForLocale(href, locale);
}

export function postSlug(post: {
  data: { id: string; language?: string; translationOf?: string };
}): string {
  if (post.data.language === 'en' && post.data.translationOf) return post.data.translationOf;
  return post.data.id;
}
