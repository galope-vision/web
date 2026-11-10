# 0005 · Seeded, constrained collage instead of gallery templates

- Status: Accepted
- Date: 2026-11-10

## Context

The updated design replaces the four gallery templates (A–D) with a free collage of
overlapping images on every project and on the projects list. A fixed composition makes all
projects look the same and doesn't adapt to the number or shape of the images. A fully
generated layout risks ugly results. Positioning images by hand in the CMS isn't practical:
Sveltia has no visual canvas.

## Decision

Compute the collage **at build time** with a seeded, constrained random layout
(`src/lib/collage.ts`):

- Cells on the 4-column grid (2 columns on mobile), with the dice and logo zones reserved.
- One image per cell, in one of 3 preset sizes by aspect ratio.
- Jitter of at most 25% of the cell. Overlap of at most 40% of the smaller image.
- Seed = `slug` + `collageSeed`. The same input always gives the same output. Editors bump
  `collageSeed` ("Mezclar collage") to get a new arrangement and check it in the preview.
- If no seed satisfies the constraints after N tries, fall back to the fixed Figma
  composition.

## Consequences

- Variety between projects with no broken layouts, no client-side layout JS and no layout
  shift.
- Estimated cost: 2–3 days in phase 3, plus tuning with the designer.
- The constraints are values in `tokens.css` or `collage.ts` and can be tuned without touching
  content.
- The gallery templates and the `galleryTemplate` field are dropped.
