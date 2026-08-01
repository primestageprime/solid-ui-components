// ============================================
// Dev-only guard for TEMPLATED MODIFIER CLASSES.
//
// Layout primitives build their classes by string template:
//
//     if (local.gap) classList.push(`row--gap-${local.gap}`);
//
// which means ANY value produces a class name, and a value with no matching CSS
// rule renders as *nothing at all*. Not a crash, not a fallback — silently no
// spacing. A consumer passing `gap="md"` to `Row` got `.row--gap-md`, a class
// that did not exist at the time, and three pages rendered at zero gap for two
// weeks before anyone noticed. (`md` and `lg` are real steps again as of
// 0.129.0 — the guard is scale-agnostic and asks the stylesheet, so it needed
// no change; `xl` is today's equivalent dead value.)
//
// The type system is supposed to catch that, and usually does. It didn't here
// because a consumer had no `typecheck` script and its bundler strips types
// rather than checking them — so the one place left to catch it is the moment
// of render. That is what this does.
//
// Deliberately NOT a runtime validation of the prop against a hard-coded list:
// the CSS is the source of truth for which modifiers exist, so asking the
// stylesheet cannot drift from it the way a duplicated list would.
//
// Dev only. `import.meta.env.DEV` is statically replaced at build time, so the
// whole thing dead-codes out of a production bundle.
// ============================================
import { isServer } from "solid-js/web";

/** Class names already reported, so a re-render can't spam the console. */
const warned = new Set<string>();

/** Every class selector defined across the loaded stylesheets. */
let known: Set<string> | null = null;

/**
 * Collect defined class names from `document.styleSheets`.
 *
 * Returns null when nothing is loaded yet — the caller must NOT cache that as
 * "no classes exist", or the first render (before stylesheets land) would
 * report every modifier in the app as missing.
 */
const collectKnownClasses = (): Set<string> | null => {
  const out = new Set<string>();
  let sawAnyRule = false;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      // Cross-origin stylesheets throw on access. Not ours; skip.
      const r = sheet.cssRules;
      if (!r) continue;
      rules = r;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      const selector = (rule as CSSStyleRule).selectorText;
      if (!selector) continue;
      sawAnyRule = true;
      // `.a--b`, `.a--b:hover`, `.x .a--b` — take every class token.
      for (const m of selector.matchAll(/\.([A-Za-z0-9_-]+)/g)) out.add(m[1]);
    }
  }
  return sawAnyRule ? out : null;
};

/**
 * Warn when a templated modifier class has no CSS rule behind it.
 *
 * @param component  e.g. "Row" — what the consumer wrote
 * @param prop       e.g. "gap"
 * @param value      e.g. "md"
 * @param className  e.g. "row--gap-md" — the class that was emitted
 */
export const assertModifierClass = (
  component: string,
  prop: string,
  value: string,
  className: string,
): void => {
  if (!import.meta.env?.DEV) return;
  if (isServer || typeof document === "undefined") return;
  if (warned.has(className)) return;

  // Stylesheets can land after first paint; re-read until we see rules, and
  // never cache an empty result.
  if (!known) {
    known = collectKnownClasses();
    if (!known) return; // nothing loaded yet — try again on a later render
  }
  if (known.has(className)) return;

  // A MISS IS NOT YET EVIDENCE. The cached set may have been built while only
  // some stylesheets had loaded — caching that snapshot and trusting it reports
  // perfectly good classes as missing, which is how a warning earns itself a
  // permanent mute. (Observed doing exactly that: `.stack--gap-sm` flagged on a
  // page where it plainly exists, because the set was cached before Layout.css
  // arrived.) Re-collect before accusing anyone.
  known = collectKnownClasses() ?? known;
  if (known.has(className)) return;

  warned.add(className);
  console.warn(
    `[SUI] <${component} ${prop}="${value}"> emitted ".${className}", which no ` +
      `stylesheet defines — so this ${prop} renders as nothing at all.\n` +
      `      Check the accepted values for ${component}.${prop}; a value outside ` +
      `the scale produces a dead class rather than an error.\n` +
      `      Prefer a named curried variant over passing ${prop} at the call site.`,
  );
};
