// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// TruthIndicator — Atomic (Depth 1)
// Owns CSS (TruthIndicator.css), no component imports.
// Boolean indicator: green check for true, red prohibition (circle-with-slash)
// for false. Read-only by default; click handler optional.
// ============================================
import { type Component, type JSX, Show, splitProps, mergeProps } from "solid-js";
import "./TruthIndicator.css";

export type TruthIndicatorSize = "sm" | "md" | "lg";

export interface TruthIndicatorProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "onClick"> {
  /** The boolean value being represented. */
  value: boolean;
  /** Size token. Default `md` (16px). */
  size?: TruthIndicatorSize;
  /** Optional accessible label override. Defaults to "true" / "false". */
  label?: string;
  /** Optional click handler — turns the indicator into a button. */
  onClick?: (e: MouseEvent) => void;
}

const SIZE_PX: Record<TruthIndicatorSize, number> = { sm: 12, md: 16, lg: 22 };

export const TruthIndicator: Component<TruthIndicatorProps> = (rawProps) => {
  const props = mergeProps({ size: "md" as TruthIndicatorSize }, rawProps);
  const [local, others] = splitProps(props, [
    "value",
    "size",
    "label",
    "onClick",
    "class",
  ]);

  const px = () => SIZE_PX[local.size!];
  const variantClass = () =>
    local.value ? "sui-truth--true" : "sui-truth--false";
  const ariaLabel = () => local.label ?? (local.value ? "true" : "false");
  const wrapperClass = () => {
    const cls = ["sui-truth", variantClass(), `sui-truth--${local.size}`];
    if (local.onClick) cls.push("sui-truth--interactive");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };

  const icon = () => (
    <svg
      class="sui-truth__svg"
      viewBox="0 0 24 24"
      width={px()}
      height={px()}
      aria-hidden="true"
    >
      {local.value ? (
        <path
          class="sui-truth__check"
          d="M5 12.5 L10 17.5 L19 7.5"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      ) : (
        <g
          class="sui-truth__no"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </g>
      )}
    </svg>
  );

  // Interactive → a real <button> (native click + keyboard activation, and a
  // static role so aria-label is valid). Read-only → a <span role="img">.
  // Button chrome is reset inline so the existing .sui-truth* classes fully
  // govern appearance, preserving the prior visual output exactly.
  return (
    <Show
      when={local.onClick}
      fallback={
        <span
          class={wrapperClass()}
          role="img"
          aria-label={ariaLabel()}
          {...others}
        >
          {icon()}
        </span>
      }
    >
      <button
        type="button"
        class={wrapperClass()}
        aria-label={ariaLabel()}
        onClick={local.onClick}
        style={{
          appearance: "none",
          background: "transparent",
          border: "none",
          color: "inherit",
          font: "inherit",
        }}
        {...(others as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {icon()}
      </button>
    </Show>
  );
};

export type TruthIndicatorOverrides = Pick<TruthIndicatorProps, "size">;
export type TruthIndicatorDataProps = Omit<
  TruthIndicatorProps,
  keyof TruthIndicatorOverrides
>;

export function createTruthIndicator(
  defaults: Partial<TruthIndicatorProps>,
): Component<TruthIndicatorDataProps> {
  return (props) => <TruthIndicator {...mergeProps(defaults, props)} />;
}
