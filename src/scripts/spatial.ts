import { animate, motionAllowed } from './motion';
interface Segment {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function initSpatial(signal: AbortSignal) {
  const root = document.documentElement;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let geometryFrame = 0;
  const set = (key: string, value: string) => {
    if (root.style.getPropertyValue(key) !== value) root.style.setProperty(key, value);
  };
  function geometry() {
    set('--usable-height', (window.visualViewport?.height || innerHeight) + 'px');
    set('--visual-top', (window.visualViewport?.offsetTop || 0) + 'px');
    const viewport = window as Window & { viewport?: { segments?: Segment[] } };
    const segments = viewport.viewport?.segments;
    let lane: Segment | undefined;
    // A seamless unfolded panel needs ordinary responsive layout. Reserve lanes only for physical gaps.
    if (segments && segments.length > 1) {
      const sorted = [...segments].sort((a, b) => a.x - b.x || a.y - b.y);
      const gap = sorted.some(
        (s, i) =>
          i &&
          (s.x > sorted[i - 1].x + sorted[i - 1].width + 1 ||
            s.y > sorted[i - 1].y + sorted[i - 1].height + 1),
      );
      if (gap) lane = [...segments].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    }
    if (root.hasAttribute('data-segmented') !== !!lane)
      root.toggleAttribute('data-segmented', !!lane);
    set('--segment-left', (lane?.x || 0) + 'px');
    set('--segment-width', (lane?.width || innerWidth) + 'px');
    set('--segment-top', (lane?.y || 0) + 'px');
    set('--segment-height', (lane?.height || innerHeight) + 'px');
    const compact = String((lane?.width || innerWidth) <= 760);
    if (root.dataset.compactNav !== compact) {
      root.dataset.compactNav = compact;
      document.dispatchEvent(new Event('site:viewport'));
    }
  }
  geometry();
  const queueGeometry = () => {
    if (!geometryFrame)
      geometryFrame = requestAnimationFrame(() => {
        geometryFrame = 0;
        geometry();
      });
  };
  addEventListener('resize', queueGeometry, { passive: true, signal });
  window.visualViewport?.addEventListener('resize', queueGeometry, { passive: true, signal });
  window.visualViewport?.addEventListener('scroll', queueGeometry, { passive: true, signal });
  signal.addEventListener('abort', () => cancelAnimationFrame(geometryFrame));
  const tilted = [...document.querySelectorAll<HTMLElement>('[data-tilt]')];
  const reset = (el: HTMLElement) => {
    el.style.removeProperty('--tilt-x');
    el.style.removeProperty('--tilt-y');
    el.style.removeProperty('--glow-x');
    el.style.removeProperty('--glow-y');
  };
  tilted.forEach((el) => {
    let frame = 0;
    let bounds: DOMRect | undefined;
    el.addEventListener(
      'pointerenter',
      () => {
        bounds = el.getBoundingClientRect();
      },
      { signal },
    );
    addEventListener(
      'resize',
      () => {
        bounds = undefined;
      },
      { passive: true, signal },
    );
    el.addEventListener(
      'pointermove',
      (e) => {
        if (!fine.matches || !motionAllowed() || e.pointerType === 'touch' || frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const b = bounds || (bounds = el.getBoundingClientRect());
          const x = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width));
          const y = Math.max(0, Math.min(1, (e.clientY - b.top) / b.height));
          el.style.setProperty('--tilt-x', 1.5 - y * 3 + 'deg');
          el.style.setProperty('--tilt-y', x * 3 - 1.5 + 'deg');
          el.style.setProperty('--glow-x', (x - 0.5) * 16 + 'px');
          el.style.setProperty('--glow-y', (y - 0.5) * 16 + 'px');
        });
      },
      { signal },
    );
    const leave = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      bounds = undefined;
      reset(el);
    };
    el.addEventListener('pointerleave', leave, { signal });
    el.addEventListener('pointercancel', leave, { signal });
    signal.addEventListener('abort', () => {
      cancelAnimationFrame(frame);
      reset(el);
    });
  });
  document.addEventListener('site:motion', () => tilted.forEach(reset), { signal });
  const observed = [
    ...document.querySelectorAll<HTMLElement>(
      '.section-heading,.project-card,.feature,.platform-card,.update-row,.club-visual,.metric,.qr-panel',
    ),
  ];
  const entering = new Map<Element, Animation>();
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const current = entering.get(entry.target);
        if (!entry.isIntersecting) {
          current?.pause();
          return;
        }
        if (current) {
          current.play();
          return;
        }
        const i = observed.indexOf(entry.target as HTMLElement);
        const a = animate(
          entry.target,
          [
            { opacity: 0.1, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 400, delay: Math.min(200, (i % 6) * 40) },
        );
        if (a) {
          entering.set(entry.target, a);
          a.finished
            .catch(() => {})
            .finally(() => {
              entering.delete(entry.target);
              observer.unobserve(entry.target);
            });
        } else observer.unobserve(entry.target);
      }),
    { threshold: 0.08 },
  );
  observed.forEach((el) => {
    if (el.getBoundingClientRect().top > innerHeight) observer.observe(el);
  });
  signal.addEventListener('abort', () => {
    observer.disconnect();
    entering.forEach((a) => a.cancel());
    entering.clear();
  });
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element)?.closest<HTMLElement>(
        '.btn,.icon-button,.filter-chips button,.text-link',
      );
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      animate(el, [{ scale: '.97' }, { scale: '1' }], { duration: 160 });
      if (el.matches('.btn,.icon-button,.filter-chips button')) {
        const ripple = document.createElement('span');
        ripple.className = 'control-glow';
        ripple.setAttribute('aria-hidden', 'true');
        el.append(ripple);
        const a = animate(
          ripple,
          [
            { opacity: 0.5, transform: 'scale(.4)' },
            { opacity: 0, transform: 'scale(1.5)' },
          ],
          { duration: 300 },
        );
        if (a) a.finished.catch(() => {}).then(() => ripple.remove());
        else ripple.remove();
      }
    },
    { signal },
  );
}
