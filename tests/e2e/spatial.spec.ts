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
  '/blog/20261004-b45psV/',
  '/blog/20260926-ukkgj5/',
  '/404.html',
];
const sizes = [
  [320, 780],
  [360, 800],
  [390, 844],
  [430, 932],
  [600, 840],
  [720, 720],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1200, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1080],
  [3440, 1440],
  [844, 390],
];
const mockImages = async (page: import('@playwright/test').Page) =>
  page.route('https://mmbiz.qpic.cn/**', (r) =>
    r.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="gray"/></svg>',
    }),
  );
test('viewport families, both languages and final palette contrast', async ({ page }) => {
  test.setTimeout(180_000);
  await mockImages(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of routes) {
    await page.goto(route);
    for (const lang of ['zh-CN', 'en']) {
      if ((await page.locator('html').getAttribute('lang')) !== lang) {
        await page.locator('[data-lang-toggle]').click();
        await page.waitForTimeout(300);
      }
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          route + ' ' + lang + ' ' + width,
        ).toBe(true);
        const button = page.locator('[data-theme-toggle]');
        const b = await button.boundingBox();
        expect(b && b.width >= 44 && b.x >= 0 && b.x + b.width <= width).toBeTruthy();
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/projects/', '/blog/', '/blog/20260930-iGVsbC/']) {
    await page.goto(route);
    for (let i = 0; i < 2; i++) {
      await page.locator('[data-theme-toggle]').click();
      await page.waitForTimeout(650);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        route,
      ).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});
test('rapid switches and animation interrupted by navigation keep final preferences', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const l = document.querySelector<HTMLButtonElement>('[data-lang-toggle]')!,
      t = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!;
    l.click();
    t.click();
    l.click();
    t.click();
    l.click();
    t.click();
  });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(550);
  expect(
    await page.evaluate(() => [
      localStorage.getItem('site-lang'),
      localStorage.getItem('site-theme'),
    ]),
  ).toEqual(['en', 'dark']);
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!.click();
    document.querySelector<HTMLAnchorElement>('a[href="/projects/"]')!.click();
  });
  await expect(page).toHaveURL(/\/projects\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-shared-link="republica"]').click();
  await expect(page).toHaveURL(/\/republica\/$/);
  await expect(page.locator('[data-shared-media="republica"]')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/projects\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/republica\/$/);
});
test('reduced motion mid-transition, unavailable API and solid surfaces remain usable', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('[data-theme-toggle]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === 'running').length,
    ),
  ).toBe(0);
  await page.emulateMedia({ forcedColors: 'active' });
  expect(
    await page.locator('.nav-shell').evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
  await page.evaluate(() =>
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
      configurable: true,
    }),
  );
  await page.locator('[data-lang-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('[data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('#site-nav a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu-toggle]')).toBeFocused();
});
test('segment geometry, resizing, touch and high-density windows', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 824, height: 900 },
    deviceScaleFactor: 3,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() =>
    Object.defineProperty(window, 'viewport', {
      configurable: true,
      value: {
        segments: [
          { x: 0, y: 0, width: 400, height: 900 },
          { x: 424, y: 0, width: 400, height: 900 },
        ],
      },
    }),
  );
  await page.goto('http://127.0.0.1:4330/');
  await expect(page.locator('html')).toHaveAttribute('data-segmented', '');
  const card = await page.locator('.nav-shell').boundingBox();
  expect(card!.x + card!.width).toBeLessThanOrEqual(400);
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('#site-nav')).toBeVisible();
  await page.evaluate(() => {
    (window as any).viewport.segments = [{ x: 0, y: 0, width: 824, height: 900 }];
    dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('html')).not.toHaveAttribute('data-segmented', '');
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  for (const segments of [
    [
      { x: 0, y: 0, width: 260, height: 900 },
      { x: 282, y: 0, width: 260, height: 900 },
      { x: 564, y: 0, width: 260, height: 900 },
    ],
    [
      { x: 0, y: 0, width: 824, height: 400 },
      { x: 0, y: 422, width: 824, height: 478 },
    ],
  ]) {
    await page.evaluate((segments) => {
      (window as any).viewport.segments = segments;
      dispatchEvent(new Event('resize'));
    }, segments);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const lane = [...segments].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    for (const selector of ['[data-lang-toggle]', '[data-theme-toggle]', '[data-menu-toggle]']) {
      if (!(await page.locator(selector).isVisible())) continue;
      const b = await page.locator(selector).boundingBox();
      expect(b!.x).toBeGreaterThanOrEqual(lane.x);
      expect(b!.x + b!.width).toBeLessThanOrEqual(lane.x + lane.width);
    }
  }
  await page.evaluate(() => {
    (window as any).viewport.segments = [];
    dispatchEvent(new Event('resize'));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-menu-toggle]').click();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  expect(
    await page
      .locator('[data-tilt]')
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe('none');
  await context.close();
});
test('chips, pointer depth and lightbox closing animation keep keyboard behavior', async ({
  page,
}) => {
  await mockImages(page);
  await page.goto('/blog/');
  await page.locator('[data-filter-tag="F1"]').click();
  await expect(page.locator('[data-filter-tag="F1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.filter-indicator')).toBeVisible();
  await page.locator('[data-search-input]').fill('not-real');
  await expect(page.locator('[data-filter-empty]')).toBeVisible();
  await page.goto('/blog/20261004-b45psV/');
  const image = page.locator('.article-content img').first();
  await image.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-lightbox]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(image).toBeFocused();
  await page.goto('/');
  const board = page.locator('.hero-board');
  const rect = await board.boundingBox();
  await page.mouse.move(rect!.x + rect!.width * 0.9, rect!.y + rect!.height * 0.3);
  if (await page.evaluate(() => matchMedia('(pointer:fine)').matches))
    await expect(board).toHaveAttribute('style', /--tilt-x/);
});

test('large text, script-free content and keyboard viewport keep controls reachable', async ({
  browser,
  page,
}) => {
  await mockImages(page);
  for (const route of ['/', '/projects/', '/blog/', '/blog/20261004-b45psV/']) {
    await page.goto(route);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        const els = [...document.querySelectorAll<HTMLElement>('body *:not(svg):not(svg *)')];
        const sizes = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
        els.forEach((el, i) => (el.style.fontSize = sizes[i] * 2 + 'px'));
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        route + ' text200 ' + width,
      ).toBe(true);
      await page.evaluate(() =>
        document
          .querySelectorAll<HTMLElement>('[style]')
          .forEach((el) => el.style.removeProperty('font-size')),
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, 'height', { value: 360, configurable: true });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await page.locator('.article-content img').first().click();
  const close = await page.locator('[data-lightbox-close]').boundingBox();
  expect(close!.y + close!.height).toBeLessThanOrEqual(360);
  await page.keyboard.press('Escape');
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const plain = await context.newPage();
  for (const route of ['/', '/projects/', '/flash/', '/dhgt/', '/blog/20261004-b45psV/']) {
    await plain.goto('http://127.0.0.1:4330' + route);
    await expect(plain.locator('main')).toBeVisible();
    await expect(plain.locator('a[href="/blog/"]').first()).toBeVisible();
    expect(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await context.close();
});
