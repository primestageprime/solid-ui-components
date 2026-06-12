// ============================================
// FormComposite — Layout (Depth 1)
// Owns CSS (FormComposite.css), no component imports.
// SLOT-BASED form layout: [[identity][schedule]] — the fields that don't
// vary across curried form variants (name, amount) group in the `identity`
// slot; the curry-VARYING schedule picker (day-of-month, weekday, date,
// payday selector, …) sits beside them in the `schedule` slot. The two
// blocks sit side by side when there's room and stack otherwise.
//
// The composite owns ONLY layout (grouping, gap, responsive stacking) —
// slot contents are arbitrary JSX, so the individual field components stay
// independent and keep working standalone. Deliberately NOT a mega-component
// that takes every child's props: that couples every form to one
// component's churn.
//   <FormComposite
//     identity={<><NameInput …/><AmountInput …/></>}
//     schedule={<DayOfMonthPicker …/>}
//   />
// Factory: createFormComposite() for curried variants.
// ============================================
import { Component, JSX, Show, mergeProps, splitProps } from "solid-js";
import "./FormComposite.css";

export interface FormCompositeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The stable block — fields that read the same across variants
   *  (name, amount). Stacked vertically. */
  identity?: JSX.Element;
  /** The variant-specific block — whatever schedule picker the curry
   *  needs. Rendered beside the identity block. */
  schedule?: JSX.Element;
  /**
   * Container width (CSS length) below which the two blocks stack.
   * Default "38rem".
   */
  breakWidth?: string;
}

export const FormComposite: Component<FormCompositeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "identity",
    "schedule",
    "breakWidth",
    "class",
  ]);
  const rootClass = () =>
    local.class ? `sui-form-composite ${local.class}` : "sui-form-composite";
  return (
    <div
      class={rootClass()}
      style={{ "--fc-break": local.breakWidth ?? "38rem" }}
      {...others}
    >
      <Show when={local.identity}>
        <div class="sui-form-composite__identity">{local.identity}</div>
      </Show>
      <Show when={local.schedule}>
        <div class="sui-form-composite__schedule">{local.schedule}</div>
      </Show>
    </div>
  );
};

export function createFormComposite(
  defaults: Partial<FormCompositeProps>,
): Component<FormCompositeProps> {
  return (props) => <FormComposite {...mergeProps(defaults, props)} />;
}
