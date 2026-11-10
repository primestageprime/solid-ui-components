// ============================================
// slotStackGeometry — pure layout for SlotStackChart (ADR 0010: the maths is
// a plain function that prints as a table, so it is tested without a DOM).
//
// One COLUMN per period. Inside a column each series owns a SLOT, and the
// slots stack in series order. A slot is a CONTAINER the size of what was
// expected, and three parts say how it stands (Peter, 2026-11-10):
//
//   filled     solid, from the slot's bottom; its border is solid
//   unfilled   the rest of the container: a dashed outline on the sides and
//              the top, and NO line where the fill ends
//   overflow   hatched, straight out of the container with NO line at the
//              join, and a heavy border on its top and sides only
//
// The caller states every part. Nothing here derives one from another: a
// slot is as tall as `filled + unfilled + overflow`, drawn in that order.
// `expected` is carried for the hover text and the table only.
//
// Two stages, both pure:
//   placeSlots   where each slot sits in its column, in DATA units
//   layoutSlots  the same slots as whole-pixel boxes, fills and border paths
// ============================================
import { filter, flatMap, map } from "../../fn";
import type { Margin } from "../Chart/context";
import {
  STACKED_TIMELINE_NARROW_BELOW,
  STACKED_TIMELINE_SHORT_BELOW,
} from "../StackedTimelineChart/layout";

/** A part's amounts by status. Every figure is a non-negative amount. */
export interface SlotStackClasses {
  /** Drawn solid (overflow: full-strength stripes). */
  readonly invoiced: number;
  /** Drawn translucent (overflow: softer stripes). */
  readonly confirmed: number;
  /** Drawn lighter (overflow: faint stripes). */
  readonly planned: number;
}

/** One series' slot in one period. Every figure is a non-negative amount. */
export interface SlotStackSlot {
  /** The period's x position (a month index, say). */
  readonly period: number;
  /** The container's size. Words and the table only; never laid out. */
  readonly expected: number;
  /** The part of the container that is full: solid, from the bottom. */
  readonly filled: number;
  /** The part of the container still empty: a dashed outline. */
  readonly unfilled: number;
  /** What came on top of the container: hatched, above it. */
  readonly overflow: number;
  /** `filled`, split by status. Omitted, the fill is one solid part. */
  readonly filledByClass?: SlotStackClasses;
  /** `overflow`, split by status. Omitted, the overflow is one hatch. */
  readonly overflowByClass?: SlotStackClasses;
}

/** One series (a job type, say): its name and its slot per period. */
export interface SlotStackSeries {
  readonly id: string;
  readonly label: string;
  readonly slots: readonly SlotStackSlot[];
}

export type SlotStackStatus = "invoiced" | "confirmed" | "planned";

/** Bottom-up order of the statuses inside a part. */
export const SLOT_STACK_STATUSES: readonly SlotStackStatus[] = [
  "invoiced",
  "confirmed",
  "planned",
];

/** What a slot occupies in its column: every part, one on the other. */
export const slotHeight = (slot: SlotStackSlot): number =>
  slot.filled + slot.unfilled + slot.overflow;

/** A slot placed in its column, in DATA units. */
export interface PlacedSlot {
  readonly seriesId: string;
  readonly seriesLabel: string;
  readonly seriesIndex: number;
  readonly slot: SlotStackSlot;
  /** The slot's floor: the top of the slot under it, or 0. */
  readonly base: number;
  /** Where the fill ends. */
  readonly fillTop: number;
  /** Where the container ends and the overflow begins. */
  readonly expectedTop: number;
  /** The slot's top. */
  readonly top: number;
  /** Nothing sits on this slot: it is its column's last non-empty slot. */
  readonly last: boolean;
}

/**
 * Every slot, stacked: per period the slots sit one on the other in series
 * order. An empty slot (no part at all) is left out, so it takes no gap.
 */
