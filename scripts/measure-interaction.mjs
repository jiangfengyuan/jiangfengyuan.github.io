import { chromium } from 'playwright';
import fs from 'node:fs';
// Both URLs must serve equivalent locally built assets. No network throttling is used.
const baseline = process.env.BASELINE_URL || 'http://127.0.0.1:4331';
const current = process.env.CURRENT_URL || 'http://127.0.0.1:4330';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];
const metrics = async (cdp) =>
  Object.fromEntries(
    (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]),
  );
const delta = (a, b) =>
  Object.fromEntries(
    [
      'TaskDuration',
      'ScriptDuration',
      'LayoutDuration',
      'RecalcStyleDuration',
      'LayoutCount',
      'RecalcStyleCount',
    ].map((k) => [k, (b[k] - a[k]) * (k.endsWith('Duration') ? 1000 : 1)]),
  );
try {
  for (const route of ['/', '/blog/20260926-ukkgj5/']) {
    const samples = { baseline: [], current: [] };
    for (let i = 0; i < 5; i++)
      for (const version of i % 2 ? ['current', 'baseline'] : ['baseline', 'current']) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 2,
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Performance.enable');
        await page.route('https://mmbiz.qpic.cn/**', (r) =>
          r.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="gray"/></svg>',
          }),
        );
        await page.goto((version === 'baseline' ? baseline : current) + route, {
          waitUntil: 'load',
        });
        await page.waitForTimeout(800);
        const phases = {};
        if (route === '/') {
          let a = await metrics(cdp);
          await page.evaluate(async () => {
            for (let n = 0; n < 8; n++) {
              document.querySelector('[data-lang-toggle]').click();
              await new Promise((r) => setTimeout(r, 320));
            }
          });
          await page.waitForTimeout(350);
          phases.language = delta(a, await metrics(cdp));
          a = await metrics(cdp);
          const viewportEvents = await page.evaluate(async () => {
            let count = 0;
            const track = () => count++;
            document.addEventListener('site:viewport', track);
            for (let i = 0; i < 60; i++) window.visualViewport?.dispatchEvent(new Event('scroll'));
            await new Promise((r) => setTimeout(r, 300));
            document.removeEventListener('site:viewport', track);
            return count;
          });
          phases.viewport = { ...delta(a, await metrics(cdp)), notifications: viewportEvents };
          a = await metrics(cdp);
          await page.evaluate(async () => {
            const el = document.querySelector('[data-tilt]');
            const box = el.getBoundingClientRect();
            el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
            for (let i = 0; i < 40; i++) {
              el.dispatchEvent(
                new PointerEvent('pointermove', {
                  pointerType: 'mouse',
                  clientX: box.left + (box.width * (i % 10)) / 10,
                  clientY: box.top + box.height * 0.4,
                }),
              );
              await new Promise(requestAnimationFrame);
            }
            el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
          });
          await page.waitForTimeout(300);
          phases.pointer = delta(a, await metrics(cdp));
        } else {
          let a = await metrics(cdp);
          await page.evaluate(async () => {
            for (let i = 0; i < 60; i++) {
              scrollBy({ top: 150, behavior: 'instant' });
              await new Promise(requestAnimationFrame);
            }
          });
          await page.waitForTimeout(250);
          phases.scroll = delta(a, await metrics(cdp));
        }
        samples[version].push(phases);
        await context.close();
      }
    const median = (list) => [...list].sort((a, b) => a - b)[2];
    const summary = {};
    for (const version of ['baseline', 'current'])
      summary[version] = Object.fromEntries(
        Object.keys(samples[version][0]).map((phase) => [
          phase,
          Object.fromEntries(
            Object.keys(samples[version][0][phase]).map((k) => [
              k,
              median(samples[version].map((s) => s[phase][k])),
            ]),
          ),
        ]),
      );
    const row = { route, ...summary, samples };
    rows.push(row);
    console.log(JSON.stringify({ route, ...summary }));
    fs.writeFileSync(
      process.env.RESULT_PATH || '/private/tmp/hayden-oct10-interaction.json',
      JSON.stringify(
        {
          environment:
            'Chrome headless, local fixed assets, remote article images replaced equally; 1440x900 DPR2, CPU4x, five alternating fresh contexts; no network throttle',
          rows,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}
