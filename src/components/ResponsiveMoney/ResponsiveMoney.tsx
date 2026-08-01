// ============================================
// ResponsiveMoney — Atomic (Depth 1)
// Owns CSS (ResponsiveMoney.css). Composes Text (visible figure + hidden
// measurement twin), no other component imports.
// Renders the widest dollar rendering of a cents value that still fits its
// container, stepping down through formatMoneyLadder's candidates
// ($330,285 → $330k → $0.3m) as the container shrinks. Abbreviation is
// view-only — callers keep passing exact integer cents; this never rounds
// the underlying value, only its display.
// ============================================
import {
  type Component,
  type JSX,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { formatMoneyLadder } from "../../internal/format/money";
import { Text, type TextVariant } from "../Text/Text";
import { map, findIndex } from "../../fn";
import "./ResponsiveMoney.css";

export interface ResponsiveMoneyProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Integer cents (may be negative). */
  cents: number;
  /** Text variant for the visible figure. Default "value". */
  variant?: TextVariant;
  color?: string;
}

export const ResponsiveMoney: Component<ResponsiveMoneyProps> = (props) => {
  const [local, others] = splitProps(props, [
    "cents",
    "variant",
    "color",
    "class",
  ]);
  let containerRef: HTMLSpanElement | undefined;
  let measureRef: HTMLElement | undefined;
  const [available, setAvailable] = createSignal(0);
  const [widths, setWidths] = createSignal<number[]>([]);

  const ladder = createMemo(() => formatMoneyLadder(local.cents));

  // Measure every candidate against the SAME hidden Text node (matching its
  // font exactly) rather than duplicating Text's class-building logic here.
  createEffect(() => {
    const candidates = ladder();
    const el = measureRef;
    if (!el) return;
    setWidths(
      map((candidate) => {
        el.textContent = candidate;
        return el.getBoundingClientRect().width;
      }, candidates),
    );
  });

  onMount(() => {
    if (!containerRef) return;
    setAvailable(containerRef.clientWidth);
    onCleanup(observeSize(containerRef, (size) => setAvailable(size.width)));
  });

  // Widest candidate that fits the measured box; falls back to the
  // narrowest tier (never renders nothing) if even that overflows, and to
  // the widest tier before the first measurement/layout pass lands.
  const display = createMemo(() => {
    const candidates = ladder();
    const measured = widths();
    const budget = available();
    if (budget === 0 || measured.length !== candidates.length) {
      return candidates[0];
    }
    const fitIndex = findIndex((_, i) => measured[i] <= budget, candidates);
    return candidates[fitIndex === -1 ? candidates.length - 1 : fitIndex];
  });

  return (
    <span
      ref={containerRef}
      class={`sui-responsive-money${local.class ? ` ${local.class}` : ""}`}
      {...others}
    >
      <Text as="span" variant={local.variant ?? "value"} color={local.color}>
        {display()}
      </Text>
      <Text
        ref={(el) => {
          measureRef = el;
        }}
        as="span"
        variant={local.variant ?? "value"}
        class="sui-responsive-money__measure"
        aria-hidden="true"
      />
    </span>
  );
};
