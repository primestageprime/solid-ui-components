// ============================================
// slotStackLabels — pure placement of the AMOUNT on each drawn part of a
// slot stack (ADR 0010: parts and pixel boxes in, label boxes out; tested as
// a table, without a DOM).
//
// Peter, 2026-11-10: "Show a treatment where the individual amounts for each
// bar are shown. If the bar is big enough, nest the amount in the bar itself.
// If not, show a callout with the amount. Make sure the amounts are visible
// and legible." And, of the result: "the annotated numbers on the columns
// are good. But only show them on hover. (both the nested and the flyout
// ones)". WHICH columns are labelled is the caller's (`labelledPeriods`);
// this file only places the labels of the columns it is handed.
//
// THE RULE, per drawn part:
//
//   nested    when the part is at least 15px tall and wider than its text
//             plus 4px each side: the amount sits in the middle of the part
//   callout   otherwise: the amount sits beside the column on a leader line
//
// A callout goes to the RIGHT of its column, in the gap before the next
// column (or the plot edge). Where that gap cannot hold the text it FLIPS to
// the left. Where neither gap can (a narrow panel's 16px gaps), the callouts
// lie OVER the neighbouring columns, each on a chip of ground, on the side
// where the plot has room: over the neighbours and never over the column
// itself, whose parts are what the amounts are about. Callouts of one column
// keep a line apart and stay inside the plot.
//
// What the figure is drawn ON decides its ink (`tone`):
//
//   on-solid    a solid fill: figures in the ground's colour
//   on-stripes  a hatch: light figures on a dark chip
//   on-open     a dashed (unfilled) or translucent area: light figures
//   callout     beside the column: light figures with a ground halo
//
// A plus marks overflow. A minus marks what is still unfilled in a container
// that holds something; an EMPTY container states its expectation plainly.
//
// WHICH PARTS carry a figure is the caller's too (`parts`). "all" (the
// default) is the rule above. "present" labels only the money that is there:
// the filled part and the overflow, each as a plain amount with no sign; the
// unfilled part keeps its dashed outline and carries no figure. Peter,
// 2026-11-11: "it's confusing to see + and - numbers. just show the values
// that are there, not the shortfalls for now".
//
// Text is never measured (no DOM): its width is `text.length * charWidth`,
// the width of 11px tabular figures, rounded up.
// ============================================
import { filter, flatMap, map, sortBy } from "../../fn";
import type { SlotBox, SlotStackSlot } from "./slotStackGeometry";

/** Which columns carry their amounts. */
export type SlotStackLabels = "hover" | "always" | "never";

/**
 * Which parts of a labelled column carry a figure: "all" (filled, unfilled
 * and overflow, the last two signed) or "present" (filled and overflow only,
 * unsigned: the amounts that are there).
 */
export type SlotStackLabelParts = "all" | "present";

export type SlotLabelTone =
  | "on-solid"
  | "on-stripes"
  | "on-open"
  | "callout"
  | "cap";

/** A pixel box. */
export interface LabelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One amount, placed. */
export interface SlotLabel {
  /** Stable per part: series, period, part and status. */
  readonly key: string;
  readonly period: number;
  /** The part the amount belongs to; "column" for the line above a column. */
  readonly part: "filled" | "unfilled" | "overflow" | "column";
  readonly text: string;
  readonly kind: "nested" | "callout" | "cap";
  /** Which side of its column a callout sits on; null for a nested label. */
  readonly side: "right" | "left" | null;
  /**
   * The callout found no gap wide enough and lies OVER the neighbouring
   * columns, on a chip. Never true for a nested label.
   */
  readonly over: boolean;
  readonly tone: SlotLabelTone;
  /** The text's anchor point: `y` is the baseline. */
  readonly x: number;
  readonly y: number;
  readonly anchor: "start" | "middle" | "end";
  /** The text's own box: what must not overlap anything. */
  readonly box: LabelRect;
  /** A ground chip behind the text, or null. */
  readonly chip: LabelRect | null;
  /** A leader line's points ("x,y x,y x,y"), or null. */
  readonly leader: string | null;
}

