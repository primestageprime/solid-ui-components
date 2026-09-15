// ============================================
// TreeDiffChart — narrow layout. Two columns, one row per line: left is the
// baseline, right is the comparison, straddling the divider means both roots
// resolve it. No roots, no edges. A changed line is two boxes facing each
// other, joined by a line. Pure.
// ============================================
import { filter, flatMap, map } from "../../fn";
import { BOX_HEIGHT, type NarrowFrame } from "./frame";
import type {
  LayoutBand,
  LayoutCaption,
  LayoutGuide,
  LayoutNode,
  RankedBand,
} from "./layout-types";
import {
  SAME_ID,
  type TreeDiffEntry,
  type TreeDiffRoot,
  type TreeDiffSide,
} from "./types";

const EDGE = 10;
const TEXT_INSET = 12;
const HEAD_Y = 26;
const HEAD_RULE_Y = 38;

const boxNode = (
  entry: TreeDiffEntry,
  kind: "group" | "leaf",
  side: TreeDiffSide,
  x: number,
  y: number,
  width: number,
): LayoutNode => ({
  id: entry.id,
  label: entry.label,
  hash: entry.hash,
  kind,
  side,
  x,
  y,
  width,
  height: BOX_HEIGHT,
});

export type NarrowInput = {
  frame: NarrowFrame;
  baseline: TreeDiffRoot;
  compare: TreeDiffRoot;
  shown: RankedBand[];
  prunedCount: number;
};

export type NarrowResult = {
  height: number;
  nodes: LayoutNode[];
  bands: LayoutBand[];
  guides: LayoutGuide[];
  captions: LayoutCaption[];
};

export function layoutNarrow(input: NarrowInput): NarrowResult {
  const f = input.frame;
  const W = f.width;
  const xl = EDGE + f.box / 2;
  const xr = W - EDGE - f.box / 2;
  const nodes: LayoutNode[] = [];
  const bands: LayoutBand[] = [];
  const guides: LayoutGuide[] = [
    { kind: "rule", x1: 0, y1: HEAD_RULE_Y, x2: W, y2: HEAD_RULE_Y },
  ];
  const captions: LayoutCaption[] = [
    {
      text: input.baseline.label,
      x: TEXT_INSET,
      y: HEAD_Y,
      anchor: "start",
      side: "baseline",
    },
    {
      text: input.compare.label,
      x: W - TEXT_INSET,
      y: HEAD_Y,
      anchor: "end",
      side: "compare",
    },
  ];

  const bandRow = (
    y0: number,
    height: number,
    name: string,
    note: string,
    same: boolean,
  ): LayoutBand => ({
    name,
    note,
    y: y0,
    height,
    same,
    labelX: TEXT_INSET,
    labelY: y0 + 16,
    labelAnchor: "start",
    noteX: W - TEXT_INSET,
  });

  let cursor = f.top;
  for (const r of input.shown) {
    const y0 = cursor;
    const height = f.labelH + r.slots * f.slot + f.pad;
    const rowY = (i: number) => y0 + f.labelH + f.slot / 2 + i * f.slot;
    if (bands.length > 0) {
      guides.push({ kind: "rule", x1: 0, y1: y0 - 6, x2: W, y2: y0 - 6 });
    }
    // The divider only runs beside the rows, not through the labels.
    guides.push({
      kind: "divider",
      x1: f.cx,
      y1: y0 + f.labelH - 4,
      x2: f.cx,
      y2: y0 + height - f.pad + 4,
    });
    const { baseline: gb, compare: gc } = r.band;
    if (r.children.length === 0) {
      if (!r.diverged && gb) {
        nodes.push(boxNode(gb, "group", "shared", f.cx, rowY(0), f.box));
      } else {
        if (gb)
          nodes.push(boxNode(gb, "group", "baseline", xl, rowY(0), f.box));
        if (gc) nodes.push(boxNode(gc, "group", "compare", xr, rowY(0), f.box));
      }
    } else {
      nodes.push(
        ...flatMap((k, i): LayoutNode[] => {
          const shared =
            k.baseline && k.compare && k.baseline.id === k.compare.id;
          if (shared && k.baseline) {
            return [
              boxNode(k.baseline, "leaf", "shared", f.cx, rowY(i), f.box),
            ];
          }
          return filter(
            (n): n is LayoutNode => n !== undefined,
            [
              k.baseline
                ? boxNode(k.baseline, "leaf", "baseline", xl, rowY(i), f.box)
                : undefined,
              k.compare
                ? boxNode(k.compare, "leaf", "compare", xr, rowY(i), f.box)
                : undefined,
            ],
          );
        }, r.children),
      );
      // A changed line is two boxes facing each other — join them.
      guides.push(
        ...map(
          (i: number): LayoutGuide => ({
            kind: "joiner",
            x1: EDGE + f.box,
            y1: rowY(i),
            x2: W - EDGE - f.box,
            y2: rowY(i),
          }),
          filter(
            (i: number) => {
              const k = r.children[i];
              return (
                !!k.baseline && !!k.compare && k.baseline.id !== k.compare.id
              );
            },
            map((_, i) => i, r.children),
          ),
        ),
      );
    }
    bands.push(
      bandRow(
        y0,
        height,
        r.band.name,
        r.diverged ? r.movedNote : "identical",
        false,
      ),
    );
    cursor += height;
  }

  if (input.prunedCount > 0) {
    const count = input.prunedCount;
    const y0 = cursor;
    const height = f.labelH + f.slot + f.pad;
    if (input.shown.length > 0) {
      guides.push({ kind: "rule", x1: 0, y1: y0 - 6, x2: W, y2: y0 - 6 });
    }
    nodes.push({
      id: SAME_ID,
      label: "[SAME]",
      hash: `${count} ${count === 1 ? "subtree" : "subtrees"} · pruned`,
      kind: "same",
      side: "shared",
      x: f.cx,
      y: y0 + f.labelH + f.slot / 2,
      width: Math.min(W - 24, 300),
      height: BOX_HEIGHT,
    });
    bands.push(
      bandRow(
        y0,
        height,
        "identical subtrees",
        `${count} ${count === 1 ? "entry" : "entries"} · pruned`,
        true,
      ),
    );
    cursor += height;
  }

  return { height: cursor + 24, nodes, bands, guides, captions };
}
