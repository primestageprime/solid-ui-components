// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — the label-to-line hover emphasis ADAPTER.
//
// `emphasis.ts` is the pure core: given a hovered id and a candidate id, it
// decides highlighted / muted / at rest, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md. This
// module is the `ScrubChart` adapter — it holds the hover STATE (which id,
// if any) and calls the core to answer `classFor`. It also owns the DOM
// colour read-back (`emphasisColor.ts`): NOT a core by the ADR's rule — it
// reads the DOM on purpose (see that module's header for why) — but general
// across any `ScrubChart`-hosted chart, so it lives here rather than
// wearing a cashflow directory.
//
// `CashflowScrubChart` is the first, and so far only, caller. It supplies
// its own `EmphasisColorSource[]` (its attribute names and id prefixes) and
// its own re-render triggers (which props changed the drawn lines) — this
// adapter owns none of that vocabulary.
// ============================================
import { type Accessor, createSignal } from "solid-js";
import { emphasisClassName } from "./emphasis";
import {
  type EmphasisColorSource,
  readEmphasisColors,
  sameColorMap,
} from "./emphasisColor";

/** What `createScrubChartEmphasis` returns. */
export interface ScrubChartEmphasis {
  /** The id the pointer currently rests on, or `null` while it rests on none. */
  hoveredId: Accessor<string | null>;
  /** Sets the hovered id — pass to a label layer's hover callback directly. */
  setHoveredId: (id: string | null) => void;
  /**
   * The emphasis modifier class `id` takes right now.
   *
   * @param block CSS block the modifier hangs off, e.g. `"my-chart__line"`.
   * @param id The element's own id, or `null` for an element no id names.
   */
  classFor: (block: string, id: string | null) => string;
  /** The colour read back for `id`, or `undefined` when none resolved. */
  colorFor: (id: string) => string | undefined;
  /**
   * Re-reads every source's tagged elements' resolved stroke.
   *
   * Call this from a caller-owned `createEffect` that tracks whichever props
   * change which lines are drawn — this adapter does not know that list, so
   * it cannot track it for you. Re-reading is cheap when nothing changed:
   * the colour map is only replaced (and only then does a reader who tracks
   * `colorFor` re-run) when a key or a colour actually differs.
   */
  refreshColors: (sources: readonly EmphasisColorSource[]) => void;
}

/**
 * Creates the `ScrubChart` label-to-line hover emphasis adapter.
 *
 * Bundles the hovered-id signal, the pure emphasis-class core
 * ({@link emphasisClassName}), and the DOM colour read-back
 * ({@link readEmphasisColors}) a label layer needs to take on its line's own
 * colour. See `emphasisColor.ts` for why the read-back exists rather than
 * a CSS-only or data-only answer.
 */
export function createScrubChartEmphasis(): ScrubChartEmphasis {
  const [hoveredId, setHoveredId] = createSignal<string | null>(null);
  const [colors, setColors] = createSignal<Record<string, string>>({});

  const classFor = (block: string, id: string | null): string =>
    emphasisClassName(block, hoveredId(), id);

  const colorFor = (id: string): string | undefined => colors()[id];

  const refreshColors = (sources: readonly EmphasisColorSource[]): void => {
    const next = readEmphasisColors(sources);
    // Keep the previous map when nothing changed. Solid compares by
    // identity, so returning it notifies no reader and no effect churns.
    setColors((prev) => (sameColorMap(next, prev) ? prev : next));
  };

  return { hoveredId, setHoveredId, classFor, colorFor, refreshColors };
}

// Re-exported so a caller building `EmphasisColorSource` values needs only
// this module's import.
export type { EmphasisColorSource } from "./emphasisColor";
