// ============================================
// fixedCardRules — pure rules behind FixedCard (Depth 0, no imports).
// Tags: does:view, data:scalar
// Two questions, both decided from plain numbers and flags so they test
// without a DOM:
//   isClipped — does the card's content overflow its fixed body box?
//   moreOf    — what (if anything) the card's "More" button opens.
// ============================================

/** The four numbers a clip test reads off the body box. */
export interface BoxMeasure {
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

/** Sub-pixel layout rounds either way, so one pixel of overflow is noise. */
const TOLERANCE_PX = 1;

/** True when the content overflows the box in either direction. */
export const isClipped = (m: BoxMeasure): boolean =>
  m.scrollHeight > m.clientHeight + TOLERANCE_PX ||
  m.scrollWidth > m.clientWidth + TOLERANCE_PX;

/**
 * What the "More" button opens:
 * - `"detail"`: the caller's `detail`, whenever one is given;
 * - `"summary"`: the card's own content in full, when it is clipped and there
 *   is no `detail`, so nothing the card hides is ever out of reach;
 * - `"none"`: no button, because everything shows already.
 */
export type MoreContent = "none" | "detail" | "summary";

export const moreOf = (hasDetail: boolean, clipped: boolean): MoreContent => {
  if (hasDetail) return "detail";
  return clipped ? "summary" : "none";
};
