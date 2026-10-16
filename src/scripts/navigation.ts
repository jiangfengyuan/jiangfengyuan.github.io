import { localized } from './i18n';
import { animate, motionAllowed } from './motion';

export function initNavigation(signal: AbortSignal) {
  const header = document.querySelector<HTMLElement>('.site-header');
  const nav = document.querySelector<HTMLElement>('#site-nav');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const dropdown = document.querySelector<HTMLElement>('[data-nav-dropdown]');
  const backdrop = document.querySelector<HTMLElement>('[data-nav-backdrop]');
  const shell = header?.querySelector<HTMLElement>('.nav-shell');
  const tools = header?.querySelector<HTMLElement>('.nav-tools');
  if (!header || !nav || !toggle || !dropdown || !shell || !tools) return;
  const panels = [...header.querySelectorAll<HTMLElement>('[data-nav-panel]')];
  const triggers = [...header.querySelectorAll<HTMLButtonElement>('[data-nav-trigger]')];
  const main = document.createElement('div');
  main.className = 'nav-main-panel';
  main.hidden = true;
  main.inert = true;
  dropdown.prepend(main);
  const layers = [main, ...panels];
  const small = matchMedia('(max-width: 760px)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const compact = () => small.matches || document.documentElement.dataset.compactNav === 'true';
  let current = '';
  let mobileOpen = false;
  let presented: HTMLElement | undefined;
  let keyboardOwned = false;
  let revision = 0;
  let focusFrame = 0;
  let focusRevision = 0;
  let focusCheck: ReturnType<typeof setTimeout> | undefined;
  let pointerInHeader = false;
  let pointerRelease: ReturnType<typeof setTimeout> | undefined;
  let linkClose: ReturnType<typeof setTimeout> | undefined;
  let delay: ReturnType<typeof setTimeout> | undefined;
  let hoverCandidate = '';
  const animations = new Set<Animation>();
  const groups = (layer: HTMLElement) => [
    ...layer.querySelectorAll<HTMLElement>(
      layer === main ? '.nav-entry' : '.nav-column, .nav-back',
    ),
  ];
  const clearStyles = (layer: HTMLElement) => {
    layer.removeAttribute('data-retiring');
    [layer, ...groups(layer)].forEach((el) => {
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
    });
  };
  const cancelDelay = () => {
    clearTimeout(delay);
    delay = undefined;
    hoverCandidate = '';
  };
  function focusAfterLayout(element: HTMLElement | undefined | null) {
    cancelAnimationFrame(focusFrame);
    const serial = ++focusRevision;
    focusFrame = requestAnimationFrame(() => {
      focusFrame = 0;
      if (!signal.aborted && serial === focusRevision) element?.focus({ preventScroll: true });
    });
  }
  function run(
    el: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
    done: () => void,
    serial: number,
  ) {
    const animation = animate(el, frames, options);
    if (!animation) {
      done();
      return;
    }
    animations.add(animation);
    const finish = () => {
      animations.delete(animation);
      if (!signal.aborted && serial === revision) {
        animation.cancel();
        done();
      }
    };
    // External theme/language/reduced-motion cancellation also settles the final state.
    void animation.finished.then(finish, finish);
  }
  function measure() {
    header!.style.setProperty('--nav-bottom', header!.getBoundingClientRect().bottom + 'px');
    dropdown!.style.height = presented
      ? (presented === main ? main.offsetHeight : presented.scrollHeight) + 'px'
      : '0px';
  }
  function render(target: HTMLElement | undefined, immediate = false) {
    if (target === presented && !immediate) {
      measure();
      return;
    }
    const snapshots = new Map<HTMLElement, { opacity: number; transform: string }>();
    layers
      .filter((layer) => !layer.hidden)
      .forEach((layer) => {
        [layer, ...groups(layer)].forEach((el) => {
          const style = getComputedStyle(el);
          snapshots.set(el, { opacity: Number(style.opacity), transform: style.transform });
        });
      });
    const serial = ++revision;
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    presented = target;
    header!.toggleAttribute('data-sheet-open', !!target);
    dropdown!.inert = !target;
    if (target) {
      target.hidden = false;
      target.inert = false;
      target.removeAttribute('aria-hidden');
    }
    const instant = immediate || !motionAllowed();
    if (instant) {
      layers.forEach((layer) => {
        clearStyles(layer);
        layer.hidden = layer !== target;
        layer.inert = layer !== target;
        if (layer !== target) layer.setAttribute('aria-hidden', 'true');
      });
      const previous = dropdown!.style.transition;
      dropdown!.style.transition = 'none';
      measure();
      // Commit an immediate route/mode/reset state before restoring ordinary transitions.
      void dropdown!.offsetHeight;
      dropdown!.style.transition = previous;
      return;
    }
    const outgoing = layers.filter((layer) => !layer.hidden && layer !== target);
    outgoing.forEach((layer) => {
      layer.inert = true;
      layer.setAttribute('aria-hidden', 'true');
      layer.setAttribute('data-retiring', '');
      groups(layer).forEach((el) => {
        const snapshot = snapshots.get(el);
        if (snapshot) {
          el.style.opacity = String(snapshot.opacity);
          el.style.transform = snapshot.transform;
        }
      });
      const opacity = snapshots.get(layer)?.opacity ?? 1;
      layer.style.opacity = String(opacity);
      run(
        layer,
        [{ opacity }, { opacity: 0 }],
        { duration: 140, easing: 'ease-out', fill: 'forwards' },
        () => {
          layer.hidden = true;
          clearStyles(layer);
        },
        serial,
      );
    });
    if (target) {
      const parentOpacity = snapshots.get(target)?.opacity ?? 0;
      clearStyles(target);
      let column = 0;
      groups(target).forEach((el, index) => {
        const snapshot = snapshots.get(el);
        const opacity = snapshots.has(target) ? parentOpacity * (snapshot?.opacity ?? 1) : 0;
        const transform = snapshot?.transform ?? 'translateY(-6px)';
        const stagger =
          target === main ? index * 20 : el.classList.contains('nav-column') ? column++ * 40 : 0;
        run(
          el,
          [
            { opacity, transform },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 360,
            delay: (outgoing.length ? 140 : 0) + stagger,
            easing: 'cubic-bezier(.22,.8,.25,1)',
            fill: 'both',
          },
          () => {
            el.style.removeProperty('opacity');
            el.style.removeProperty('transform');
          },
          serial,
        );
      });
    }
    measure();
  }
  function sync(immediate = false) {
    if (compact()) {
      if (nav!.parentElement !== main) main.append(nav!);
    } else if (nav!.parentElement !== shell) shell!.insertBefore(nav!, tools!);
    header!.toggleAttribute('data-panel-open', !!current);
    header!.toggleAttribute('data-navigation-open', !!current || mobileOpen);
    backdrop?.toggleAttribute('data-open', !!current || mobileOpen);
    nav!.classList.toggle('is-open', mobileOpen);
    nav!.inert = compact() && (!mobileOpen || !!current);
    toggle!.setAttribute('aria-expanded', String(mobileOpen));
    toggle!.setAttribute(
      'aria-label',
      localized(
        mobileOpen ? '关闭菜单' : '打开菜单',
        mobileOpen ? 'Close navigation' : 'Open navigation',
      ),
    );
    triggers.forEach((button) => {
      button.setAttribute('aria-expanded', String(button.dataset.navTrigger === current));
      button.parentElement?.toggleAttribute(
        'data-active-menu',
        button.dataset.navTrigger === current,
      );
    });
    const target = current
      ? panels.find((panel) => panel.dataset.navPanel === current)
      : mobileOpen && compact()
        ? main
        : undefined;
    render(target, immediate);
  }
  function close(restore = false, immediate = false) {
    const previous = current;
    cancelDelay();
    current = '';
    mobileOpen = false;
    keyboardOwned = false;
    ++focusRevision;
    cancelAnimationFrame(focusFrame);
    focusFrame = 0;
    sync(immediate);
    if (restore) {
      if (compact()) toggle!.focus({ preventScroll: true });
      else
        triggers
          .find((button) => button.dataset.navTrigger === previous)
          ?.focus({ preventScroll: true });
    }
  }
  function open(id: string, focus = false, keyboard = false) {
    const preserveFocus = dropdown!.contains(document.activeElement);
    keyboardOwned = keyboard;
    cancelDelay();
    current = id;
    if (compact()) mobileOpen = true;
    sync();
    if (focus || preserveFocus)
      focusAfterLayout(
        panels.find((panel) => panel.dataset.navPanel === id)?.querySelector<HTMLElement>('a'),
      );
  }
  triggers.forEach((button) => {
    const id = button.dataset.navTrigger!;
    button.addEventListener(
      'pointermove',
      (event) => {
        if (
          compact() ||
          !hover.matches ||
          event.pointerType === 'touch' ||
          current === id ||
          hoverCandidate === id
        )
          return;
        cancelDelay();
        hoverCandidate = id;
        // Only actual movement opens a menu; a route swap under a stationary pointer does not.
        delay = setTimeout(() => open(id), 90);
      },
      { signal },
    );
    button.addEventListener(
      'pointerleave',
      () => {
        if (hoverCandidate === id) cancelDelay();
      },
      { signal },
    );
    button.addEventListener('click', (event) => open(id, true, event.detail === 0), { signal });
    button.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          open(id, true, true);
        }
      },
      { signal },
    );
  });
  toggle.addEventListener(
    'click',
    () => {
      if (mobileOpen) close();
      else {
        mobileOpen = true;
        sync();
        focusAfterLayout(triggers[0]);
      }
    },
    { signal },
  );
  panels.forEach((panel) =>
    panel.querySelector('[data-nav-back]')?.addEventListener(
      'click',
      () => {
        const previous = current;
        current = '';
        sync();
        focusAfterLayout(triggers.find((button) => button.dataset.navTrigger === previous));
      },
      { signal },
    ),
  );
  function leave() {
    if (compact() || !hover.matches) return;
    cancelDelay();
    delay = setTimeout(() => {
      if (!keyboardOwned) close(dropdown!.contains(document.activeElement));
    }, 160);
  }
  header.addEventListener(
    'pointerleave',
    (event) => {
      if (event.pointerType !== 'touch') leave();
    },
    { signal },
  );
  dropdown.addEventListener('pointerenter', cancelDelay, { signal });
  backdrop?.addEventListener('pointerenter', leave, { signal });
  header.addEventListener(
    'focusout',
    () => {
      clearTimeout(focusCheck);
      focusCheck = setTimeout(() => {
        if (
          !signal.aborted &&
          !focusFrame &&
          !pointerInHeader &&
          !header.contains(document.activeElement)
        )
          close();
      }, 0);
    },
    { signal },
  );
  header.querySelectorAll('a').forEach((link) =>
    link.addEventListener(
      'click',
      () => {
        cancelDelay();
        clearTimeout(linkClose);
        // Preserve WebKit default link activation before making the outgoing content inert.
        linkClose = setTimeout(() => close(), 0);
      },
      { signal },
    ),
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      pointerInHeader = event.target instanceof Node && header.contains(event.target);
      if ((current || mobileOpen) && event.target instanceof Node && !pointerInHeader)
        close(nav.contains(document.activeElement) || dropdown.contains(document.activeElement));
    },
    { signal },
  );
  const releasePointer = () => {
    clearTimeout(pointerRelease);
    pointerRelease = setTimeout(() => {
      pointerInHeader = false;
    }, 0);
  };
  document.addEventListener('pointerup', releasePointer, { signal });
  document.addEventListener('pointercancel', releasePointer, { signal });
  document.addEventListener(
    'keydown',
    (event) => {
      if (!current && !mobileOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
      if (event.key === 'Tab') keyboardOwned = true;
      if (event.key === 'Tab' && compact()) {
        const content = presented;
        const items = [...header.querySelectorAll<HTMLElement>('a,button')].filter(
          (el) =>
            !el.closest('[inert]') &&
            el.getClientRects().length &&
            getComputedStyle(el).visibility !== 'hidden',
        );
        const cycle = [
          ...items.filter((el) => content?.contains(el)),
          ...items.filter((el) => tools.contains(el)),
        ];
        if (event.shiftKey && document.activeElement === cycle[0]) {
          event.preventDefault();
          cycle.at(-1)?.focus();
        } else if (!event.shiftKey && document.activeElement === cycle.at(-1)) {
          event.preventDefault();
          cycle[0]?.focus();
        }
      }
    },
    { signal },
  );
  const reset = () =>
    close(nav.contains(document.activeElement) || dropdown.contains(document.activeElement), true);
  small.addEventListener('change', reset, { signal });
  document.addEventListener('site:viewport', reset, { signal });
  document.addEventListener('site:language', () => sync(), { signal });
  document.addEventListener(
    'site:motion',
    () => {
      if (!motionAllowed()) sync(true);
    },
    { signal },
  );
  window.addEventListener('resize', measure, { signal, passive: true });
  window.visualViewport?.addEventListener('resize', measure, { signal, passive: true });
  document.addEventListener('astro:before-preparation', () => close(false, true), { signal });
  signal.addEventListener(
    'abort',
    () => {
      ++revision;
      cancelDelay();
      clearTimeout(focusCheck);
      clearTimeout(pointerRelease);
      clearTimeout(linkClose);
      cancelAnimationFrame(focusFrame);
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      layers.forEach(clearStyles);
      // Leave original markup reusable if initialization is rerun on the same document.
      if (nav.parentElement === main) shell.insertBefore(nav, tools);
      main.remove();
    },
    { once: true },
  );
  header.setAttribute('data-nav-ready', '');
  sync(true);
}
