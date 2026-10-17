import { test, expect } from '@playwright/test';

test('desktop discovery, rapid switching, dismissal and keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.nav-disclosure')).toHaveCount(0);
  await page.locator('[data-nav-trigger="projects"]').hover();
  await expect(page.locator('[data-nav-trigger="projects"]')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.locator('#nav-panel-projects')).toBeVisible();
  expect(
    await page.locator('.nav-backdrop').evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe('blur(6px)');
  await page.locator('#nav-panel-projects a[href="/flash/"]').hover();
  await expect(page.locator('#nav-panel-projects')).toBeVisible();
  for (const id of ['blog', 'about', 'updates', 'projects']) {
    await page.locator(`[data-nav-trigger="${id}"]`).hover();
    await expect(page.locator(`[data-nav-trigger="${id}"]`)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  }
  await page.locator('[data-nav-trigger="projects"]').click();
  await expect(page.locator('[data-nav-trigger="projects"]')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page).toHaveURL(/\/$/);
  await page.locator('[data-nav-trigger="about"]').click();
  await expect(page.locator('#nav-panel-about a').first()).toBeFocused();
  await page.locator('[data-nav-trigger="blog"]').hover();
  await expect(page.locator('#nav-panel-blog a').first()).toBeFocused();
  await page.mouse.move(50, 800);
  await expect(page.locator('.site-header')).not.toHaveAttribute('data-navigation-open', '');
  await page.locator('[data-nav-trigger="blog"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#nav-panel-blog a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-nav-trigger="blog"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.locator('#nav-panel-blog a[href="/blog/"]').click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.locator('.site-header')).not.toHaveAttribute('data-navigation-open', '');
});

test('mobile two-level sheet, focus cycle, resize and language', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('#site-nav [data-nav-trigger]').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-menu-toggle]')).toBeFocused();
  await page.locator('[data-nav-trigger="projects"]').click();
  await expect(page.locator('#nav-panel-projects a').first()).toBeFocused();
  await page.locator('#nav-panel-projects [data-nav-back]').click();
  await expect(page.locator('[data-nav-trigger="projects"]')).toBeFocused();
  await page.locator('[data-lang-toggle]').click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-nav-trigger="projects"]')).toHaveText('Projects');
  await page.locator('[data-menu-toggle]').click();
  await page.locator('[data-nav-trigger="about"]').click();
  await expect(page.locator('#nav-panel-about')).toContainText('Get in touch');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu-toggle]')).toBeFocused();
  await expect(page.locator('#site-nav')).not.toBeVisible();
  await page.locator('[data-menu-toggle]').click();
  await page.setViewportSize({ width: 1200, height: 850 });
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#site-nav')).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
});

test('reduced motion and a scrollable short-screen sheet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 420 });
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  await page.locator('[data-nav-trigger="projects"]').click();
  expect(
    await page
      .locator('[data-nav-dropdown]')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s');
  const sheet = page.locator('#nav-panel-projects .nav-panel-inner');
  expect(await sheet.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.locator('#nav-panel-projects a[href="/about/#contact"]').click();
  await expect(page).toHaveURL(/\/about\/#contact$/);
  await expect(page.locator('.site-header')).not.toHaveAttribute('data-navigation-open', '');
});

test('open sheets remain accessible with large text, touch and language changes', async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('/');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('html')).toHaveAttribute('data-compact-nav', String(width <= 760));
    await page.evaluate(() => {
      const els = [...document.querySelectorAll<HTMLElement>('.site-header *:not(svg):not(svg *)')];
      const sizes = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
      els.forEach((el, i) => (el.style.fontSize = sizes[i] * 2 + 'px'));
    });
    if (width <= 760) await page.locator('[data-menu-toggle]').click();
    await page.locator('[data-nav-trigger="projects"]').click();
    await expect(page.locator('#nav-panel-projects')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), {
        message: `Expanded navigation at ${width}px with 200% text`,
      })
      .toBe(true);
    await page.locator('[data-lang-toggle]').click();
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    if (width <= 760) await page.locator('[data-menu-toggle]').click();
    await page.locator('[data-nav-trigger="projects"]').click();
    await expect(page.locator('#nav-panel-projects a').first()).toHaveText('All projects');
    await page.keyboard.press('Escape');
    await page.locator('[data-lang-toggle]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    if (width <= 760) await page.locator('[data-menu-toggle]').click();
    await page.locator('[data-nav-trigger="projects"]').click();
    for (let theme = 0; theme < 2; theme++) {
      await page.locator('[data-theme-toggle]').click();
      await page.waitForTimeout(650);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
    }
    await page.keyboard.press('Escape');
  }
  const touch = await browser.newContext({
    hasTouch: true,
    viewport: { width: 1024, height: 900 },
  });
  const touchPage = await touch.newPage();
  await touchPage.goto('http://127.0.0.1:4330/');
  await touchPage.locator('[data-nav-trigger="projects"]').tap();
  await expect(touchPage.locator('#nav-panel-projects')).toBeVisible();
  await touchPage.locator('#nav-panel-projects a[href="/flash/"]').tap();
  await expect(touchPage).toHaveURL(/\/flash\/$/);
  await expect(touchPage.locator('.site-header')).not.toHaveAttribute('data-navigation-open', '');
  await touch.close();
});

