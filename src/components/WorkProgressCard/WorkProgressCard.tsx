// WorkProgressCard — Composed (Depth 1). Composes Surface / Text / Layout variants (each Depth 0).
// A status-aware work card with a progress bar derived
// entirely from work metadata. Data-only: the caller passes domain values
// (status, estimate, actual) and never reasons about colors or proportions —
// all styling comes from cardProgress.ts. It carries no visual/size overrides,
// so per the curried-only convention it's re-exported directly (no factory).
import { For, Show, type Component, type JSX } from "solid-js";
import { Surface } from "../Surface/Surface";
import { BaselineSpreadRow } from "../Layout/variants";
import { Text } from "../Text/Text";
import { deriveCardBar, statusAccent, type WorkStatus } from "./cardProgress";
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
    deriveCardBar({
      status: props.status,
      estimate: props.estimate,
      actual: props.actual,
    });
  // Padding (8px 12px) and radius (6px) sit off Surface's padding/radius scale
  // (sm=8/md=16, sm=4/md=8), so they're supplied inline at the composition
  // site. The status accent drives the border color, matching the previous
  // per-status inline border-color override.
  const cardStyle = (): JSX.CSSProperties => ({
    padding: "8px 12px",
    "border-radius": "6px",
  });
  return (
    <Surface
      class="sui-wpc"
      data-status={props.status}
      direction="column"
      padding="none"
      radius="none"
      bg="var(--sui-surface, rgba(0, 0, 0, 0.2))"
      borderColor={accent()}
      style={cardStyle()}
    >
      <BaselineSpreadRow class="sui-wpc__header">
        <Text variant="sublabel" as="span" class="sui-wpc__claimed">
          {props.claimedBy}
        </Text>
        <Text
          variant="label"
          as="span"
          class="sui-wpc__status"
          color={accent()}
        >
          {props.status}
        </Text>
      </BaselineSpreadRow>
      <Text variant="title" as="div" class="sui-wpc__title">
        {props.title}
      </Text>
      <Show when={props.subtitle}>
        <Text variant="sublabel" as="div" class="sui-wpc__subtitle">
          {props.subtitle}
        </Text>
      </Show>
      <div class="sui-wpc__bar-wrap">
        <div class="sui-wpc__bar">
          <For each={bar().segments}>
            {(seg) => (
              <div
                class="sui-wpc__seg"
                style={{ width: `${seg.width * 100}%`, background: seg.color }}
              />
            )}
          </For>
        </div>
        <Show when={bar().sign}>
          {(sign) => (
            <div class="sui-wpc__sign">
              {sign() === "yield" ? "⚠︎" : "?"}
            </div>
          )}
        </Show>
      </div>
    </Surface>
  );
};
