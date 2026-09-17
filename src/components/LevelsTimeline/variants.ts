// src/components/LevelsTimeline/variants.ts
//
// The curried variant the package publishes. It takes DATA ONLY — levels,
// transfers, mutations, the time span, an optional pinned value span,
// selection and the two callbacks — and bakes the one presentational prop
// (`formatValue`) at its default: the value as a plain number.
//
// ONE variant, deliberately (SUI: start with one, expand only when a real
// caller demands it). A second named variant would have to bake a FORMAT, and
// a format is domain knowledge — dollars, hours, kilograms — which is exactly
// what this component refuses to hold. A consumer that wants one builds it
// where that knowledge already lives:
//
//   const MoneyLevelsTimeline = createLevelsTimeline({ formatValue: asDollars });
//
// It is named `LevelsRailChart` rather than `LevelsTimeline` because the BASE
// component keeps that name at the package root: thorcasting-ui is writing
// adapters against `LevelsTimeline` + `LevelsTimelineProps` today, and a
// curried surface under the same name would reject the `formatValue` those
// adapters pass. Base and curried variant side by side is the ordinary SUI
// shape (Button, Fab); one name meaning two things is not.
import { createLevelsTimeline } from "./LevelsTimeline";

export const LevelsRailChart = createLevelsTimeline({});
