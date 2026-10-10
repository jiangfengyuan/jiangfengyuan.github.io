import { localized } from './i18n';
import { animate, animateResults } from './motion';

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
  let previousCount = -1;
  const tagSets = rows.map((row) => new Set<string>(JSON.parse(row.dataset.tags || '[]')));
  const chips = root.querySelector<HTMLElement>('.filter-chips');
  const indicator = document.createElement('span');
  indicator.className = 'filter-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  chips?.prepend(indicator);
  chips?.classList.add('enhanced-chips');
  let indicatorBox: DOMRect | undefined;
  function moveIndicator(effect = false) {
    const button = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    if (!button || !chips) return;
    indicator.getAnimations().forEach((a) => a.cancel());
    const box = button.getBoundingClientRect(),
      container = chips.getBoundingClientRect();
    const x = box.left - container.left,
      y = box.top - container.top;
    Object.assign(indicator.style, {
      width: box.width + 'px',
      height: box.height + 'px',
      left: x + 'px',
      top: y + 'px',
    });
    if (effect && indicatorBox)
      animate(
        indicator,
        Math.abs(indicatorBox.top - box.top) < 2
          ? [{ transform: `translateX(${indicatorBox.left - box.left}px)` }, { transform: 'none' }]
          : [{ opacity: 0 }, { opacity: 1 }],
        { duration: 220 },
      );
    indicatorBox = box;
  }
  const observer = new ResizeObserver(() => moveIndicator());
  if (chips) observer.observe(chips);
  signal.addEventListener('abort', () => {
    observer.disconnect();
    indicator.remove();
  });
  function run(write = false) {
    const q = (input?.value || '').trim().toLocaleLowerCase();
    let count = 0;
    rows.forEach((row, i) => {
      const match =
        kind === 'blog'
          ? (!q || (row.dataset.search || '').includes(q)) &&
            (selected === 'all' || tagSets[i].has(selected))
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
    if (empty) {
      empty.hidden = count !== 0;
      if (write && count === 0 && previousCount !== 0)
        animate(
          empty,
          [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 180 },
        );
    }
    previousCount = count;
    moveIndicator(write);
    if (write) animateResults(rows);
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
