import { test, expect, type Page } from '@playwright/test';

// Opening an article from a Writing list (src/scripts/article-open.ts).
const withCover = '20261017-SGGP26';
const withoutCover = '20260926-ukkgj5';

const entering = (page: Page) =>
  page.evaluate(() => document.documentElement.hasAttribute('data-article-enter'));

// Nothing from the entrance may outlive it.
async function expectSettled(page: Page, title: string) {
  await expect.poll(() => entering(page), { timeout: 10_000 }).toBe(false);
  await expect(page.locator('.article-cover, .article-shade')).toHaveCount(0);
  const h1 = page.locator('.article-header h1');
  await expect(h1).toHaveText(title);
  await expect(h1).not.toHaveAttribute('aria-label');
  await expect(h1.locator('.article-char')).toHaveCount(0);
  await expect(page.locator('.article-content')).toHaveCSS('opacity', '1');
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) =>
            (a.effect as KeyframeEffect | null)?.target?.closest('.article-main, .article-cover'),
          ).length,
    ),
  ).toBe(0);
}

test('opening an article plays the staged entrance and leaves the page clean', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/blog/');
  const link = page.locator(`.post-row h3 a[href*="${withCover}"]`);
  const title = (await link.textContent())!.trim();
  await link.click();

  // The cover slides in over the list before the article replaces it.
  await expect(page.locator('.article-cover')).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`/blog/${withCover}/$`));
  await expect.poll(() => entering(page)).toBe(true);
  await expect(page.locator('.article-header h1')).toHaveAttribute('aria-label', title);
  // The cover image is uncovered by its own animation once the headline has risen.
  await expect
    .poll(() =>
      page.evaluate(() =>
        document
          .getAnimations()
          .some((a) => (a.effect as KeyframeEffect | null)?.target?.matches('.article-main > img')),
      ),
    )
    .toBe(true);
  await expectSettled(page, title);

  // Only one history entry, even though the click opened a layer first.
  await page.goBack();
  await expect(page).toHaveURL(/\/blog\/$/);
  expect(errors).toEqual([]);
});

test('going back mid-entrance cancels it, and it replays afterwards', async ({ page }) => {
  await page.goto('/en/blog/');
  const link = page.locator(`.post-row h3 a[href*="${withoutCover}"]`);
  const title = (await link.textContent())!.trim();
  await link.click();
  await expect.poll(() => entering(page)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/blog\/$/);
  await expect(page.locator('.article-cover, .article-shade')).toHaveCount(0);
  expect(await entering(page)).toBe(false);

  await link.click();
  await expect(page).toHaveURL(new RegExp(`/en/blog/${withoutCover}/$`));
  await expectSettled(page, title);
});

test('the cover blocks further clicks on the list while it slides in', async ({ page }) => {
  await page.goto('/blog/');
  const link = page.locator(`.post-row h3 a[href*="${withCover}"]`);
  const box = (await link.boundingBox())!;
  await link.click();
  await page.mouse.click(box.x + 10, box.y + box.height / 2);
  await page.mouse.click(box.x + 10, box.y + box.height / 2);
  await expect(page.locator('.article-cover')).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`/blog/${withCover}/$`));
  await expectSettled(page, (await page.locator('.article-header h1').textContent())!.trim());
});

test('reduced motion opens the article in its final state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const link = page.locator('.post-row h3 a[data-article-link]').first();
  const title = (await link.textContent())!.trim();
  await link.click();
  await expect(page).toHaveURL(/\/blog\/[^/]+\/$/);
  expect(await entering(page)).toBe(false);
  await expect(page.locator('.article-cover')).toHaveCount(0);
  await expect(page.locator('.article-header h1')).toHaveText(title);
  await expect(page.locator('.article-content')).toHaveCSS('opacity', '1');
});
