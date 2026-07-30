// ============================================================================
// Shared colour math for the theme contrast contracts
// ============================================================================
// Self-contained token parser + WCAG 2.x relative-luminance/contrast math (no
// imports outside this repo). Used by both `contrast.test.ts` (token pairs)
// and `buttonHoverContrast.test.ts` (resolved component cascade).
//
// This lives in one place deliberately: two divergent copies of the alpha
// compositing rule is exactly how a compositing bug survives in one test and
// not the other, producing confident-looking numbers that disagree.
// ============================================================================
import { every, map, sortBy } from "../../fn";

export type Tokens = Record<string, string>;

export function parseTokens(css: string): Tokens {
  const tokens: Tokens = {};
  // Comments must be stripped FIRST. A prose comment mentioning a token by
  // name — "retuned from X, see --sui-accent-dim: ..." — otherwise parses as a
  // declaration whose value runs to the next `;`, swallowing the real
  // declaration that follows it and leaving that token undefined.
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // First `--name: value;` declaration wins (themes rarely repeat a :root
  // block, and the standalone :root always precedes any modifier block).
  for (const m of src.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (!(m[1] in tokens)) tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

export type RGBA = [number, number, number, number];
export type RGB = [number, number, number];

/**
 * Resolve an "R, G, B" triplet expression — either a literal triplet or a
 * `var(--x-rgb)` chain ending in one. Returns the raw triplet string.
 */
function resolveTriplet(
  raw: string | undefined,
  tokens: Tokens,
  depth: number,
): string | undefined {
  if (!raw || depth > 8) return undefined;
  const v = raw.trim();
  const varMatch = v.match(/^var\((--[\w-]+)(?:\s*,\s*(.+))?\)$/s);
  if (varMatch) {
    return (
      tokens[varMatch[1]] ?? resolveTriplet(varMatch[2], tokens, depth + 1)
    );
  }
  return v;
}

export function parseColor(
  raw: string | undefined,
  tokens: Tokens,
  depth = 0,
): RGBA | null {
  if (!raw || depth > 8) return null;
  const v = raw.trim();

  // var(--name) or var(--name, fallback)
  const varMatch = v.match(/^var\((--[\w-]+)(?:\s*,\s*(.+))?\)$/);
  if (varMatch) {
    return parseColor(tokens[varMatch[1]] ?? varMatch[2], tokens, depth + 1);
  }

  // #rrggbb
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  // #rgb
  m = v.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = map((c: string) => parseInt(c + c, 16), [...m[1]]);
    return [r, g, b, 1];
  }

  // rgb()/rgba(), including a leading var(--x-rgb) triplet reference, e.g.
  // "rgba(var(--sui-accent-rgb), 0.3)" where --sui-accent-rgb = "0, 212, 255".
  // The inner group must be greedy: `[^)]+` cannot span the nested `var(...)`,
  // which silently reduced the triplet branch below to dead code.
  m = v.match(/^rgba?\((.+)\)$/s);
  if (m) {
    const inner = m[1].trim();
    // The triplet ref may itself carry a var() fallback, e.g.
    // "rgba(var(--a-rgb, var(--b-rgb)), 0.1)".
    const varTripletMatch = inner.match(
      /^var\((--[\w-]+)(?:\s*,\s*(.+))?\)\s*,\s*([\d.]+)\s*$/s,
    );
    if (varTripletMatch) {
      const alpha = parseFloat(varTripletMatch[3]);
      const triplet =
        tokens[varTripletMatch[1]] ??
        resolveTriplet(varTripletMatch[2], tokens, depth + 1);
      if (triplet) {
        const parts = map(parseFloat, triplet.split(","));
        if (
          parts.length >= 3 &&
          every((n: number) => !Number.isNaN(n), parts.slice(0, 3))
        ) {
          return [parts[0], parts[1], parts[2], alpha];
        }
      }
      return null;
    }
    const parts = map(parseFloat, inner.split(","));
    if (
      parts.length >= 3 &&
      every((n: number) => !Number.isNaN(n), parts.slice(0, 3))
    ) {
      return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
    }
    return null;
  }

  return null;
}

// Composite a (possibly translucent) foreground over an opaque background.
export function over(fg: RGBA, bg: RGB): RGB {
  if (fg[3] >= 1) return [fg[0], fg[1], fg[2]];
  return map(
    (i: number) => fg[i] * fg[3] + bg[i] * (1 - fg[3]),
    [0, 1, 2],
  ) as RGB;
}

export function relLuminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [lighter, darker] = sortBy(
    (n: number) => -n,
    [relLuminance(a), relLuminance(b)],
  );
  return (lighter + 0.05) / (darker + 0.05);
}
