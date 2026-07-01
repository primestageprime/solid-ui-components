// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ProductGrid — Pure Composite (Depth ≥ 2).
// Composes AreaFocusGrid + ProductGridCard + FocusLabelBand + StackedProgressBar.
//
// (Area × focus) pivot grid. Above-the-line items are solutions whose
// progress is tracked as todo/doing/done; below-the-line items are needs
// satisfied when every solution they reference (`solvedBy`) is fully done.
//
// Pure rendering + selection: the consumer owns the data and any work
// animation (just pass a fresh `work` map each tick). Selection is
// optionally controlled — pass `selection`/`onSelectionChange` to lift it
// into your store, or omit both for internal-only state.
//
// As a Pure Composite this file owns ZERO CSS and ZERO inline `style={}` —
// the only `style=` is the consumer pass-through on the root AreaFocusGrid.
// All visual treatment lives in the Primitives' own CSS files.
// ============================================
import { type Component, createMemo, createSignal, For, type JSX, Show } from "solid-js";
import { StackedProgressBar } from "../Progress";
import {
  AreaFocusGrid,
  type AreaFocusCellKey,
  type AreaFocusGridArea,
} from "../AreaFocusGrid";
import { ProductGridCard } from "../ProductGridCard";
import { FocusLabelBand } from "../FocusLabelBand";

export interface ProductGridWorkCounts {
  todo: number;
  doing: number;
  done: number;
}

export interface ProductGridItem {
  id: string;
  /** Top-level grouping; rendered as a header spanning its sub-columns. */
  area: string;
  /** Sub-column within an area. */
  focus: string;
  /** "above" the line = solution, tracked through todo→doing→done.
   *  "below" the line = need, met when all `solvedBy` solutions are done. */
  position: "above" | "below";
  /** ≤ 3-word display name shown on the card. */
  shortName: string;
  /** Longer prose; surfaced as the card's hover tooltip. */
  description: string;
  /** Static work counts; overridden per-render by the `work` prop on the
   *  parent component if provided (used for animation). */
  work?: ProductGridWorkCounts;
  /** Below-the-line only: ids of above-the-line solutions that, when all
   *  fully done, mark this need as met. */
  solvedBy?: string[];
}

export type ProductGridSelection =
  | { kind: "item"; id: string }
  | { kind: "focus"; area: string; focus: string }
  | null;

