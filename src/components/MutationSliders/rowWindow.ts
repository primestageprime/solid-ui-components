// The row's window: its measured width, the item runs, which dials fit, and
// paging by one dial (or one item run) at a time. Reads only `shown` — what
// the row draws — never the raw entities.
import { createMemo, createSignal, onCleanup } from "solid-js";
import { filter, map, some } from "../../fn";
import { observeSize } from "../../internal/dom/observeSize";
import { clamp } from "../../internal/math/clamp";
import type { Entity } from "../MarkedSlider/geometry";
import { type ItemRun, itemLayout, itemRuns } from "./items";
import type { MutationSlidersProps } from "./props";
import {
  CARD_OVERHEAD,
  DIAL_SLOT,
  GUTTERED_DIAL_SLOT,
  GUTTER_GAP,
  ROW_GAP,
  type RowLayout,
  rowLayout,
} from "./rows";

export interface RowWindow {
  readonly measure: (el: HTMLDivElement) => void;
  /** Whether the `"beside"` readout's 24px gutter row is in use. */
  readonly guttered: () => boolean;
  readonly itemized: () => boolean;
  readonly layout: () => RowLayout;
  readonly page: (delta: number) => void;
  readonly atStart: () => boolean;
  readonly atEnd: () => boolean;
  readonly visible: () => readonly Entity[];
  /** The runs inside the visible window, each as its entities. */
  readonly visibleRuns: () => readonly (readonly Entity[])[];
}

export const createRowWindow = (
  props: MutationSlidersProps,
  shown: () => readonly Entity[],
): RowWindow => {
  // The row measures ITSELF rather than taking a width prop: how much room a
  // row of dials has is a fact about the page it was dropped into, and a
  // consumer would have to re-measure and re-pass it on every layout change.
  //
  // `0` means NOT MEASURED YET, and an unmeasured row shows EVERYTHING rather
  // than falling back to the one-dial minimum. The distinction matters well
  // beyond the first frame: `observeSize` returns a no-op disposer wherever
  // `ResizeObserver` is undefined — SSR, jsdom, older engines — so a width that
  // never arrives is a real and permanent state, not a transient one. Reading
  // it as "one dial" would leave those environments showing a single entity
  // for ever, which looks like a broken component rather than a narrow one.
  //
  // Unknown is not narrow. The minimum-of-one rule is about a container that
  // was MEASURED and found too small.
  const [width, setWidth] = createSignal(0);
  const [offset, setOffset] = createSignal(0);

  const measure = (el: HTMLDivElement): void => {
    setWidth(el.clientWidth);
    onCleanup(observeSize(el, (size) => setWidth(size.width)));
  };

  /**
   * The `"beside"` readout's change figure runs right of each bar into the gap,
   * so that row takes the 24px GUTTER (`GutteredFillStretchRow`) and pages by
   * the matching slot. Every other row is exactly the 8px row it was.
   */
  const guttered = (): boolean => props.readout === "beside";
  /** A row with role groups draws every top-level column as a card. */
  const carded = (): boolean => (props.groups?.length ?? 0) > 0;

  /** Whether any dial names an ITEM — the row then groups and pages by item. */
  const itemized = (): boolean =>
    some((entity: Entity) => entity.item !== undefined, shown());
  /** The row's item runs (items.ts), over every entity, in reading order. */
  const runs = createMemo((): readonly ItemRun[] =>
    itemRuns(map((entity: Entity) => entity.item, shown())),
  );

  const layout = createMemo((): RowLayout => {
    const count = shown().length;
    if (width() <= 0) {
      return { start: 0, end: count, capacity: count, paging: false };
    }
    if (itemized()) {
      // BY WHOLE ITEMS: a page never shows one of a person's dials without
      // the other. `offset` counts RUNS in this mode.
      const out = itemLayout(
        width(),
        runs(),
        offset(),
        props.onAdd !== undefined,
        (guttered() ? GUTTERED_DIAL_SLOT : DIAL_SLOT) +
          (carded() ? CARD_OVERHEAD : 0),
        carded() || guttered() ? GUTTER_GAP : ROW_GAP,
      );
      return {
        start: out.start,
        end: out.end,
        capacity: out.end - out.start,
        paging: out.paging,
      };
    }
    return guttered()
      ? rowLayout(
          width(),
          count,
          offset(),
          props.onAdd !== undefined,
          GUTTERED_DIAL_SLOT,
          GUTTER_GAP,
        )
      : rowLayout(width(), count, offset(), props.onAdd !== undefined);
  });

  /**
   * Page by ONE dial, not by a screenful.
   *
   * The row exists to be COMPARED across, and a full-page jump means no two
   * neighbours either side of a boundary are ever on screen together — the
   * reader loses exactly the adjacency they were reading. Stepping by one
   * keeps every pair reachable, at the cost of more presses on a long row.
   */
  const page = (delta: number): void => {
    if (itemized()) {
      // One RUN at a time — a whole person, whatever their dial count.
      setOffset((current) =>
        clamp(current + delta, 0, Math.max(runs().length - 1, 0)),
      );
      return;
    }
    const { capacity } = layout();
    setOffset((current) =>
      clamp(current + delta, 0, Math.max(shown().length - capacity, 0)),
    );
  };

  // The window is derived, so it CANNOT disagree with the arrows' disabled
  // state: both read the same memo.
  const atStart = (): boolean => layout().start === 0;
  const atEnd = (): boolean => layout().end >= shown().length;

  const visible = createMemo(() => {
    const all = shown();
    return all.slice(layout().start, layout().end);
  });
  const visibleRuns = createMemo((): readonly (readonly Entity[])[] =>
    map(
      (run: ItemRun) => map((index: number) => shown()[index], run.indices),
      filter(
        (run: ItemRun) =>
          run.indices[0] >= layout().start && run.indices[0] < layout().end,
        runs(),
      ),
    ),
  );

  return {
    measure,
    guttered,
    itemized,
    layout,
    page,
    atStart,
    atEnd,
    visible,
    visibleRuns,
  };
};
