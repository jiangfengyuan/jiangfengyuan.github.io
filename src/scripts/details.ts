import { animate, motionAllowed } from './motion';
import { localized } from './i18n';

export function initDetails(signal: AbortSignal) {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-email]').forEach((button) => {
    button.hidden = false;
    const feedback = button
      .closest('[data-copy-region]')
      ?.querySelector<HTMLElement>('[role="status"]');
    let state: 'idle' | 'success' | 'error' = 'idle';
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    const render = () => {
      button.dataset.copyState = state;
      if (feedback)
        feedback.textContent =
          state === 'success'
            ? localized('已复制，可以粘贴了。', 'Copied. Ready to paste.')
            : state === 'error'
              ? localized(
                  '未能复制，请选中邮箱手动复制。',
                  'Could not copy. Select the email to copy manually.',
                )
              : '';
    };
    button.addEventListener(
      'click',
      async () => {
        if (pending) return;
        pending = true;
        button.setAttribute('aria-busy', 'true');
        clearTimeout(timer);
        try {
          await navigator.clipboard.writeText(button.dataset.copyEmail!);
          state = 'success';
        } catch {
          state = 'error';
        } finally {
          pending = false;
          if (signal.aborted) return;
          button.removeAttribute('aria-busy');
          render();
          if (feedback)
            animate(
              feedback,
              [
                { opacity: 0, transform: 'translateY(3px)' },
                { opacity: 1, transform: 'none' },
              ],
              { duration: 180 },
            );
          if (state === 'success')
            timer = setTimeout(() => {
              state = 'idle';
              render();
            }, 5000);
        }
      },
      { signal },
    );
    document.addEventListener('site:language', render, { signal });
    signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  });

  document.querySelector<HTMLAnchorElement>('[data-back-top]')?.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'instant' });
    },
    { signal },
  );

  document.addEventListener(
    'site:motion',
    () => {
      if (!motionAllowed()) window.scrollTo({ top: scrollY, behavior: 'instant' });
    },
    { signal },
  );
}
