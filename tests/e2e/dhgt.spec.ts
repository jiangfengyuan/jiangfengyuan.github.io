import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const languages = [
  ['/dhgt/', 'zh-CN', 'ltr'],
  ['/en/dhgt/', 'en', 'ltr'],
  ['/fr/dhgt/', 'fr', 'ltr'],
  ['/ko/dhgt/', 'ko', 'ltr'],
  ['/de/dhgt/', 'de', 'ltr'],
  ['/ru/dhgt/', 'ru', 'ltr'],
  ['/ar/dhgt/', 'ar', 'rtl'],
  ['/ja/dhgt/', 'ja', 'ltr'],
] as const;

for (const [route, lang, dir] of languages) {
  test(`DHGT page in ${lang} is accessible and stays inside the viewport`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('html')).toHaveAttribute('dir', dir);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(9);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
}

test('the whole DHGT page, header and footer included, uses the Night tokens', async ({ page }) => {
  await page.goto('/en/dhgt/');
  const styles = await page.evaluate(() => {
    const read = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    return {
      body: read('body').backgroundColor,
      font: read('body').fontFamily,
      footer: read('.site-footer').fontFamily,
      wordmark: read('.site-header .wordmark').fontFamily,
      kicker: read('.dhgt-page .eyebrow').fontFamily,
      radius: read('.nav-shell').borderTopLeftRadius,
      feature: read('.dhgt-page .feature').borderBottomLeftRadius,
    };
  });
  expect(styles.body).toBe('rgb(11, 16, 38)');
  for (const font of [styles.font, styles.footer, styles.wordmark, styles.kicker]) {
    expect(font).toMatch(/^Futura/);
  }
  expect(styles.radius).toBe('0px');
  expect(styles.feature).toBe('0px');
  await expect(page.locator('[data-theme-toggle]')).toHaveCount(0);
});

test('DHGT cards elsewhere use the design, while the rest of the page does not', async ({
  page,
}) => {
  await page.goto('/en/projects/');
  const fonts = await page.evaluate(() => ({
    card: getComputedStyle(document.querySelector('.project-card[data-brand="dhgt"] h3')!)
      .fontFamily,
    other: getComputedStyle(document.querySelector('.project-card:not([data-brand]) h3')!)
      .fontFamily,
    body: getComputedStyle(document.body).backgroundColor,
  }));
  expect(fonts.card).toMatch(/^Futura/);
  expect(fonts.other).not.toMatch(/Futura/);
  expect(fonts.body).not.toBe('rgb(11, 16, 38)');
  await expect(page.locator('[data-theme-toggle]')).toBeVisible();
});

test('the language menu keeps the place on the page and links out in English', async ({ page }) => {
  await page.goto('/dhgt/#about');
  await page.locator('[data-lang-menu] summary').click();
  await page.locator('a[data-lang-target="ar"]').click();
  await expect(page).toHaveURL(/\/ar\/dhgt\/#about$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#site-nav a.nav-fallback').first()).toHaveAttribute('href', '/en/');
  await page.goto('/fr/dhgt/');
  await page.locator('[data-lang-menu] summary').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-lang-menu]')).not.toHaveAttribute('open');
});
