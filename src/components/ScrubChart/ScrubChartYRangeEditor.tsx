// lastReviewedAt: 2026-09-23
// lastReviewedBy: claude
// ============================================
// ScrubChartYRangeEditor — Composite (Depth 2).
// The small min/max editor a FIXED y-axis opens when the reader clicks the
// axis (ScrubChart: `yAxisMode="fixed"` + `onYRangeChange`). Two fields —
// Max above Min, the order they sit on the axis — and Cancel / Apply.
//
// Enter applies; Escape cancels, stops propagation AND marks the event
// handled (`preventDefault`). The second half is what protects a
// FullscreenBox around the chart: it listens on `document`, and it ignores an
// Escape whose `defaultPrevented` is set (pinned end to end in
// FullscreenBox/escapeWithEditor.test.tsx).
// Apply is disabled while the draft is not a range (a cleared end, or min not
// below max) and the reason shows under the fields.
//
// Money charts show dollars (`CurrencyInput`) and emit cents; any other chart
// shows and emits its own unit (`ThemedNumberInput`). The conversion and the
// rule live in yRange.ts. This module is markup only; ScrubChart owns where
// the panel sits (`.sui-scrub-chart__y-range-editor`) and whether it is open.
// ============================================

import { type JSX, Show, createMemo, createSignal, onMount } from "solid-js";
import { SmallGhostButton, SmallPrimaryButton } from "../Button";
import { CurrencyInput } from "../CurrencyInput";
import { ClusterRow, TightStack } from "../Layout";
import { MutedBody } from "../Text";
import { ThemedNumberInput } from "../ThemedNumberInput";
import {
  type YRange,
  type YRangeField,
  draftYRange,
  toFieldValue,
} from "./yRange";

export interface ScrubChartYRangeEditorProps {
  /** The range the fields start from — the domain the chart shows now. */
  initial: YRange;
  /** How the fields show a data value. Default `"number"`. */
  field?: YRangeField;
  /** The reader applied a valid range, in data units. */
  onApply: (range: YRange) => void;
  /** The reader backed out. */
  onCancel: () => void;
}

export const ScrubChartYRangeEditor = (
  props: ScrubChartYRangeEditorProps,
): JSX.Element => {
  const field = (): YRangeField => props.field ?? "number";
  const [max, setMax] = createSignal<number | undefined>(
    toFieldValue(props.initial.max, field()),
  );
  const [min, setMin] = createSignal<number | undefined>(
    toFieldValue(props.initial.min, field()),
  );
  const draft = createMemo(() => draftYRange(min(), max(), field()));
  const apply = () => {
    const d = draft();
    if (d.ok) props.onApply(d.range);
  };
  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apply();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      props.onCancel();
    }
  };
  const input = (name: "max" | "min", label: string) => {
    const value = name === "max" ? max : min;
    const onChange = name === "max" ? setMax : setMin;
    return field() === "currency-cents" ? (
      <CurrencyInput
        name={`y-range-${name}`}
        label={label}
        size="sm"
        maxValue={1_000_000_000}
        value={value}
        onChange={onChange}
      />
    ) : (
      <ThemedNumberInput
        name={`y-range-${name}`}
        label={label}
        size="sm"
        value={value}
        onChange={onChange}
      />
    );
  };
  // The reader clicked the axis to type a number: put the caret in Max.
  let panel: HTMLDivElement | undefined;
  onMount(() => panel?.querySelector("input")?.focus());
  return (
    <div
      ref={panel}
      class="sui-scrub-chart__y-range-editor"
      role="dialog"
      aria-label="Y-axis range"
      onKeyDown={onKeyDown}
    >
      <TightStack>
        {input("max", "Max")}
        {input("min", "Min")}
        <Show when={!draft().ok}>
          <MutedBody>{(draft() as { error: string }).error}</MutedBody>
        </Show>
        <ClusterRow>
          <SmallGhostButton onClick={() => props.onCancel()}>Cancel</SmallGhostButton>
          <SmallPrimaryButton disabled={!draft().ok} onClick={apply}>
            Apply
          </SmallPrimaryButton>
        </ClusterRow>
      </TightStack>
    </div>
  );
};
