// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// Deliberately narrow, the same disposition as MutationSliders' and
// RateGauge's. `geometry.ts` is a PRIVATE module: it is pure, it prints as a
// table, and its exports exist so `geometry.test.ts` can read a row without a
// browser — not so a consumer can. The exception is the two TYPES a call site
// has to be able to name, and they reach `src/index.ts` through
// MutationSliders' barrel, which has published them since 0.170 and stays
// their canonical home.
export {
  MarkedSlider,
  createMarkedSlider,
  type MarkedSliderProps,
  type MarkedSliderOverrides,
  type MarkedSliderDataProps,
} from "./MarkedSlider";
export { ContinuousMarkedSlider } from "./variants";
