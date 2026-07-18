// Table field module — `actions` (Depth 1). Icon-button action cells plus the
// trailing cluster column and its geometry. A single action is an IconOnlyButton
// wrapping an `sm` Icon; a cluster renders n action cells in one right-aligned
// IconClusterRow (Peter's ruling: 1rem of gutter around each icon).
// See docs/superpowers/plans/2026-07-16-semantic-props-metric.md §3a-geometry.
import type { JSX } from "solid-js";
import type { FieldCol, FieldGeo } from "./shared";
import { humanize } from "./shared";
import { IconOnlyButton } from "../../Button";
import { Icon, type IconName } from "../../Icon";
import { IconClusterRow } from "../../Layout";
import { pipe, pluck, join } from "../../../fn";

/** Standard icons for known action ids. Extend ONLY with names that exist in
 *  IconName; unknown ids fall back to the neutral `settings` glyph. */
export const ACTION_ICONS: Record<string, IconName> = {
  edit: "edit",
  delete: "trash",
};

/** actions(n) geometry — DERIVED from button metrics, never guessed. Standard
 *  widths come from the rendered chrome: n IconOnlyButtons at 1.4rem each, the
 *  IconClusterRow's `sm`/0.5rem gap between adjacent buttons (Peter's amendment
 *  2026-07-17 — glyphs ~1em apart, not 1rem), plus 2rem of cell chrome, so the
 *  column is `n·1.4 + (n-1)·0.5 + 1` rem. Fixed (min === max); minCh/maxCh
 *  express that rem width in ch (1rem ≈ 2ch).
 *  geoFor(2) = 2·1.4 + 0.5 + 1 = 4.3rem = 8.6ch (8px/side field-frame chrome). */
export const geoFor = (n: number): FieldGeo => {
  const rem = Number((n * 1.4 + (n - 1) * 0.5 + 1).toFixed(1));
  return { minCh: Number((rem * 2.22).toFixed(1)), maxCh: Number((rem * 2.22).toFixed(1)), css: `${rem.toFixed(1)}rem` };
};

/** A single action cell: an icon button that runs `run(row)`. aria-label and
 *  title are the humanized id so the icon-only affordance stays accessible. */
export const actionCol = <T,>(
  id: string,
  run: (row: T) => void,
): FieldCol<T> => ({
  id,
  header: "",
  geo: geoFor(1),
  accessor: (row) => (
    <IconOnlyButton
      aria-label={humanize(id)}
      title={humanize(id)}
      onClick={() => run(row)}
    >
      <Icon name={ACTION_ICONS[id] ?? "settings"} size="sm" />
    </IconOnlyButton>
  ),
});

/** ['edit','delete'] → one compact trailing action column. Renders every action
 *  cell in a single IconClusterRow; empty header, right-aligned, width from the
 *  n-action standard geometry. */
export const clusterCol = <T,>(actions: FieldCol<T>[]): FieldCol<T> => {
  const geo = geoFor(actions.length);
  return {
    id: pipe(actions, pluck("id"), join("+")),
    header: "",
    align: "right",
    width: geo.css,
    geo,
    accessor: (row) => (
      <IconClusterRow>
        {actions.map((a) => (a.accessor as (r: T) => JSX.Element)(row))}
      </IconClusterRow>
    ),
  };
};
