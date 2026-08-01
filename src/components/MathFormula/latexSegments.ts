// lastReviewedAt: 2026-06-16
// lastReviewedBy: adlai.arnold
// ============================================
// latexSegments — pure LaTeX splitter (zero CSS, no DOM, no KaTeX).
// Splits a display formula at TOP-LEVEL additive (`+`, `-`) and the
// trailing relational (`=`) operators so each term can be rendered as
// its own inline KaTeX element inside a flex-wrap container. Depth is
// tracked across `{}`, `()`, `[]`, and `\left … \right`, so the inside
// of a `\frac{a}{b}`, a `\var{id}{x}`, or any parenthesised group is
// never split.
// ============================================

import { some } from "../../fn";

/** A single piece of a split formula: either a renderable term or a
 *  binary operator that sits between terms. */
export type FormulaSegment =
  | { readonly kind: "term"; readonly latex: string }
  | { readonly kind: "op"; readonly latex: string };

/** Characters that open a depth level. */
const OPENERS = new Set(["{", "(", "[", "|"]);
/** Characters that close a depth level. */
const CLOSERS = new Set(["}", ")", "]"]);

/** Top-level operators we break on, longest-match first so `\left`/`\right`
 *  depth bookkeeping is handled separately. Only single-char binary
 *  operators appear in the compliance formulas (`+`, `-`, `=`). */
const BREAK_OPS = new Set(["+", "-", "="]);

/**
 * Does the substring at `i` start a `\left…` (depth+1) or `\right…`
 * (depth-1) control sequence? Returns the delta and the number of extra
 * characters consumed (the command name + its delimiter), or `null`.
 */
function leftRight(
  src: string,
  i: number,
): { delta: number; consumed: number } | null {
  if (src[i] !== "\\") return null;
  if (src.startsWith("\\left", i)) return { delta: 1, consumed: 5 };
  if (src.startsWith("\\right", i)) return { delta: -1, consumed: 6 };
  return null;
}

/**
 * Is the `-`/`+` at index `i` a *binary* operator (something to break on)
 * rather than a unary sign? We treat it as binary only when the previous
 * non-space, non-`{(` token looks like the end of a term (a digit, letter,
 * `}`, `)`, `]`). A leading `-x` or a `(-b …)` stays inside its term.
 */
function isBinary(beforeTrimmed: string): boolean {
  const trimmed = beforeTrimmed.trimEnd();
  const last = trimmed.slice(-1);
  return last !== "" && !OPENERS.has(last) && last !== "\\";
}

/**
 * Split a LaTeX display formula into ordered {@link FormulaSegment}s.
 *
 * Operators (`+`, `-`, `=`) at brace/paren/`\left\right` depth 0 become
 * `op` segments; the text between them becomes trimmed `term` segments.
 * Empty terms are dropped. A formula with no top-level operator yields a
 * single `term`, so the caller can always render the result the same way.
 *
 * @example
 * splitLatexSegments("a + \\frac{b}{c} = d")
 * // → [{term a}, {op +}, {term \frac{b}{c}}, {op =}, {term d}]
 */
export function splitLatexSegments(latex: string): FormulaSegment[] {
  const segments: FormulaSegment[] = [];
  let depth = 0;
  let termStart = 0;
  let i = 0;

  const pushTerm = (end: number): void => {
    const raw = latex.slice(termStart, end).trim();
    if (raw.length > 0) segments.push({ kind: "term", latex: raw });
  };

  while (i < latex.length) {
    const ch = latex[i];

    // Skip escaped specials like \{ \} \( so they don't move depth, and
    // handle \left / \right depth changes.
    if (ch === "\\") {
      const lr = leftRight(latex, i);
      if (lr) {
        depth += lr.delta;
        i += lr.consumed;
        continue;
      }
      // Any other escape (\frac, \times, \var, \{, …): consume the
      // backslash + the following char so an escaped brace can't shift depth.
      i += 2;
      continue;
    }

    if (OPENERS.has(ch)) {
      depth += 1;
      i += 1;
      continue;
    }
    if (CLOSERS.has(ch)) {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }

    if (depth === 0 && BREAK_OPS.has(ch)) {
      const before = latex.slice(termStart, i);
      // `=` is always relational; `+`/`-` only when binary.
      if (ch === "=" || isBinary(before)) {
        pushTerm(i);
        segments.push({ kind: "op", latex: ch });
        termStart = i + 1;
        i += 1;
        continue;
      }
    }

    i += 1;
  }

  pushTerm(latex.length);
  return segments;
}

/**
 * Whether a formula actually splits into more than one renderable piece.
 * Used to decide if the flex-wrap layout buys anything over a single block.
 */
export function hasSplittableOperators(latex: string): boolean {
  return some((s) => s.kind === "op", splitLatexSegments(latex));
}
