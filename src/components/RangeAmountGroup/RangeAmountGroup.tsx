// ============================================
// RangeAmountGroup — Atomic (Depth 2)
// Owns CSS (RangeAmountGroup.css). Composes ThemedNumberInput.
// A responsive TRIO of labeled amount inputs (min / standard / max):
// all three on ONE line when there's room, otherwise each on its OWN
// line — never the awkward 2+1 wrap (holy-albatross flex basis).
//   <RangeAmountGroup
//     slots={[
//       { label: "Min", value: 2000, onChange: setMin },
//       { label: "p95", value: 5000, onChange: setTypical },
//       { label: "Max", value: 40000, onChange: setMax },
//     ]}
//   />
// Pass `children` instead of `slots` to reuse the responsive container
// for arbitrary triple inputs (e.g. three date pickers).
// Factory: createRangeAmountGroup() for curried variants.
// ============================================
import {
  type Component,
  Index,
  type JSX,
  Show,
  mergeProps,
  splitProps,
} from "solid-js";
import { ThemedNumberInput } from "../ThemedNumberInput/ThemedNumberInput";
import "./RangeAmountGroup.css";

export interface RangeAmountSlot {
  /** Slot label, e.g. "Min" / "Standard" / "Max" (caller-supplied). */
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export interface RangeAmountGroupProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The three amount slots. Defaults labels are Min / Standard / Max when
   *  a slot label is empty. Ignored when `children` is provided. */
  slots?: RangeAmountSlot[];
  /** Increment step forwarded to each ThemedNumberInput. Default 0.01. */
  step?: number;
  /** Name prefix for the inputs (name-0, name-1, name-2). */
  name?: string;
  /**
   * Container width (CSS length) below which the trio stacks one-per-line.
   * Default "30rem".
   */
  breakWidth?: string;
  /** Arbitrary triple content — rendered in the responsive container
   *  instead of the built-in number inputs. */
  children?: JSX.Element;
}

const DEFAULT_LABELS = ["Min", "Standard", "Max"];

export const RangeAmountGroup: Component<RangeAmountGroupProps> = (props) => {
  const [local, others] = splitProps(props, [
    "slots",
    "step",
    "name",
    "breakWidth",
    "children",
    "class",
  ]);
  const rootClass = () =>
    local.class
      ? `sui-range-amount-group ${local.class}`
      : "sui-range-amount-group";
  return (
    <div
      class={rootClass()}
      style={{ "--rag-break": local.breakWidth ?? "30rem" }}
      {...others}
    >
      <Show
        when={local.children}
        fallback={
          // Index (not For): slots are recreated by callers on every value
          // change — position keying keeps the focused input mounted.
          <Index each={local.slots ?? []}>
            {(slot, i) => (
              <div class="sui-range-amount-group__slot">
                <span class="sui-range-amount-group__label">
                  {slot().label || DEFAULT_LABELS[i] || ""}
                </span>
                <ThemedNumberInput
                  name={`${local.name ?? "range-amount"}-${i}`}
                  value={() => slot().value}
                  step={local.step ?? 0.01}
                  onChange={(v: number | undefined) => slot().onChange(v)}
                />
              </div>
            )}
          </Index>
        }
      >
        {local.children}
      </Show>
    </div>
  );
};

export function createRangeAmountGroup(
  defaults: Partial<RangeAmountGroupProps>,
): Component<RangeAmountGroupProps> {
  return (props) => <RangeAmountGroup {...mergeProps(defaults, props)} />;
}
