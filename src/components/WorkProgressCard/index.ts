// WorkProgressCard public surface.
//
// The card is data-only (no size/variant/tone), so per the curried-only
// convention it's re-exported directly — no factory needed. The styling
// derivation is exposed as pure functions so consumers can build their own
// renderers (or compute `actual` from work segments for a live view).
export { WorkProgressCard } from "./WorkProgressCard";
export type { WorkProgressCardProps } from "./WorkProgressCard";

export {
  deriveCardBar,
  actualFromSegments,
  isRunning,
  statusAccent,
  CARD_BAR_COLOR,
  CARD_SIGN_COLOR,
} from "./cardProgress";
export type {
  WorkStatus,
  CardProgressInput,
  CardBarSegment,
  CardBar,
  CardSign,
  WorkSegment,
} from "./cardProgress";
