import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { stringify } from 'yaml';
const tags = new Set(
  'p br h2 h3 h4 h5 h6 strong em b i del s u a img figure figcaption blockquote ul ol li pre code hr table thead tbody tfoot tr th td span div'.split(
    ' ',
  ),
);
const dangerous = new Set(
  'script style iframe object embed form input button textarea select link meta svg math template'.split(
    ' ',
  ),
);
export function safeURL(value: string, image = false): string | null {
  const compact = value.replace(/[\s\u0000-\u001f\u007f]/g, '');
  if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(compact)) return value;
  if (image && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(compact))
    return value;
  if (/^[^:]+$/.test(compact) && !compact.startsWith('\\')) return value;
  return null;
}
export function sanitizeHTML(source: string) {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  function clean(parent: Element) {
    for (const node of [...parent.children]) {
      let el = node;
      const name = el.tagName.toLowerCase();
      if (
        dangerous.has(name) ||
        el.hasAttribute('hidden') ||
        /display\s*:\s*none|visibility\s*:\s*hidden/i.test(el.getAttribute('style') || '')
      ) {
        el.remove();
        continue;
      }
      if (name === 'h1') {
        const h = doc.createElement('h2');
        h.append(...el.childNodes);
        el.replaceWith(h);
        el = h;
      }
      if (!tags.has(el.tagName.toLowerCase())) {
        clean(el);
        el.replaceWith(...el.childNodes);
        continue;
      }
      const src = el.getAttribute('src') || el.getAttribute('data-src');
      const href = el.getAttribute('href');
      const alt = el.getAttribute('alt') || '';
      const codeClass = el.getAttribute('class') || '';
      const spanAttrs = ['colspan', 'rowspan', 'scope'].map(
        (a) => [a, el.getAttribute(a)] as const,
      );
      for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
      if (el.tagName === 'IMG') {
        const url = safeURL(src || '', true);
        if (!url) {
          el.remove();
          continue;
        }
        el.setAttribute('src', url);
        el.setAttribute('alt', alt);
        el.setAttribute('loading', 'lazy');
        el.setAttribute('referrerpolicy', 'no-referrer');
      }
      if (el.tagName === 'A' && href) {
        const url = safeURL(href);
        if (url) el.setAttribute('href', url);
      }
      if (el.tagName === 'CODE' && /^language-[a-z0-9_-]+$/i.test(codeClass))
        el.className = codeClass;
      if (['TH', 'TD'].includes(el.tagName))
        for (const [a, v] of spanAttrs) {
          if (
            v &&
            ((a === 'scope' && /^(row|col|rowgroup|colgroup)$/.test(v)) ||
              (a !== 'scope' && /^\d{1,2}$/.test(v)))
          )
            el.setAttribute(a, v);
        }
      clean(el);
    }
  }
  clean(doc.body);
  return doc.body.innerHTML;
}
export function htmlToMarkdown(source: string) {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  td.use(gfm);
  td.addRule('figures', {
    filter: 'figure',
    replacement: (_content, node) => '\n\n' + (node as HTMLElement).outerHTML + '\n\n',
  });
  return td.turndown(sanitizeHTML(source));
}
export interface PostMetadata {
  id: string;
  title: string;
  date: string;
  tags: string[];
  summary: string;
  language: 'zh' | 'en';
  draft: boolean;
}
export function postFile(meta: PostMetadata, body: string) {
  return '---\n' + stringify(meta, { lineWidth: 0 }) + '---\n\n' + body.trim() + '\n';
}
