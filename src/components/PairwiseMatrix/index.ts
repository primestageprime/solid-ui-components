// Base (PairwiseMatrix) is intentionally NOT exported — use the curried variant ONLY.
export { createPairwiseMatrix } from "./PairwiseMatrix";
export type {
  PairwiseMatrixDataProps,
  PairwiseMatrixOverrides,
} from "./PairwiseMatrix";
export { pairwiseMatrix, pairwiseOutcome } from "./pairwise";
export type { PairwiseOutcome, PairwiseTally, TieredBallot } from "./pairwise";
export * from "./variants";