export interface SlotLabelOptions {
  /** The plot's pixel box: no label leaves it. */
  readonly plot: LabelRect;
  /** A part's amount as text (the sign is added here, not by the caller). */
  readonly format: (value: number) => string;
  /** Width of one character of the label font, in px. Default 6.5. */
  readonly charWidth?: number;
  /**
   * The LINE ABOVE a labelled column ("$79k of $65k"), or null for none.
   * It is the caller's sentence about the column's own two values; this file
   * only seats it.
   */
  readonly cap?: (period: number) => string | null;
  /** Which parts carry a figure. Default "all". */
  readonly parts?: SlotStackLabelParts;
}

/** The line above a column keeps this far from the column's top. */
const CAP_GAP = 4;

/** A nested label needs a part at least this tall. */
export const SLOT_LABEL_MIN_HEIGHT = 15;
/** ...and this much room each side of its text. */
export const SLOT_LABEL_PAD = 4;
/** One label line: callouts of a column keep this far apart. */
export const SLOT_LABEL_LINE = 13;
/** The baseline's drop below a label's centre, for 11px figures. */
const BASELINE = 4;
/** A callout's text starts this far from its column. */
const CALLOUT_REACH = 10;
/** Room a callout keeps before the next column or the plot edge. */
const CALLOUT_CLEAR = 2;

const MINUS = "−";

/**
 * Which periods are labelled: the hovered one, all of them, or none. The
 * same pointer that expands a column labels it.
 */
/**
 * The line above a column, from the column's OWN slot as the caller states
 * it: "<arrived> of <expected>", where arrived is the slot's filled plus its
 * overflow (the two parts that are money in hand), or "<expected-only word>
 * <expected>" when nothing has arrived. Never a sum over the series.
 */
export const slotCapText = (
  total: SlotStackSlot,
  format: (value: number) => string,
  words: { readonly of: string; readonly expectedOnly: string },
): string => {
  const arrived = total.filled + total.overflow;
  return arrived > 0
    ? `${format(arrived)} ${words.of} ${format(total.expected)}`
    : `${words.expectedOnly} ${format(total.expected)}`;
};

export const labelledPeriods = (
  labels: SlotStackLabels,
  hovered: number | null,
): ((period: number) => boolean) =>
  labels === "always"
    ? () => true
    : labels === "never"
      ? () => false
      : (period) => period === hovered;

interface Part {
  readonly key: string;
  readonly box: SlotBox;
  readonly part: "filled" | "unfilled" | "overflow";
  readonly text: string;
  readonly y: number;
  readonly height: number;
  readonly tone: Exclude<SlotLabelTone, "callout">;
}

/** Every drawn part of a slot, top first, with its amount as text. */
const partsOf = (
  box: SlotBox,
  format: (value: number) => string,
  which: SlotStackLabelParts,
): Part[] => {
  const { placed } = box;
  const signed = which === "all";
  const id = `${placed.seriesId}-${placed.slot.period}`;
  const fills = map(
    (fill): Part => ({
      key: `${id}-${fill.part}-${fill.status ?? "plain"}`,
      box,
      part: fill.part,
      text: `${signed && fill.part === "overflow" ? "+" : ""}${format(fill.value)}`,
      y: fill.y,
      height: fill.height,
      tone:
        fill.paint === "solid"
          ? "on-solid"
          : fill.part === "overflow"
            ? "on-stripes"
            : "on-open",
    }),
    box.fills,
  );
  const unfilled: Part[] =
    box.dashed === null || !signed
      ? []
      : [
          {
            key: `${id}-unfilled-plain`,
            box,
            part: "unfilled",
            text: `${placed.slot.filled > 0 ? MINUS : ""}${format(placed.slot.unfilled)}`,
            y: box.expectedTop,
            height: box.fillTop - box.expectedTop,
            tone: "on-open",
          },
        ];
  return sortBy((p: Part) => p.y, [...fills, ...unfilled]);
};

/**
 * Centres for a column's callouts: each as near its part as it can be while
 * keeping `SLOT_LABEL_LINE` from the one above and staying inside
 * [top, bottom]. Pushed down first, then back up from the floor.
 */
