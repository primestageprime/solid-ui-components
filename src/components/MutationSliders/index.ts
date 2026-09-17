// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// Deliberately narrow, the same disposition as RateGauge's. `geometry.ts` is a
// PRIVATE module: it is pure, it prints as a table, and every one of its ~30
// exports exists so `geometry.test.ts` can read a row without a browser — not
// so a consumer can. Publishing them would make each one API the manifest owes
// an entry for and the next agent owes a deprecation to. The two TYPES are the
// exception, because a call site has to be able to name the shape of the
// `entities` it builds and the `domain` it passes — and both are exported under
// QUALIFIED names, because `Entity` and `Domain` are words more than one
// component in this library wants and an ambiguous `export *` resolves to
// nothing at all.
//
// `MutationDial` (dial.tsx) and the wording defaults (labels.ts) are private
// too. The dial is a real seam — one entity's column, plausibly reusable on
// its own — but no caller has asked for it, and a published component owes a
// showcase, a catalog entry and a COMPONENTS.md section. Promoting it later is
// a rename and a showcase; unpublishing it would be a breaking change.
//
// Clients import `NumberMutationSliders` (or curry their own unit and
// vocabulary once with `createMutationSliders`); `MutationSliders` itself is
// exported for the case where every override is already being passed
// explicitly, and because a row's formatter is often genuinely reactive — a
// unit the reader switches — which a curried variant would hide.
export { MutationSliders, createMutationSliders } from "./MutationSliders";
export type {
  MutationSlidersProps,
  MutationSlidersOverrides,
  MutationSlidersDataProps,
  MutationSliderLabels,
} from "./MutationSliders";
export { NumberMutationSliders } from "./variants";
// THE CANONICAL NAMES ARE THE PLAIN ONES. `Entity`, `Domain` and `ChangeTone`
// are what a consumer writing an adapter says, and they reach `src/index.ts`
// unambiguously: verified by grep that no other component's barrel re-exports
// any of the three (RateGauge publishes its own domain as `RateGaugeDomain`
// for exactly this reason). An ambiguous `export *` resolves to NOTHING
// silently, so if a second component ever wants one of these words, THAT one
// qualifies — this component was here first and has consumers.
export type { ChangeTone, Domain, Entity } from "./geometry";

// Qualified aliases, kept alongside. Additive: the scenario board already
// imports `MutationEntity`, and a name that reads unambiguously at a distant
// call site is worth keeping even though the plain one is canonical.
export type {
  Entity as MutationEntity,
  Domain as MutationSlidersDomain,
} from "./geometry";
