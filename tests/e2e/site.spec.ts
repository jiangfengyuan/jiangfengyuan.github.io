import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// [zh route, en route, zh URL after switching back when it differs]
const routes: Array<[string, string, string?]> = [
  ['/', '/en/'],
  ['/projects/', '/en/projects/'],
  ['/flash/', '/en/flash/'],
  ['/republica/', '/en/republica/'],
  ['/dhgt/', '/en/dhgt/'],
  ['/blog/', '/en/blog/'],
  ['/updates/', '/en/updates/'],
  ['/about/', '/en/about/'],
  ['/blog-admin/', '/en/blog-admin/'],
  ['/blog/20260926-S5g3_V/', '/en/blog/20260926-S5g3_V/'],
  ['/blog/20260913-04kgrl/', '/en/blog/20260913-04kgrl/'],
  ['/404.html', '/en/404/'],
];
test('all layouts, bilingual themes, static metadata and accessibility', async ({ page }) => {
  test.setTimeout(180_000);
  await page.route('https://mmbiz.qpic.cn/**', (r) => r.abort());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [zh, en, zhReturn] of routes) {
    await page.goto(zh);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        zh + ' ' + width,
      ).toBe(true);
    }
    await page.locator('[data-lang-toggle]').click();
    await expect(page).toHaveURL(new RegExp(en.replace(/[/.]/g, '\\$&') + '$'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toBeVisible();
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
        en,
      ).toEqual([]);
    }
    await page.locator('[data-lang-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page).toHaveURL(new RegExp((zhReturn ?? zh).replace(/[/.]/g, '\\$&') + '$'));
  }
  expect(errors).toEqual([]);
});
test('menu focus, reduced motion, search and history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('#site-nav [data-nav-trigger]').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-menu-toggle]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#site-nav')).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.hero-copy')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.goto('/blog/');
  const articleCount = await page.locator('[data-post]').count();
  const input = page.locator('[data-search-input]');
  await input.fill('DHGT');
  await expect(page.locator('[data-post]:visible')).toHaveCount(1);
  await input.fill('not-a-real-article');
  await expect(page.locator('[data-filter-empty]')).toBeVisible();
  await input.fill('');
  await expect(page.locator('[data-post]:visible')).toHaveCount(articleCount);
  await page.locator('[data-post] h3 a').first().click();
  await expect(page.locator('.article-content')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-post]:visible')).toHaveCount(articleCount);
  await page.goto('/updates/');
  await page.locator('[data-filter-project="flash"]').click();
  await expect(page.locator('[data-update]:visible')).toHaveCount(1);
});
test('old article links and content without scripts', async ({ page, browser }) => {
  await page.goto('/blog.html?p=20260926-S5g3_V#test');
  await expect(page).toHaveURL(/\/blog\/20260926-S5g3_V\/#test/);
  await page.goto('/blog.html?p=20261011-SGGPQS');
  await expect(page).toHaveURL(/\/blog\/20261011-SGGPQS\//);
  await page.goto('/flash.html');
  await expect(page).toHaveURL(/\/flash\/$/);
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
  await nojs.goto('/en/about/');
  await expect(nojs.locator('html')).toHaveAttribute('lang', 'en');
  await expect(nojs.locator('#site-nav a[href="/en/blog/"]')).toBeVisible();
  await nojs.goto('/en/blog/20260926-S5g3_V/');
  await expect(nojs.locator('html')).toHaveAttribute('lang', 'en');
  await expect(nojs.locator('.article-content p').first()).toBeVisible();
  await context.close();
});
test('lightbox keyboard and production admin page', async ({ page }) => {
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
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.notice')).toContainText('导入工具仅在本地开发环境可用');
  await expect(page.locator('[data-load-html]')).toHaveCount(0);
  await expect(page.locator('[name="htmlsource"]')).toHaveCount(0);
  await expect(page.locator('[data-preview-button]')).toHaveCount(0);
  const html = await page.content();
  expect(html).not.toContain('data-import-preview');
  expect(html).not.toContain('data-import-output');
  for (const src of await page
    .locator('script[src]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('src') ?? ''))) {
    expect(src).not.toMatch(/import/i);
  }
});
