// ============================================
// MarkedSlider labelFit — pure, headless, no Solid, no DOM.
//
// The two figures beside a dial (the delta right of the change line, the old
// amount left of the prior arrowhead) must stay INSIDE the 88px column: a
// neighbour's dial starts at the column edge. Their font is monospace, so a
// line's width is its character count times a fixed advance — no DOM
// measurement is needed, and the answer is the same in a test.
//
// Two moves, in order: shrink the text a step at a time (never below the
// smallest step that still reads), then, if it still does not fit between the
// arrow and the column edge, anchor it to the OTHER edge so it grows back
// toward the track instead of out into the neighbour.
// ============================================
import { PRIOR_LABEL_X, DELTA_X, TRACK_X, VIEW_WIDTH, CHANGE_HALF } from "./geometry";

/** The font sizes a side label steps through, largest first, in px. */
export const LABEL_SIZES = [11, 10, 9, 8, 7, 6] as const;
export type LabelSize = (typeof LABEL_SIZES)[number];

/** The advance of the monospace face, as a share of the font size. */
const MONO_ADVANCE = 0.6;
/** The smallest size tried before the label flips to its far anchor. */
const SMALLEST_BESIDE_ARROW: LabelSize = 8;
/** Clear space kept to the column edge, in px. */
const EDGE = 1;

export interface SideLabelFit {
  readonly size: LabelSize;
  /** `start` grows right of `x`, `end` grows left of it. */
  readonly anchor: "start" | "end";
  readonly x: number;
}

/** The widest line of a label, in characters. */
const widest = (lines: readonly string[]): number =>
  lines.reduce((most, line) => Math.max(most, line.length), 0);

/** The largest size at which `chars` fit in `room` px, or the smallest. */
const sizeFor = (chars: number, room: number, floor: LabelSize): LabelSize =>
  LABEL_SIZES.filter((size) => size >= floor).find(
    (size) => chars * size * MONO_ADVANCE <= room,
  ) ?? LABEL_SIZES[LABEL_SIZES.length - 1];

const fit = (
  lines: readonly string[],
  near: { x: number; room: number; anchor: "start" | "end" },
  far: { x: number; room: number; anchor: "start" | "end" },
): SideLabelFit => {
  const chars = widest(lines);
  const beside = sizeFor(chars, near.room, SMALLEST_BESIDE_ARROW);
  if (chars * beside * MONO_ADVANCE <= near.room || far.room <= near.room) {
    return { size: beside, anchor: near.anchor, x: near.x };
  }
  return { size: sizeFor(chars, far.room, LABEL_SIZES[0]), anchor: far.anchor, x: far.x };
};

/** The delta label: right of the arrow, else right-anchored at the edge. */
export const deltaFit = (lines: readonly string[]): SideLabelFit =>
  fit(
    lines,
    { x: DELTA_X, room: VIEW_WIDTH - EDGE - DELTA_X, anchor: "start" },
    {
      x: VIEW_WIDTH - EDGE,
      room: VIEW_WIDTH - EDGE - (TRACK_X + CHANGE_HALF + EDGE),
      anchor: "end",
    },
  );

/** The prior label: left of the arrow, else left-anchored at the edge. */
export const priorFit = (text: string): SideLabelFit =>
  fit(
    [text],
    { x: PRIOR_LABEL_X, room: PRIOR_LABEL_X - EDGE, anchor: "end" },
    {
      x: EDGE,
      room: TRACK_X - CHANGE_HALF - EDGE - EDGE,
      anchor: "start",
    },
  );
