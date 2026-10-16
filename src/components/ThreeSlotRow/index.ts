// The base is not exported — use the curried `ThreeSlotRow`, or bake a start
// width with `createThreeSlotRow({ startWidth })`.
export { createThreeSlotRow, threeSlotColumns } from "./ThreeSlotRow";
export type {
  ThreeSlotRowDataProps,
  ThreeSlotRowOverrides,
  ThreeSlotRowProps,
} from "./ThreeSlotRow";
export { ThreeSlotRow } from "./variants";
