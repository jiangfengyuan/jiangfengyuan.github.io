export const locales = ['zh', 'en'] as const;
export type Locale = 'zh' | 'en';

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
  return base === '/en' || base.startsWith('/en/') ? 'en' : 'zh';
}

export function pathForLocale(path: string, locale: Locale): string {
  const { pathname, search, hash } = splitPath(path);

  if (locale === 'en') {
    if (pathname === '' || pathname === '/') return `/en${search}${hash}`;
    if (pathname === '/en' || pathname.startsWith('/en/')) return path;
    return `/en${pathname}${search}${hash}`;
  }

  if (pathname === '/en') return `/${search}${hash}`;
  if (pathname.startsWith('/en/')) {
    return `/${pathname.slice('/en/'.length)}${search}${hash}`;
  }
  return path;
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

  // If a path is already prefixed with /en, evaluate its resource status without the prefix
  // so that /en/assets/... is treated the same as /assets/... and not forced through locale rewriting.
  let withoutPrefix = href;
  if (href === '/en' || href.startsWith('/en/')) {
    withoutPrefix = pathForLocale(href, 'zh');
  }
  if (isNonPagePath(withoutPrefix)) return href;

  return pathForLocale(href, locale);
}

export function postSlug(post: {
  data: { id: string; language?: string; translationOf?: string };
}): string {
  if (post.data.language === 'en' && post.data.translationOf) return post.data.translationOf;
  return post.data.id;
}
