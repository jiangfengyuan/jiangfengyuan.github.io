import { test, expect } from '@playwright/test';

test('language switch link preserves query and hash', async ({ page }) => {
  await page.goto('/about/?foo=bar#contact');
  const zhLink = page.locator('a[data-lang-link]');
  await expect(zhLink).toHaveAttribute('href', '/en/about/?foo=bar#contact');
  await expect(zhLink).toHaveText('EN');

  await zhLink.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(page.url()).toContain('/en/about/');
  expect(page.url()).toContain('foo=bar');
  expect(page.url()).toContain('#contact');

  const enLink = page.locator('a[data-lang-link]');
  await expect(enLink).toHaveAttribute('href', '/about/?foo=bar#contact');
  await expect(enLink).toHaveText('中文');
});
