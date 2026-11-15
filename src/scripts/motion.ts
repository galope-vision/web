/**
 * Entrance animations (docs/spec.md § 8, CLAUDE.md).
 *
 * Anything marked `data-enter` fades and lifts into place the first time it reaches the
 * viewport: opacity 0→1, translateY 24px→0, scale .96→1, rotate ±1.5°→0, over 600 ms. Elements
 * inside the same `data-enter-group` come in one after another, 80 ms apart.
 *
 * Only `transform` and `opacity` are touched, so none of this leaves the compositor and none of
 * it can move anything else on the page.
 *
 * **Why the hidden state is a class on `<html>`.** `[data-enter]` starts at opacity 0, but only
 * under `.motion`, which a tiny inline script in the head sets before the first paint. With no
 * JavaScript — or if this module fails to load — the class is never set, nothing is hidden and
 * the page reads normally. The alternative, hiding in plain CSS, turns one broken script into a
 * blank page.
 *
 * `prefers-reduced-motion` is honoured by leaving out the movement, not the content: the spec
 * asks for entrances to become "solo un fade", so opacity still animates and the transform does
 * not. The query is re-read on every run rather than cached, because a visitor can change the
 * setting without reloading.
 */
import { animate } from 'motion/mini';

/** docs/spec.md § 8. The durations also live in tokens.css, for the CSS-only animations. */
const DURATION = 0.6;
const STAGGER = 0.08;
const LIFT = 24;
const SCALE = 0.96;
const TILT = 1.5;
const EASE = [0.22, 1, 0.36, 1] as const;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A deterministic ±1 from the element's position in its group, so the tilt alternates instead
 * of leaning the same way every time. No `Math.random`: the same page always animates the same.
 */
function direction(index: number): number {
  return index % 2 === 0 ? 1 : -1;
}

function entrance(group: Element): void {
  const items = [...group.querySelectorAll<HTMLElement>('[data-enter]')];
  const members = items.length > 0 ? items : [group as HTMLElement];
  const reduced = prefersReducedMotion();

  /** Reduced motion gets the opacity and nothing else, which is the fade § 8 asks for. */
  const tilt = (index: number): string | undefined =>
    reduced
      ? undefined
      : `translateY(${LIFT}px) scale(${SCALE}) rotate(${direction(index) * TILT}deg)`;

  const to = reduced
    ? { opacity: 1 }
    : { opacity: 1, transform: 'translateY(0px) scale(1) rotate(0deg)' };

  /*
   * Set the starting frame on each element rather than letting `animate` infer it: these come
   * from CSS at opacity 0 with no transform, and inferring would make them slide in from
   * wherever they already are.
   */
  members.forEach((element, index) => {
    element.style.opacity = '0';
    const start = tilt(index);
    if (start !== undefined) element.style.transform = start;
  });

  const animations = members.map((element, index) =>
    animate(element, to, {
      duration: reduced ? DURATION / 2 : DURATION,
      ease: reduced ? 'linear' : EASE,
      delay: reduced ? 0 : index * STAGGER,
    }),
  );

  Promise.all(animations).then(() => {
    /*
     * Hand the elements back to CSS once they have arrived, so that nothing later — the image
     * hover, the idle drift — has to fight an inline transform left behind here. The cleanup
     * waits a frame: the library writes the final values of the animation after the promise
     * settles, and removing the properties before that leaves an identity transform sitting on
     * the element, which is enough to beat a `transform` coming from a stylesheet.
     */
    requestAnimationFrame(() => {
      for (const element of members) {
        element.style.removeProperty('opacity');
        element.style.removeProperty('transform');
        element.dataset.entered = '';
      }
    });
  });
}

/** Shows a group with no animation at all, for the ones the viewport jumped straight past. */
function reveal(group: Element): void {
  const items = [...group.querySelectorAll<HTMLElement>('[data-enter]')];
  for (const element of items.length > 0 ? items : [group as HTMLElement]) {
    element.dataset.entered = '';
  }
}

export function startEntrances(): void {
  const groups = [...document.querySelectorAll('[data-enter-group]')];
  const loose = [...document.querySelectorAll<HTMLElement>('[data-enter]')].filter(
    (element) => element.closest('[data-enter-group]') === null,
  );

  const pending = new Set<Element>([...groups, ...loose]);

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      pending.delete(entry.target);
      entrance(entry.target);
    }
  });
  for (const group of pending) observer.observe(group);

  /*
   * The safety net, and it is not hypothetical: "Partes del proyecto" scrolls to a section
   * instantly, so jumping to Proceso skips straight over Fotos. An IntersectionObserver never
   * reports an element the viewport passed without ever rendering it on screen, and that group
   * would stay at opacity 0 for good. Anything left above the viewport is therefore shown
   * outright — it has already been scrolled past, so there is nothing left to animate into.
   */
  let queued = false;
  const sweep = (): void => {
    queued = false;
    for (const group of pending) {
      if (group.getBoundingClientRect().bottom < 0) {
        pending.delete(group);
        reveal(group);
      }
    }
    if (pending.size === 0) window.removeEventListener('scroll', onScroll);
  };
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sweep);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}
