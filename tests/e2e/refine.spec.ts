import { test, expect } from '@playwright/test';

test('header gains a scrolled state with a more solid surface', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const header = page.locator('.site-header');
  const shell = page.locator('.nav-shell');
  await expect(header).not.toHaveAttribute('data-scrolled', '');
  expect(await shell.evaluate((el) => getComputedStyle(el).transitionDuration)).toContain('0.22s');
  const before = await shell.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-scrolled', '');
  const after = await shell.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(after).not.toBe(before);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(header).not.toHaveAttribute('data-scrolled', '');
});

test('home to Flash shares the phone visual like Republica and DHGT', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const link = page.locator('[data-shared-link="flash"]');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/flash\/$/);
  await expect(page.locator('[data-shared-media="flash"]')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-shared-link="flash"]')).toBeVisible();
});

test('hero board entrance plays once and never replays on return', async ({ page }) => {
  await page.goto('/');
  const piece = page.locator('.board-game');
  await expect
    .poll(async () => (await piece.evaluate((el) => el.getAnimations().length)) > 0)
    .toBe(true);
  await expect
    .poll(async () =>
      (await piece.evaluate((el) => el.getAnimations().map((a) => a.playState))).every(
        (s) => s === 'finished',
      ),
    )
    .toBe(true);
  await page.locator('.hero-copy a[href="/blog/"]').click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.locator('.board-game').evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('hero board entrance is skipped entirely with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const piece = page.locator('.board-game');
  await expect(piece).toBeVisible();
  expect(await piece.evaluate((el) => el.getAnimations().length)).toBe(0);
  expect(await piece.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});
