const SELECTOR = [
  '.section',
  '.project-grid > *',
  '.post-row',
  '.update-row',
  '.feature',
  '.metric',
  '.qr-panel',
].join(', ');

let active: AbortController | undefined;

function init() {
  active?.abort();
  const { signal } = (active = new AbortController());
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => !el.closest('.home-hero'),
  );
  if (!targets.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        el.classList.add('is-revealed');
        el.addEventListener(
          'transitionend',
          () => {
            el.classList.remove('js-reveal', 'is-revealed');
            el.style.transitionDelay = '';
          },
          { once: true, signal },
        );
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  signal.addEventListener('abort', () => observer.disconnect());
  targets.forEach((el, i) => {
    el.classList.add('js-reveal');
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
    observer.observe(el);
  });
}

document.addEventListener('astro:page-load', init);
