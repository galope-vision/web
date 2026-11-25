/**
 * The values of the entrance animation (docs/spec.md § 8), in one place for its two halves:
 * the inline script in `src/layouts/Base.astro`, which plays it for whatever is on screen at
 * load, and `src/scripts/motion.ts`, which plays it for the rest as it scrolls into view.
 * Seconds and pixels; the durations of the CSS-only animations live in tokens.css.
 */
export const ENTRANCE = {
  duration: 0.6,
  stagger: 0.08,
  lift: 24,
  scale: 0.96,
  tilt: 1.5,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};
