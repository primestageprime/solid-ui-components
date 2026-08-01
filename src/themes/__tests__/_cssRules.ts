// ============================================================================
// Minimal CSS rule scanner (test-only)
// ============================================================================
// Enough of a parser to answer "which rules match this element, and in what
// document order" for our own hand-written stylesheets. Not a general CSS
// parser: it assumes no strings containing braces, which holds across
// `src/themes/*.css`.
//
// At-rule blocks (`@media`, `@supports`) are flattened — their inner rules are
// emitted in document order alongside top-level rules. That is correct for the
// button contrast contract, which has no media-conditional button colours; if
// one is ever added, this scanner will over-report it as unconditional and the
// contract will be conservative rather than blind.
// ============================================================================

export interface CssRule {
  /** A single selector (comma-separated lists are split into one rule each). */
  readonly selector: string;
  /** Declarations, lowercased property → raw value. Later wins within a rule. */
  readonly decls: Readonly<Record<string, string>>;
  /** 0-based position in the effective stylesheet, for document-order tie-breaks. */
  readonly order: number;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseDecls(body: string): Record<string, string> {
  const decls: Record<string, string> = {};
  // Split on `;` at depth 0 so `rgba(var(--x), .1)` and nested parens survive.
  let depth = 0;
  let buf = "";
  const flush = () => {
    const i = buf.indexOf(":");
    if (i > 0) {
      const prop = buf.slice(0, i).trim().toLowerCase();
      const value = buf.slice(i + 1).trim();
      if (prop && value) decls[prop] = value;
    }
    buf = "";
  };
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === ";" && depth === 0) flush();
    else buf += ch;
  }
  flush();
  return decls;
}

/**
 * Scan a stylesheet into a flat, document-ordered list of single-selector
 * rules. `@import`/`@charset` statements and at-rule preludes are skipped;
 * blocks nested inside at-rules are flattened into the same stream.
 */
export function parseRules(css: string): CssRule[] {
  const src = stripComments(css);
  const rules: CssRule[] = [];
  let i = 0;
  let preludeStart = 0;

  const scanBlock = (end: number) => {
    while (i < end) {
      const ch = src[i];
      if (ch === "{") {
        const prelude = src.slice(preludeStart, i).trim();
        // Find the matching close brace.
        let depth = 1;
        let j = i + 1;
        while (j < end && depth > 0) {
          if (src[j] === "{") depth++;
          else if (src[j] === "}") depth--;
          j++;
        }
        const bodyEnd = j - 1;
        if (prelude.startsWith("@")) {
          // Conditional group rule — descend, keeping document order.
          const savedPrelude = preludeStart;
          i = i + 1;
          preludeStart = i;
          scanBlock(bodyEnd);
          preludeStart = savedPrelude;
        } else if (prelude) {
          const decls = parseDecls(src.slice(i + 1, bodyEnd));
          for (const selector of prelude.split(",")) {
            const s = selector.trim();
            if (s) rules.push({ selector: s, decls, order: rules.length });
          }
        }
        i = j;
        preludeStart = i;
      } else if (ch === "}") {
        i++;
        preludeStart = i;
      } else if (ch === ";") {
        // Statement at-rule (@import, @charset) — discard.
        i++;
        preludeStart = i;
      } else {
        i++;
      }
    }
  };

  scanBlock(src.length);
  return rules;
}

/**
 * Approximate selector specificity as "number of class-level components":
 * classes, attribute selectors and pseudo-classes, counting the argument of
 * `:not()` rather than `:not()` itself (per the spec). Element and pseudo-
 * element components are ignored — our button selectors have none, and every
 * rule we compare sits in the same origin, so this is enough to rank them.
 */
export function specificity(selector: string): number {
  const inner = selector.replace(/:not\(([^)]*)\)/g, "$1");
  const classes = inner.match(/\.[\w-]+/g)?.length ?? 0;
  const attrs = inner.match(/\[[^\]]*\]/g)?.length ?? 0;
  const pseudos =
    inner.replace(/\[[^\]]*\]/g, "").match(/(?<!:):[\w-]+/g)?.length ?? 0;
  return classes + attrs + pseudos;
}

/** The class names a compound selector requires, e.g. `.a.b:hover` → [a, b]. */
export function requiredClasses(selector: string): string[] {
  return (
    selector
      .replace(/:not\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .match(/\.[\w-]+/g)
      ?.map((c) => c.slice(1)) ?? []
  );
}

/** True if the selector targets a single element (no descendant/sibling combinators). */
export function isCompound(selector: string): boolean {
  return !/[\s>+~]/.test(selector.replace(/:not\([^)]*\)/g, "").trim());
}