export const placeSlots = (
  series: readonly SlotStackSeries[],
): readonly PlacedSlot[] => {
  const floors = new Map<number, number>();
  const placed = flatMap(
    (one: SlotStackSeries, seriesIndex: number) =>
      flatMap((slot: SlotStackSlot): Omit<PlacedSlot, "last">[] => {
        const height = slotHeight(slot);
        if (height <= 0) return [];
        const base = floors.get(slot.period) ?? 0;
        floors.set(slot.period, base + height);
        return [
          {
            seriesId: one.id,
            seriesLabel: one.label,
            seriesIndex,
            slot,
            base,
            fillTop: base + slot.filled,
            expectedTop: base + slot.filled + slot.unfilled,
            top: base + height,
          },
        ];
      }, one.slots),
    series,
  );
  return map(
    (one: Omit<PlacedSlot, "last">) => ({
      ...one,
      last: one.top === floors.get(one.slot.period),
    }),
    placed,
  );
};

/** The tallest column: what the y axis has to hold. */
export const slotStackTallest = (
  series: readonly SlotStackSeries[],
): number => Math.max(0, ...map((p: PlacedSlot) => p.top, placeSlots(series)));

/** What paints a fill: the part it belongs to, and its status. */
export type SlotFillPaint =
  | "solid"
  | "tint"
  | "light"
  | "hatch"
  | "hatch-tint"
  | "hatch-light";

/** One painted rect of a slot, in whole pixels. */
export interface SlotFill {
  readonly part: "filled" | "overflow";
  /** The status it carries, or null for a part that states none. */
  readonly status: SlotStackStatus | null;
  readonly paint: SlotFillPaint;
  /** The amount this rect stands for. */
  readonly value: number;
  readonly y: number;
  readonly height: number;
}

/** One slot, ready to draw: whole-pixel edges, fills and border paths. */
export interface SlotBox {
  readonly placed: PlacedSlot;
  readonly x: number;
  readonly width: number;
  /** Pixel y of each edge; `bottom` is the largest. */
  readonly bottom: number;
  readonly fillTop: number;
  readonly expectedTop: number;
  readonly top: number;
  readonly fills: readonly SlotFill[];
  /** The filled part's solid border, or null when nothing is filled. */
  readonly solid: string | null;
  /** The unfilled part's dashed outline, or null when the container is full. */
  readonly dashed: string | null;
  /** The overflow's heavy border, or null when nothing overflows. */
  readonly heavy: string | null;
}

export interface SlotLayoutOptions {
  /** A column's width as a fraction of its period. */
  readonly band: number;
  /** Pixels of ground between two slots of a column. */
  readonly gap: number;
  /** The container outline's stroke width, in px. */
  readonly thin: number;
  /** The overflow border's stroke width, in px. */
  readonly heavy: number;
}

const PAINT: Record<
  SlotFill["part"],
  Record<SlotStackStatus | "plain", SlotFillPaint>
> = {
  filled: { plain: "solid", invoiced: "solid", confirmed: "tint", planned: "light" },
  overflow: {
    plain: "hatch",
    invoiced: "hatch",
    confirmed: "hatch-tint",
    planned: "hatch-light",
  },
};

/** Hold a pixel y inside a part: `lo` is the part's top, `hi` its bottom. */
const within = (y: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, y));

/**
 * A part's rects between two pixel edges. With no status split it is one
 * rect. With one, the statuses stack bottom-up at their own amounts, held
 * inside the part; whatever the split leaves over is drawn as the plain part.
 */
const fillsOf = (
  part: SlotFill["part"],
  amount: number,
  classes: SlotStackClasses | undefined,
  floor: number,
  bottomPx: number,
  topPx: number,
  ys: (value: number) => number,
): readonly SlotFill[] => {
  if (amount <= 0 || bottomPx <= topPx) return [];
  if (classes === undefined)
    return [
      {
        part,
        status: null,
        paint: PAINT[part].plain,
        value: amount,
        y: topPx,
        height: bottomPx - topPx,
      },
    ];
  let cursor = floor;
  let edge = bottomPx;
  const split = flatMap((status: SlotStackStatus): SlotFill[] => {
    const value = classes[status];
    if (value <= 0) return [];
    cursor += value;
    const y = within(Math.round(ys(cursor)), topPx, edge);
    const rect: SlotFill = {
      part,
      status,
      paint: PAINT[part][status],
      value,
      y,
      height: edge - y,
    };
    edge = y;
    return [rect];
  }, SLOT_STACK_STATUSES);
  const rest: SlotFill[] =
    edge > topPx
      ? [
          {
            part,
            status: null,
            paint: PAINT[part].plain,
            value: Math.max(0, floor + amount - cursor),
            y: topPx,
            height: edge - topPx,
          },
        ]
      : [];
  return filter((one: SlotFill) => one.height > 0, [...split, ...rest]);
};