export const spreadCentres = (
  wanted: readonly number[],
  top: number,
  bottom: number,
): number[] => {
  const half = SLOT_LABEL_LINE / 2;
  const down: number[] = [];
  for (const y of wanted) {
    const floor = down.length === 0 ? top + half : down[down.length - 1] + SLOT_LABEL_LINE;
    down.push(Math.max(y, floor));
  }
  for (let i = down.length - 1; i >= 0; i -= 1) {
    const ceiling = i === down.length - 1 ? bottom - half : down[i + 1] - SLOT_LABEL_LINE;
    down[i] = Math.min(down[i], ceiling);
  }
  return down;
};

/**
 * The labels of the given slot boxes. `all` is every box the chart draws:
 * the neighbours a callout must not reach into.
 */
export const placeSlotLabels = (
  labelled: readonly SlotBox[],
  all: readonly SlotBox[],
  options: SlotLabelOptions,
): readonly SlotLabel[] => {
  const charWidth = options.charWidth ?? 6.5;
  const widthOf = (text: string): number => Math.ceil(text.length * charWidth);
  const { plot } = options;
  const plotRight = plot.x + plot.width;
  const plotBottom = plot.y + plot.height;
  /* Columns are placed LEFT TO RIGHT, and each one sees the callouts already
     set beside the column before it: with every column labelled, a column's
     right-hand callouts and the next column's left-hand ones would otherwise
     land in the same gap. */
  const periods = sortBy(
    (period: number) => period,
    [...new Set(map((b: SlotBox) => b.placed.slot.period, labelled))],
  );
  let taken = plot.x;

  const columnLabels = (period: number): SlotLabel[] => {
    const column = filter((b: SlotBox) => b.placed.slot.period === period, labelled);
    const left = column[0].x;
    const right = left + column[0].width;
    const centre = left + column[0].width / 2;
    const parts = sortBy(
      (p: Part) => p.y,
      flatMap(
        (b: SlotBox) => partsOf(b, options.format, options.parts ?? "all"),
        column,
      ),
    );
    const nests = (p: Part): boolean =>
      p.height >= SLOT_LABEL_MIN_HEIGHT &&
      p.box.width >= widthOf(p.text) + 2 * SLOT_LABEL_PAD;

    const nested = map((p: Part): SlotLabel => {
      const width = widthOf(p.text);
      const middle = p.y + p.height / 2;
      const box = { x: centre - width / 2, y: middle - SLOT_LABEL_LINE / 2, width, height: SLOT_LABEL_LINE };
      return {
        key: p.key,
        period,
        part: p.part,
        text: p.text,
        kind: "nested",
        side: null,
        tone: p.tone,
        x: centre,
        y: middle + BASELINE,
        anchor: "middle",
        over: false,
        box,
        chip:
          p.tone === "on-stripes"
            ? { x: box.x - SLOT_LABEL_PAD, y: box.y, width: width + 2 * SLOT_LABEL_PAD, height: SLOT_LABEL_LINE }
            : null,
        leader: null,
      };
    }, filter(nests, parts));

    /* The line above the column: centred, a few px over the column's top,
       held inside the plot sideways. Where the column reaches too near the
       plot's top for a line above it, the line sits just inside the top, on
       a chip (it then lies over the column's own top). Callouts are kept
       below it (see `ceiling`). */
    const capText = options.cap?.(period) ?? null;
    const caps: SlotLabel[] = [];
    if (capText !== null) {
      const width = widthOf(capText);
      const columnTop = Math.min(...map((b: SlotBox) => b.top, column));
      const above = columnTop - CAP_GAP - SLOT_LABEL_LINE;
      const fits = above >= plot.y;
      const y = fits ? above : plot.y;
      const x = Math.min(
        Math.max(centre, plot.x + width / 2 + SLOT_LABEL_PAD),
        plotRight - width / 2 - SLOT_LABEL_PAD,
      );
      const box = { x: x - width / 2, y, width, height: SLOT_LABEL_LINE };
      caps.push({
        key: `${period}-cap`,
        period,
        part: "column",
        text: capText,
        kind: "cap",
        side: null,
        over: !fits,
        tone: "cap",
        x,
        y: y + SLOT_LABEL_LINE / 2 + BASELINE,
        anchor: "middle",
        box,
        chip: fits
          ? null
          : { x: box.x - SLOT_LABEL_PAD, y, width: width + 2 * SLOT_LABEL_PAD, height: SLOT_LABEL_LINE },
        leader: null,
      });
    }
    const capBox = caps.length > 0 ? caps[0].box : null;

    /* A nested figure the line would lie over gives way to it: it becomes a
       callout instead. Only possible when the line sits inside the top. */
    const clear = (p: Part): boolean =>
      capBox === null ||
      p.y + p.height / 2 - SLOT_LABEL_LINE / 2 >= capBox.y + capBox.height;
    const seated = filter((l: SlotLabel) => {
      const centreY = l.box.y;
      return capBox === null || centreY >= capBox.y + capBox.height;
    }, nested);
    const loose = filter((p: Part) => !nests(p) || !clear(p), parts);
    if (loose.length === 0) return [...caps, ...seated];

    /* The room each side: up to the nearest other column, or the plot edge. */
    const others = filter((b: SlotBox) => b.placed.slot.period !== period, all);
    const nextLeft = Math.min(plotRight, ...map((b: SlotBox) => b.x, filter((b: SlotBox) => b.x >= right, others)));
    const prevRight = Math.max(taken, ...map((b: SlotBox) => b.x + b.width, filter((b: SlotBox) => b.x + b.width <= left, others)));
    const widest = Math.max(...map((p: Part) => widthOf(p.text), loose));
    const need = CALLOUT_REACH + widest + CALLOUT_CLEAR;
    /* In the gap on the right; else in the gap on the left; else, where no
       gap can hold the text (a narrow panel), OVER the neighbours on
       whichever side the plot has room, each figure on a chip. Over the
       neighbours rather than over the column itself: the hovered column's
       own parts are what the amounts are about, so they stay in view. */
    const fitsRight = nextLeft - right >= need;
    const fitsLeft = left - prevRight >= need;
    const over = !fitsRight && !fitsLeft;
    const side: "right" | "left" = fitsRight
      ? "right"
      : fitsLeft
        ? "left"
        : plotRight - right >= need || plotRight - right >= left - plot.x
          ? "right"
          : "left";

    /* Callouts start under the line above the column wherever the two could
       meet: the line is centred on the column and may be wider than it. */
    const textFrom = side === "right" ? right + CALLOUT_REACH : left - CALLOUT_REACH - widest;
    const meets =
      capBox !== null &&
      textFrom < capBox.x + capBox.width + SLOT_LABEL_PAD &&
      capBox.x - SLOT_LABEL_PAD < textFrom + widest;
    const ceiling = meets && capBox !== null ? capBox.y + capBox.height : plot.y;
    const centres = spreadCentres(
      map((p: Part) => p.y + p.height / 2, loose),
      ceiling,
      plotBottom,
    );
    const dir = side === "right" ? 1 : -1;
    const edge = side === "right" ? right : left;
    const callouts = map((p: Part, i: number): SlotLabel => {
      const width = widthOf(p.text);
      const at = centres[i];
      const from = Math.min(Math.max(p.y + p.height / 2, p.y), p.y + p.height);
      const textX = edge + dir * CALLOUT_REACH;
      return {
        key: p.key,
        period,
        part: p.part,
        text: p.text,
        kind: "callout",
        side,
        tone: "callout",
        x: textX,
        y: at + BASELINE,
        anchor: side === "right" ? "start" : "end",
        over,
        box: {
          x: side === "right" ? textX : textX - width,
          y: at - SLOT_LABEL_LINE / 2,
          width,
          height: SLOT_LABEL_LINE,
        },
        chip: over
          ? {
              x: (side === "right" ? textX : textX - width) - SLOT_LABEL_PAD,
              y: at - SLOT_LABEL_LINE / 2,
              width: width + 2 * SLOT_LABEL_PAD,
              height: SLOT_LABEL_LINE,
            }
          : null,
        leader: `${edge + dir},${from} ${edge + dir * 5},${at} ${edge + dir * 8},${at}`,
      };
    }, loose);
    return [...caps, ...seated, ...callouts];
  };

  return flatMap((period: number): SlotLabel[] => {
    const placed = columnLabels(period);
    taken = Math.max(
      taken,
      ...map(
        (label: SlotLabel) => label.box.x + label.box.width,
        filter((label: SlotLabel) => label.side === "right", placed),
      ),
    );
    return placed;
  }, periods);
};
