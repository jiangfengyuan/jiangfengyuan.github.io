import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';

const posts = fs
  .readdirSync('src/content/posts')
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const source = fs.readFileSync('src/content/posts/' + name, 'utf8');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${name} has no frontmatter`);
    return { name, data: parse(frontmatter[1]) };
  });

const zh = posts.filter((p) => p.data.language !== 'en');
const en = posts.filter((p) => p.data.language === 'en');

test('every published Chinese article has a published English translation', () => {
  const publishedZh = zh.filter((p) => !p.data.draft);
  assert.ok(publishedZh.length > 0);
  for (const post of publishedZh) {
    const translation = en.find((candidate) => candidate.data.translationOf === post.data.id);
    assert.ok(translation, `${post.name} (${post.data.id}) has no English translationOf`);
    assert.equal(
      translation.data.draft,
      false,
      `${translation.name} translates ${post.data.id} but is still a draft`,
    );
  }
});

test('English translations reference existing Chinese originals and never chain', () => {
  const zhIds = new Set(zh.map((p) => p.data.id));
  for (const post of en) {
    assert.ok(
      zhIds.has(post.data.translationOf),
      `${post.name} translationOf ${post.data.translationOf} has no Chinese original`,
    );
  }
  for (const post of zh)
    assert.equal(post.data.translationOf, undefined, `${post.name} is Chinese but sets translationOf`);
});

test('Chinese and English published slugs cover the same articles', () => {
  const zhSlugs = zh
    .filter((p) => !p.data.draft)
    .map((p) => p.data.id)
    .sort();
  const enSlugs = en
    .filter((p) => !p.data.draft)
    .map((p) => p.data.translationOf)
    .sort();
  assert.deepEqual(enSlugs, zhSlugs);
});
