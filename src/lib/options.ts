/**
 * Content option keys, shared by the Zod schemas (`src/content.config.ts`) and the label
 * dictionary (`src/lib/i18n.ts`). The CMS stores the key, never the label, so the Spanish and
 * English names of an option live in the code and never go through machine translation.
 *
 * PROVISIONAL until the client confirms them (docs/spec.md § 13).
 */
export const GROUPS = ['2023', '2024', '2025'] as const;
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
