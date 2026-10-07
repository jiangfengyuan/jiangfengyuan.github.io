import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = [
  '/',
  '/projects/',
  '/flash/',
  '/republica/',
  '/dhgt/',
  '/blog/',
  '/updates/',
  '/about/',
  '/blog-admin/',
  '/blog/20260926-S5g3_V/',
  '/blog/20260913-04kgrl/',
  '/404.html',
];
test('all layouts, bilingual themes, static metadata and accessibility', async ({ page }) => {
  await page.route('https://mmbiz.qpic.cn/**', (r) => r.abort());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        route + ' ' + width,
      ).toBe(true);
    }
    await page.locator('[data-lang-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    for (let theme = 0; theme < 2; theme++) {
      await page.locator('[data-theme-toggle]').click();
      await page.waitForTimeout(650);
      const violations = (
        await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      ).violations;
      expect(
        violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        route,
      ).toEqual([]);
    }
    await page.locator('[data-lang-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  }
  expect(errors).toEqual([]);
});
test('menu focus, reduced motion, search and history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('#site-nav a').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-menu-toggle]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#site-nav')).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.reveal')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.goto('/blog/');
  const input = page.locator('[data-search-input]');
  await input.fill('DHGT');
  await expect(page.locator('[data-post]:visible')).toHaveCount(1);
  await input.fill('not-a-real-article');
  await expect(page.locator('[data-filter-empty]')).toBeVisible();
  await input.fill('');
  await expect(page.locator('[data-post]:visible')).toHaveCount(9);
  await page.locator('[data-post] h3 a').first().click();
  await expect(page.locator('.article-content')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-post]:visible')).toHaveCount(9);
  await page.goto('/updates/');
  await page.locator('[data-filter-project="flash"]').click();
  await expect(page.locator('[data-update]:visible')).toHaveCount(1);
});
test('old article links and content without scripts', async ({ page, browser }) => {
  await page.goto('/blog.html?p=20260926-S5g3_V#test');
  await expect(page).toHaveURL(/\/blog\/20260926-S5g3_V\/#test/);
  await page.goto('/blog/?p=20260913-04kgrl');
  await expect(page).toHaveURL(/\/blog\/20260913-04kgrl\//);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  const nojs = await context.newPage();
  await nojs.goto('/');
  await expect(nojs.locator('#site-nav a').first()).toBeVisible();
  await nojs.goto('/blog/20260926-S5g3_V/');
  await expect(nojs.locator('.article-content p').first()).toBeVisible();
  await expect(nojs.locator('.article-aside')).toHaveCount(0);
  await nojs.goto('/blog/20260926-ukkgj5/');
  await expect(nojs.locator('.toc a')).toHaveCount(8);
  await nojs.goto('/blog.html?p=20260926-S5g3_V');
  await expect(nojs.locator('a[href="/blog/20260926-S5g3_V/"]')).toBeVisible();
  await context.close();
});
test('lightbox keyboard and importer export', async ({ page }) => {
  await page.route('https://mmbiz.qpic.cn/**', (r) =>
    r.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="gray"/></svg>',
    }),
  );
  await page.goto('/blog/20260926-S5g3_V/');
  const image = page.locator('.article-content img').first();
  await image.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-lightbox]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(image).toBeFocused();
  await page.goto('/blog-admin/');
  await page.locator('[name="title"]').fill('Import test');
  await page.locator('details summary').click();
  await page
    .locator('[name="htmlsource"]')
    .fill(
      '<h2>Heading</h2><p>Hello</p><script>alert(1)</script><table><tr><th>A</th></tr><tr><td>B</td></tr></table>',
    );
  await page.locator('[data-load-html]').click();
  await page.locator('[data-preview-button]').click();
  await expect(page.locator('[data-import-preview] table')).toBeVisible();
  expect(await page.locator('[data-import-preview] script').count()).toBe(0);
  const download = page.waitForEvent('download');
  await page.locator('button[type="submit"]').click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  await expect(page.locator('[data-import-output]')).toHaveValue(/draft: true/);
});