/**
 * The slots as whole-pixel boxes. `xs` and `ys` are the chart's scales
 * (data to px); a period is one data unit wide.
 *
 * EVERY EDGE LANDS ON A WHOLE PIXEL, the rule `BarSeries` follows: a column
 * left on a fraction blends its edge into the ground, and a warm series then
 * reads a pixel wider than a cool one. The gap between two slots is GROUND
 * taken off the lower slot's top, never a stroke. A column's last slot keeps
 * its top.
 *
 * The borders are open PATHS, inset half a stroke so they stay inside the
 * box. Which sides each one draws is the whole of the picture:
 *
 *   solid   sides and bottom of the fill; the top too once the container is
 *           full and nothing overflows
 *   dashed  sides and top of what is unfilled, never the bottom: the fill
 *           (or the slot's floor) is where it opens
 *   heavy   sides and top of the overflow, never the join
 */
export const layoutSlots = (
  placed: readonly PlacedSlot[],
  xs: (value: number) => number,
  ys: (value: number) => number,
  options: SlotLayoutOptions,
): readonly SlotBox[] => {
  const periodPx = Math.abs(xs(1) - xs(0));
  const inset = Math.round((periodPx * (1 - options.band)) / 2);
  return map((one: PlacedSlot): SlotBox => {
    const { slot } = one;
    const left = Math.round(xs(slot.period - 0.5)) + inset;
    const right = Math.round(xs(slot.period + 0.5)) - inset;
    const width = Math.max(1, right - left);
    const bottom = Math.round(ys(one.base));
    const rawTop = Math.min(bottom - 1, Math.round(ys(one.top)));
    const top =
      one.last || bottom - rawTop <= options.gap + 1
        ? rawTop
        : rawTop + options.gap;
    const expectedTop =
      slot.overflow > 0
        ? within(Math.round(ys(one.expectedTop)), top, bottom)
        : top;
    const fillTop =
      slot.unfilled > 0
        ? within(Math.round(ys(one.fillTop)), expectedTop, bottom)
        : expectedTop;
    const t = options.thin / 2;
    const h = options.heavy / 2;
    const full = slot.unfilled <= 0 && slot.overflow <= 0;
    return {
      placed: one,
      x: left,
      width,
      bottom,
      fillTop,
      expectedTop,
      top,
      fills: [
        ...fillsOf(
          "filled",
          slot.filled,
          slot.filledByClass,
          one.base,
          bottom,
          fillTop,
          ys,
        ),
        ...fillsOf(
          "overflow",
          slot.overflow,
          slot.overflowByClass,
          one.expectedTop,
          expectedTop,
          top,
          ys,
        ),
      ],
      solid:
        slot.filled > 0 && bottom > fillTop
          ? full
            ? `M${left + t} ${top + t}V${bottom - t}H${right - t}V${top + t}Z`
            : `M${left + t} ${fillTop}V${bottom - t}H${right - t}V${fillTop}`
          : null,
      dashed:
        slot.unfilled > 0 && fillTop > expectedTop
          ? `M${left + t} ${fillTop}V${expectedTop + t}H${right - t}V${fillTop}`
          : null,
      heavy:
        slot.overflow > 0 && expectedTop > top
          ? `M${left + h} ${expectedTop}V${top + h}H${right - h}V${expectedTop}`
          : null,
    };
  }, placed);
};

