import { test, expect } from '@playwright/test';

const mockCopy = (page: import('@playwright/test').Page) =>
  page.addInitScript(() => {
    (window as any).vibrations = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        (window as any).vibrations.push(pattern);
        return true;
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });

test('aspect ratios: 16:10, 21:9 and low-height landscape keep layout usable', async ({
  page,
}) => {
  await page.goto('/');
  for (const [width, height] of [
    [1280, 800],
    [1440, 900],
    [1600, 1000],
    [1920, 1080],
    [2560, 1080],
    [3440, 1440],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `${width}x${height} overflow`,
    ).toBe(true);
    const toggle = await page.locator('[data-theme-toggle]').boundingBox();
    expect(toggle && toggle.width >= 44 && toggle.height >= 44, `${width}x${height} target`).toBe(
      true,
    );
    if (width >= 2000) {
      const container = await page.locator('.container').first().boundingBox();
      expect(container!.width, `${width} container capped`).toBeLessThanOrEqual(1440);
      const card = await page.locator('.project-card').first().boundingBox();
      expect(card!.width, `${width} card not stretched`).toBeLessThanOrEqual(500);
    }
  }
  await page.goto('/blog/20261004-b45psV/');
  await page.setViewportSize({ width: 3440, height: 1440 });
  const shell = await page.locator('.article-shell').boundingBox();
  expect(shell!.width).toBeLessThanOrEqual(990);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('.article-content img').first().click();
  const close = await page.locator('[data-lightbox-close]').boundingBox();
  expect(close!.y + close!.height).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
});

test('seamless wide screens do not constrain lanes; real hinges do', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 3440, height: 1440 });
  await expect(page.locator('html')).not.toHaveAttribute('data-segmented', '');
  await page.evaluate(() => {
    Object.defineProperty(window, 'viewport', {
      configurable: true,
      value: {
        segments: [
          { x: 0, y: 0, width: 1720, height: 1440 },
          { x: 1720, y: 0, width: 1720, height: 1440 },
        ],
      },
    });
    dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).not.toHaveAttribute('data-segmented', '');
  await page.evaluate(() => {
    (window as any).viewport.segments = [
      { x: 0, y: 0, width: 1720, height: 1440 },
      { x: 1744, y: 0, width: 1696, height: 1440 },
    ];
    dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-segmented', '');
  const nav = await page.locator('.nav-shell').boundingBox();
  expect(nav!.x + nav!.width).toBeLessThanOrEqual(1744);
});

test('haptics fire only on explicit actions, never on load, scroll or hover', async ({
  page,
}) => {
  await mockCopy(page);
  await page.goto('/');
  await page.evaluate(() => scrollTo(0, 400));
  await page.mouse.move(300, 300);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).vibrations)).toEqual([]);
  await page.locator('[data-theme-toggle]').click();
  expect(await page.evaluate(() => (window as any).vibrations)).toEqual([10]);
  await page.goto('/about/');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).vibrations)).toEqual([]);
  await page.locator('[data-copy-email]').first().click();
  await expect(page.locator('[data-copy-email]').first()).toHaveAttribute(
    'data-copy-state',
    'success',
  );
  expect(await page.evaluate(() => (window as any).vibrations)).toEqual([[12, 40, 12]]);
});

test('haptics silently no-op without the API and stay silent under reduced motion', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined });
  });
  await page.goto('/');
  expect(await page.evaluate(() => typeof navigator.vibrate)).toBe('undefined');
  await page.locator('[data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
  const context = await page.context().browser()!.newContext({
    reducedMotion: 'reduce',
  });
  const reduced = await context.newPage();
  await mockCopy(reduced);
  await reduced.goto('/');
  await reduced.locator('[data-theme-toggle]').click();
  await expect(reduced.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await reduced.evaluate(() => (window as any).vibrations)).toEqual([]);
  await reduced.goto('/about/');
  await reduced.locator('[data-copy-email]').first().click();
  await expect(reduced.locator('[data-copy-email]').first()).toHaveAttribute(
    'data-copy-state',
    'success',
  );
  await expect(reduced.locator('[role="status"]').first()).toHaveText('已复制，可以粘贴了。');
  expect(await reduced.evaluate(() => (window as any).vibrations)).toEqual([]);
  await context.close();
});
