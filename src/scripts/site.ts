import { translate, language, localized } from './i18n';
translate(language());
document
  .querySelector('[data-lang-toggle]')
  ?.addEventListener('click', () => translate(language() === 'zh' ? 'en' : 'zh'));
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
themeButton?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.classList.add('changing-theme');
  document.documentElement.dataset.theme = theme;
  void document.documentElement.offsetHeight;
  requestAnimationFrame(() => document.documentElement.classList.remove('changing-theme'));
  try {
    localStorage.setItem('site-theme', theme);
  } catch {}
  syncTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let saved = null;
  try {
    saved = localStorage.getItem('site-theme');
  } catch {}
  if (!saved) {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    syncTheme();
  }
});
document.addEventListener('site:language', syncTheme);
syncTheme();
const nav = document.querySelector<HTMLElement>('#site-nav');
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const mobile = matchMedia('(max-width:760px)');
function menu(open: boolean, restore = false) {
  if (!nav || !toggle) return;
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  nav.inert = mobile.matches && !open;
  if (restore) toggle.focus();
  if (open) nav.querySelector<HTMLAnchorElement>('a')?.focus();
}
function reset() {
  menu(false, !!nav?.contains(document.activeElement));
  if (nav && !mobile.matches) nav.inert = false;
}
mobile.addEventListener('change', reset);
reset();
toggle?.addEventListener('click', () => menu(toggle.getAttribute('aria-expanded') !== 'true'));
nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu(false)));
document.addEventListener('pointerdown', (e) => {
  if (
    toggle?.getAttribute('aria-expanded') === 'true' &&
    e.target instanceof Node &&
    !document.querySelector('.nav-shell')?.contains(e.target)
  )
    menu(false, !!nav?.contains(document.activeElement));
});
document.addEventListener('keydown', (e) => {
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
});
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
  };
  img.addEventListener('error', fail);
  if (img.complete && img.naturalWidth === 0) fail();
});
