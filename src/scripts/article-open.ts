import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from 'astro:transitions/client';

// Opening an article from a Writing list: a cover slides in from the right
// with a skeleton while ClientRouter loads the page; on the article the
// headline appears low and rises, the cover image is uncovered from its bottom
// edge, then meta and body fade in.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');

const PUSH = 'cubic-bezier(.32,.72,0,1)';
const OUT = 'cubic-bezier(.22,1,.36,1)';
// Milliseconds, estimated frame by frame from the reference recording.
const T = {
  enter: 380,
  radius: 380,
  skeleton: 200,
  typeDelay: 60,
  charStagger: 13,
  typeBudget: 560,
  charFade: 180,
  hold: 320,
  headline: 520,
  heroDelay: 70,
  hero: 640,
  metaDelay: 400,
  meta: 320,
  metaStagger: 60,
};
// The reference timing, stretched so each stage reads clearly (about 3.5s in all).
const PACE = 1.5;

interface Run {
  controller: AbortController;
  animations: Set<Animation>;
}

function cancelRun(run: Run) {
  run.controller.abort();
  run.animations.forEach((a) => a.cancel());
  run.animations.clear();
}

function play(
  run: Run,
  el: Element,
  frames: Keyframe[],
  { duration, delay = 0, easing = OUT }: { duration: number; delay?: number; easing?: string },
) {
  const a = el.animate(frames, {
    duration: duration * PACE,
    delay: delay * PACE,
    easing,
    fill: 'both',
  });
  run.animations.add(a);
  return a;
}

function abortable<T>(run: Run, promise: Promise<T>) {
  const { signal } = run.controller;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    promise.then(resolve, reject);
  });
}

function wait(run: Run, duration: number) {
  let id = 0;
  return abortable(
    run,
    new Promise<void>((resolve) => {
      id = window.setTimeout(resolve, duration * PACE);
    }),
  ).finally(() => clearTimeout(id));
}

const cssValue = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ==================== Cover and skeleton ====================
function cover(doc: Document, toc: boolean) {
  const layer = doc.createElement('div');
  layer.className = 'article-cover';
  layer.setAttribute('aria-hidden', 'true');
  const shell = doc.createElement('div');
  shell.className = toc ? 'article-shell' : 'article-shell article-shell-no-toc';
  const main = doc.createElement('div');
  main.className = 'article-skeleton-main';
  for (const kind of [
    'link',
    'title',
    'title',
    'line',
    'line sk-short',
    'meta',
    'cover',
    'line',
    'line',
    'line sk-short',
  ]) {
    const bar = doc.createElement('span');
    bar.className = 'sk sk-' + kind;
    main.append(bar);
  }
  shell.append(main);
  // An empty second column keeps the grid of articles that have a table of contents.
  if (toc) shell.append(doc.createElement('span'));
  layer.append(shell);
  return layer;
}

// ==================== Headline ====================
// Inline spans add no line-break opportunities, so the final wrapping holds
// while characters fade in. The plain title comes back once the entrance ends.
function splitTitle(h1: HTMLElement) {
  const text = h1.textContent ?? '';
  const segments =
    typeof Intl.Segmenter === 'function'
      ? Array.from(
          new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
          (s) => s.segment,
        )
      : Array.from(text);
  h1.dataset.articleTitle = text;
  h1.setAttribute('aria-label', text);
  h1.replaceChildren(
    ...segments.map((segment) => {
      const span = h1.ownerDocument.createElement('span');
      span.className = 'article-char';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = segment;
      return span;
    }),
  );
}

function restoreTitle(h1: HTMLElement | null) {
  if (!h1 || h1.dataset.articleTitle === undefined) return;
  h1.textContent = h1.dataset.articleTitle;
  delete h1.dataset.articleTitle;
  h1.removeAttribute('aria-label');
}

// ==================== Entrance ====================
let active: { run: Run; swapped: boolean } | undefined;

// Drops the cover and the pre-entrance state at once, wherever the run is.
function clear() {
  if (!active) return;
  cancelRun(active.run);
  active = undefined;
  document.querySelectorAll('.article-cover, .article-shade').forEach((el) => el.remove());
  delete document.documentElement.dataset.articleEnter;
  restoreTitle(document.querySelector<HTMLElement>('.article-header h1'));
}

