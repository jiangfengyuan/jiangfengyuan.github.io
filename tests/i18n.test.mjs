import test from 'node:test';
import assert from 'node:assert/strict';
import {
  locales,
  localeFromPath,
  pathForLocale,
  hrefFor,
  postSlug,
} from '../src/i18n.ts';

test('locales constant and Locale type cover zh and en', () => {
  assert.deepEqual(locales, ['zh', 'en']);
});

test('localeFromPath identifies /en and /en/... as English, everything else as Chinese', () => {
  assert.equal(localeFromPath('/'), 'zh');
  assert.equal(localeFromPath('/about/'), 'zh');
  assert.equal(localeFromPath('/blog/post/'), 'zh');
  assert.equal(localeFromPath('/en'), 'en');
  assert.equal(localeFromPath('/en/'), 'en');
  assert.equal(localeFromPath('/en/about/'), 'en');
  assert.equal(localeFromPath('/en/blog/post/'), 'en');
  assert.equal(localeFromPath('/en/about?foo=1#bar'), 'en');
  assert.equal(localeFromPath('/english/'), 'zh');
});

test('pathForLocale maps /about/ to /en/about/ and back', () => {
  assert.equal(pathForLocale('/about/', 'en'), '/en/about/');
  assert.equal(pathForLocale('/en/about/', 'zh'), '/about/');
});

test('pathForLocale maps /blog/post/ to /en/blog/post/ and back', () => {
  assert.equal(pathForLocale('/blog/post/', 'en'), '/en/blog/post/');
  assert.equal(pathForLocale('/en/blog/post/', 'zh'), '/blog/post/');
});

test('pathForLocale preserves query strings and hashes', () => {
  assert.equal(pathForLocale('/about?foo=1#bar', 'en'), '/en/about?foo=1#bar');
  assert.equal(pathForLocale('/en/about?foo=1#bar', 'zh'), '/about?foo=1#bar');
  assert.equal(pathForLocale('/?foo=1#bar', 'en'), '/en/?foo=1#bar');
  assert.equal(pathForLocale('/en?foo=1#bar', 'zh'), '/?foo=1#bar');
});

test('pathForLocale avoids adding /en twice', () => {
  assert.equal(pathForLocale('/en/about/', 'en'), '/en/about/');
  assert.equal(pathForLocale('/en/', 'en'), '/en/');
  assert.equal(pathForLocale('/en', 'en'), '/en/');
});

test('pathForLocale collapses /en to root for Chinese locale', () => {
  assert.equal(pathForLocale('/en', 'zh'), '/');
  assert.equal(pathForLocale('/en/', 'zh'), '/');
});

test('pathForLocale does not confuse /english/ with /en/', () => {
  assert.equal(pathForLocale('/english/', 'en'), '/en/english/');
  assert.equal(pathForLocale('/en/english/', 'zh'), '/english/');
});

test('hrefFor only rewrites site-internal absolute page paths', () => {
  assert.equal(hrefFor('/about/', 'en'), '/en/about/');
  assert.equal(hrefFor('/en/about/', 'zh'), '/about/');
  assert.equal(hrefFor('/blog/post/', 'en'), '/en/blog/post/');
  assert.equal(hrefFor('/en/blog/post/', 'zh'), '/blog/post/');
});

test('hrefFor leaves external URLs, protocols, anchors and resources unchanged', () => {
  const externals = [
    'https://example.com/',
    'http://example.com/',
    '//example.com/',
    'mailto:a@b.com',
    'tel:+123',
    '#anchor',
    '/assets/photo.jpg',
    '/assets/fonts/font.woff2',
    '/rss.xml',
    '/sitemap.xml',
    '/sitemap-index.xml',
    '/robots.txt',
    '/favicon.ico',
    '/feed',
    '/api/search.json',
    '/_astro/chunk.js',
  ];
  for (const href of externals) {
    assert.equal(hrefFor(href, 'en'), href, `expected ${href} to stay unchanged in en`);
    assert.equal(hrefFor(href, 'zh'), href, `expected ${href} to stay unchanged in zh`);
  }
});

test('hrefFor treats /en/assets/... as a resource and does not force rewrites', () => {
  assert.equal(hrefFor('/en/assets/photo.jpg', 'en'), '/en/assets/photo.jpg');
  assert.equal(hrefFor('/en/assets/photo.jpg', 'zh'), '/en/assets/photo.jpg');
});

test('postSlug returns translationOf only for English translations', () => {
  assert.equal(postSlug({ data: { id: 'abc123', language: 'zh' } }), 'abc123');
  assert.equal(postSlug({ data: { id: 'def456', language: 'en' } }), 'def456');
  assert.equal(
    postSlug({ data: { id: 'ghi789', language: 'en', translationOf: 'abc123' } }),
    'abc123',
  );
});

test('postSlug ignores translationOf on Chinese articles', () => {
  assert.equal(
    postSlug({ data: { id: 'own-id', language: 'zh', translationOf: 'other-id' } }),
    'own-id',
  );
});
