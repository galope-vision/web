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
import { ENTRANCE } from '../lib/entrance';

const { duration: DURATION, stagger: STAGGER, lift: LIFT, scale: SCALE, tilt: TILT } = ENTRANCE;
const EASE = ENTRANCE.ease;

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

/**
 * Whatever was on screen at load is already entering: the inline script in Base.astro started it
 * before the first paint and marked it `data-entering`. Waiting for this module instead kept the
 * first screen at opacity 0 until the script had downloaded, which on a slow phone was seconds
 * of blank page, and that blank was the page's Largest Contentful Paint.
 */
export function startEntrances(): void {
  const groups = [...document.querySelectorAll('[data-enter-group]:not([data-entering])')];
  const loose = [
    ...document.querySelectorAll<HTMLElement>('[data-enter]:not([data-entering])'),
  ].filter((element) => element.closest('[data-enter-group]') === null);

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

/**
 * Pauses the idle drift of a collage while nobody can see it: off screen, or with the tab in the
 * background (docs/spec.md § 8). The drift itself is CSS — this only sets `data-still` on the
 * container, and the stylesheet does the rest.
 *
 * Browsers already throttle animations in hidden tabs, but not consistently, and a page with
 * several collages on it is a dozen images animating for nobody. The observer is the part that
 * actually matters: a project page is taller than the screen.
 */
export function pauseDriftOutOfSight(): void {
  const collages = [...document.querySelectorAll<HTMLElement>('.collage')];
  if (collages.length === 0) return;

  const onScreen = new WeakSet<Element>();

  function settle(collage: HTMLElement): void {
    const visible = onScreen.has(collage) && !document.hidden;
    collage.toggleAttribute('data-still', !visible);
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
      settle(entry.target as HTMLElement);
    }
  });

  for (const collage of collages) observer.observe(collage);

  document.addEventListener('visibilitychange', () => {
    for (const collage of collages) settle(collage);
  });
}

/* Parallax (docs/spec.md § 8). */

/** How far the nearest image travels from one edge of the screen to the other. */
const PARALLAX_MAX = 12;

/** How much of the remaining distance is covered each frame; the lag is the whole effect. */
const LERP = 0.08;

/** Under this, the image is close enough to its mark that nobody can tell. */
const SETTLED = 0.01;

/**
 * Moves the collage images with the pointer, the nearer ones further than the far ones
 * (docs/spec.md § 8).
 *
 * Depth runs 0.2 to 1 off the image's index, the same deterministic trick the drift uses.
 * Movement is written to `transform` while the drift owns `translate` and `rotate`, so the two
 * compose instead of overwriting each other.
 *
 * It is off entirely where it would be wrong or unwanted: a device without a fine pointer has
 * nothing to follow, and `prefers-reduced-motion` asks for no parallax at all. The loop also
 * stops whenever the collage is paused — off screen or in a background tab — so an idle page
 * is not running a `requestAnimationFrame` for nothing.
 */
export function startParallax(): void {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...document.querySelectorAll<HTMLElement>('.collage .item')];
  if (items.length === 0) return;

  /* 0.2, 0.4, 0.6, 0.8, 1 and round again — far images barely move, near ones lead. */
  const depth = (index: number): number => 0.2 + (index % 5) * 0.2;

  let targetX = 0;
  let targetY = 0;
  const current = items.map(() => ({ x: 0, y: 0 }));
  let frame = 0;

  /*
   * Visibility is tracked here rather than read off the `data-still` that the drift uses. Both
   * come from an IntersectionObserver, and two observers' callbacks can land in either order:
   * reading the other one's attribute meant the loop could run, find the collage still marked
   * visible, settle, and stop — a frame before the attribute appeared. The images then stayed
   * leaning until the pointer next moved.
   */
  const onScreen = new WeakSet<Element>();

  function paused(): boolean {
    if (document.hidden || !fine.matches || reduced.matches) return true;
    return items.every((item) => {
      const collage = item.closest('.collage');
      return collage === null || !onScreen.has(collage);
    });
  }

  function step(): void {
    frame = 0;
    let moving = false;

    items.forEach((item, index) => {
      const point = current[index];
      if (!point) return;

      const wanted = paused() ? { x: 0, y: 0 } : { x: targetX, y: targetY };
      const factor = depth(index) * PARALLAX_MAX;
      const wantedX = wanted.x * factor;
      const wantedY = wanted.y * factor;
      point.x += (wantedX - point.x) * LERP;
      point.y += (wantedY - point.y) * LERP;

      /*
       * The distance left to travel, not the distance from the middle. Measuring from the
       * middle keeps `moving` true for as long as an image is displaced at all, which leaves a
       * `requestAnimationFrame` running at 60 fps on a page where nothing is happening.
       */
      if (Math.abs(wantedX - point.x) > SETTLED || Math.abs(wantedY - point.y) > SETTLED) {
        moving = true;
      }
      item.style.transform = `translate3d(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px, 0)`;
    });

    /* Keep going only while something is still travelling, so a still page costs nothing. */
    if (moving) frame = requestAnimationFrame(step);
  }

  function run(): void {
    if (frame === 0) frame = requestAnimationFrame(step);
  }

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      /* −1 to 1 from the middle of the window, so the collage leans towards the pointer. */
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      run();
    },
    { passive: true },
  );

  /* The same callback that learns the collage has gone sets the images travelling home. */
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
    }
    run();
  });
  for (const collage of new Set(items.map((item) => item.closest('.collage')))) {
    if (collage) observer.observe(collage);
  }

  /* Settle back to the middle when the page is hidden or the preference changes. */
  document.addEventListener('visibilitychange', run);
  reduced.addEventListener('change', run);
  fine.addEventListener('change', run);
}

/**
 * Slides the background's red layer (src/components/Backdrop.astro) with the scroll: 0 at the
 * top of the page, half its height — the whole window — at the bottom. A page too short to
 * scroll stays black.
 *
 * Read in a `requestAnimationFrame`, so a burst of scroll events costs one write per frame, and
 * re-read when the page changes height (images loading, Menos Info folding the panel), since
 * the same scroll position then means a different progress.
 */
export function startBackdrop(): void {
  const found = document.querySelector<HTMLElement>('[data-backdrop-red]');
  if (!found) return;
  const red: HTMLElement = found;

  let frame = 0;

  function step(): void {
    frame = 0;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const progress = range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 0;
    red.style.transform = `translate3d(0, ${(-progress * 50).toFixed(3)}%, 0)`;
  }

  function run(): void {
    if (frame === 0) frame = requestAnimationFrame(step);
  }

  window.addEventListener('scroll', run, { passive: true });
  window.addEventListener('resize', run, { passive: true });
  new ResizeObserver(run).observe(document.body);
  run();
}
