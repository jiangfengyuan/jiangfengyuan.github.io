// Runs init on every astro:page-load, aborting the previous page's listeners
// so ClientRouter navigations never stack duplicate handlers.
export function onPageLoad(init: (signal: AbortSignal) => void) {
  let active: AbortController | undefined;
  document.addEventListener('astro:page-load', () => {
    active?.abort();
    active = new AbortController();
    init(active.signal);
  });
}
