/**
 * Content option keys, shared by the Zod schemas (`src/content.config.ts`) and the label
 * dictionary (`src/lib/i18n.ts`). The CMS stores the key, never the label, so the Spanish and
 * English names of an option live in the code and never go through machine translation.
 *
 * `GROUPS` are the three of the catalogue in docs/spec.md § 6.4, which is Galope's own list, plus
 * the ones the general map (FigJam «MAPA GENERAL») adds; those have only hidden projects for now,
 * and a group with nothing visible is not listed. The rest is still PROVISIONAL until the client
 * confirms it (docs/spec.md § 13). The CMS options in public/admin/config.yml must match.
 */
export const GROUPS = [
  '111',
  '166',
  '166 Deluxe',
  'La vida era más corta',
  'Morón',
  'Un día a la vez',
  'Bizarrap Session #57',
] as const;
export const TYPES = [
  'videoclip',
  'documental',
  'visualizer',
  'sesion-en-vivo',
  'diseno-grafico',
] as const;
export const CATEGORIES = TYPES;
export const GALLERY_PARTS = ['fotos', 'proceso'] as const;
export const FOCUS = ['center', 'top', 'bottom', 'left', 'right'] as const;
export const DESCRIPTION_MAX = 600;

export type Group = (typeof GROUPS)[number];
export type ProjectType = (typeof TYPES)[number];
export type Category = (typeof CATEGORIES)[number];
export type GalleryPart = (typeof GALLERY_PARTS)[number];
export type Focus = (typeof FOCUS)[number];
