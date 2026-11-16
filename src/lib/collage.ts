/**
 * The collage: random positions inside a pattern, decided at build time (ADR 0005,
 * docs/spec.md § 7).
 *
 * Images go on cells of the page grid — four columns wide, two on a narrow screen — each one
 * taking one of three preset sizes according to its shape. Inside its own area every image
 * keeps its proportions, takes a random share of the space and a random spot in what is left,
 * which is what stops the result from reading as a grid. No image ever leaves its area, and the
 * areas never share a cell, so images do not overlap: they scatter, with room between them, as
 * in the «PROYECTOS» page of the Figma.
 *
 * Everything here is pure and deterministic: the same seed and the same images always give the
 * same layout, so the build, the preview and production cannot disagree, and there is no
 * client-side layout work and no layout shift. An editor who dislikes an arrangement changes
 * "Mezclar collage" (`collageSeed`) in the CMS and sees the next one in the preview.
 */
import type { Focus } from './options';

/** At most this many images; the rest live only in the Fotos and Proceso sections. */
export const MAX_IMAGES = 8;

/**
 * The margin every area keeps on each side, as a share of one cell. Two neighbours are at least
 * twice this apart, which leaves room for the idle drift (±6 px) and the hover (scale 1.03)
 * without either one making an image touch the next.
 */
const GUTTER = 0.06;

/** The smallest and largest share of its area an image may take, along its longer side. */
const MIN_FILL = 0.72;
const MAX_FILL = 1;

/** How many seeds to try before falling back to the fixed composition. */
const ATTEMPTS = 40;

export interface CollageImage {
  /** Width ÷ height. Decides which of the three preset sizes the image gets. */
  aspect: number;
}

/** One image as the component renders it. The algorithm itself only needs the shape. */
export interface CollageItem {
  image: ImageMetadata;
  alt: string;
  focus: Focus;
}

/** Where one image ends up, in percentages of the collage box. */
export interface Placement {
  /** Index into the images that were passed in. */
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollageLayout {
  /** Four columns, used from 48rem up. */
  wide: Placement[];
  /** Two columns, used below 48rem. */
  narrow: Placement[];
  /** Width ÷ height of the collage box, so the page can reserve its height. */
  wideAspect: number;
  narrowAspect: number;
  /** True when no seed met the limits and the fixed composition was used instead. */
  fallback: boolean;
}

interface Cell {
  column: number;
  row: number;
}

interface Size {
  columns: number;
  rows: number;
}

interface Pattern {
  columns: number;
  /** Width ÷ height of one cell. */
  cellAspect: number;
  /** Cells an image may not take, as a function of how many rows the pattern ended up with. */
  reserve: (rows: number) => Cell[];
}

/*
 * The dice is pinned over the middle of the content from 48rem up, so the cells under it are
 * out of bounds. The logo is not: it lives in its own row at the bottom of the shell
 * (src/layouts/Base.astro), below the collage rather than over it. The mechanism takes any
 * number of zones, so when the layout changes and the logo does sit over the collage, that is
 * one more entry here and nothing else.
 */
const WIDE: Pattern = {
  columns: 4,
  cellAspect: 4 / 3,
  reserve: () => [
    { column: 1, row: 0 },
    { column: 2, row: 0 },
  ],
};

/* Below 48rem the dice sits above the content instead of over it, so nothing is reserved. */
const NARROW: Pattern = {
  columns: 2,
  cellAspect: 1,
  reserve: () => [],
};

/** The three preset sizes, by shape. A tall image gets a tall area, a wide one a wide area. */
function sizeOf(aspect: number): Size {
  if (aspect < 0.9) return { columns: 1, rows: 2 };
  if (aspect > 1.15) return { columns: 2, rows: 1 };
  return { columns: 1, rows: 1 };
}

/** FNV-1a, so that a slug and a number become one number to seed the generator with. */
function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** mulberry32: small, fast, and good enough for deciding where a photograph goes. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const a = result[index];
    const b = result[other];
    if (a !== undefined && b !== undefined) {
      result[index] = b;
      result[other] = a;
    }
  }
  return result;
}

interface Footprint extends Cell, Size {
  index: number;
}

/**
 * Puts every image on free cells, or gives up. Origins are tried in a shuffled order, so the
 * same images land somewhere else with every seed; a footprint may not leave the pattern, cover
 * a reserved cell or touch one already taken.
 */
function place(sizes: Size[], pattern: Pattern, rows: number, random: () => number): Footprint[] {
  const taken = new Set<string>();
  const key = (column: number, row: number): string => `${column},${row}`;

  for (const cell of pattern.reserve(rows)) taken.add(key(cell.column, cell.row));

  const origins: Cell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < pattern.columns; column += 1) origins.push({ column, row });
  }

  const placed: Footprint[] = [];

  for (const [index, size] of sizes.entries()) {
    const spot = shuffle(origins, random).find(({ column, row }) => {
      if (column + size.columns > pattern.columns || row + size.rows > rows) return false;
      for (let dx = 0; dx < size.columns; dx += 1) {
        for (let dy = 0; dy < size.rows; dy += 1) {
          if (taken.has(key(column + dx, row + dy))) return false;
        }
      }
      return true;
    });

    if (!spot) return [];

    for (let dx = 0; dx < size.columns; dx += 1) {
      for (let dy = 0; dy < size.rows; dy += 1) {
        taken.add(key(spot.column + dx, spot.row + dy));
      }
    }
    placed.push({ ...spot, ...size, index });
  }

  return placed;
}

