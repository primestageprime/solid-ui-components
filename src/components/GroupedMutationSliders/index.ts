// Barrel — the PUBLIC surface, re-exported from `src/index.ts`.
//
// Deliberately narrow, the same disposition as `PairedMutationSliders`' and
// `MutationSliders`'. `groups.ts` is pure and prints as a table
// (`groups.test.ts`); its projection helpers exist so a test can read a row
// without a browser, not so a consumer can. `axes.ts`'s resolvers and
// `labels.ts`'s defaults are private for the same reason, and `dial.tsx` is a
// real seam that no caller has asked for — promoting it later is a rename and
// a showcase, unpublishing it would be a breaking change.
//
// EVERY EXPORTED TYPE IS QUALIFIED, and that is not cosmetic. `src/index.ts`
// is `export *` over every component barrel, and an AMBIGUOUS `export *` — two
// modules publishing one name — resolves to NOTHING, silently. `Entity`,
// `Domain`, `MeasureIndex` and `ChangeTone` are already published names with
// live consumers, so nothing here reuses a bare one: the measure index is
// `GroupedMeasureIndex`, the measure is `GroupedMeasure`, and so on. Having
// done it while the folder was still on the bench meant promotion could not be
// the thing that silently broke `Chart`, `MutationSliders` or
// `PairedMutationSliders` — and `barrel.test.ts` pins both sets through the
// package root, which is what makes a future collision loud instead of silent.
//
// NO CURRIED VARIANT, AND THAT IS THE CORRECT NUMBER — the same argument
// `PairedMutationSliders`' barrel makes, one notch stronger. The FACTORY is
// what satisfies "clients import only curried components". Here a variant could
// not merely guess wrong about presentation, it would FIX THE DATA SHAPE:
// `axes` is required in `GroupedMutationSlidersOverrides`, and `axes.length` IS
// each entity's measure count, so a curried name would dictate how many dials
// every consumer's entities carry. There is no generic N the way there is a
// generic number for `NumberMutationSliders`. The consumer curries once with
// `createGroupedMutationSliders` and imports its own curried name thereafter.
export {
  GroupedMutationSliders,
  createGroupedMutationSliders,
} from "./GroupedMutationSliders";
export type {
  GroupedMutationSlidersProps,
  GroupedMutationSlidersOverrides,
  GroupedMutationSlidersDataProps,
  GroupedMutationSliderLabels,
} from "./GroupedMutationSliders";
export type { GroupedMeasureAxis, GroupedMeasureAxes } from "./axes";
export type {
  GroupRun,
  GroupedMeasure,
  GroupedMeasureIndex,
  GroupedMutationEntity,
} from "./groups";
