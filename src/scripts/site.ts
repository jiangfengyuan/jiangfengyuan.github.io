import { language, localized } from './i18n';
import { pathForLocale } from '../i18n';
import { changeView, panel } from './motion';
import { initSpatial } from './spatial';
import { initDetails } from './details';
import { initNavigation } from './navigation';

// ClientRouter swaps <html> attributes with the server-rendered defaults on
// navigation; restore the user's stored theme before paint.
document.addEventListener('astro:after-swap', () => {
  try {
    const t = localStorage.getItem('site-theme');
    document.documentElement.dataset.theme =
      t === 'light' || t === 'dark'
        ? t
        : matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
  } catch {}
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta)
    meta.content = document.documentElement.dataset.theme === 'dark' ? '#191c19' : '#f6f4ef';
});

let active: AbortController | undefined;

function init() {
  active?.abort();
  const { signal } = (active = new AbortController());

  initSpatial(signal);
  initDetails(signal);

  // The server-rendered language link only knows the pathname (query/hash are
  // empty during static builds); rewrite it client-side so they are preserved.
  const langLink = document.querySelector<HTMLAnchorElement>('a[data-lang-link]');
  if (langLink) {
    const target = document.documentElement.dataset.lang === 'en' ? 'zh' : 'en';
    langLink.href = pathForLocale(
      location.pathname + location.search + location.hash,
      target,
    );
  }

  const themeButton = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  function syncTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    themeButton?.setAttribute(
      'aria-label',
      dark
        ? localized('切换为浅色主题', 'Switch to light theme')
        : localized('切换为深色主题', 'Switch to dark theme'),
    );
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#191c19' : '#f6f4ef';
  }
  let desiredTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  themeButton?.addEventListener(
    'click',
    () => {
      desiredTheme = desiredTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('site-theme', desiredTheme);
      } catch {}
      changeView(
        'theme',
        () => {
          document.documentElement.dataset.theme = desiredTheme;
          syncTheme();
        },
        themeButton || undefined,
      );
    },
    { signal },
  );
  matchMedia('(prefers-color-scheme: dark)').addEventListener(
    'change',
    (e) => {
      let saved = null;
      try {
        saved = localStorage.getItem('site-theme');
      } catch {}
      if (!saved) {
        desiredTheme = e.matches ? 'dark' : 'light';
        document.documentElement.classList.add('theme-fade');
        document.documentElement.dataset.theme = desiredTheme;
        syncTheme();
        setTimeout(() => document.documentElement.classList.remove('theme-fade'), 180);
      }
    },
    { signal },
  );
  syncTheme();

  initNavigation(signal);

  // Give failed remote article images an explicit, readable fallback.
  document.querySelectorAll<HTMLImageElement>('img[src]').forEach((img) => {
    const fail = () => {
      if (img.dataset.failed) return;
      img.dataset.failed = 'true';
      const note = document.createElement('p');
      note.className = 'image-error';
      note.textContent =
        language() === 'zh'
          ? '图片暂时无法加载' + (img.alt ? '：' + img.alt : '')
          : 'Image unavailable' + (img.alt ? ': ' + img.alt : '');
      img.insertAdjacentElement('afterend', note);
      img.hidden = true;
      panel(note, true);
    };
    img.addEventListener('error', fail, { signal });
    img.addEventListener(
      'load',
      () => {
        if (img.loading === 'lazy' && img.closest('.project-media')) panel(img, true);
      },
      { signal },
    );
    if (img.complete && img.naturalWidth === 0) fail();
  });
}

document.addEventListener('astro:page-load', init);
