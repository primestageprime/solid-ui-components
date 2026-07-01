// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// AreaFocusGrid — Primitive (Depth 1). Atomic.
// Owns CSS (AreaFocusGrid.css), imports no other components.
//
// A (area × focus) pivot layout: each area is a header that spans its
// focus sub-columns; each sub-column carries an above-the-line cell stack
// on top, a focus-label band in the middle, and a below-the-line cell
// stack at the bottom. Major horizontals divide the rows; major verticals
// divide adjacent areas; minor verticals divide adjacent focuses within
// an area.
//
// Content is supplied via render callbacks so the layout is reusable: the
// caller decides what an area header, focus label, or cell looks like.
// ============================================
import {
  type Component,
  createMemo,
  For,
  type JSX,
  mergeProps,
} from "solid-js";
import "./AreaFocusGrid.css";

/** One focus sub-column within an area. */
export interface AreaFocusGridFocus {
  /** Stable identifier used to key the column and pass back to renderers. */
  id: string;
  /** Display name; passed back to `renderFocusLabel`. */
  label: string;
}

/** One area = a header that spans 1+ focus sub-columns. */
export interface AreaFocusGridArea {
  /** Stable identifier; passed back to renderers. */
  id: string;
  /** Display name; passed back to `renderAreaHeader`. */
  label: string;
  /** Ordered focuses (sub-columns) under this area. */
  focuses: readonly AreaFocusGridFocus[];
}

/** Identifies one focus sub-column. */
export interface AreaFocusCellKey {
  area: AreaFocusGridArea;
  focus: AreaFocusGridFocus;
}

export interface AreaFocusGridProps {
  /** Left-to-right ordered areas; each owns its ordered focus sub-columns. */
  areas: readonly AreaFocusGridArea[];

  /** Renders the per-area header that spans its focus sub-columns. */
  renderAreaHeader: (area: AreaFocusGridArea) => JSX.Element;
  /** Renders the focus-label band cell (one per (area × focus)). */
  renderFocusLabel: (key: AreaFocusCellKey) => JSX.Element;
  /** Renders the above-the-line stack contents for one (area × focus). */
  renderAboveCell: (key: AreaFocusCellKey) => JSX.Element;
  /** Renders the below-the-line stack contents for one (area × focus). */
  renderBelowCell: (key: AreaFocusCellKey) => JSX.Element;

  /** Optional minimum width per sub-column track. Default: `"120px"`. */
  subColumnMinWidth?: string;
  /** Optional minimum height for an above/below cell-stack row. Default: `"80px"`. */
  cellRowMinHeight?: string;

  class?: string;
  style?: JSX.CSSProperties | string;
}

interface AreaFocusGridLayout {
  /** Flattened sub-columns in display order. */
  subCols: readonly AreaFocusCellKey[];
  /** Per-area placement: first sub-column index (1-based) + span. */
  areaSpans: readonly {
    area: AreaFocusGridArea;
    startSubCol: number;
    span: number;
  }[];
  /** Grid-column indices (1-based) of vertical separators between areas. */
  areaBoundaryCols: readonly number[];
  /** Grid-column indices (1-based) of vertical separators between every pair of sub-columns. */
  interSubColVseps: readonly number[];
}

/**
 * Compute sub-column layout: the flat sub-column list, per-area spans, and
 * the grid-column indices of the two flavors of vertical separator.
 * Pure: derived only from `areas`.
 */
const buildLayout = (
  areas: readonly AreaFocusGridArea[],
): AreaFocusGridLayout => {
  const occupied = areas.filter((a) => a.focuses.length > 0);

  const subCols: AreaFocusCellKey[] = occupied.flatMap((area) =>
    area.focuses.map((focus) => ({ area, focus })),
  );

  const areaSpans = occupied.reduce<
    { area: AreaFocusGridArea; startSubCol: number; span: number }[]
  >((acc, area) => {
    const prev = acc[acc.length - 1];
    const startSubCol = prev ? prev.startSubCol + prev.span : 1;
    acc.push({ area, startSubCol, span: area.focuses.length });
    return acc;
  }, []);

  // The vsep between the last sub-col of area i and the first of area i+1
  // lives at grid-column = 2 * (lastSubCol).
  const areaBoundaryCols = areaSpans
    .slice(0, -1)
    .map((a) => 2 * (a.startSubCol + a.span - 1));

  // A vsep between every pair of consecutive sub-cols (even-indexed tracks).
  const interSubColVseps = subCols.slice(1).map((_, k) => 2 * (k + 1));

  return { subCols, areaSpans, areaBoundaryCols, interSubColVseps };
};

/**
 * Compose the grid template strings from the computed layout.
 * Returns the inline grid CSS as a CSSProperties object. Pure.
 */
const gridTemplate = (
  layout: AreaFocusGridLayout,
  subColumnMinWidth: string,
  cellRowMinHeight: string,
): JSX.CSSProperties => {
  const N = layout.subCols.length;
  const totalCols = Math.max(2 * N - 1, 1);
  const areaBoundarySet = new Set(layout.areaBoundaryCols);
  const cols = Array.from({ length: totalCols }, (_, i) => {
    const col = i + 1;
    if (col % 2 === 1) return `minmax(${subColumnMinWidth}, 1fr)`;
    return areaBoundarySet.has(col) ? "3px" : "1px";
  }).join(" ");
  return {
    "grid-template-columns": cols,
    // Rows: header | hsep | above | hsep | label | hsep | below
    "grid-template-rows": `auto 1px minmax(${cellRowMinHeight}, 1fr) 1px auto 1px minmax(${cellRowMinHeight}, 1fr)`,
  };
};

