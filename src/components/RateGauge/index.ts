// Barrel — WORKSHOP PROTOTYPE, deliberately NOT re-exported from src/index.ts.
//
// The bench (dev/showcases/workshop/rate-gauge.tsx) reaches this folder
// directly while the API is still being settled. Promotion (`/promote`) is
// what adds the package export, the dedicated showcase, the COMPONENTS.md
// entry and whatever curried variants the first real caller turns out to need.
//
// No factory here on purpose: every prop is data (`domain`, `baseline`,
// `value`, `label`, `format`, `baselineLabel`), so there is nothing static to
// curry, and `createRateGauge({})` would be an unconfigured surface.
export { RateGauge } from "./RateGauge";
export type { RateGaugeProps } from "./RateGauge";
export {
  angleFor,
  braceCusp,
  bracePath,
  capArc,
  clampedValue,
  gaugeGeometry,
  zoneOf,
} from "./geometry";
export type { Callout, Domain, GaugeGeometry, LabelId, Zone } from "./geometry";
