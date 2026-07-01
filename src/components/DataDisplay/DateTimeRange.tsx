// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DateTimeRange — Composite (Depth 2).
// Owns zero CSS. Composes the `NowrapBody` Text Curried Variant; the
// pure formatter lives in `formatDateTimeRange.ts` so other Primitives
// (e.g. `TitledTimeRangeHeader`) can reuse the rule without composing
// this Composite.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import { NowrapBody } from "../Text";
import {
  formatDateTimeRange,
  type DateTimeRangeMode,
} from "./formatDateTimeRange";

export interface DateTimeRangeProps extends JSX.HTMLAttributes<HTMLElement> {
  start: string;
  end?: string | null;
  mode?: DateTimeRangeMode;
}

export const DateTimeRange: Component<DateTimeRangeProps> = (props) => {
  const [local, others] = splitProps(props, ["start", "end", "mode"]);

  return (
    <NowrapBody {...others}>
      {formatDateTimeRange(local.start, local.end, local.mode)}
    </NowrapBody>
  );
};
