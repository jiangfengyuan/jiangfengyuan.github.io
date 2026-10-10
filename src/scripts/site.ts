import { translate, language, localized } from './i18n';
import { changeView, panel } from './motion';
import { initSpatial } from './spatial';

// ClientRouter swaps <html> attributes with the server-rendered defaults on
// navigation; restore the user's stored theme and language before paint.
document.addEventListener('astro:after-swap', () => {
  try {
    const t = localStorage.getItem('site-theme');
    document.documentElement.dataset.theme =
      t === 'light' || t === 'dark'
        ? t
        : matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    const l = localStorage.getItem('site-lang');
    document.documentElement.dataset.lang = l === 'en' ? 'en' : 'zh';
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
  } catch {}
  translate(language());
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta)
    meta.content = document.documentElement.dataset.theme === 'dark' ? '#191c19' : '#f6f4ef';
});

let active: AbortController | undefined;

function init() {
  active?.abort();
  const { signal } = (active = new AbortController());

  translate(language());
  initSpatial(signal);
  let desiredLanguage = language();

  document.querySelector('[data-lang-toggle]')?.addEventListener(
    'click',
    () => {
      desiredLanguage = desiredLanguage === 'zh' ? 'en' : 'zh';
      try {
        localStorage.setItem('site-lang', desiredLanguage);
      } catch {}
      changeView('language', () => translate(desiredLanguage));
    },
    { signal },
  );

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
  document.addEventListener('site:language', syncTheme, { signal });
  syncTheme();

  const nav = document.querySelector<HTMLElement>('#site-nav');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const mobile = matchMedia('(max-width:760px)');
  const compact = () => mobile.matches || document.documentElement.dataset.compactNav === 'true';
  let menuRevision = 0;
  let menuAnimation: Animation | undefined;
  function menu(open: boolean, restore = false) {
    if (!nav || !toggle) return;
    const serial = ++menuRevision;
    menuAnimation?.cancel();
    if (open) nav.classList.add('is-open');
    if (compact())
      menuAnimation = panel(nav, open, () => {
        if (serial === menuRevision && !open) nav.classList.remove('is-open');
      });
    else nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.dataset.labelZh = open ? '关闭菜单' : '打开菜单';
    toggle.dataset.labelEn = open ? 'Close navigation' : 'Open navigation';
    toggle.setAttribute('aria-label', localized(toggle.dataset.labelZh, toggle.dataset.labelEn));
    nav.inert = compact() && !open;
    if (restore) toggle.focus();
    if (open) nav.querySelector<HTMLAnchorElement>('a')?.focus();
  }
  function reset() {
    const wasOpen = toggle?.getAttribute('aria-expanded') === 'true';
    if (wasOpen) menu(false, !!nav?.contains(document.activeElement));
    else {
      nav?.classList.remove('is-open');
      if (nav) nav.inert = compact();
    }
    if (nav && !compact()) nav.inert = false;
  }
  mobile.addEventListener('change', reset, { signal });
  document.addEventListener('site:viewport', reset, { signal });
  reset();
  toggle?.addEventListener('click', () => menu(toggle.getAttribute('aria-expanded') !== 'true'), {
    signal,
  });
  nav
    ?.querySelectorAll('a')
    .forEach((a) => a.addEventListener('click', () => menu(false), { signal }));
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (
        toggle?.getAttribute('aria-expanded') === 'true' &&
        e.target instanceof Node &&
        !document.querySelector('.nav-shell')?.contains(e.target)
      )
        menu(false, !!nav?.contains(document.activeElement));
    },
    { signal },
  );
  document.addEventListener(
    'keydown',
    (e) => {
      if (toggle?.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        menu(false, true);
      }
      if (e.key === 'Tab') {
        const items = [
          ...nav!.querySelectorAll<HTMLAnchorElement>('a'),
          ...document.querySelectorAll<HTMLButtonElement>('.nav-tools button'),
        ];
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    { signal },
  );

  // Give failed remote article images an explicit, readable fallback.
  document.querySelectorAll<HTMLImageElement>('img[src]').forEach((img) => {
    const fail = () => {
      if (img.dataset.failed) return;
      img.dataset.failed = 'true';
      const note = document.createElement('p');
      note.className = 'image-error';
      note.dataset.i18n = '';
      note.dataset.zh = '图片暂时无法加载' + (img.alt ? '：' + img.alt : '');
      note.dataset.en = 'Image unavailable' + (img.alt ? ': ' + img.alt : '');
      note.textContent = language() === 'zh' ? note.dataset.zh : note.dataset.en;
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
