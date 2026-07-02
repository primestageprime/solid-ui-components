// ─── slurp morph ────────────────────────────────────────────────────────────
//
// Identical shape to the renderer's existing `slurpRectMorph` but
// parameterised so the trajectory module is self-contained. (Phase 4
// will deduplicate.)
//
// `side` describes which side of the LOZENGE the card sits on:
//   side === "left"  → card is on the LEFT of the lozenge (lozenge is
//                      on the card's right; the slit attaches to the
//                      lozenge's LEFT edge)
//   side === "right" → card is on the RIGHT of the lozenge (slit on
//                      the lozenge's RIGHT edge)
//
// `t` runs 0 → 1:
//   t === 0 → slit at lozenge's inner edge
//   t === 1 → full card at its rest rect

import type { Rect } from "./primitives";
import { ease, lerp, windowProgress } from "./math";

// Module-private to the slurp morph, but also read by the per-card
// arriving-trajectory builder for its morph-tracking anchor math, so
// it is exported here (NOT re-exported from the barrel).
export const SLURP_SLIT_H = 16;

export function slurpRectMorph(
  card: Rect,
  loz: Rect,
  side: "left" | "right",
  t: number,
): string {
  const cardLeft = card.x - card.width / 2;
  const cardRight = card.x + card.width / 2;
  const lozLeftEdge = loz.x - loz.width / 2;
  const lozRightEdge = loz.x + loz.width / 2;
  const lozNearEdgeX = side === "left" ? lozLeftEdge : lozRightEdge;
  const leadingFarX = side === "left" ? cardLeft : cardRight;

  const leadingT = windowProgress(t, 0.0, 0.55);
  const trailingHT = windowProgress(t, 0.4, 0.88);

  const leadingX = lerp(lozNearEdgeX, leadingFarX, ease(leadingT));
  const leadingH = lerp(SLURP_SLIT_H, card.height, ease(leadingT));
  const trailingH = lerp(SLURP_SLIT_H, card.height, ease(trailingHT));
  const trailingX =
    side === "left"
      ? Math.min(lozNearEdgeX, leadingX + card.width)
      : Math.max(lozNearEdgeX, leadingX - card.width);

  const yT = windowProgress(t, 0.0, 0.7);
  const morphCy = lerp(loz.y, card.y, ease(yT));

  const lTop = morphCy - leadingH / 2;
  const lBot = morphCy + leadingH / 2;
  const tTop = morphCy - trailingH / 2;
  const tBot = morphCy + trailingH / 2;
  const ctrlX = (leadingX + trailingX) / 2;
  return [
    `M ${trailingX} ${tTop}`,
    `C ${ctrlX} ${tTop}, ${ctrlX} ${lTop}, ${leadingX} ${lTop}`,
    `L ${leadingX} ${lBot}`,
    `C ${ctrlX} ${lBot}, ${ctrlX} ${tBot}, ${trailingX} ${tBot}`,
    "Z",
  ].join(" ");
}
