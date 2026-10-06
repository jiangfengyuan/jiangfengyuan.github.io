import { localized } from './i18n';

let active: AbortController | undefined;

function init() {
  active?.abort();
  const { signal } = (active = new AbortController());
  const blog = document.querySelector<HTMLElement>('[data-blog-filter]');
  const update = document.querySelector<HTMLElement>('[data-update-filter]');
  if (blog) setup(blog, 'blog', signal);
  if (update) setup(update, 'update', signal);
}

function setup(root: HTMLElement, kind: 'blog' | 'update', signal: AbortSignal) {
  const rows = [
    ...root.querySelectorAll<HTMLElement>(kind === 'blog' ? '[data-post]' : '[data-update]'),
  ];
  const input = root.querySelector<HTMLInputElement>('[data-search-input]');
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>(
      kind === 'blog' ? '[data-filter-tag]' : '[data-filter-project]',
    ),
  ];
  const status = root.querySelector<HTMLElement>('[data-result-count]');
  const empty = root.querySelector<HTMLElement>('[data-filter-empty]');
  let selected = 'all';
  function run(write = false) {
    const q = (input?.value || '').trim().toLocaleLowerCase();
    let count = 0;
    rows.forEach((row) => {
      const match =
        kind === 'blog'
          ? (!q || (row.dataset.search || '').includes(q)) &&
            (selected === 'all' || JSON.parse(row.dataset.tags || '[]').includes(selected))
          : selected === 'all' || row.dataset.project === selected;
      row.hidden = !match;
      if (match) count++;
    });
    buttons.forEach((b) =>
      b.setAttribute(
        'aria-pressed',
        String((b.dataset.filterTag || b.dataset.filterProject) === selected),
      ),
    );
    if (status)
      status.textContent = localized(
        `${count} ${kind === 'blog' ? '篇文章' : '条记录'}`,
        `${count} ${kind === 'blog' ? 'articles' : 'updates'}`,
      );
    if (empty) empty.hidden = count !== 0;
    if (write) {
      const url = new URL(location.href);
      const key = kind === 'blog' ? 'tag' : 'project';
      if (selected === 'all') url.searchParams.delete(key);
      else url.searchParams.set(key, selected);
      if (q) url.searchParams.set('q', input!.value);
      else url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
    }
  }
  function read() {
    const params = new URLSearchParams(location.search);
    const candidate = params.get(kind === 'blog' ? 'tag' : 'project') || 'all';
    selected = buttons.some((b) => (b.dataset.filterTag || b.dataset.filterProject) === candidate)
      ? candidate
      : 'all';
    if (input) input.value = params.get('q') || '';
    run();
  }
  buttons.forEach((b) =>
    b.addEventListener(
      'click',
      () => {
        selected = b.dataset.filterTag || b.dataset.filterProject || 'all';
        run(true);
      },
      { signal },
    ),
  );
  input?.addEventListener('input', () => run(true), { signal });
  window.addEventListener('popstate', read, { signal });
  document.addEventListener('site:language', () => run(), { signal });
  read();
}
document.addEventListener('astro:page-load', init);
