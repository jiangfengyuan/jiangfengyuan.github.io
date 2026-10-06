import { localized } from './i18n';
const content = document.querySelector<HTMLElement>('[data-article-content]');
const progress = document.querySelector<HTMLElement>('[data-reading-progress]');
const article = document.querySelector<HTMLElement>('.article-main');
if (content && article) {
  // Raw HTML imports may have headings not present in Astro's Markdown heading list.
  const headings = [...content.querySelectorAll<HTMLHeadingElement>('h2,h3')];
  const used = new Set<string>();
  headings.forEach((h, i) => {
    let id = h.id || 'section-' + (i + 1);
    if (used.has(id)) id += '-' + (i + 1);
    h.id = id;
    used.add(id);
  });
  const toc = document.querySelector<HTMLElement>('.toc');
  if (toc && headings.length) {
    toc.replaceChildren();
    headings.forEach((h) => {
      const li = document.createElement('li');
      li.className = h.tagName === 'H3' ? 'depth-3' : 'depth-2';
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent =
        (h.textContent || '').length > 50 ? h.textContent!.slice(0, 50) + '…' : h.textContent;
      li.append(a);
      toc.append(li);
    });
    const aside = document.querySelector<HTMLElement>('[data-article-aside]');
    if (aside) aside.hidden = false;
  }
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
  let pending = false;
  function update() {
    pending = false;
    if (!article) return;
    const box = article.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (120 - box.top) / Math.max(1, box.height - window.innerHeight + 120)),
    );
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    let current = headings[0];
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= 155) current = h;
      else break;
    }
    links.forEach((a) => {
      if (current && a.hash === '#' + current.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  function queue() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  content.querySelectorAll('img').forEach((i) => i.addEventListener('load', queue));
  queue();
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  const large = document.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const caption = document.querySelector<HTMLElement>('[data-lightbox-caption]');
  let opener: HTMLImageElement | null = null;
  content.querySelectorAll<HTMLImageElement>('img').forEach((img, i) => {
    if (!img.alt) img.alt = localized('文章配图 ' + (i + 1), 'Article image ' + (i + 1));
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    const label = () =>
      img.setAttribute('aria-label', localized('放大图片：', 'Enlarge image: ') + img.alt);
    label();
    document.addEventListener('site:language', label);
    function open(e: Event) {
      if (!dialog || !large || img.dataset.failed) return;
      e.preventDefault();
      opener = img;
      large.src = img.currentSrc || img.src;
      large.alt = img.alt;
      if (caption)
        caption.textContent =
          img.closest('figure')?.querySelector('figcaption')?.textContent || img.alt;
      dialog.showModal();
    }
    img.addEventListener('click', open);
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') open(e);
    });
  });
  dialog?.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const b = dialog.getBoundingClientRect();
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)
        dialog.close();
    }
  });
  dialog?.addEventListener('close', () => opener?.focus());
}
