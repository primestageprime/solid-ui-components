// ============================================
// fn — data-last functional utilities (Depth 0, ruled 2026-07-18)
// A self-contained module of always-curried, data-last helpers plus a typed
// value-first `pipe`. Prefer small named pure functions composed through
// `pipe` over inline dot-chained `.map().filter().reduce()` lambdas. Reached
// through the package barrel as the `fn` namespace (`import { fn } from
// "@primestageprime/solid-ui-components"`). Zero imports from outside this
// directory — designed to be lifted out as its own package. See README.md and
// docs/superpowers/plans/2026-07-18-fn-module.md.
// ============================================
export { pipe } from "./pipe";
export { map } from "./map";
export { filter } from "./filter";
export { prop } from "./prop";
export { pluck } from "./pluck";
export { sortBy } from "./sortBy";
export { sum } from "./sum";
export { mean } from "./mean";
export { length } from "./length";
export { lengthOf } from "./lengthOf";
export { join } from "./join";
export { groupBy } from "./groupBy";
