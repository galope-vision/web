/**
 * The collage: random positions inside a pattern, decided at build time (ADR 0005,
 * docs/spec.md § 7).
 *
 * Images go on cells of the page grid — four columns wide, two on a narrow screen. Each one
 * takes a single cell or, depending on its shape, a double one: two cells tall for a tall image,
 * two wide for a wide one. Which images get the double size and where everything lands is
 * random, and among the arrangements that fit, the one that leaves fewest cells empty wins, so
 * the images fill the grid instead of floating in it. Every image fills its whole area, minus a
 * gutter, cropped from its `focus`. The areas never share a cell, so images never overlap: a
 * random grid, as in the «PROYECTOS» page of the Figma.
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
const GUTTER = 0.04;

/** How likely a tall or wide image is to get the double size on each try. */
const DOUBLE = 0.6;

/** How many arrangements to try before keeping the one that fills the most cells. */
const ATTEMPTS = 200;

export interface CollageImage {
  /** Width ÷ height. Decides whether the image may take a tall or a wide double cell. */
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
  /** True when no arrangement placed every image and the fixed composition was used instead. */
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

const SINGLE: Size = { columns: 1, rows: 1 };

/** The double size an image may take, by shape, or none for a squarish one. */
function doubleOf(aspect: number): Size | undefined {
  if (aspect < 0.9) return { columns: 1, rows: 2 };
  if (aspect > 1.15) return { columns: 2, rows: 1 };
  return undefined;
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
 * a reserved cell or touch one already taken. Double sizes go first, while there is room for
 * them.
 */
function place(sizes: Size[], pattern: Pattern, rows: number, random: () => number): Footprint[] {
  const taken = new Set<string>();
  const key = (column: number, row: number): string => `${column},${row}`;

  for (const cell of pattern.reserve(rows)) taken.add(key(cell.column, cell.row));

  const origins: Cell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < pattern.columns; column += 1) origins.push({ column, row });
  }

  const order = sizes
    .map((size, index) => ({ size, index }))
    .sort((a, b) => b.size.columns * b.size.rows - a.size.columns * a.size.rows);

  const placed: Footprint[] = [];
  let free = rows * pattern.columns - taken.size;

  const spotFor = (size: Size): Cell | undefined =>
    shuffle(origins, random).find(({ column, row }) => {
      if (column + size.columns > pattern.columns || row + size.rows > rows) return false;
      for (let dx = 0; dx < size.columns; dx += 1) {
        for (let dy = 0; dy < size.rows; dy += 1) {
          if (taken.has(key(column + dx, row + dy))) return false;
        }
      }
      return true;
    });

  for (const [position, { size: wanted, index }] of order.entries()) {
    /*
     * A double size only goes in if it leaves a cell for every image still to come and finds
     * room; otherwise the image takes a single cell, so an arrangement never fails for having
     * been too generous early on.
     */
    const left = order.length - position - 1;
    const roomy = free - wanted.columns * wanted.rows >= left;
    const doubleSpot = roomy && wanted !== SINGLE ? spotFor(wanted) : undefined;
    const size = doubleSpot ? wanted : SINGLE;
    const spot = doubleSpot ?? spotFor(SINGLE);

    if (!spot) return [];
    free -= size.columns * size.rows;

    for (let dx = 0; dx < size.columns; dx += 1) {
      for (let dy = 0; dy < size.rows; dy += 1) {
        taken.add(key(spot.column + dx, spot.row + dy));
      }
    }
    placed.push({ ...spot, ...size, index });
  }

  return placed;
}

/** Cells to percentages: every image fills its area, minus the gutter on each side. */
function toPlacements(footprints: Footprint[], pattern: Pattern, rows: number): Placement[] {
  const cellWidth = 100 / pattern.columns;
  const cellHeight = 100 / rows;

  return footprints.map(({ index, column, row, columns, rows: tall }) => ({
    index,
    x: (column + GUTTER) * cellWidth,
    y: (row + GUTTER) * cellHeight,
    width: (columns - 2 * GUTTER) * cellWidth,
    height: (tall - 2 * GUTTER) * cellHeight,
  }));
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

/**
 * Just enough rows for every image to have a cell of its own. No spare row: the double sizes
 * are what takes up the room left over, so the grid comes out full rather than gappy.
 */
function rowsFor(count: number, pattern: Pattern): number {
  const reserved = pattern.reserve(0).length;
  return Math.max(1, Math.ceil((count + reserved) / pattern.columns));
}

/**
 * The fixed composition, used when no arrangement places every image. Single cells, in the
 * order the images came in — it is the thing that must never look broken, not the thing that
 * must look exciting.
 *
 * PROVISIONAL: the spec calls for the fixed composition from Figma. This stands in for it until
 * that composition is available, and it satisfies every limit by construction.
 */
function fixed(count: number, pattern: Pattern): { placements: Placement[]; rows: number } {
  const rows = rowsFor(count, pattern);
  const footprints = place(Array<Size>(count).fill(SINGLE), pattern, rows, generator(0));

  if (footprints.length === 0) {
    /* Even single cells did not fit: fall back to plain stacked rows. */
    const cellHeight = 100 / Math.max(count, 1);
    return {
      rows: Math.max(count, 1),
      placements: Array.from({ length: count }, (_, index) => ({
        index,
        x: 0,
        y: index * cellHeight,
        width: 100,
        height: cellHeight,
      })),
    };
  }

  return { rows, placements: toPlacements(footprints, pattern, rows) };
}

interface Attempt {
  placements: Placement[];
  rows: number;
  fallback: boolean;
}

/**
 * Tries random choices of double sizes and positions and keeps the arrangement that covers the
 * most cells, stopping early once one covers them all.
 */
function layOut(aspects: number[], pattern: Pattern, seed: number): Attempt {
  const rows = rowsFor(aspects.length, pattern);
  const free = rows * pattern.columns - pattern.reserve(rows).length;
  const random = generator(seed);

  let best: { footprints: Footprint[]; cells: number } | undefined;

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const sizes = aspects.map((aspect) => {
      const double = doubleOf(aspect);
      return double && random() < DOUBLE ? double : SINGLE;
    });

    const footprints = place(sizes, pattern, rows, random);
    if (footprints.length === 0) continue;

    const cells = footprints.reduce((total, { columns, rows: tall }) => total + columns * tall, 0);
    if (!best || cells > best.cells) best = { footprints, cells };
    if (cells >= free) break;
  }

  if (best) {
    const placements = toPlacements(best.footprints, pattern, rows);
    if (withinLimits(placements)) return { placements, rows, fallback: false };
  }

  const { placements, rows: fixedRows } = fixed(aspects.length, pattern);
  return { placements, rows: fixedRows, fallback: true };
}

/**
 * The collage for one set of images.
 *
 * `seed` is the slug plus the entry's `collageSeed`, so the same project always gets the same
 * arrangement and an editor can ask for another one by changing the number.
 */
export function collage(images: CollageImage[], seed: string): CollageLayout {
  const aspects = images.slice(0, MAX_IMAGES).map((image) => image.aspect);

  if (aspects.length === 0) {
    return { wide: [], narrow: [], wideAspect: 1, narrowAspect: 1, fallback: false };
  }

  const start = hash(seed);
  const wide = layOut(aspects, WIDE, start);
  const narrow = layOut(aspects, NARROW, start);

  return {
    wide: wide.placements,
    narrow: narrow.placements,
    wideAspect: (WIDE.columns * WIDE.cellAspect) / wide.rows,
    narrowAspect: (NARROW.columns * NARROW.cellAspect) / narrow.rows,
    fallback: wide.fallback || narrow.fallback,
  };
}
