// TEMPORARY: measures where Linux WebKit stalls on the way to /blog/. Remove with the fix.
// These tests never fail; they print DIAG lines for the CI log.
import { test, type Page } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'webkit');

const instrument = (page: Page, css = '', noViewTransition = false) =>
  page.evaluate(
    ([css, noViewTransition]) => {
      const start = performance.now();
      const marks: string[] = [];
      const mark = (name: string) => marks.push(`${name}@${Math.round(performance.now() - start)}`);
      (window as any).__marks = marks;
      (window as any).__mark = mark;
      if (css) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css as string);
        document.adoptedStyleSheets = [sheet];
      }
      for (const name of [
        'astro:before-preparation',
        'astro:after-preparation',
        'astro:before-swap',
        'astro:after-swap',
        'astro:page-load',
      ])
        document.addEventListener(name, () => mark(name.slice(6)));
      window.addEventListener('error', (e) => mark('error:' + e.message.slice(0, 80)));
      window.addEventListener('unhandledrejection', (e) =>
        mark('rejection:' + String(e.reason).slice(0, 80)),
      );
      const original = (document as any).startViewTransition?.bind(document);
      if (!original) return mark('no-view-transition-api');
      (document as any).startViewTransition = (arg: any) => {
        mark('vt-start');
        const wrap = (update: () => unknown) => async () => {
          mark('vt-callback');
          await update();
          mark('vt-callback-done');
        };
        const view = original(
          typeof arg === 'function' ? wrap(arg) : { ...arg, update: wrap(arg.update) },
        );
        // ClientRouter caches API support at load, so skip the transition rather than remove the API.
        if (noViewTransition) view.skipTransition();
        view.ready.then(
          () => mark('vt-ready'),
          () => mark('vt-ready-rejected'),
        );
        view.finished.then(() => mark('vt-finished'));
        return view;
      };
    },
    [css, noViewTransition] as const,
  );

async function report(page: Page, name: string, started: number, pattern: RegExp) {
  let result = 'url-ok';
  try {
    await page.waitForURL(pattern, { timeout: 30_000, waitUntil: 'commit' });
  } catch {
    result = 'url-TIMEOUT';
  }
  const elapsed = Date.now() - started;
  await page.waitForTimeout(500);
  const marks = await page
    .evaluate(() => (window as any).__marks as string[])
    .catch((e) => ['evaluate-failed ' + String(e).slice(0, 60)]);
  console.log(`DIAG ${name} ${result} ${elapsed}ms ${page.url()} ${marks.join(' ')}`);
}

async function viaMenu(
  page: Page,
  name: string,
  { width = 1440, height = 1000, id = 'blog', css = '', noViewTransition = false } = {},
) {
  page.on('crash', () => console.log(`DIAG ${name} CRASH`));
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await instrument(page, css, noViewTransition);
  await page.locator(`[data-nav-trigger="${id}"]`).focus();
  await page.keyboard.press('Enter');
  const started = Date.now();
  await page.locator(`#nav-panel-${id} a[href="/${id}/"]`).click();
  await report(page, name, started, new RegExp(`/${id}/$`));
}

const noBlur = '*{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}';
const noWrap = '*{text-wrap:wrap !important}';

test.describe(() => {
  test.setTimeout(60_000);
  test('blog 1440', ({ page }) => viaMenu(page, 'blog-1440'));
  test('blog 1280', ({ page }) => viaMenu(page, 'blog-1280', { width: 1280, height: 720 }));
  test('about 1440', ({ page }) => viaMenu(page, 'about-1440', { id: 'about' }));
  test('updates 1440', ({ page }) => viaMenu(page, 'updates-1440', { id: 'updates' }));
  test('blog no blur', ({ page }) => viaMenu(page, 'blog-noblur', { css: noBlur }));
  test('blog no text-wrap', ({ page }) => viaMenu(page, 'blog-nowrap', { css: noWrap }));
  test('blog no view transition', ({ page }) =>
    viaMenu(page, 'blog-novt', { noViewTransition: true }));

  // The failing test's own steps, in case the earlier interactions matter.
  test('full sequence', async ({ page }) => {
    page.on('crash', () => console.log('DIAG full CRASH'));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await instrument(page);
    const begun = Date.now();
    await page.locator('[data-nav-trigger="projects"]').hover();
    await page.locator('#nav-panel-projects a[href="/flash/"]').hover();
    for (const id of ['blog', 'about', 'updates', 'projects'])
      await page.locator(`[data-nav-trigger="${id}"]`).hover();
    await page.locator('[data-nav-trigger="projects"]').click();
    await page.locator('[data-nav-trigger="about"]').click();
    await page.locator('[data-nav-trigger="blog"]').hover();
    await page.mouse.move(50, 800);
    await page.locator('[data-nav-trigger="blog"]').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    console.log(`DIAG full setup ${Date.now() - begun}ms`);
    const started = Date.now();
    await page.locator('#nav-panel-blog a[href="/blog/"]').click();
    await report(page, 'full', started, /\/blog\/$/);
  });
});
