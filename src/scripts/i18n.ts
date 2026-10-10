export type Language = 'zh' | 'en';
export function language(): Language {
  return document.documentElement.dataset.lang === 'en' ? 'en' : 'zh';
}
export function localized(zh: string, en: string) {
  return language() === 'en' ? en : zh;
}
let translatedBody: HTMLElement | undefined;
let translatedLanguage: Language | undefined;
export function translate(lang: Language) {
  if (translatedBody === document.body && translatedLanguage === lang) return;
  translatedBody = document.body;
  translatedLanguage = lang;
  document.documentElement.dataset.lang = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const text = el.dataset[lang] || '';
    if (el.textContent !== text) el.textContent = text;
  });
  document.querySelectorAll<HTMLImageElement>('img[data-alt-zh]').forEach((el) => {
    el.alt = el.dataset[lang === 'zh' ? 'altZh' : 'altEn'] || el.dataset.altZh || '';
  });
  document.querySelectorAll<HTMLElement>('[data-label-zh]').forEach((el) => {
    el.setAttribute('aria-label', el.dataset[lang === 'zh' ? 'labelZh' : 'labelEn'] || '');
  });
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-placeholder-zh]')
    .forEach((el) => {
      el.placeholder = el.dataset[lang === 'zh' ? 'placeholderZh' : 'placeholderEn'] || '';
    });
  document.querySelectorAll<HTMLMetaElement>('[data-meta-zh]').forEach((el) => {
    el.content = el.dataset[lang === 'zh' ? 'metaZh' : 'metaEn'] || '';
  });
  const title = document.querySelector<HTMLTitleElement>('title');
  if (title?.dataset.titleZh)
    title.textContent = title.dataset[lang === 'zh' ? 'titleZh' : 'titleEn'] || '';
  const ogLocale = document.querySelector<HTMLMetaElement>('meta[property="og:locale"]');
  if (ogLocale) ogLocale.content = lang === 'zh' ? 'zh_CN' : 'en_US';
  const button = document.querySelector<HTMLButtonElement>('[data-lang-toggle]');
  if (button) button.textContent = lang === 'zh' ? 'EN' : '中文';
  try {
    localStorage.setItem('site-lang', lang);
  } catch {}
  document.dispatchEvent(new CustomEvent('site:language', { detail: lang }));
}
