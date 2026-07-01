// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import { createMemo, For, type JSX, Show } from "solid-js";
import "./PivotGrid.css";

export interface PivotGridProps<
  RowKey extends string,
  ColKey extends string,
  Cell,
> {
  /** Row identities, top-to-bottom. Caller sorts. */
  rows: readonly RowKey[];
  /** Column identities, left-to-right. Caller sorts. */
  columns: readonly ColKey[];
  /** Display label for a row's sticky-left header cell. */
  rowLabel: (row: RowKey) => string;
  /** Display label for a column's sticky-top header cell. */
  colLabel: (col: ColKey) => string;
  /** Cell value lookup. Return `null` for "no data" (rendered via `emptyCell`). */
  cell: (row: RowKey, col: ColKey) => Cell | null;
  /**
   * Render the cell payload to JSX. Caller owns formatting.
   *
   * Accessibility: for ambiguous glyphs like `✓` or blank flag-matrix
   * cells, embed accessible text (e.g. `<span aria-label="enabled">✓</span>`)
   * — the grid passes the rendered JSX directly into the cell wrapper
   * and does not synthesize an aria-label.
   */
  renderCell: (cell: Cell, row: RowKey, col: ColKey) => JSX.Element;
  /**
   * Optional: navigate on click. If present, the cell wraps in an `<a>`.
   * Solid Router intercepts in-app `<a>` hrefs automatically. For
   * external URLs, return a string that includes `target` / `rel` via
   * the consumer's own wrapper component — the grid does not set them.
   */
  cellHref?: (
    row: RowKey,
    col: ColKey,
    cell: Cell | null,
  ) => string | undefined;
  /** Optional: imperative click handler. Ignored when `cellHref` returns a string. */
  onCellClick?: (row: RowKey, col: ColKey, cell: Cell | null) => void;
  /** Optional: continuous heat 0..1 → translucent background. Return `null` to skip. */
  getCellHeat?: (cell: Cell, row: RowKey, col: ColKey) => number | null;
  /** Optional: shape the 0..1 heat value before alpha mapping. Default `Math.sqrt`. */
  heatRamp?: (v: number) => number;
  /** Optional: hue for heat ramp. Default `var(--sui-pivot-heat-rgb, 248, 113, 113)`. */
  heatRgb?: string;
  /** Corner cell (top-left) label. Default `""`. */
  cornerLabel?: string;
  /** Rendered in body cells where `cell()` returns `null`. Default `"—"`. */
  emptyCell?: JSX.Element;
  /** Optional title (native `title` attr) for a cell. */
  cellTitle?: (
    row: RowKey,
    col: ColKey,
    cell: Cell | null,
  ) => string | undefined;
  /** Tight rows (12px padding) vs default (16px). */
  compact?: boolean;
  class?: string;
}

const HEAT_ALPHA_MIN = 0.1;
const HEAT_ALPHA_MAX = 0.6;
const DEFAULT_HEAT_RGB_VAR = "var(--sui-pivot-heat-rgb, 248, 113, 113)";

const heatBackground = (rampedHeat: number, rgb: string): string => {
  const alpha = HEAT_ALPHA_MIN + rampedHeat * (HEAT_ALPHA_MAX - HEAT_ALPHA_MIN);
  return `rgba(${rgb}, ${alpha})`;
};

export function PivotGrid<RowKey extends string, ColKey extends string, Cell>(
  props: PivotGridProps<RowKey, ColKey, Cell>,
): JSX.Element {
  const heatRamp = (v: number): number => (props.heatRamp ?? Math.sqrt)(v);
  const heatRgb = (): string => props.heatRgb ?? DEFAULT_HEAT_RGB_VAR;

  const wrapperClass = (): string => {
    const parts = ["sui-pivot-grid"];
    if (props.compact) parts.push("sui-pivot-grid--compact");
    if (props.class) parts.push(props.class);
    return parts.join(" ");
  };

  return (
    <div class={wrapperClass()}>
      <table class="sui-pivot-grid__table">
        <thead>
          <tr>
            <th class="sui-pivot-grid__corner">{props.cornerLabel ?? ""}</th>
            <For each={props.columns}>
              {(col) => (
                <th class="sui-pivot-grid__col-header" scope="col">
                  {props.colLabel(col)}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.rows}>
            {(row) => (
              <tr>
                <th class="sui-pivot-grid__row-header" scope="row">
                  {props.rowLabel(row)}
                </th>
                <For each={props.columns}>
                  {(col) => {
                    // Memoized so `props.cell(row, col)` runs exactly once per
                    // cell render — heat math, href, title, and renderCell all
                    // see the same snapshot, and consumers can put logging or
                    // expensive lookups in `cell` without surprise multiplicity.
                    const cellValue = createMemo<Cell | null>(() =>
                      props.cell(row, col),
                    );
                    const href = (): string | undefined =>
                      props.cellHref?.(row, col, cellValue());
                    const title = (): string | undefined =>
                      props.cellTitle?.(row, col, cellValue());

                    const heat = (): number | null => {
                      const v = cellValue();
                      if (v === null) return null;
                      const raw = props.getCellHeat?.(v, row, col);
                      if (raw === null || raw === undefined) return null;
                      return heatRamp(raw);
                    };

                    const cellStyle = (): JSX.CSSProperties | undefined => {
                      const h = heat();
                      if (h === null) return undefined;
                      return {
                        "background-color": heatBackground(h, heatRgb()),
                      };
                    };

                    const renderInner = (): JSX.Element => {
                      const v = cellValue();
                      if (v === null) return props.emptyCell ?? "—";
                      return props.renderCell(v, row, col);
                    };

                    return (
                      <td class="sui-pivot-grid__cell" style={cellStyle()}>
                        <Show
                          when={href() !== undefined}
                          fallback={
                            <Show
                              when={props.onCellClick !== undefined}
                              fallback={renderInner()}
                            >
                              <button
                                type="button"
                                class="sui-pivot-grid__cell-button"
                                title={title()}
                                onClick={() =>
                                  props.onCellClick?.(row, col, cellValue())
                                }
                              >
                                {renderInner()}
                              </button>
                            </Show>
                          }
                        >
                          <a
                            class="sui-pivot-grid__cell-link"
                            href={href()}
                            title={title()}
                          >
                            {renderInner()}
                          </a>
                        </Show>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
