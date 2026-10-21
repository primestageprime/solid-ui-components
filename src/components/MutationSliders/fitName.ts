// ============================================
// MutationSliders fitName — pure, headless, no Solid, no DOM beyond the
// optional canvas measurer.
//
// A dial header is a fixed 88px column, so a name shortens to fit it. The
// order is the owner's: whole name → first initial + last name → last name
// alone → last name cut with an ellipsis. A one-word name goes straight to the
// ellipsis. The width is MEASURED (a canvas `measureText` with the header's
// computed font), never guessed from a character count.
// ============================================

/** The width of a string in px, in the header's font. */
export type Measure = (text: string) => number;

const ELLIPSIS = "…";

/** The forms of a name, longest first: full, "D. Whitfield", "Whitfield". */
export const nameForms = (name: string): readonly string[] => {
  const words = name.trim().split(/\s+/).filter((w) => w !== "");
  if (words.length < 2) return [name.trim()];
  const last = words[words.length - 1];
  return [words.join(" "), `${words[0][0]}. ${last}`, last];
};

/** The longest prefix of `text` plus an ellipsis that fits `width`. */
export const ellipsize = (text: string, width: number, measure: Measure): string => {
  const cut = Array.from({ length: text.length }, (_, i) => text.length - i)
    .map((n) => `${text.slice(0, n)}${ELLIPSIS}`)
    .find((form) => measure(form) <= width);
  return cut ?? ELLIPSIS;
};

/** The first form of `name` that fits `width`, else the last name cut short. */
export const fitName = (name: string, width: number, measure: Measure): string => {
  const forms = nameForms(name);
  return (
    forms.find((form) => measure(form) <= width) ??
    ellipsize(forms[forms.length - 1], width, measure)
  );
};

let shared: CanvasRenderingContext2D | null | undefined;

/**
 * A measurer for `font` (a CSS font shorthand) on one shared canvas, or `null`
 * where there is no canvas (jsdom, SSR) — the caller then shows the full name.
 */
export const measurerFor = (font: string): Measure | null => {
  if (typeof document === "undefined") return null;
  shared ??= document.createElement("canvas").getContext("2d") ?? null;
  const ctx = shared;
  if (ctx === null || typeof ctx.measureText !== "function") return null;
  return (text) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
};