test('interrupted transitions keep only the last selection and close immediately to interaction', async ({
  page,
}) => {
  await page.setViewportSize({ width: 689, height: 950 });
  await page.goto('/');
  await page.locator('[data-menu-toggle]').click();
  await page.locator('[data-nav-trigger="projects"]').click();
  await page.evaluate(() => {
    for (const id of ['blog', 'updates', 'about'])
      document.querySelector<HTMLButtonElement>(`[data-nav-trigger="${id}"]`)!.click();
  });
  await expect(page.locator('#nav-panel-about')).toBeVisible();
  expect(
    await page.locator('#nav-panel-projects').evaluate((el) => (el as HTMLElement).inert),
  ).toBe(true);
  await page.locator('#nav-panel-about [data-nav-back]').click();
  await expect(page.locator('[data-nav-trigger="about"]')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-nav-trigger="about"]')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  expect(
    await page.locator('[data-nav-dropdown]').evaluate((el) => (el as HTMLElement).inert),
  ).toBe(true);
  await page.waitForTimeout(650);
  await expect(page.locator('[data-nav-dropdown]')).not.toBeVisible();
  await page.locator('[data-menu-toggle]').click();
  await page.locator('[data-nav-trigger="projects"]').click();
  await page.waitForTimeout(650);
  expect(
    await page
      .locator('[data-nav-dropdown]')
      .evaluate(
        (el) =>
          Math.abs(
            el.getBoundingClientRect().height - parseFloat((el as HTMLElement).style.height),
          ) < 1,
      ),
  ).toBe(true);
});

test('motion timing, capped main menu and script-free title links', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/');
  const motion = await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-nav-trigger="projects"]')!.click();
    const sheet = document.querySelector<HTMLElement>('[data-nav-dropdown]')!;
    return {
      duration: getComputedStyle(sheet).transitionDuration,
      columns: [...document.querySelectorAll('.nav-panel:not([hidden]) .nav-column')].map((el) => {
        const timing = el.getAnimations()[0]?.effect?.getTiming();
        return { duration: timing?.duration, delay: timing?.delay };
      }),
    };
  });
  expect(motion.duration).toBe('0.44s, 0s');
  expect(motion.columns).toEqual([
    { duration: 360, delay: 0 },
    { duration: 360, delay: 40 },
    { duration: 360, delay: 80 },
  ]);
  await page.waitForTimeout(500);
  const switching = await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-nav-trigger="blog"]')!.click();
    return {
      retired: (document.querySelector('#nav-panel-projects') as HTMLElement).inert,
      timing: document
        .querySelector('#nav-panel-blog .nav-column')!
        .getAnimations()[0]
        .effect!.getTiming(),
    };
  });
  expect(switching.retired).toBe(true);
  expect(switching.timing.delay).toBe(140);
  await page.keyboard.press('Escape');
  expect(
    await page
      .locator('[data-nav-dropdown]')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0.36s, 0s');
  await page.setViewportSize({ width: 320, height: 320 });
  await page.locator('[data-menu-toggle]').click();
  await page.waitForTimeout(500);
  expect(
    await page.locator('.nav-main-panel').evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  expect(
    await page
      .locator('[data-nav-dropdown]')
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
  ).toBe(true);
  await page.locator('[data-nav-backdrop]').click({ position: { x: 3, y: 310 } });
  await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'false');
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 700 },
  });
  const nojs = await context.newPage();
  await nojs.goto('http://127.0.0.1:4330/');
  await expect(nojs.locator('[data-nav-trigger]').first()).toBeHidden();
  await nojs.locator('#site-nav a[href="/projects/"]').click();
  await expect(nojs).toHaveURL(/\/projects\/$/);
  await context.close();
});