const sepClassFor = (col: number, areaBoundarySet: Set<number>): string =>
  areaBoundarySet.has(col)
    ? "sui-area-focus-grid__sep--major"
    : "sui-area-focus-grid__sep--minor";

export const AreaFocusGrid: Component<AreaFocusGridProps> = (props) => {
  const layout = createMemo(() => buildLayout(props.areas));
  const subColMinW = () => props.subColumnMinWidth ?? "120px";
  const rowMinH = () => props.cellRowMinHeight ?? "80px";
  const inlineGrid = createMemo(() =>
    gridTemplate(layout(), subColMinW(), rowMinH()),
  );
  const areaBoundarySet = createMemo(() => new Set(layout().areaBoundaryCols));

  const rootClass = () =>
    props.class ? `sui-area-focus-grid ${props.class}` : "sui-area-focus-grid";

  const rootStyle = (): JSX.CSSProperties => ({
    ...inlineGrid(),
    ...(typeof props.style === "object" ? props.style : {}),
  });

  return (
    <div class={rootClass()} style={rootStyle()}>
      {/* Row 1 — area headers (each spans its sub-cols + interior vseps). */}
      <For each={layout().areaSpans}>
        {(a) => {
          const startCol = 2 * a.startSubCol - 1;
          const colSpan = 2 * a.span - 1;
          return (
            <div
              class="sui-area-focus-grid__area-header"
              style={{
                "grid-row": "1",
                "grid-column": `${startCol} / span ${colSpan}`,
              }}
            >
              {props.renderAreaHeader(a.area)}
            </div>
          );
        }}
      </For>
      {/* Vseps between areas in the header row (always major). */}
      <For each={layout().areaBoundaryCols}>
        {(col) => (
          <div
            class="sui-area-focus-grid__sep--major"
            style={{ "grid-row": "1", "grid-column": `${col}` }}
          />
        )}
      </For>
      {/* Row 2 — full-width major hsep under headers. */}
      <div
        class="sui-area-focus-grid__sep--major"
        style={{ "grid-row": "2", "grid-column": "1 / -1" }}
      />
      {/* Row 3 — above-the-line cell stacks. */}
      <For each={layout().subCols}>
        {(sc, i) => (
          <div
            class="sui-area-focus-grid__cell-stack sui-area-focus-grid__cell-stack--anchor-bottom"
            style={{ "grid-row": "3", "grid-column": `${2 * (i() + 1) - 1}` }}
          >
            {props.renderAboveCell(sc)}
          </div>
        )}
      </For>
      <For each={layout().interSubColVseps}>
        {(col) => (
          <div
            class={sepClassFor(col, areaBoundarySet())}
            style={{ "grid-row": "3", "grid-column": `${col}` }}
          />
        )}
      </For>
      {/* Row 4 — full-width major hsep above the label band. */}
      <div
        class="sui-area-focus-grid__sep--major"
        style={{ "grid-row": "4", "grid-column": "1 / -1" }}
      />
      {/* Row 5 — focus labels. */}
      <For each={layout().subCols}>
        {(sc, i) => (
          <div
            class="sui-area-focus-grid__focus"
            style={{ "grid-row": "5", "grid-column": `${2 * (i() + 1) - 1}` }}
          >
            {props.renderFocusLabel(sc)}
          </div>
        )}
      </For>
      <For each={layout().interSubColVseps}>
        {(col) => (
          <div
            class={sepClassFor(col, areaBoundarySet())}
            style={{ "grid-row": "5", "grid-column": `${col}` }}
          />
        )}
      </For>
      {/* Row 6 — full-width major hsep below the label band. */}
      <div
        class="sui-area-focus-grid__sep--major"
        style={{ "grid-row": "6", "grid-column": "1 / -1" }}
      />
      {/* Row 7 — below-the-line cell stacks. */}
      <For each={layout().subCols}>
        {(sc, i) => (
          <div
            class="sui-area-focus-grid__cell-stack sui-area-focus-grid__cell-stack--anchor-top"
            style={{ "grid-row": "7", "grid-column": `${2 * (i() + 1) - 1}` }}
          >
            {props.renderBelowCell(sc)}
          </div>
        )}
      </For>
      <For each={layout().interSubColVseps}>
        {(col) => (
          <div
            class={sepClassFor(col, areaBoundarySet())}
            style={{ "grid-row": "7", "grid-column": `${col}` }}
          />
        )}
      </For>
    </div>
  );
};

/** Override props — sizing knobs locked in at Factory-call time. */
export type AreaFocusGridOverrides = Pick<
  AreaFocusGridProps,
  "subColumnMinWidth" | "cellRowMinHeight"
>;

/** Data props — what a Curried Variant publicly exposes. */
export type AreaFocusGridDataProps = Omit<
  AreaFocusGridProps,
  keyof AreaFocusGridOverrides
>;

/**
 * Factory: returns an AreaFocusGrid pre-configured with sizing overrides.
 * The returned Component exposes only Data props (column structure +
 * render callbacks + className/style).
 */
export function createAreaFocusGrid(
  defaults: AreaFocusGridOverrides,
): Component<AreaFocusGridDataProps> {
  return (props) => <AreaFocusGrid {...mergeProps(defaults, props)} />;
}
