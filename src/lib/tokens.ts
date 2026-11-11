/**
 * Reads `src/styles/tokens.css` at build time so the styles page (`/estilos`) can list the real
 * tokens and never drift from them.
 */
import raw from '../styles/tokens.css?raw';

export interface Token {
  name: string;
  value: string;
}

export interface TokenGroup {
  title: string;
  tokens: Token[];
}

/** Every custom property declared in the tokens file, in the order it appears. */
export function allTokens(): Token[] {
  return [...raw.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => ({
    name: match[1] ?? '',
    value: (match[2] ?? '').trim().replace(/\s+/g, ' '),
  }));
}

/** The tokens whose name starts with one of the given prefixes. */
export function tokensFor(...prefixes: string[]): Token[] {
  return allTokens().filter((token) => prefixes.some((prefix) => token.name.startsWith(prefix)));
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number | null {
  const digits = /^#([\da-f]{6})$/i.exec(hex.trim())?.[1];
  if (digits === undefined) return null;
  const [r, g, b] = [0, 2, 4].map((at) => channel(parseInt(digits.slice(at, at + 2), 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Contrast of a hex color against another one, rounded to two decimals. */
export function contrast(hex: string, against: string): number | null {
  const a = luminance(hex);
  const b = luminance(against);
  if (a === null || b === null) return null;
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}
