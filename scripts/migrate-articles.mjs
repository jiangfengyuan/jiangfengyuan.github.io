// Compare the original source archive against the migrated, pre-rendered article bodies.
// Usage: node scripts/migrate-articles.mjs /path/to/legacy/posts
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
const source = process.argv[2];
if (!source) throw new Error('Provide the legacy posts directory.');
const normalize = (s) => s.replace(/\s+/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
for (const file of fs.readdirSync(source).filter((f) => f.endsWith('.html'))) {
  const id = file.slice(0, -5);
  const old = new JSDOM(fs.readFileSync(path.join(source, file), 'utf8')).window.document;
  const output = new JSDOM(fs.readFileSync(`dist/blog/${id}/index.html`, 'utf8')).window.document;
  const body = output.querySelector('.article-content');
  if (!body) throw new Error(`Missing article: ${id}`);
  if (normalize(old.body.textContent) !== normalize(body.textContent))
    throw new Error(`Text changed: ${id}`);
  for (const tag of ['img', 'table', 'figcaption'])
    if (old.querySelectorAll(tag).length !== body.querySelectorAll(tag).length)
      throw new Error(`${tag} count changed: ${id}`);
  const a = [...old.querySelectorAll('img')].map((i) => i.getAttribute('src'));
  const b = [...body.querySelectorAll('img')].map((i) => i.getAttribute('src'));
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`Image references changed: ${id}`);
  console.log(`${id}: text, tables, images and captions preserved`);
}
