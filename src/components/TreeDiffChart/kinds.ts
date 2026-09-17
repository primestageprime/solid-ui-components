// ============================================
// TreeDiffChart — change kinds and their legend. Pure.
//
// The consumer supplies a `kind` per entry; the chart never infers one. This
// module owns the two things that must agree for the picture to read: the
// colour a kind paints, and the swatch the legend shows for it. Both come
// from the same table, so a legend swatch can never drift from the outline
// it explains.
//
// Colours are `--sui-*` tone tokens, never literals, so a theme (including
// the colourblind theme, which deliberately re-points success and danger)
// restyles chart and legend together.
// ============================================
import { filter, map } from "../../fn";
import type { LayoutNode } from "./layout-types";
import type { TreeDiffKind } from "./types";

/** Every kind, in the order the legend reads them: least to most disruptive. */
export const KINDS: TreeDiffKind[] = [
  "unchanged",
  "changed",
  "added",
  "removed",
];

type KindFace = { label: string; token: string };

const FACE: Record<TreeDiffKind, KindFace> = {
  unchanged: { label: "Unchanged", token: "var(--sui-text-muted)" },
  changed: { label: "Changed", token: "var(--sui-accent)" },
  added: { label: "Added", token: "var(--sui-success)" },
  removed: { label: "Removed", token: "var(--sui-danger)" },
};

/** The swatch colour for a kind, as a CSS token reference. */
export const kindColor = (kind: TreeDiffKind): string => FACE[kind].token;

/** The legend's human label for a kind. */
export const kindLabel = (kind: TreeDiffKind): string => FACE[kind].label;

/**
 * The kinds actually present in the drawn nodes, in `KINDS` order. The legend
 * shows only these: a chart with nothing removed must not advertise red.
 */
export function presentKinds(nodes: LayoutNode[]): TreeDiffKind[] {
  const seen = new Set(
    filter(
      (k): k is TreeDiffKind => k !== undefined,
      map((n: LayoutNode) => n.changeKind, nodes),
    ),
  );
  return filter((k: TreeDiffKind) => seen.has(k), KINDS);
}

/** Legend rows for the kinds present, ready for the `Legend` component. */
export const kindLegendItems = (
  nodes: LayoutNode[],
): { color: string; label: string }[] =>
  map(
    (k: TreeDiffKind) => ({ color: kindColor(k), label: kindLabel(k) }),
    presentKinds(nodes),
  );
