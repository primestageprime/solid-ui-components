// ============================================
// ThreeSlotRow Curried Variants — Depth 2 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import { createThreeSlotRow } from "./ThreeSlotRow";
import type { ThreeSlotRowDataProps } from "./ThreeSlotRow";

/** start | centre | end, with the start track at its content's width (`auto`).
 *  For a fixed start width (a 160px logo box), curry your own:
 *  `createThreeSlotRow({ startWidth: "160px" })` — AppBar does exactly that. */
export const ThreeSlotRow: Component<ThreeSlotRowDataProps> = createThreeSlotRow(
  {},
);
