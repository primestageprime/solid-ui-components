// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// Deliberately narrow. `geometry.ts` is a private module: it is pure, it prints
// as a table, and every one of its ~20 exports exists so `geometry.test.ts` can
// read the dial without a browser — not so a consumer can. Publishing them
// would make each one API the manifest owes an entry for and the next agent
// owes a deprecation to. `Domain` is the exception, because a call site has to
// be able to name the type of the `domain` prop it passes — exported under a
// qualified name, because `Domain` is a word more than one component in this
// library wants and an ambiguous `export *` resolves to nothing at all.
//
// Clients import `RateDial` (or curry their own units once with
// `createRateGauge`); `RateGauge` itself is exported for the case where every
// override is already being passed explicitly.
export { RateGauge, createRateGauge } from "./RateGauge";
export type {
  RateGaugeProps,
  RateGaugeOverrides,
  RateGaugeDataProps,
} from "./RateGauge";
export { RateDial } from "./variants";
export type { Domain as RateGaugeDomain } from "./geometry";
