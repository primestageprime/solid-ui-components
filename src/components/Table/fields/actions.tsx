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

/** Standard icons for known action ids. Extend ONLY with names that exist in
 *  IconName; unknown ids fall back to the neutral `settings` glyph. */
export const ACTION_ICONS: Record<string, IconName> = {
  edit: "edit",
  delete: "trash",
};

/** actions(n) geometry — DERIVED from button metrics, never guessed. Standard
 *  widths come from the rendered chrome: each action is a 2.5rem-wide button and
 *  the cluster adds 1rem of surrounding gutter, so the column is `n·2.5 + 1` rem.
 *  Fixed (min === max); minCh/maxCh express that rem width in ch (1rem ≈ 2ch).
 *  Bench-verified: geoFor(2) = 6rem = 12ch (2 buttons need 6rem, not 5). */
export const geoFor = (n: number): FieldGeo => {
  const rem = n * 2.5 + 1;
  return { minCh: rem * 2, maxCh: rem * 2, css: `${rem}rem` };
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
    id: actions.map((a) => a.id).join("+"),
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
