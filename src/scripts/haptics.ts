const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function vibrate(pattern: number | number[]): boolean {
  if (reduceMotion.matches) return false;
  const v = navigator.vibrate as ((pattern: number | number[]) => boolean) | undefined;
  if (typeof v !== 'function') return false;
  try {
    return v.call(navigator, pattern);
  } catch {
    return false;
  }
}

export function hapticTap() {
  vibrate(10);
}

export function hapticSuccess() {
  vibrate([12, 40, 12]);
}
