import { test, expect } from '@playwright/test';

test('language switch link preserves query and hash', async ({ page }) => {
  await page.goto('/about/?foo=bar#contact');
  const zhLink = page.locator('a[data-lang-link]');
  await expect(zhLink).toHaveAttribute('href', '/en/about/?foo=bar#contact');
  await expect(zhLink).toHaveText('EN');

  const motionPromise = page.evaluate(
    () =>
      new Promise<string | undefined>((resolve) => {
        document.addEventListener(
          'astro:before-preparation',
          () => {
            resolve(document.documentElement.dataset.motion);
          },
          { once: true },
        );
      }),
  );
  await zhLink.click();
  expect(await motionPromise).toBe('language');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(page.url()).toContain('/en/about/');
  expect(page.url()).toContain('foo=bar');
  expect(page.url()).toContain('#contact');

  const enLink = page.locator('a[data-lang-link]');
  await expect(enLink).toHaveAttribute('href', '/about/?foo=bar#contact');
  await expect(enLink).toHaveText('中文');
});

for (const width of [1280, 390]) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`language switch preserves reading progress at ${width}px with ${reducedMotion}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.emulateMedia({ reducedMotion });
      await page.addInitScript(() => localStorage.setItem('site-lang-hint', 'dismissed'));
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/about/?foo=bar#contact');
      await expect(page.locator('.site-header')).toHaveAttribute('data-nav-ready', '');
      for (const locale of ['en', 'zh-CN']) {
        await expect(page.locator('html')).not.toHaveAttribute('data-astro-transition');
        await page.evaluate(() =>
          scrollTo({
            top: (document.documentElement.scrollHeight - innerHeight) * 0.6,
            behavior: 'instant',
          }),
        );
        const before = await page.evaluate(
          () => scrollY / (document.documentElement.scrollHeight - innerHeight),
        );
        expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300);
        const link = await page.locator('a[data-lang-link]').boundingBox();
        expect(link).not.toBeNull();
        await page.mouse.click(link!.x + link!.width / 2, link!.y + link!.height / 2);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('.site-header')).toHaveAttribute('data-nav-ready', '');
        await expect
          .poll(async () =>
            page.evaluate(
              (progress) =>
                Math.abs(
                  scrollY / (document.documentElement.scrollHeight - innerHeight) - progress,
                ),
              before,
            ),
          )
          .toBeLessThan(0.02);
        expect(page.url()).toContain('?foo=bar#contact');
      }
      // A later ordinary navigation should still start at the top.
      await page.locator('.site-header a.wordmark').click();
      await expect(page).toHaveURL('/');
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      expect(errors).toEqual([]);
    });
  }
}
