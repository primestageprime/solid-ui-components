// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Treemap — Atomic Primitive (Depth 1).
// Owns the outer-column × inner-leaf grid layout CSS. No library Primitive
// imports — renders raw <div> structure styled by Treemap.css.
//
// API: render-callback based. Caller hands in `cells` (each with a `weight`
// and a list of `children`, also with weights). Header / toolbar / inner
// content are produced by render callbacks so the Primitive owns geometry
// while the consumer owns labels, bars, and any other content.
//
// Selection: predicate-based, so the parent owns the source of truth. The
// Primitive only paints the selection ring and forwards click events with
// stopPropagation handled correctly.
// ============================================
import { type Component, For, type JSX, Show } from "solid-js";
import "./Treemap.css";

/** One inner (leaf) cell of an outer column. */
export interface TreemapInnerData {
  /** Stable identifier — passed back in callbacks. */
  key: string;
  /** Relative size driving this inner cell's flex-grow within its column. */
  weight: number;
}

/** One outer column of the treemap. */
export interface TreemapCellData<
  Inner extends TreemapInnerData = TreemapInnerData,
> {
  /** Stable identifier — passed back in callbacks. */
  key: string;
  /** Relative size driving this column's flex-grow within the treemap. */
  weight: number;
  /** Inner cells rendered inside the column. */
  children: readonly Inner[];
}

/** Optional trailing pseudo-column (e.g. an "untagged" sidebar). */
export interface TreemapSidebar {
  /** Relative size driving the sidebar's flex-grow. */
  weight: number;
  /** Selection ring on the sidebar. */
  selected?: boolean;
  /** Click handler. */
  onClick?: (e: MouseEvent) => void;
  /** Hover title. */
  title?: string;
  /** Pre-rendered sidebar content (label, count, etc.). */
  content: JSX.Element;
}

export interface TreemapProps<
  Inner extends TreemapInnerData = TreemapInnerData,
  Cell extends TreemapCellData<Inner> = TreemapCellData<Inner>,
> {
  /** Outer columns of the treemap, ordered left-to-right. */
  cells: readonly Cell[];
  /** Render the header bar (title + meta) of an outer column. */
  renderOuterHeader: (cell: Cell) => JSX.Element;
  /** Optional toolbar shown below the outer header (e.g. summary bar). */
  renderOuterToolbar?: (cell: Cell) => JSX.Element;
  /** Render the body content of one inner cell (label + bars). */
  renderInnerContent: (cell: Cell, inner: Inner) => JSX.Element;
  /** Predicate marking an outer column as selected (border highlight). */
  isOuterSelected?: (cell: Cell) => boolean;
  /** Predicate marking an inner cell as selected (border highlight). */
  isInnerSelected?: (cell: Cell, inner: Inner) => boolean;
  /** Fired when the outer header is clicked (event propagation stopped). */
  onOuterClick?: (cell: Cell, e: MouseEvent) => void;
  /** Fired when an inner cell is clicked (event propagation stopped). */
  onInnerClick?: (cell: Cell, inner: Inner, e: MouseEvent) => void;
  /** Hover title for the outer header. Receives the cell. */
  outerTitle?: (cell: Cell) => string | undefined;
  /** Hover title for an inner cell. Receives both the cell and inner. */
  innerTitle?: (cell: Cell, inner: Inner) => string | undefined;
  /** Optional trailing sidebar column. */
  sidebar?: TreemapSidebar;
  /** Extra class on the root. */
  class?: string;
}

const outerFlex = (weight: number): string =>
  weight <= 0 ? "0 0 auto" : `${weight} 1 0px`;

const innerFlex = (weight: number): string => `${weight} 1 15ch`;

const outerClass = (selected: boolean): string =>
  selected
    ? "sui-treemap__outer sui-treemap__outer--selected"
    : "sui-treemap__outer";

const innerClass = (selected: boolean): string =>
  selected
    ? "sui-treemap__inner sui-treemap__inner--selected"
    : "sui-treemap__inner";

const sidebarClass = (selected: boolean): string =>
  selected
    ? "sui-treemap__sidebar sui-treemap__sidebar--selected"
    : "sui-treemap__sidebar";

