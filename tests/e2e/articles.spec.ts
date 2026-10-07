import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const ids = fs.readdirSync('src/content/posts').map((name) => name.replace(/\.md$/, ''));
test('nine articles reflow, maintain image proportions and theme contrast', async ({ page }) => {
  test.setTimeout(180_000);
  await page.route('https://mmbiz.qpic.cn/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="gray"/></svg>',
    }),
  );
  for (const id of ids) {
    await page.goto('/blog/' + id + '/');
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
      await page.waitForTimeout(250);
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await expect(page.locator('.article-content')).toHaveCSS(
          'font-size',
          width <= 600 ? '17px' : '18px',
        );
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          id + ' ' + width,
        ).toBe(true);
      }
      const results = await new AxeBuilder({ page })
        .include('.article-shell')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        id + ' ' + theme,
      ).toEqual([]);
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.evaluate(() => {
        const items = [
          ...document.querySelectorAll<HTMLElement>(
            '.article-main, .article-main *, .article-aside, .article-aside *',
          ),
        ];
        const sizes = items.map((el) => parseFloat(getComputedStyle(el).fontSize));
        items.forEach((el, i) => (el.style.fontSize = sizes[i] * 2 + 'px'));
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        id + ' zoom ' + width,
      ).toBe(true);
      await page.evaluate(() =>
        document
          .querySelectorAll<HTMLElement>(
            '.article-main, .article-main *, .article-aside, .article-aside *',
          )
          .forEach((el) => (el.style.fontSize = '')),
      );
    }
    for (const img of await page.locator('.article-content img').all()) {
      expect(
        await img.evaluate((i: HTMLImageElement) => {
          const bounds = i.getBoundingClientRect();
          return (
            !i.complete ||
            !i.naturalWidth ||
            Math.abs(bounds.width / bounds.height - i.naturalWidth / i.naturalHeight) < 0.01
          );
        }),
      ).toBe(true);
    }
  }
});
test('static directory anchors and source timestamps work without scripts', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();
  for (const id of ids) {
    await page.goto('http://127.0.0.1:4330/blog/' + id + '/');
    const headings = await page.locator('.article-content h2,.article-content h3').count();
    await expect(page.locator('.toc a')).toHaveCount(headings);
    if (!headings) await expect(page.locator('.article-aside')).toHaveCount(0);
    for (const a of await page.locator('.toc a').all()) {
      const href = await a.getAttribute('href');
      expect(await page.evaluate((hash) => !!document.getElementById(hash!.slice(1)), href)).toBe(
        true,
      );
    }
  }
  await page.goto('http://127.0.0.1:4330/blog/20261004-b45psV/');
  await expect(page.locator('.post-meta time')).toContainText('2026.10.04 20:45');
  await expect(page.locator('.post-meta time')).toContainText('新加坡时间');
  await context.close();
});

test('directory keyboard navigation and long content stay usable', async ({ page }) => {
  await page.goto('/blog/20260926-ukkgj5/');
  await page.locator('.toc a').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#section-1$/);
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.evaluate(() => {
      const article = document.querySelector('.article-content')!;
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'https://example.org/' + 'long-path'.repeat(40);
      const pre = document.createElement('pre');
      pre.textContent = 'const longLine = ' + 'value'.repeat(200);
      const table = document.createElement('table');
      const row = table.insertRow();
      for (let i = 0; i < 12; i++) row.insertCell().textContent = 'Table column ' + i;
      article.append(link, pre, table);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
});
