// Local barrel only — DELIBERATELY not re-exported from src/index.ts.
//
// MutationSliders is on a workshop bench (dev/showcases/workshop/
// mutation-sliders.tsx) while its API settles. Joining the package barrel is
// what `/promote` does, together with the showcase, the catalog entry and the
// COMPONENTS.md section that the `componentsWithoutShowcase` and
// `undocumentedExports` ratchets ask for at that moment — all of which would
// be asking the library to commit to props Peter has not signed off yet.
export { MutationSliders } from "./MutationSliders";
export type { MutationSlidersProps } from "./MutationSliders";

// The geometry ships beside the component, the way RateGauge's does: a
// consumer that draws its own legend or its own summary of a mutation needs
// the same value→y mapping the dial used, and re-deriving it is how two
// drawings of one number end up disagreeing.
export {
  arrowPath,
  bandFor,
  changeLineFor,
  clampToRange,
  dialGeometry,
  mutationGeometry,
  rangeOf,
  toneOf,
  yFor,
} from "./geometry";
export type {
  ArrowSide,
  Box,
  ChangeTone,
  DialGeometry,
  Domain,
  Entity,
} from "./geometry";
