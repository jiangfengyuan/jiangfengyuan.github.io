import { test, expect } from '@playwright/test';

const site = 'https://jiangfengyuan.github.io';
const pairs: Array<[string, string]> = [
  ['/', '/en/'],
  ['/blog/', '/en/blog/'],
  ['/about/', '/en/about/'],
  ['/blog/20261004-b45psV/', '/en/blog/20261004-b45psV/'],
];

test('canonical, hreflang, og:locale and RSS alternate are locale-aware', async ({ page }) => {
  for (const [zh, en] of pairs) {
    await page.goto(zh);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + zh);
    await expect(page.locator('link[hreflang="zh-CN"]')).toHaveAttribute('href', site + zh);
    await expect(page.locator('link[hreflang="en-US"]')).toHaveAttribute('href', site + en);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', site + zh);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'zh_CN');
    await expect(
      page.locator('link[rel="alternate"][type="application/rss+xml"]'),
    ).toHaveAttribute('href', '/rss.xml');
    await page.goto(en);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + en);
    await expect(page.locator('link[hreflang="zh-CN"]')).toHaveAttribute('href', site + zh);
    await expect(page.locator('link[hreflang="en-US"]')).toHaveAttribute('href', site + en);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
    await expect(
      page.locator('link[rel="alternate"][type="application/rss+xml"]'),
    ).toHaveAttribute('href', '/en/rss.xml');
  }
});

test('blog listings are scoped per language and match the search indexes', async ({
  page,
  request,
}) => {
  const zhIndex = (await (await request.get('/search-index.json')).json()) as Array<{
    url: string;
  }>;
  const enIndex = (await (await request.get('/en/search-index.json')).json()) as Array<{
    url: string;
  }>;
  expect(zhIndex.length).toBeGreaterThan(0);
  expect(enIndex).toHaveLength(zhIndex.length);

  await page.goto('/blog/');
  const zhPosts = page.locator('[data-post]');
  await expect(zhPosts).toHaveCount(zhIndex.length);
  const zhHrefs = await zhPosts.locator('h3 a').evaluateAll((els) =>
    els.map((el) => el.getAttribute('href') ?? ''),
  );
  expect(zhHrefs.length).toBe(zhIndex.length);
  for (const href of zhHrefs) expect(href).toMatch(/^\/blog\/[^/]+\/$/);
  await page.goto('/en/blog/');
  const enPosts = page.locator('[data-post]');
  await expect(enPosts).toHaveCount(enIndex.length);
  const enHrefs = await enPosts.locator('h3 a').evaluateAll((els) =>
    els.map((el) => el.getAttribute('href') ?? ''),
  );
  expect(enHrefs.length).toBe(enIndex.length);
  for (const href of enHrefs) expect(href).toMatch(/^\/en\/blog\/[^/]+\/$/);
  const zhSlugs = zhHrefs.map((h) => h.replace(/^\/blog\/|\/$/g, '')).sort();
  const enSlugs = enHrefs.map((h) => h.replace(/^\/en\/blog\/|\/$/g, '')).sort();
  expect(enSlugs).toEqual(zhSlugs);
  const zhIndexSlugs = zhIndex.map((e) => e.url.replace(/^\/blog\/|\/$/g, '')).sort();
  const enIndexSlugs = enIndex.map((e) => e.url.replace(/^\/en\/blog\/|\/$/g, '')).sort();
  expect(zhSlugs).toEqual(zhIndexSlugs);
  expect(enSlugs).toEqual(enIndexSlugs);
});

test('previous and next links stay within the same language', async ({ page }) => {
  await page.goto('/en/blog/20261004-b45psV/');
  const enNav = page.locator('.article-nav a');
  await expect(enNav).toHaveCount(2);
  for (const href of await enNav.evaluateAll((els) =>
    els.map((el) => el.getAttribute('href') ?? ''),
  )) {
    expect(href).toMatch(/^\/en\/blog\/[^/]+\/$/);
  }
  await enNav.first().click();
  await expect(page).toHaveURL(/\/en\/blog\/[^/]+\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/blog/20261004-b45psV/');
  const zhNav = page.locator('.article-nav a');
  await expect(zhNav).toHaveCount(2);
  for (const href of await zhNav.evaluateAll((els) =>
    els.map((el) => el.getAttribute('href') ?? ''),
  )) {
    expect(href).toMatch(/^\/blog\/[^/]+\/$/);
  }
});

test('RSS feeds and search indexes cover every published post per language', async ({
  request,
}) => {
  const zhIndex = (await (await request.get('/search-index.json')).json()) as unknown[];
  const enIndex = (await (await request.get('/en/search-index.json')).json()) as unknown[];
  expect(zhIndex.length).toBeGreaterThan(0);
  expect(enIndex).toHaveLength(zhIndex.length);
  const rss = await (await request.get('/en/rss.xml')).text();
  expect(rss.match(/<item>/g)).toHaveLength(enIndex.length);
  expect(rss).toContain('<language>en');
  const zhRss = await (await request.get('/rss.xml')).text();
  expect(zhRss.match(/<item>/g)).toHaveLength(zhIndex.length);
  expect(rss).toContain('Verstappen');
  expect(rss).not.toContain('维斯塔潘');
  expect(zhRss).toContain('维斯塔潘');
});

test('external links are noopener and main pages carry CSP and referrer meta', async ({
  page,
}) => {
  const routes = [
    '/',
    '/projects/',
    '/blog/',
    '/about/',
    '/blog/20261004-b45psV/',
    '/en/',
    '/en/projects/',
    '/en/blog/',
    '/en/about/',
    '/en/blog/20261004-b45psV/',
  ];
  for (const route of routes) {
    await page.goto(route);
    const blanks = page.locator('a[target="_blank"]');
    for (const rel of await blanks.evaluateAll((els) =>
      els.map((el) => el.getAttribute('rel') ?? ''),
    )) {
      expect(rel, route).toContain('noopener');
      expect(rel, route).toContain('noreferrer');
    }
    await expect(
      page.locator('meta[http-equiv="Content-Security-Policy"]'),
      route,
    ).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[name="referrer"]'), route).toHaveAttribute('content', /.+/);
  }
});