const rootClass = (extra: string | undefined): string =>
  extra ? `sui-treemap ${extra}` : "sui-treemap";

/**
 * Treemap Primitive. See module header for API contract.
 */
export function Treemap<
  Inner extends TreemapInnerData,
  Cell extends TreemapCellData<Inner>,
>(p: TreemapProps<Inner, Cell>): ReturnType<Component> {
  const cellSelected = (c: Cell): boolean =>
    p.isOuterSelected ? p.isOuterSelected(c) : false;
  const innerSelected = (c: Cell, i: Inner): boolean =>
    p.isInnerSelected ? p.isInnerSelected(c, i) : false;

  return (
    <div class={rootClass(p.class)}>
      <For each={p.cells}>
        {(cell) => (
          <div
            class={outerClass(cellSelected(cell))}
            style={{ flex: outerFlex(cell.weight) }}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive — role/tabIndex/onKeyDown added when onOuterClick is provided; static usage stays non-interactive */}
            <div
              class="sui-treemap__outer-header"
              title={p.outerTitle?.(cell)}
              role={p.onOuterClick ? "button" : undefined}
              tabIndex={p.onOuterClick ? 0 : undefined}
              onClick={(e) => {
                e.stopPropagation();
                p.onOuterClick?.(cell, e);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  p.onOuterClick?.(cell, e as unknown as MouseEvent);
                }
              }}
            >
              {p.renderOuterHeader(cell)}
            </div>
            <Show when={p.renderOuterToolbar}>
              {(render) => (
                <div class="sui-treemap__outer-toolbar">{render()(cell)}</div>
              )}
            </Show>
            <div class="sui-treemap__inner-list">
              <For each={cell.children}>
                {(inner) => (
                  // biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive — role/tabIndex/onKeyDown added when onInnerClick is provided; static usage stays non-interactive
                  <div
                    class={innerClass(innerSelected(cell, inner))}
                    style={{ flex: innerFlex(inner.weight) }}
                    title={p.innerTitle?.(cell, inner)}
                    role={p.onInnerClick ? "button" : undefined}
                    tabIndex={p.onInnerClick ? 0 : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onInnerClick?.(cell, inner, e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        p.onInnerClick?.(
                          cell,
                          inner,
                          e as unknown as MouseEvent,
                        );
                      }
                    }}
                  >
                    {p.renderInnerContent(cell, inner)}
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </For>
      <Show when={p.sidebar}>
        {(sb) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive — role/tabIndex/onKeyDown added when sidebar.onClick is provided; static usage stays non-interactive
          <div
            class={sidebarClass(sb().selected ?? false)}
            style={{ flex: outerFlex(sb().weight) }}
            title={sb().title}
            role={sb().onClick ? "button" : undefined}
            tabIndex={sb().onClick ? 0 : undefined}
            onClick={(e) => {
              e.stopPropagation();
              sb().onClick?.(e);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                sb().onClick?.(e as unknown as MouseEvent);
              }
            }}
          >
            {sb().content}
          </div>
        )}
      </Show>
    </div>
  );
}

/** Override Props on Treemap — set at Factory call time, stripped from
 *  Curried Variant public APIs. */
export type TreemapOverrides = "class";

/** Public props of a Curried Treemap Variant. */
export type TreemapDataProps<
  Inner extends TreemapInnerData = TreemapInnerData,
  Cell extends TreemapCellData<Inner> = TreemapCellData<Inner>,
> = Omit<TreemapProps<Inner, Cell>, TreemapOverrides>;

/** Factory: returns a Treemap pre-configured with the given Override Props.
 *  Use this to spin up named Curried Variants in `variants.ts`. The returned
 *  function preserves the Primitive's generics so each call site keeps full
 *  type inference for its cell shape. */
export function createTreemap(
  defaults: Partial<Pick<TreemapProps, TreemapOverrides>> = {},
) {
  function Curried<
    Inner extends TreemapInnerData,
    Cell extends TreemapCellData<Inner>,
  >(props: TreemapDataProps<Inner, Cell>): ReturnType<Component> {
    return <Treemap {...(defaults as TreemapProps<Inner, Cell>)} {...props} />;
  }
  return Curried;
}
