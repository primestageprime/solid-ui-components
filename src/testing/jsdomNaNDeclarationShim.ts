// Test-setup shim — jsdom 30 and Kobalte's `calc(NaN%)`.
//
// WHY THIS FILE EXISTS
//
// `@kobalte/core` (0.13.12 through 2.0.0-alpha.1) builds a slider thumb's
// offset as `` [context.startEdge()]: `calc(${position() * 100}%)` ``. On the
// FIRST render `position()` is `NaN` for every slider and every input: thumbs
// register themselves in a `createEffect` that runs AFTER the style getter, so
// `index()` is still `-1`, `values()[-1]` is `undefined`, and
// `undefined - min` is `NaN`. The declaration jsdom receives is therefore
// `left: calc(NaN%)`.
//
// A REAL BROWSER DROPS THAT DECLARATION as an invalid value and renders the
// slider correctly — the thumb also carries `display: none` at that instant,
// so nothing is ever visible in the wrong place. jsdom 26 (cssstyle 4) matched
// the browser and dropped it silently. jsdom 30 (css-tree 3) THROWS
// `SyntaxError: ")" is expected` instead, which turns every slider mount into
// a failed test.
//
// SUI's Slider is not the cause. It forwards `min`, `max`, `value` and `step`
// to Kobalte unchanged and does no arithmetic of its own. SUI's browser build
// also leaves Kobalte external on purpose, so no patch of the dependency can
// reach a consumer — a test-setup shim is the only place the fix fits.
//
// DELETE THIS FILE when Kobalte reads the thumb index before the style getter,
// or when jsdom drops an invalid declaration again. Until then, list it in
// your vitest `setupFiles`:
//
//     setupFiles: [
//       "@primestageprime/solid-ui-components/testing/jsdom-nan-shim",
//     ]

/**
 * Whether a CSS declaration value carries a `NaN`, and so cannot parse.
 *
 * Deliberately narrow: this is the ONLY class of invalid CSS the shim drops.
 * Every other malformed value still reaches jsdom and still throws, because a
 * test that writes real garbage CSS should fail.
 */
export const carriesNaN = (value: unknown): boolean =>
  typeof value === "string" && value.includes("NaN");

/**
 * Wraps `CSSStyleDeclaration.prototype.setProperty` so a `NaN`-bearing value
 * is dropped, exactly as a browser drops it. Every other call is delegated to
 * the original implementation, unchanged.
 *
 * @returns a function that restores the original `setProperty`.
 */
export const installNaNDeclarationShim = (): (() => void) => {
  const original = CSSStyleDeclaration.prototype.setProperty;

  CSSStyleDeclaration.prototype.setProperty = function setProperty(
    this: CSSStyleDeclaration,
    name: string,
    value: string,
    priority?: string,
  ): void {
    // A `NaN` value is dropped, the way a browser drops it. Everything else
    // is delegated unchanged.
    if (carriesNaN(value)) return;
    original.call(this, name, value, priority);
  };

  return () => {
    CSSStyleDeclaration.prototype.setProperty = original;
  };
};

// Installed on import: a `setupFiles` entry is loaded for its side effect, and
// a caller that wants the restore handle can call the installer itself.
if (typeof CSSStyleDeclaration !== "undefined") installNaNDeclarationShim();