async function enter(run: Run) {
  const main = document.querySelector<HTMLElement>('.article-main');
  const h1 = main?.querySelector<HTMLElement>('.article-header h1');
  const layer = document.querySelector<HTMLElement>('.article-cover');
  if (!main || !h1) {
    clear();
    return;
  }
  const header = main.querySelector<HTMLElement>('.article-header');
  const image = main.querySelector<HTMLImageElement>(':scope > img');
  const rest = [
    ...main.querySelectorAll<HTMLElement>(
      '.article-header .text-link, .article-summary, .article-header .post-meta, .article-content, .article-nav',
    ),
    ...document.querySelectorAll<HTMLElement>('.article-aside, .reading-progress'),
  ];
  try {
    if (layer)
      play(run, layer, [{ opacity: 1 }, { opacity: 0 }], {
        duration: T.skeleton,
        easing: 'ease-out',
      });

    // Content entrance waits for fonts and the decoded image, never for less than the skeleton fade.
    const decoded = image
      ? image.decode().then(
          () => true,
          () => false,
        )
      : Promise.resolve(false);
    const [, hasImage] = await Promise.all([
      wait(run, T.typeDelay),
      abortable(
        run,
        Promise.all([document.fonts.ready, decoded]).then(([, ok]) => ok),
      ),
    ]);

    const chars = [...h1.querySelectorAll<HTMLElement>('.article-char')].filter((c) =>
      c.textContent?.trim(),
    );
    const stagger = Math.min(T.charStagger, T.typeBudget / Math.max(1, chars.length));
    const typed = chars.map((char, i) =>
      play(run, char, [{ opacity: 0 }, { opacity: 1 }], {
        duration: T.charFade,
        delay: i * stagger,
        easing: 'linear',
      }),
    );
    if (typed.length) await abortable(run, typed[typed.length - 1].finished);
    await wait(run, T.hold);

    const entering = [
      play(
        run,
        h1,
        [
          { transform: `translateY(${cssValue('--article-enter-offset')})` },
          { transform: 'translateY(0)' },
        ],
        { duration: T.headline },
      ),
    ];
    let metaStart = T.headline * 0.45;
    if (image && hasImage && !image.hidden) {
      // The image keeps its final box; only clip-path and transform change, so nothing reflows.
      entering.push(
        play(
          run,
          image,
          [
            {
              clipPath: 'inset(100% 0 0 0)',
              transform: `translateY(${cssValue('--article-hero-offset')})`,
            },
            { clipPath: 'inset(0% 0 0 0)', transform: 'translateY(0)' },
          ],
          { duration: T.hero, delay: T.heroDelay },
        ),
      );
      metaStart = T.heroDelay + T.metaDelay;
    } else if (image) {
      rest.push(image);
    }
    if (header)
      entering.push(
        play(
          run,
          header,
          [{ borderBottomColor: 'transparent' }, { borderBottomColor: 'var(--line)' }],
          { duration: T.meta, delay: metaStart },
        ),
      );
    rest.forEach((el, i) =>
      entering.push(
        play(
          run,
          el,
          [
            { opacity: 0, translate: '0 10px' },
            { opacity: 1, translate: '0 0' },
          ],
          { duration: T.meta, delay: metaStart + i * T.metaStagger },
        ),
      ),
    );
    await abortable(run, Promise.all(entering.map((a) => a.finished)));
    // The base styles are the final state, so dropping the animations does not jump.
    if (active?.run === run) clear();
  } catch (error) {
    // An abort comes from clear(), which has already reset the page.
    if (!run.controller.signal.aborted) throw error;
  }
}

// ==================== Router hooks ====================
const isArticle = (path: string) => /^\/(en\/)?blog\/[^/]+\/?$/.test(path);

document.addEventListener('astro:before-preparation', (e) => {
  const event = e as TransitionBeforePreparationEvent;
  clear();
  const link = event.sourceElement?.closest('[data-article-link]');
  if (!link || reduce.matches || !isArticle(event.to.pathname)) return;

  const run: Run = { controller: new AbortController(), animations: new Set() };
  active = { run, swapped: false };
  const shade = document.createElement('div');
  shade.className = 'article-shade';
  const layer = cover(document, link.hasAttribute('data-article-toc'));
  document.body.append(shade, layer);

  const pushed = play(
    run,
    layer,
    [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }],
    { duration: T.enter, easing: PUSH },
  );
  // The corners stay round until the cover has nearly landed.
  play(
    run,
    layer,
    [{ borderRadius: cssValue('--article-enter-radius') }, { borderRadius: '0px' }],
    {
      duration: T.radius,
      easing: 'cubic-bezier(.7,0,.3,1)',
    },
  );
  play(run, shade, [{ opacity: 0 }, { opacity: 0.16 }], { duration: T.enter, easing: PUSH });
  const page = document.getElementById('main-content');
  if (page)
    play(run, page, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6%)' }], {
      duration: T.enter,
      easing: PUSH,
    });

  // Swap only once the cover has landed, so the skeleton is always seen whole.
  const load = event.loader;
  event.loader = async () => {
    await Promise.all([load(), pushed.finished.catch(() => {})]);
  };
  event.signal.addEventListener('abort', () => active?.run === run && clear(), { once: true });
});

document.addEventListener('astro:before-swap', (e) => {
  const event = e as TransitionBeforeSwapEvent;
  const next = event.newDocument;
  if (!active) {
    // Leaving an article for a list slides the article away to the right.
    if (isArticle(event.from.pathname) && !isArticle(event.to.pathname) && !reduce.matches)
      next.documentElement.dataset.motion = 'article-back';
    return;
  }
  const h1 = next.querySelector<HTMLElement>('.article-header h1');
  if (!h1) {
    clear();
    return;
  }
  // The new page starts in its pre-entrance state under an identical cover, so the swap is invisible.
  active.swapped = true;
  next.documentElement.dataset.articleEnter = '';
  next.documentElement.dataset.motion = 'article';
  splitTitle(h1);
  const layer = cover(next, !next.querySelector('.article-shell-no-toc'));
  layer.classList.add('article-cover-settled');
  next.body.append(layer);
});

document.addEventListener('astro:page-load', () => {
  if (active?.swapped) enter(active.run);
});
