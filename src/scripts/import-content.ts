import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { stringify } from 'yaml';
import { sanitizeHTML } from './import-sanitize.ts';
export { sanitizeHTML, safeURL } from './import-sanitize.ts';
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
