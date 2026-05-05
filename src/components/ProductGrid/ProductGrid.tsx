// ============================================
// ProductGrid — Composed (Depth 2). Composes StackedProgressBar.
// (Area × focus) pivot grid. Above-the-line items are solutions whose
// progress is tracked as todo/doing/done; below-the-line items are needs
// satisfied when every solution they reference (`solvedBy`) is fully done.
//
// Pure rendering + selection: the consumer owns the data and any work
// animation (just pass a fresh `work` map each tick). Selection is
// optionally controlled — pass `selection`/`onSelectionChange` to lift it
// into your store, or omit both for internal-only state.
// ============================================
import { Component, createMemo, createSignal, For, JSX, Show } from "solid-js";
import { StackedProgressBar } from "../Progress";
import "./ProductGrid.css";

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
  doing: "var(--sui-info, #4ea1ff)",
  todo: "var(--sui-text-muted, #555)",
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

  // ----- layout -------------------------------------------------------------
  // For each area, group items by focus. Compute the column ordering of
  // sub-columns and where each area starts/spans, plus the grid-column
  // indices for both kinds of separator tracks.
  const layout = createMemo(() => {
    const byArea = new Map<
      string,
      Map<string, { above: ProductGridItem[]; below: ProductGridItem[] }>
    >();
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

    const subCols: {
      area: string;
      focus: string;
      slot: { above: ProductGridItem[]; below: ProductGridItem[] };
    }[] = [];
    const areaSpans: { area: string; startSubCol: number; span: number }[] = [];
    let subColIdx = 1;
    for (const area of props.areaOrder) {
      const focusMap = byArea.get(area)!;
      if (focusMap.size === 0) continue;
      const startSubCol = subColIdx;
      for (const [focus, slot] of focusMap) {
        subCols.push({ area, focus, slot });
        subColIdx++;
      }
      areaSpans.push({ area, startSubCol, span: subColIdx - startSubCol });
    }
    // Vsep grid-column indices that fall between two different areas.
    const areaBoundaryCols: number[] = [];
    for (let i = 0; i < areaSpans.length - 1; i++) {
      const a = areaSpans[i];
      const lastSubCol = a.startSubCol + a.span - 1;
      areaBoundaryCols.push(2 * lastSubCol);
    }
    // Vsep grid-column indices between every sub-column.
    const interSubColVseps: number[] = [];
    for (let k = 1; k < subCols.length; k++) interSubColVseps.push(2 * k);
    return { subCols, areaSpans, areaBoundaryCols, interSubColVseps };
  });

  // ----- subcomponents (closed over selection / metness) --------------------
  const Card: Component<{ item: ProductGridItem }> = (p) => {
    const met = () => p.item.position === "below" && isNeedMet(p.item);
    const selected = () => selectedItemIds().has(p.item.id);
    const className = () => {
      const list = ["sui-product-grid__card"];
      if (selected()) list.push("sui-product-grid__card--selected");
      else if (met()) list.push("sui-product-grid__card--met");
      return list.join(" ");
    };
    return (
      <div
        class={className()}
        title={p.item.description}
        onClick={() => toggleItem(p.item.id)}
      >
        <div>{p.item.shortName}</div>
        <Show when={workOf(p.item.id)}>
          {(w) => (
            <div
              class="sui-product-grid__card-bar"
              title={`done: ${w().done} · doing: ${w().doing} · todo: ${w().todo}`}
            >
              <StackedProgressBar
                segments={workSegments(w())}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          )}
        </Show>
      </div>
    );
  };

  const CellStack: Component<{
    items: ProductGridItem[];
    anchor: "top" | "bottom";
  }> = (p) => (
    <div
      class={`sui-product-grid__cell-stack sui-product-grid__cell-stack--anchor-${p.anchor}`}
    >
      <For each={p.items}>{(it) => <Card item={it} />}</For>
    </div>
  );

  const FocusLabel: Component<{
    area: string;
    focus: string;
    above: ProductGridItem[];
    below: ProductGridItem[];
  }> = (p) => {
    const sel = () => {
      const s = selection();
      return !!s && s.kind === "focus" && s.area === p.area && s.focus === p.focus;
    };
    const aboveTotals = () =>
      p.above.reduce(
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
    const metCount = () => p.below.filter((n) => isNeedMet(n)).length;
    const belowSegmentsAccessor = () => {
      const m = metCount();
      const u = p.below.length - m;
      const t = p.below.length || 1;
      return [
        { percentage: (m / t) * 100, color: SEGMENT_COLORS.done },
        { percentage: (u / t) * 100, color: SEGMENT_COLORS.todo },
      ];
    };
    const className = () =>
      sel()
        ? "sui-product-grid__focus sui-product-grid__focus--selected"
        : "sui-product-grid__focus";
    return (
      <div class={className()} onClick={() => toggleFocus(p.area, p.focus)}>
        <div
          class="sui-product-grid__focus-bar"
          title={`above · done ${aboveTotals().done} · doing ${aboveTotals().doing} · todo ${aboveTotals().todo}`}
        >
          <Show when={p.above.length > 0}>
            <StackedProgressBar
              segments={aboveSegmentsAccessor()}
              style={{ width: "100%", height: "100%" }}
            />
          </Show>
        </div>
        <div>{p.focus}</div>
        <div
          class="sui-product-grid__focus-bar"
          title={`below · met ${metCount()}/${p.below.length}`}
        >
          <Show when={p.below.length > 0}>
            <StackedProgressBar
              segments={belowSegmentsAccessor()}
              style={{ width: "100%", height: "100%" }}
            />
          </Show>
        </div>
      </div>
    );
  };

  // ----- grid template ------------------------------------------------------
  const gridStyle = (): JSX.CSSProperties => {
    const L = layout();
    const N = L.subCols.length;
    const totalCols = Math.max(2 * N - 1, 1);
    const areaBoundarySet = new Set(L.areaBoundaryCols);
    const cols = Array.from({ length: totalCols }, (_, i) => {
      const col = i + 1;
      if (col % 2 === 1) return "minmax(120px, 1fr)";
      return areaBoundarySet.has(col) ? "3px" : "1px";
    }).join(" ");
    return {
      "grid-template-columns": cols,
      // Rows: header | hsep | above | hsep | label | hsep | below
      "grid-template-rows": "auto 1px minmax(80px, 1fr) 1px auto 1px minmax(80px, 1fr)",
    };
  };

  const className = () =>
    props.class ? `sui-product-grid ${props.class}` : "sui-product-grid";

  return (
    <div class={className()} style={{ ...gridStyle(), ...(typeof props.style === "object" ? props.style : {}) }}>
      {(() => {
        const L = layout();
        const areaBoundarySet = new Set(L.areaBoundaryCols);
        const sepClass = (col: number) =>
          areaBoundarySet.has(col)
            ? "sui-product-grid__sep--major"
            : "sui-product-grid__sep--minor";
        return (
          <>
            {/* Row 1 — area headers (each spans its sub-cols + interior vseps). */}
            <For each={L.areaSpans}>
              {(a) => {
                const startCol = 2 * a.startSubCol - 1;
                const colSpan = 2 * a.span - 1;
                return (
                  <div
                    class="sui-product-grid__area-header"
                    style={{ "grid-row": "1", "grid-column": `${startCol} / span ${colSpan}` }}
                  >
                    {a.area}
                  </div>
                );
              }}
            </For>
            {/* Vseps between areas in the header row (always major). */}
            <For each={L.areaBoundaryCols}>
              {(col) => (
                <div
                  class="sui-product-grid__sep--major"
                  style={{ "grid-row": "1", "grid-column": `${col}` }}
                />
              )}
            </For>
            {/* Row 2 — full-width major hsep under headers. */}
            <div
              class="sui-product-grid__sep--major"
              style={{ "grid-row": "2", "grid-column": "1 / -1" }}
            />
            {/* Row 3 — above-the-line cells + vseps. */}
            <For each={L.subCols}>
              {(sc, i) => (
                <div style={{ "grid-row": "3", "grid-column": `${2 * (i() + 1) - 1}` }}>
                  <CellStack items={sc.slot.above} anchor="bottom" />
                </div>
              )}
            </For>
            <For each={L.interSubColVseps}>
              {(col) => (
                <div
                  class={sepClass(col)}
                  style={{ "grid-row": "3", "grid-column": `${col}` }}
                />
              )}
            </For>
            {/* Row 4 — full-width major hsep above the label band. */}
            <div
              class="sui-product-grid__sep--major"
              style={{ "grid-row": "4", "grid-column": "1 / -1" }}
            />
            {/* Row 5 — focus labels with sandwiched status bars. */}
            <For each={L.subCols}>
              {(sc, i) => (
                <div style={{ "grid-row": "5", "grid-column": `${2 * (i() + 1) - 1}` }}>
                  <FocusLabel
                    area={sc.area}
                    focus={sc.focus}
                    above={sc.slot.above}
                    below={sc.slot.below}
                  />
                </div>
              )}
            </For>
            <For each={L.interSubColVseps}>
              {(col) => (
                <div
                  class={sepClass(col)}
                  style={{ "grid-row": "5", "grid-column": `${col}` }}
                />
              )}
            </For>
            {/* Row 6 — full-width major hsep below the label band. */}
            <div
              class="sui-product-grid__sep--major"
              style={{ "grid-row": "6", "grid-column": "1 / -1" }}
            />
            {/* Row 7 — below-the-line cells + vseps. */}
            <For each={L.subCols}>
              {(sc, i) => (
                <div style={{ "grid-row": "7", "grid-column": `${2 * (i() + 1) - 1}` }}>
                  <CellStack items={sc.slot.below} anchor="top" />
                </div>
              )}
            </For>
            <For each={L.interSubColVseps}>
              {(col) => (
                <div
                  class={sepClass(col)}
                  style={{ "grid-row": "7", "grid-column": `${col}` }}
                />
              )}
            </For>
          </>
        );
      })()}
    </div>
  );
};
