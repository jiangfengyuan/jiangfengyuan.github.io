export type Language = 'zh' | 'en';
export function language(): Language {
  return document.documentElement.dataset.lang === 'en' ? 'en' : 'zh';
}
export function localized(zh: string, en: string) {
  return language() === 'en' ? en : zh;
}
