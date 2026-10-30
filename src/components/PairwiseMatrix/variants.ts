// ============================================
// PairwiseMatrix Curried Variants — Depth 3 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import {
  createPairwiseMatrix,
  type PairwiseMatrixDataProps,
} from "./PairwiseMatrix";

/** Every candidate against every other, "wins–losses" per pair, toned by who won. */
export const PairwiseMatrix: Component<PairwiseMatrixDataProps> =
  createPairwiseMatrix();
