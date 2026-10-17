// Fails when dist/ inline <style> blocks are not covered by each page's own CSP
// style-src hashes — catches astro.config.mjs styleDirective hashes going stale
// after Astro changes its transition:name output.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}

const sha256 = (text) => 'sha256-' + createHash('sha256').update(text, 'utf8').digest('base64');

let failures = 0;
let pages = 0;
for (const file of htmlFiles('dist')) {
  const html = readFileSync(file, 'utf8');
  const meta = html.match(/<meta[^>]+http-equiv="content-security-policy"[^>]+content="([^"]+)"/i);
  if (!meta) continue;
  pages++;
  const styleSrc = meta[1].match(/style-src ([^;]+)/);
  if (!styleSrc) {
    console.error(file + ': CSP meta has no style-src directive');
    failures++;
    continue;
  }
  const allowed = new Set(styleSrc[1].match(/'sha256-[^']+'/g) ?? []);
  for (const block of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const hash = sha256(block[1]);
    if (!allowed.has(`'${hash}'`)) {
      console.error(
        `${file}: inline <style> ${hash} is not in the page CSP; update styleDirective hashes in astro.config.mjs`,
      );
      failures++;
    }
  }
}

if (!pages) {
  console.error('No dist HTML pages with a CSP meta found; run npm run build first');
  process.exit(1);
}
if (failures) process.exit(1);
console.log(`CSP style hashes verified across ${pages} pages`);
