/* Alarm-overlay component family. See ./README.md for the full picture.
 *
 * Three layers:
 *   1. Pure helpers      — alarm.ts          (detectRanges, padRanges,
 *                                            findHotZones, subtractZones,
 *                                            clampRanges, alarmPipeline)
 *   2. Base components   — AlarmBands, AlarmHotZones, AlarmStripeDefs
 *                          (render pre-computed shapes inside a <Chart>)
 *   3. Curried component — AlarmOverlay
 *                          (raw points + thresholds → full overlay)
 */

export {
  detectRanges,
  padRanges,
  findHotZones,
  subtractZones,
  clampRanges,
  alarmPipeline,
} from "./alarm";
export type { Pt, Range, HotZone } from "./alarm";

export { AlarmBands } from "./AlarmBands";
export type { AlarmBandsProps } from "./AlarmBands";

export { AlarmHotZones } from "./AlarmHotZones";
export type { AlarmHotZonesProps } from "./AlarmHotZones";

export { AlarmStripeDefs } from "./AlarmStripeDefs";
export type { AlarmStripeDefsProps } from "./AlarmStripeDefs";

export { AlarmOverlay } from "./AlarmOverlay";
export type { AlarmOverlayProps, AlarmSeries } from "./AlarmOverlay";
