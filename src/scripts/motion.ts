import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from 'astro:transitions/client';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set<Animation>();
let view: ViewTransition | undefined;
let revision = 0;
let navigating = false;
let named: HTMLElement[] = [];
let pendingUpdate: (() => void) | undefined;
export const motionAllowed = () => !reduce.matches && !navigating;
export function animate(el: Element, frames: Keyframe[], options: KeyframeAnimationOptions = {}) {
  if (!motionAllowed()) return undefined;
  const a = el.animate(frames, {
    duration: 240,
    easing: 'cubic-bezier(.22,.68,0,1.01)',
    ...options,
  });
  running.add(a);
  a.finished.catch(() => {}).finally(() => running.delete(a));
  return a;
}
function cancel() {
  const pending = pendingUpdate;
  pendingUpdate = undefined;
  pending?.();
  revision++;
  view?.skipTransition();
  view = undefined;
  running.forEach((a) => a.cancel());
  running.clear();
  named.forEach((el) => el.style.removeProperty('view-transition-name'));
  named = [];
  document.documentElement.classList.remove('theme-fade');
  delete document.documentElement.dataset.motion;
}
reduce.addEventListener('change', () => {
  if (reduce.matches) cancel();
  document.dispatchEvent(new Event('site:motion'));
});
function zones() {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '.nav-shell,.hero-copy,.page-hero,.section-heading,.project-info,.post-row-body,.article-header,.filter-bar,.about-mini',
    ),
  ]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    })
    .slice(0, 8);
}
export function changeView(kind: 'theme' | 'language', update: () => void, origin?: HTMLElement) {
  cancel();
  const serial = revision;
  const root = document.documentElement;
  const elements = kind === 'language' ? zones() : [];
  const oldRects = elements.map((el) => el.getBoundingClientRect());
  const fallback = () => {
    if (kind === 'theme') root.classList.add('theme-fade');
    update();
    if (kind === 'language')
      elements.forEach((el, i) => {
        const next = el.getBoundingClientRect();
        animate(el, [
          {
            opacity: 0.15,
            transform: `translateY(${Math.max(-24, Math.min(24, oldRects[i].top - next.top))}px)`,
          },
          { opacity: 1, transform: 'none' },
        ]);
        if (
          next.height < 500 &&
          Math.abs(oldRects[i].height - next.height) < 160 &&
          oldRects[i].height !== next.height
        )
          animate(el, [{ height: oldRects[i].height + 'px' }, { height: next.height + 'px' }]);
      });
    setTimeout(() => {
      if (serial === revision) root.classList.remove('theme-fade');
    }, 240);
  };
  root.classList.remove('theme-fade');
  if (!motionAllowed()) {
    update();
    return;
  }
  if (!document.startViewTransition) {
    fallback();
    return;
  }
  root.dataset.motion = kind;
  named = [...document.querySelectorAll<HTMLElement>('#main-content,.site-header')];
  named.forEach((el) => (el.style.viewTransitionName = 'none'));
  if (kind === 'language') {
    named.push(...elements);
    elements.forEach((el, i) => (el.style.viewTransitionName = 'language-' + i));
  }
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : innerHeight / 2;
  try {
    pendingUpdate = update;
    const current = document.startViewTransition(() => {
      if (serial === revision) {
        pendingUpdate = undefined;
        update();
      }
    });
    view = current;
    current.ready
      .then(() => {
        if (serial !== revision || !motionAllowed()) return;
        if (kind === 'theme') {
          const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
          animate(
            root,
            [
              { clipPath: `circle(0px at ${x}px ${y}px)` },
              { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
            ],
            { duration: 420, pseudoElement: '::view-transition-new(root)' },
          );
        }
      })
      .catch(() => {});
    current.finished
      .catch(() => {})
      .finally(() => {
        if (serial === revision) cancel();
      });
  } catch {
    cancel();
    fallback();
  }
}
export function panel(el: HTMLElement, open: boolean, complete: () => void = () => {}) {
  el.getAnimations().forEach((a) => {
    if (running.has(a)) a.cancel();
  });
  const a = animate(
    el,
    open
      ? [
          { opacity: 0, transform: 'translateY(-8px) scale(.98)' },
          { opacity: 1, transform: 'none' },
        ]
      : [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(-6px) scale(.98)' },
        ],
  );
  if (a) a.finished.catch(() => {}).then(complete);
  else complete();
  return a;
}
export function animateResults(rows: HTMLElement[]) {
  rows
    .filter((row) => !row.hidden && row.getBoundingClientRect().top < innerHeight)
    .slice(0, 6)
    .forEach((row, i) => {
      row.getAnimations().forEach((a) => a.cancel());
      animate(
        row,
        [
          { opacity: 0.15, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 200, delay: i * 24 },
      );
    });
}
let shared = '';
document.addEventListener('astro:before-preparation', (e) => {
  const event = e as TransitionBeforePreparationEvent;
  cancel();
  navigating = true;
  shared = '';
  document.documentElement.dataset.direction = event.direction;
  const link = event.sourceElement?.closest<HTMLElement>('[data-shared-link]');
  const key = link?.dataset.sharedLink;
  const image = link?.querySelector<HTMLElement>('img');
  if (key && image && !reduce.matches) {
    shared = key;
    image.style.viewTransitionName = 'project-visual';
  }
  event.signal.addEventListener(
    'abort',
    () => {
      navigating = false;
    },
    { once: true },
  );
});
document.addEventListener('astro:before-swap', (e) => {
  const event = e as TransitionBeforeSwapEvent;
  event.newDocument.documentElement.dataset.direction = event.direction;
  const key =
    shared || ['republica', 'dhgt'].find((id) => event.from.pathname === '/' + id + '/') || '';
  if (!key || reduce.matches) return;
  const oldImage = document.querySelector<HTMLImageElement>(`[data-shared-media="${key}"] img`);
  const nextImage = event.newDocument.querySelector<HTMLImageElement>(
    `[data-shared-media="${key}"] img, [data-shared-link="${key}"] img`,
  );
  if (nextImage) {
    nextImage.style.viewTransitionName = 'project-visual';
    if (!shared && oldImage) oldImage.style.viewTransitionName = 'project-visual';
  }
});
document.addEventListener('astro:page-load', () => {
  navigating = false;
  document
    .querySelectorAll<HTMLElement>('[style*="project-visual"]')
    .forEach((el) => el.style.removeProperty('view-transition-name'));
});