/**
 * Cells to percentages. Each image is fitted to its area at its own proportions, shrunk by a
 * random amount and dropped at a random spot of the room that leaves, all inside the area minus
 * its gutter. With `scatter` off it fills the area and sits in the middle: the fixed composition.
 */
function toPlacements(
  footprints: Footprint[],
  aspects: number[],
  pattern: Pattern,
  rows: number,
  random: () => number,
  scatter: boolean,
): Placement[] {
  const cellWidth = 100 / pattern.columns;
  const cellHeight = 100 / rows;
  /* Percentages of the box are not square: this turns a width ÷ height into box units. */
  const boxAspect = (pattern.columns * pattern.cellAspect) / rows;

  return footprints.map(({ index, column, row, columns, rows: tall }) => {
    const areaX = column * cellWidth + GUTTER * cellWidth;
    const areaY = row * cellHeight + GUTTER * cellHeight;
    const areaWidth = cellWidth * (columns - 2 * GUTTER);
    const areaHeight = cellHeight * (tall - 2 * GUTTER);

    /* The image's own shape, in box percentages, at the largest size that fits the area. */
    const shape = (aspects[index] ?? 1) / boxAspect;
    const fit = Math.min(areaWidth / shape, areaHeight);
    const fill = scatter ? MIN_FILL + random() * (MAX_FILL - MIN_FILL) : 1;
    const height = fit * fill;
    const width = height * shape;

    const spareX = areaWidth - width;
    const spareY = areaHeight - height;

    return {
      index,
      width,
      height,
      x: areaX + (scatter ? random() : 0.5) * spareX,
      y: areaY + (scatter ? random() : 0.5) * spareY,
    };
  });
}

/** True when two placements share any area. By construction they never do; this checks it. */
function overlaps(a: Placement, b: Placement): boolean {
  const epsilon = 1e-6;
  return (
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > epsilon &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > epsilon
  );
}

function withinLimits(placements: Placement[]): boolean {
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i];
      const b = placements[j];
      if (a && b && overlaps(a, b)) return false;
    }
  }
  return true;
}

/** Enough rows for the footprints to fit, with one spare so there is room to choose. */
function rowsFor(sizes: Size[], pattern: Pattern): number {
  const demand = sizes.reduce((total, size) => total + size.columns * size.rows, 0);
  const tallest = sizes.reduce((most, size) => Math.max(most, size.rows), 1);
  const reserved = pattern.reserve(0).length;
  return Math.max(tallest, Math.ceil((demand + reserved) / pattern.columns) + 1);
}

/**
 * The fixed composition, used when no seed works. Plain, non-overlapping, in the order the
 * images came in — it is the thing that must never look broken, not the thing that must look
 * exciting.
 *
 * PROVISIONAL: the spec calls for the fixed composition from Figma. This stands in for it until
 * that composition is available, and it satisfies every limit by construction: every image is
 * centred in its own area.
 */
function fixed(
  sizes: Size[],
  aspects: number[],
  pattern: Pattern,
): { placements: Placement[]; rows: number } {
  const rows = rowsFor(sizes, pattern);
  const footprints = place(sizes, pattern, rows, generator(0));
  const laid = footprints.length > 0 ? footprints : [];

  if (laid.length === 0) {
    /* Even the fixed arrangement could not place them: fall back to plain stacked rows. */
    const cellHeight = 100 / Math.max(sizes.length, 1);
    return {
      rows: Math.max(sizes.length, 1),
      placements: sizes.map((_, index) => ({
        index,
        x: 0,
        y: index * cellHeight,
        width: 100,
        height: cellHeight,
      })),
    };
  }

  return { rows, placements: toPlacements(laid, aspects, pattern, rows, generator(0), false) };
}

interface Attempt {
  placements: Placement[];
  rows: number;
  fallback: boolean;
}

function layOut(sizes: Size[], aspects: number[], pattern: Pattern, seed: number): Attempt {
  const rows = rowsFor(sizes, pattern);

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const random = generator(seed + attempt * 0x9e3779b9);
    const footprints = place(sizes, pattern, rows, random);
    if (footprints.length === 0) continue;

    const placements = toPlacements(footprints, aspects, pattern, rows, random, true);
    if (withinLimits(placements)) return { placements, rows, fallback: false };
  }

  const { placements, rows: fixedRows } = fixed(sizes, aspects, pattern);
  return { placements, rows: fixedRows, fallback: true };
}

/**
 * The collage for one set of images.
 *
 * `seed` is the slug plus the entry's `collageSeed`, so the same project always gets the same
 * arrangement and an editor can ask for another one by changing the number.
 */
export function collage(images: CollageImage[], seed: string): CollageLayout {
  const used = images.slice(0, MAX_IMAGES);
  const aspects = used.map((image) => image.aspect);
  const sizes = aspects.map(sizeOf);

  if (used.length === 0) {
    return { wide: [], narrow: [], wideAspect: 1, narrowAspect: 1, fallback: false };
  }

  const start = hash(seed);
  const wide = layOut(sizes, aspects, WIDE, start);
  const narrow = layOut(sizes, aspects, NARROW, start);

  return {
    wide: wide.placements,
    narrow: narrow.placements,
    wideAspect: (WIDE.columns * WIDE.cellAspect) / wide.rows,
    narrowAspect: (NARROW.columns * NARROW.cellAspect) / narrow.rows,
    fallback: wide.fallback || narrow.fallback,
  };
}