export interface ProductGridProps {
  items: readonly ProductGridItem[];
  /** Area display order (left → right). Areas not present in `items` are
   *  dropped silently. */
  areaOrder: readonly string[];
  /** Optional reactive map of work counts keyed by item id. When supplied,
   *  takes precedence over each item's static `work` field. Used by
   *  consumers that animate counts over time. */
  work?: Record<string, ProductGridWorkCounts>;
  /** Controlled selection. Omit for uncontrolled mode (the component keeps
   *  its own selection signal). */
  selection?: ProductGridSelection;
  onSelectionChange?: (sel: ProductGridSelection) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export const isSolutionSatisfied = (w?: ProductGridWorkCounts): boolean =>
  !!w && w.todo === 0 && w.doing === 0 && w.done > 0;

const SEGMENT_COLORS = {
  done: "var(--sui-success, #2a6)",
  doing: "var(--sui-accent)",
  todo: "var(--sui-text-muted)",
} as const;

const workSegments = (w: ProductGridWorkCounts) => {
  const total = w.todo + w.doing + w.done || 1;
  return [
    { percentage: (w.done / total) * 100,  color: SEGMENT_COLORS.done,  label: String(w.done) },
    { percentage: (w.doing / total) * 100, color: SEGMENT_COLORS.doing, label: String(w.doing) },
    { percentage: (w.todo / total) * 100,  color: SEGMENT_COLORS.todo,  label: String(w.todo) },
  ];
};

export const ProductGrid: Component<ProductGridProps> = (props) => {
  // ----- selection (controlled or uncontrolled) ------------------------------
  const [internalSel, setInternalSel] = createSignal<ProductGridSelection>(null);
  const selection = (): ProductGridSelection =>
    props.selection !== undefined ? props.selection : internalSel();
  const updateSelection = (next: ProductGridSelection) => {
    if (props.selection === undefined) setInternalSel(next);
    props.onSelectionChange?.(next);
  };
  const toggleItem = (id: string) => {
    const cur = selection();
    updateSelection(cur && cur.kind === "item" && cur.id === id ? null : { kind: "item", id });
  };
  const toggleFocus = (area: string, focus: string) => {
    const cur = selection();
    updateSelection(
      cur && cur.kind === "focus" && cur.area === area && cur.focus === focus
        ? null
        : { kind: "focus", area, focus },
    );
  };

  // ----- per-item work resolution -------------------------------------------
  const workOf = (id: string): ProductGridWorkCounts | undefined => {
    const w = props.work?.[id];
    if (w) return w;
    return props.items.find((it) => it.id === id)?.work;
  };

  // ----- derived state ------------------------------------------------------
  const aboveItems = createMemo(() => props.items.filter((it) => it.position === "above"));

  const satisfiedById = createMemo(() => {
    const m = new Map<string, boolean>();
    for (const it of aboveItems()) m.set(it.id, isSolutionSatisfied(workOf(it.id)));
    return m;
  });

  const isNeedMet = (need: ProductGridItem): boolean => {
    if (!need.solvedBy || need.solvedBy.length === 0) return false;
    const lookup = satisfiedById();
    return need.solvedBy.every((id) => lookup.get(id) === true);
  };

  const selectedItemIds = createMemo<Set<string>>(() => {
    const sel = selection();
    if (!sel) return new Set();
    if (sel.kind === "focus") {
      return new Set(
        props.items
          .filter((it) => it.area === sel.area && it.focus === sel.focus)
          .map((it) => it.id),
      );
    }
    const it = props.items.find((x) => x.id === sel.id);
    if (!it) return new Set();
    const ids = new Set<string>([sel.id]);
    if (it.position === "below") {
      for (const s of it.solvedBy ?? []) ids.add(s);
    } else {
      for (const x of props.items) {
        if (x.position === "below" && x.solvedBy?.includes(sel.id)) ids.add(x.id);
      }
    }
    return ids;
  });

  // ----- (area × focus) bucketing into above/below items --------------------
  // Group items so that for any (area, focus) we can list above-the-line and
  // below-the-line cards. The AreaFocusGrid Primitive only needs the column
  // structure (areas → focuses); per-cell content comes from these buckets.
  type FocusBucket = { above: ProductGridItem[]; below: ProductGridItem[] };

  const bucketedAreas = createMemo<readonly AreaFocusGridArea[]>(() => {
    const byArea = new Map<string, Map<string, FocusBucket>>();
    for (const a of props.areaOrder) byArea.set(a, new Map());
    for (const it of props.items) {
      const focusMap = byArea.get(it.area);
      if (!focusMap) continue;
      let slot = focusMap.get(it.focus);
      if (!slot) {
        slot = { above: [], below: [] };
        focusMap.set(it.focus, slot);
      }
      slot[it.position].push(it);
    }
    return props.areaOrder.flatMap<AreaFocusGridArea>((area) => {
      const focusMap = byArea.get(area)!;
      if (focusMap.size === 0) return [];
      return [{
        id: area,
        label: area,
        focuses: Array.from(focusMap.keys()).map((focus) => ({
          id: `${area}:${focus}`,
          label: focus,
        })),
      }];
    });
  });

  /** Look up the above/below items for one (area × focus) cell. */
  const bucketFor = (key: AreaFocusCellKey): FocusBucket => {
    const empty: FocusBucket = { above: [], below: [] };
    const above = props.items.filter(
      (it) => it.area === key.area.label && it.focus === key.focus.label && it.position === "above",
    );
    const below = props.items.filter(
      (it) => it.area === key.area.label && it.focus === key.focus.label && it.position === "below",
    );
    return above.length === 0 && below.length === 0 ? empty : { above, below };
  };

  // ----- per-item card --------------------------------------------------------
  const renderCard = (item: ProductGridItem): JSX.Element => {
    const met = () => item.position === "below" && isNeedMet(item);
    const selected = () => selectedItemIds().has(item.id);
    const w = () => workOf(item.id);
    const barTitle = () => {
      const counts = w();
      return counts
        ? `done: ${counts.done} · doing: ${counts.doing} · todo: ${counts.todo}`
        : undefined;
    };
    return (
      <ProductGridCard
        selected={selected()}
        met={met()}
        title={item.description}
        onClick={() => toggleItem(item.id)}
        barTitle={barTitle()}
        bar={
          <Show when={w()}>
            {(counts) => <StackedProgressBar segments={workSegments(counts())} />}
          </Show>
        }
      >
        {item.shortName}
      </ProductGridCard>
    );
  };

  // ----- focus-label band content --------------------------------------------
  const renderFocusLabel = (key: AreaFocusCellKey): JSX.Element => {
    const { above, below } = bucketFor(key);
    const sel = () => {
      const s = selection();
      return !!s && s.kind === "focus" && s.area === key.area.label && s.focus === key.focus.label;
    };
    const aboveTotals = () =>
      above.reduce(
        (acc, it) => {
          const w = workOf(it.id);
          if (w) {
            acc.todo += w.todo;
            acc.doing += w.doing;
            acc.done += w.done;
          }
          return acc;
        },
        { todo: 0, doing: 0, done: 0 },
      );
    const aboveSegmentsAccessor = () => workSegments(aboveTotals());
    const metCount = () => below.filter((n) => isNeedMet(n)).length;
    const belowSegmentsAccessor = () => {
      const m = metCount();
      const u = below.length - m;
      const t = below.length || 1;
      return [
        { percentage: (m / t) * 100, color: SEGMENT_COLORS.done },
        { percentage: (u / t) * 100, color: SEGMENT_COLORS.todo },
      ];
    };
    const aboveBarTitle = () =>
      `above · done ${aboveTotals().done} · doing ${aboveTotals().doing} · todo ${aboveTotals().todo}`;
    const belowBarTitle = () => `below · met ${metCount()}/${below.length}`;
    return (
      <FocusLabelBand
        selected={sel()}
        onClick={() => toggleFocus(key.area.label, key.focus.label)}
        aboveBarTitle={aboveBarTitle()}
        belowBarTitle={belowBarTitle()}
        aboveBar={
          <Show when={above.length > 0}>
            <StackedProgressBar segments={aboveSegmentsAccessor()} />
          </Show>
        }
        belowBar={
          <Show when={below.length > 0}>
            <StackedProgressBar segments={belowSegmentsAccessor()} />
          </Show>
        }
      >
        {key.focus.label}
      </FocusLabelBand>
    );
  };

  // ----- cell-stack contents (Primitive owns the stack wrapper) --------------
  const renderAboveCell = (key: AreaFocusCellKey): JSX.Element => (
    <For each={bucketFor(key).above}>{(it) => renderCard(it)}</For>
  );

  const renderBelowCell = (key: AreaFocusCellKey): JSX.Element => (
    <For each={bucketFor(key).below}>{(it) => renderCard(it)}</For>
  );

  return (
    <AreaFocusGrid
      areas={bucketedAreas()}
      renderAreaHeader={(a) => a.label}
      renderFocusLabel={renderFocusLabel}
      renderAboveCell={renderAboveCell}
      renderBelowCell={renderBelowCell}
      class={props.class}
      style={props.style}
    />
  );
};
