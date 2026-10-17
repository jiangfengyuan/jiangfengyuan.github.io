import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parse } from 'yaml';
import { sanitizeHTML, htmlToMarkdown, postFile, safeURL } from '../src/scripts/import-content.ts';
globalThis.DOMParser = new JSDOM('').window.DOMParser;
test('pasted article drops executable and hidden content, including obfuscated URLs', () => {
  const html = sanitizeHTML(
    '<script>alert(1)</script><iframe src="https://example.org"></iframe><p style="display:none">hidden</p><a href="java&#x09;script:alert(1)" onclick="bad()">link</a><img data-src="https://example.org/a.jpg" onerror="bad()" alt="photo"><img src="data:image/svg+xml;base64,abcd"><h1>heading</h1>',
  );
  const d = new JSDOM(html).window.document;
  assert.equal(d.querySelectorAll('script,iframe,[onclick],[onerror],h1').length, 0);
  assert.equal(d.querySelector('a').getAttribute('href'), null);
  assert.equal(d.querySelectorAll('img').length, 1);
  assert.equal(d.querySelector('img').src, 'https://example.org/a.jpg');
  assert.equal(d.querySelector('h2').textContent, 'heading');
  assert.ok(!d.body.textContent.includes('hidden'));
  assert.equal(safeURL('javascript:alert(1)'), null);
});
test('import keeps a table, caption, list and code semantics', () => {
  const md = htmlToMarkdown(
    '<h2>Notes</h2><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table><figure><img src="/a.png" alt="A"><figcaption>Caption</figcaption></figure><ul><li>Item</li></ul><pre><code>const a = 1;</code></pre>',
  );
  assert.match(md, /## Notes/);
  assert.match(md, /\| A \| B \|/);
  assert.match(md, /<figcaption>Caption<\/figcaption>/);
  assert.match(md, /-\s+Item/);
  assert.match(md, /```/);
});
test('frontmatter safely round-trips punctuation, dates and draft state', () => {
  const meta = {
    id: 'sample-id',
    title: 'A: "title"\nsecond line',
    date: '2026-10-06',
    tags: ['a', 'b'],
    summary: '---\ntext',
    language: 'zh',
    draft: true,
  };
  const file = postFile(meta, '## Body');
  const head = file.match(/^---\n([\s\S]*?)^---\n/m)[1];
  assert.deepEqual(parse(head), meta);
  assert.ok(file.endsWith('## Body\n'));
});

test('Markdown pipeline preserves figures and theme-aware highlighting after sanitizing', async () => {
  const { default: config } = await import('../astro.config.mjs');
  const renderer = await config.markdown.processor.createRenderer(config.markdown);
  const result = await renderer.render(
    '## Section\n\n```ts\nconst answer = 42;\n```\n\n<figure><img src="/a.png" alt="A"><figcaption>Caption</figcaption></figure>\n\n<script>alert(1)</script>',
  );
  assert.match(result.code, /<figcaption>Caption<\/figcaption>/);
  assert.match(result.code, /--shiki-dark/);
  assert.ok(!result.code.includes('<script>'));
  assert.equal(result.metadata.headings.length, 1);
});

test('editorial roles are allowlisted and raw HTML sections have static unique anchors', async () => {
  const { default: config } = await import('../astro.config.mjs');
  const renderer = await config.markdown.processor.createRenderer(config.markdown);
  const result = await renderer.render(
    '<p class="article-lead injected" style="color:red" onclick="bad()">Intro</p><h2 class="article-centered article-blue">Section</h2><h2>Section</h2><div class="article-credits"><p>Credit</p></div><strong class="article-warm">Emphasis</strong>',
  );
  const doc = new JSDOM(result.code).window.document;
  assert.equal(doc.querySelector('p').className, 'article-lead');
  assert.equal(doc.querySelectorAll('[style],[onclick],.injected').length, 0);
  assert.equal(doc.querySelector('h2').className, 'article-centered article-blue');
  assert.ok(doc.querySelector('.article-credits'));
  assert.ok(doc.querySelector('strong.article-warm'));
  assert.equal(result.metadata.headings.length, 2);
  assert.deepEqual(
    result.metadata.headings.map((h) => h.slug),
    ['section-1', 'section-2'],
  );
  for (const h of result.metadata.headings)
    assert.equal(doc.getElementById(h.slug).textContent, h.text);
});

test('Markdown pipeline strips dangerous link protocols, obfuscated URLs and executable tags', async () => {
  const { default: config } = await import('../astro.config.mjs');
  const renderer = await config.markdown.processor.createRenderer(config.markdown);
  const result = await renderer.render(
    '[xss](javascript:alert(1))\n' +
      '[obf](java&#x09;script:alert(1))\n' +
      '<a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;">data link</a>\n' +
      '![x](javascript:alert(1))\n' +
      '<script>alert(1)</script>\n' +
      '<iframe src="https://example.org"></iframe>\n' +
      '<img src="data:image/svg+xml;base64,abcd" onerror="alert(1)">\n' +
      '<p onclick="alert(1)">click</p>',
  );
  const doc = new JSDOM(result.code).window.document;
  assert.equal(doc.querySelectorAll('script, iframe').length, 0);
  assert.equal(doc.querySelectorAll('[onclick], [onerror]').length, 0);
  const html = result.code.toLowerCase();
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('data:text/html'));
  const links = [...doc.querySelectorAll('a')];
  assert.ok(
    links.every((a) => {
      const href = a.getAttribute('href');
      return !href || !/javascript/i.test(href);
    }),
  );
  const images = [...doc.querySelectorAll('img')];
  assert.ok(
    images.every((img) => {
      const src = img.getAttribute('src');
      return !src || !/javascript/i.test(src);
    }),
  );
});

test('remote article images never send a referrer', async () => {
  const { default: config } = await import('../astro.config.mjs');
  const renderer = await config.markdown.processor.createRenderer(config.markdown);
  const result = await renderer.render(
    '![a](https://mmbiz.qpic.cn/x/640)\n\n<img src="https://example.org/b.jpg" alt="b">\n\n![c](/assets/c.png)',
  );
  const imgs = [...new JSDOM(result.code).window.document.querySelectorAll('img')];
  assert.deepEqual(
    imgs.map((i) => i.getAttribute('referrerpolicy')),
    ['no-referrer', 'no-referrer', null],
  );
});
