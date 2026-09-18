// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// Deliberately narrow, the same disposition as MutationSliders' and
// RateGauge's. `pairs.ts` is pure and prints as a table (pairs.test.ts); its
// projection helpers exist so the test can read a row without a browser, not
// so a consumer can. `axes.ts`'s resolvers and `labels.ts`'s defaults are
// private for the same reason. `pair.tsx` is a real seam — one entity's paired
// column, plausibly reusable on its own — but no caller has asked for it, and a
// published component owes a showcase, a catalog entry and a COMPONENTS.md
// section. Promoting it later is a rename and a showcase; unpublishing it
// would be a breaking change.
//
// EVERY EXPORTED TYPE IS QUALIFIED, and that is not cosmetic. `src/index.ts`
// is `export *` over every component barrel, and an AMBIGUOUS `export *` — two
// modules publishing one name — resolves to NOTHING, silently. `Entity`,
// `Domain` and `ChangeTone` are already MutationSliders'/MarkedSlider's
// published names and have live consumers, so nothing here may reuse a bare
// one. `barrel.test.ts` asserts every name below still resolves from the
// package root, which is what makes a collision loud instead of silent.
//
// NO CURRIED VARIANT, AND THAT IS THE CORRECT NUMBER FOR TODAY. The rule is
// "clients import only curried components", and the FACTORY is what satisfies
// it: a variant here would have to name two units, two names, two grids and
// two scales, and every combination anyone has asked for so far is
// DOMAIN-SPECIFIC ("Hrs/wk" 0–80 snap 1, "$/hr" 0–300 snap 5 — an hourly
// board's axes, not a library's). SUI does not guess which units. The consumer
// curries once with `createPairedMutationSliders` and imports its own curried
// name thereafter, exactly as the showcase below does and exactly as
// `createMutationSliders` is documented for. The first NON-domain-specific pair
// anybody demands gets a variant here (SUI: start minimal, expand on demand).
export {
  PairedMutationSliders,
  createPairedMutationSliders,
} from "./PairedMutationSliders";
export type {
  PairedMutationSlidersProps,
  PairedMutationSlidersOverrides,
  PairedMutationSlidersDataProps,
  PairedMutationSliderLabels,
} from "./PairedMutationSliders";
export type { PairedMeasureAxis, PairedMeasureAxes } from "./axes";
export type {
  MeasureIndex,
  PairedMeasure,
  PairedMutationEntity,
} from "./pairs";
