// Folder barrel — the surface this component's BENCHES import.
//
// NOT re-exported from `src/index.ts`, and that is the whole disposition of
// this file today. `GroupedMutationSliders` is on the workshop bench
// (`dev/showcases/workshop/grouped-mutation-sliders.tsx`), so it is deliberately
// absent from the package barrel: a published component owes a dedicated
// showcase, a catalog entry, a COMPONENTS.md section and a CHANGELOG line, and
// none of those should be written against an API still being argued with.
// `RateGauge` and `LevelsTimeline` both lived exactly here first. `/promote` is
// the one deliberate step that adds this folder to `src/index.ts` and pays all
// four debts at once.
//
// So its two consumers — its own bench and the License Board bench — import
// from this path directly, which is the honest shape: a relative import into
// `src/components/` says "this is not published yet" at every call site, where
// a barrel export would have said the opposite.
//
// EVERY EXPORTED TYPE IS ALREADY QUALIFIED, against the day it IS published.
// `src/index.ts` is `export *` over every component barrel, and an AMBIGUOUS
// `export *` — two modules publishing one name — resolves to NOTHING, silently.
// `Entity`, `Domain`, `MeasureIndex` and `ChangeTone` are already published
// names with live consumers, so nothing here reuses a bare one: the measure
// index is `GroupedMeasureIndex`, the measure is `GroupedMeasure`, and so on.
// Doing it now rather than at promotion means promotion cannot be the thing
// that silently breaks `Chart` or `MutationSliders`.
//
// NO CURRIED VARIANT, AND THAT IS THE CORRECT NUMBER FOR TODAY — the same
// argument `PairedMutationSliders`' barrel makes. The FACTORY is what satisfies
// "clients import only curried components": a variant here would have to name
// every unit, grid, scale and caption, and the only combination anyone has
// asked for is DOMAIN-SPECIFIC (a licence board's `mo` #/$ and `yr` #/%). SUI
// does not guess which units.
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
