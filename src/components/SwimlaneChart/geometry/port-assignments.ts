/* SwimlaneChart geometry — per-edge port assignment.
 *
 * Spreads each visible node's in/out edges across distinct y-positions along its
 * vertical extent so parallel connections fan out instead of stacking, for
 * orthogonal routing. */
import type { EdgePorts, LayoutEdgeLike, NodePos } from "./shared";

/**
 * Per-edge port assignment for orthogonal routing. For each visible node, its
 * in/out edges get distinct y positions spread evenly along the node's vertical
 * extent so parallel connections fan out instead of stacking at one anchor.
 * Returns a map keyed "source|target" → { from, to } port y-values.
 */
export function computePortAssignments(
  positions: ReadonlyMap<string, NodePos>,
  edges: LayoutEdgeLike[],
): Map<string, EdgePorts> {
  // Ordered so edges with smaller other-endpoint y get earlier ports (the fan
  // reads top-to-bottom).
  const incoming = new Map<string, { edgeKey: string; otherY: number }[]>();
  const outgoing = new Map<string, { edgeKey: string; otherY: number }[]>();
  for (const e of edges) {
    if (e.synthetic) continue;
    const key = `${e.sourceId}|${e.targetId}`;
    const s = positions.get(e.sourceId);
    const t = positions.get(e.targetId);
    if (s && positions.has(e.targetId)) {
      const arr = outgoing.get(e.sourceId) ?? [];
      arr.push({ edgeKey: key, otherY: t!.y });
      outgoing.set(e.sourceId, arr);
    }
    if (t && positions.has(e.sourceId)) {
      const arr = incoming.get(e.targetId) ?? [];
      arr.push({ edgeKey: key, otherY: s!.y });
      incoming.set(e.targetId, arr);
    }
  }
  const portY = new Map<string, EdgePorts>();
  const assign = (
    side: "in" | "out",
    list: Map<string, { edgeKey: string; otherY: number }[]>,
  ) => {
    for (const [nodeId, es] of list) {
      const p = positions.get(nodeId);
      if (!p) continue;
      es.sort((a, b) => a.otherY - b.otherY);
      const n = es.length;
      const top = p.y - p.height / 2;
      const h = p.height;
      es.forEach((e, i) => {
        const y = top + (h * (i + 1)) / (n + 1);
        const cur = portY.get(e.edgeKey) ?? { from: p.y, to: p.y };
        if (side === "out") cur.from = y;
        else cur.to = y;
        portY.set(e.edgeKey, cur);
      });
    }
  };
  assign("out", outgoing);
  assign("in", incoming);
  return portY;
}