/** The words a part's hover text and the legend are written in. */
export interface SlotStackWords {
  readonly expected: string;
  readonly filled: string;
  readonly unfilled: string;
  readonly overflow: string;
  readonly invoiced: string;
  readonly confirmed: string;
  readonly planned: string;
}

export const SLOT_STACK_WORDS: SlotStackWords = {
  expected: "expected",
  filled: "filled",
  unfilled: "not yet filled",
  overflow: "above expected",
  invoiced: "invoiced",
  confirmed: "confirmed",
  planned: "planned",
};

/** What a part says under the pointer: whose it is, how much, and of what. */
export const slotPartTitle = (
  placed: PlacedSlot,
  part: "filled" | "unfilled" | "overflow",
  value: number,
  status: SlotStackStatus | null,
  periodLabel: (period: number) => string,
  valueFormat: (value: number) => string,
  words: SlotStackWords,
): string => {
  const who = `${placed.seriesLabel} · ${periodLabel(placed.slot.period)}`;
  const what =
    status === null ? words[part] : `${words[part]}, ${words[status]}`;
  const of =
    part === "overflow"
      ? ""
      : ` (${valueFormat(placed.slot.expected)} ${words.expected})`;
  return `${who}: ${valueFormat(value)} ${what}${of}`;
};

/** Headless observation: one row per slot, the numbers the chart draws. */
export const slotStackRows = (
  series: readonly SlotStackSeries[],
): readonly Record<string, string | number>[] =>
  map(
    (p: PlacedSlot) => ({
      series: p.seriesLabel,
      period: p.slot.period,
      expected: p.slot.expected,
      filled: p.slot.filled,
      unfilled: p.slot.unfilled,
      overflow: p.slot.overflow,
      base: p.base,
      top: p.top,
    }),
    placeSlots(series),
  );

/** Chart's inset at full size: room for a money tick on the left. */
const FULL_MARGIN: Margin = { top: 12, right: 12, bottom: 26, left: 52 };
/** The short chart's inset: just clear of the tick labels. */
const SHORT_MARGIN: Margin = { top: 6, right: 6, bottom: 20, left: 44 };

/** The most y labels a short chart carries before every other one goes. */
const SHORT_Y_TICKS = 4;

export interface SlotStackChrome {
  readonly short: boolean;
  readonly narrow: boolean;
  /**
   * The y labels: the axis's own ticks, or every other one (from zero) when
   * a short box holds more than four. Always the axis's own steps, so a
   * label never sits between two grid lines.
   */
  readonly yTicks: readonly number[];
  /** The grid's lines: one per axis step, whatever the labels thin to. */
  readonly gridSteps: number;
  /** Keep every Nth period label (1 = all). */
  readonly xLabelStep: number;
  readonly margin: Margin;
  /** The overflow border's width: thinner where the columns are small. */
  readonly heavy: number;
}

/**
 * What a box of this size can afford, on StackedTimelineChart's thresholds:
 * a SHORT box gets a tighter inset, a 2px heavy border and at most four y
 * labels; a NARROW one keeps every other period label once there are more
 * than six.
 */
export const slotStackChrome = (
  box: { readonly width: number; readonly height: number },
  axis: { readonly top: number; readonly ticks: readonly number[] },
  periods: number,
  callerMargin: Partial<Margin> = {},
): SlotStackChrome => {
  const short = box.height < STACKED_TIMELINE_SHORT_BELOW;
  const narrow = box.width < STACKED_TIMELINE_NARROW_BELOW;
  return {
    short,
    narrow,
    yTicks:
      short && axis.ticks.length > SHORT_Y_TICKS
        ? filter((_tick: number, i: number) => i % 2 === 0, axis.ticks)
        : axis.ticks,
    gridSteps: Math.max(1, axis.ticks.length - 1),
    xLabelStep: narrow && periods > 6 ? 2 : 1,
    margin: { ...(short ? SHORT_MARGIN : FULL_MARGIN), ...callerMargin },
    heavy: short || narrow ? 2 : 3,
  };
};
