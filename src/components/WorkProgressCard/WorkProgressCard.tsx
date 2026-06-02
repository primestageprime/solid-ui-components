// WorkProgressCard — a status-aware work card with a progress bar derived
// entirely from work metadata. Data-only: the caller passes domain values
// (status, estimate, actual) and never reasons about colors or proportions —
// all styling comes from cardProgress.ts. It carries no visual/size overrides,
// so per the curried-only convention it's re-exported directly (no factory).
import { For, Show, type Component } from "solid-js";
import {
  deriveCardBar,
  statusAccent,
  CARD_SIGN_COLOR,
  type WorkStatus,
} from "./cardProgress";
import "./WorkProgressCard.css";

export interface WorkProgressCardProps {
  /** Work status — drives the accent and the bar treatment. */
  status: WorkStatus;
  /** Primary label (clamps to 3 lines). */
  title: string;
  /** Assignee shown top-left. */
  claimedBy?: string;
  /** Secondary label shown under the title. */
  subtitle?: string;
  /** Budgeted amount (any unit, same as `actual`). */
  estimate?: number;
  /** Actual amount spent so far (same unit as `estimate`). For a live view,
   *  recompute this from `actualFromSegments(segments, now)` and pass it in —
   *  the card re-renders reactively without re-deriving anything itself. */
  actual?: number;
}

export const WorkProgressCard: Component<WorkProgressCardProps> = (props) => {
  const accent = () => statusAccent(props.status);
  const bar = () =>
    deriveCardBar({ status: props.status, estimate: props.estimate, actual: props.actual });
  return (
    <div class="sui-wpc" data-status={props.status} style={{ "border-color": accent() }}>
      <div class="sui-wpc__header">
        <span class="sui-wpc__claimed">{props.claimedBy}</span>
        <span class="sui-wpc__status" style={{ color: accent() }}>{props.status}</span>
      </div>
      <div class="sui-wpc__title">{props.title}</div>
      <Show when={props.subtitle}>
        <div class="sui-wpc__subtitle">{props.subtitle}</div>
      </Show>
      <div class="sui-wpc__bar-wrap">
        <div class="sui-wpc__bar">
          <For each={bar().segments}>
            {(seg) => (
              <div class="sui-wpc__seg" style={{ width: `${seg.width * 100}%`, background: seg.color }} />
            )}
          </For>
        </div>
        <Show when={bar().sign}>
          {(sign) => (
            <div class="sui-wpc__sign" style={{ border: `1px solid ${CARD_SIGN_COLOR}`, color: CARD_SIGN_COLOR }}>
              {sign() === "yield" ? "⚠︎" : "?"}
            </div>
          )}
        </Show>
      </div>
    </div>
  );
};
