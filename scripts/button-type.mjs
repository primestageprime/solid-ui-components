// ============================================
// button-type — every raw `<button>` in SUI says its `type` out loud.
//
// A `<button>` with no `type` is a SUBMIT button. Inside a consumer's own
// `<form>`, a SUI chevron, a reset glyph or a tab would then submit the form
// on click and become the form's default button for Enter. The owner rule
// (thorcasting, 2026-10-21): every SUI button renders `type="button"` unless
// the caller passes another `type`.
//
// `typelessButtons(source)` returns the 1-based line of each `<button` tag in
// a TSX source that has no `type=` attribute. Comments are blanked first, with
// their newlines kept, so a `<button>` mentioned in prose is not a tag and the
// line numbers stay true. `scripts/button-type.test.ts` runs it over `src/`.
// ============================================

/** Blank every comment, keeping newlines so line numbers survive. */
const blankComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:"'`])\/\/[^\n]*/g,
      (c, lead) => lead + " ".repeat(c.length - lead.length),
    );

/** The text of the opening tag that starts at `start`, braces balanced. */
const openingTag = (source, start) => {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else if (ch === ">" && depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
};

/** 1-based lines of every `<button` tag without a `type=` attribute. */
export const typelessButtons = (source) => {
  const text = blankComments(source);
  return [...text.matchAll(/<button(?=[\s>])/g)]
    .filter((m) => !/\stype=/.test(openingTag(text, m.index)))
    .map((m) => text.slice(0, m.index).split("\n").length);
};
