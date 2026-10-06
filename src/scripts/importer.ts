import { marked } from 'marked';
import { sanitizeHTML, htmlToMarkdown, postFile } from './import-content';
import { localized } from './i18n';
const form = document.querySelector<HTMLFormElement>('[data-import-form]');
if (form) {
  const title = form.querySelector<HTMLInputElement>('[name="title"]')!;
  const date = form.querySelector<HTMLInputElement>('[name="date"]')!;
  const tag = form.querySelector<HTMLInputElement>('[name="tags"]')!;
  const summary = form.querySelector<HTMLTextAreaElement>('[name="summary"]')!;
  const draft = form.querySelector<HTMLInputElement>('[name="draft"]')!;
  const mode = form.querySelector<HTMLSelectElement>('[name="mode"]')!;
  const editor = form.querySelector<HTMLElement>('[data-rich-editor]')!;
  const markdown = form.querySelector<HTMLTextAreaElement>('[name="markdown"]')!;
  const preview = document.querySelector<HTMLElement>('[data-import-preview]')!;
  const message = document.querySelector<HTMLElement>('[data-import-message]')!;
  const output = document.querySelector<HTMLTextAreaElement>('[data-import-output]')!;
  const outputWrap = document.querySelector<HTMLElement>('[data-output-wrap]')!;
  const source = form.querySelector<HTMLTextAreaElement>('[name="htmlsource"]')!;
  let id = '';
  let generatedBody = '';
  date.value = new Date().toLocaleDateString('en-CA');
  const say = (zh: string, en: string) => {
    message.dataset.zh = zh;
    message.dataset.en = en;
    message.textContent = localized(zh, en);
  };
  document.addEventListener('site:language', () => {
    message.textContent = localized(message.dataset.zh || '', message.dataset.en || '');
  });
  const rich = () => mode.value === 'rich';
  function cleanAndTitle() {
    editor.innerHTML = sanitizeHTML(editor.innerHTML);
    if (!title.value) title.value = editor.querySelector('h2')?.textContent?.trim() || '';
  }
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain') || '';
    const content = html
      ? sanitizeHTML(html)
      : text
          .split('\n')
          .map((t) => {
            const p = document.createElement('p');
            p.textContent = t;
            return p.outerHTML;
          })
          .join('');
    editor.focus();
    const selection = getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const fragment = document.createRange().createContextualFragment(content);
    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      const last = fragment.lastChild;
      range.insertNode(fragment);
      if (last) {
        range.setStartAfter(last);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } else editor.append(fragment);
    cleanAndTitle();
  });
  mode.addEventListener('change', () => {
    if (!rich() && !markdown.value) markdown.value = htmlToMarkdown(editor.innerHTML);
    editor.hidden = !rich();
    markdown.hidden = rich();
  });
  document.querySelector('[data-load-html]')?.addEventListener('click', () => {
    editor.innerHTML = sanitizeHTML(source.value);
    mode.value = 'rich';
    editor.hidden = false;
    markdown.hidden = true;
    cleanAndTitle();
    source.value = '';
  });
  function body() {
    if (rich()) cleanAndTitle();
    return rich() ? htmlToMarkdown(editor.innerHTML) : markdown.value.trim();
  }
  function renderPreview() {
    const b = body();
    preview.innerHTML = sanitizeHTML(marked.parse(b, { async: false }));
    if (!b) say('请先粘贴或编写正文。', 'Paste or write some content first.');
    return b;
  }
  document.querySelector('[data-preview-button]')?.addEventListener('click', renderPreview);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const b = renderPreview();
    if (!title.value.trim() || !b) {
      say('请填写标题和正文。', 'A title and body are required.');
      (!title.value ? title : rich() ? editor : markdown).focus();
      return;
    }
    if (!id) id = date.value.replaceAll('-', '') + '-' + crypto.randomUUID().slice(0, 8);
    generatedBody = b;
    const meta = {
      id,
      title: title.value.trim(),
      date: date.value,
      tags: tag.value
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      summary: summary.value.trim() || preview.textContent?.trim().slice(0, 90) || '',
      language: form.querySelector<HTMLSelectElement>('[name="language"]')!.value as 'zh' | 'en',
      draft: draft.checked,
    };
    output.value = postFile(meta, b);
    outputWrap.hidden = false;
    const url = URL.createObjectURL(
      new Blob([output.value], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = id + '.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say(
      '已导出文章。上传到 src/content/posts/，或复制正文到 CMS。',
      'Article exported. Upload to src/content/posts/, or copy the body to the CMS.',
    );
  });
  document.querySelector('[data-copy-body]')?.addEventListener('click', async () => {
    const b = generatedBody || body();
    try {
      await navigator.clipboard.writeText(b);
      say(
        '正文已复制。请在 CMS 源码模式中粘贴，并填写元数据。',
        'Body copied. Paste into CMS Source mode and fill in the metadata.',
      );
    } catch {
      output.value = b;
      outputWrap.hidden = false;
      output.select();
      say('请复制下方选中的正文。', 'Copy the selected body below.');
    }
  });
  document.querySelector('[data-reset-import]')?.addEventListener('click', () => {
    form.reset();
    date.value = new Date().toLocaleDateString('en-CA');
    editor.replaceChildren();
    preview.replaceChildren();
    markdown.hidden = true;
    editor.hidden = false;
    outputWrap.hidden = true;
    id = '';
    generatedBody = '';
    say('已开始新文章。', 'Ready for a new article.');
  });
}
