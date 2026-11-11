# 0006 · A lighter red for text, the brand red for everything else

- Status: Accepted
- Date: 2026-11-11

## Context

The design uses the brand red `#C42626` on black for the logo, the dice and also for text: the
active nav item, a project's title, the active row of the list, VOLVER and the highlighted
words in Info. All of that text is 13 or 16 px.

Red on black is **3.65:1**. WCAG AA asks for 4.5:1 for text that size, in bold too, so the
design as drawn doesn't pass. The light text `#E6E6E6` on black is 16.8:1 and is fine.

## Decision

Two tokens:

- `--color-accent: #c42626` — the brand red, unchanged, for the logo, the dice and any other
  shape that isn't text. Non-text parts of the interface only need 3:1, which it passes.
- `--color-accent-text: #d93a3a` — the same hue and saturation, lighter, at **4.62:1** on
  black. Every red **text** uses this one, and so does the focus ring.

The red keeps its hue, so the difference is barely visible next to the logo while the text
becomes readable. The underline on the active item stays: colour is never the only signal.

## Alternatives considered

- **Accept the exception** and keep one red. It would leave the pages that carry the most
  meaning — the active item, the project title — below AA.
- **Make the text bigger** so 3:1 is enough (18.66 px bold). It would break the type scale of
  the design, which only has 13 and 16 px.
- **Lighten the brand red everywhere**, logo and dice included. It would change the identity for
  an accessibility problem that only affects text.

## Consequences

- A component that paints text red has to use `--color-accent-text`, never `--color-accent`.
- Over an image, for example a title on the collage, contrast has to be checked again: these
  ratios are against black.
