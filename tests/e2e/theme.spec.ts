import { test, expect } from '@playwright/test';

test('theme toggle updates icons, aria-pressed and meta theme-color', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('[data-theme-toggle]');
  const sun = page.locator('.theme-icon-sun');
  const moon = page.locator('.theme-icon-moon');
  const meta = page.locator('meta[name="theme-color"]');

  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('aria-label', '切换为深色主题');
  await expect(meta).toHaveAttribute('content', '#f6f4ef');
  expect(await sun.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  expect(await moon.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');

  await toggle.click();
  await page.waitForTimeout(300);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('aria-label', '切换为浅色主题');
  await expect(meta).toHaveAttribute('content', '#191c19');
  expect(await sun.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  expect(await moon.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

  await toggle.click();
  await page.waitForTimeout(300);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(meta).toHaveAttribute('content', '#f6f4ef');
});

test('theme toggle is hidden without javascript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await context.newPage();
  await nojs.goto('/');
  const html = await nojs.content();
  expect(html).toContain('[data-theme-toggle]');
  expect(html).toContain('display: none');
  await context.close();
});
