// ─── primitives ─────────────────────────────────────────────────────────────
//
// Geometric + card-state primitives shared across the trajectory model.

export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CardMode = "card" | "morph" | "gone";
export type CardStatus = "TODO" | "DOING" | "DONE";
