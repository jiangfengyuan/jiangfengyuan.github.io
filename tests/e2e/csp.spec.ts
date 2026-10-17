import { test, expect } from '@playwright/test';

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
  '/blog/20261011-SGGPQS/',
  '/404.html',
  '/en/',
  '/en/about/',
  '/en/blog/',
  '/en/blog/20260926-ukkgj5/',
  '/en/404/',
];

test('pages, theme switch and language switch raise no CSP violations', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route('https://mmbiz.qpic.cn/**', (r) => r.abort());
  await page.addInitScript(() => {
    (window as any).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as any).__csp.push(`${e.effectiveDirective} ${e.sample}`),
    );
  });
  const violations: string[] = [];
  const collect = async () =>
    violations.push(
      ...(await page.evaluate(() => (window as any).__csp as string[])).map(
        (v) => page.url() + ' ' + v,
      ),
    );
  for (const route of routes) {
    await page.goto(route);
    await page.locator('[data-theme-toggle]').click();
    await page.waitForTimeout(500);
    await collect();
  }
  await page.goto('/about/');
  await page.locator('[data-lang-toggle]').click();
  await expect(page).toHaveURL(/\/en\/about\/$/);
  await collect();
  expect(violations).toEqual([]);
});

test('missing English URLs land on the English 404', async ({ page }) => {
  await page.goto('/en/no-such-page/');
  // The static test server serves 404.html for misses, like GitHub Pages.
  await expect(page).toHaveURL(/\/en\/404\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('English hint shows only for non-Chinese browsers and stays dismissed', async ({
  browser,
}) => {
  const en = await browser.newContext({ locale: 'en-US' });
  const page = await en.newPage();
  await page.goto('http://127.0.0.1:4330/about/?x=1#contact');
  const hint = page.locator('[data-lang-hint]');
  await expect(hint).toBeVisible();
  await expect(hint.locator('a')).toHaveAttribute('href', '/en/about/?x=1#contact');
  await hint.locator('[data-lang-hint-close]').click();
  await expect(hint).toBeHidden();
  await page.goto('http://127.0.0.1:4330/projects/');
  await expect(page.locator('[data-lang-hint]')).toBeHidden();
  await en.close();
  const zh = await browser.newContext({ locale: 'zh-CN' });
  const zhPage = await zh.newPage();
  await zhPage.goto('http://127.0.0.1:4330/about/');
  await expect(zhPage.locator('[data-lang-hint]')).toBeHidden();
  await zh.close();
});
