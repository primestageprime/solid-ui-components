// ============================================
// FormComposite — Layout (Depth 1)
// Owns CSS (FormComposite.css), no component imports.
// SLOT-BASED form layout: [[identity][amounts][schedule]] — the fields that
// don't vary across curried form variants (name + a single amount) group in
// the `identity` slot; an ATOMIC amount group (a min/typical/max trio) takes
// the optional `amounts` slot so the amounts stay together and never
// interleave with the name; the curry-VARYING schedule picker (day-of-month,
// weekday, date, payday selector, …) sits in the `schedule` slot. Blocks sit
// side by side when there's room and stack otherwise, reading
// name → amounts → cadence in both arrangements.
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
import { type Component, type JSX, Show, mergeProps, splitProps } from "solid-js";
import "./FormComposite.css";

export interface FormCompositeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The stable block — fields that read the same across variants
   *  (name, amount). Stacked vertically. */
  identity?: JSX.Element;
  /** An atomic amount group (e.g. a min/typical/max trio) rendered BETWEEN
   *  identity and schedule — kept together, never interleaved. */
  amounts?: JSX.Element;
  /** The variant-specific block — whatever schedule picker the curry
   *  needs. Rendered beside the identity block. */
  schedule?: JSX.Element;
  /**
   * Container width (CSS length) below which the two blocks stack.
   * Default "38rem".
   */
  breakWidth?: string;
  /**
   * Force the STACKED arrangement at every width: identity (name + amount,
   * sharing a line when they fit) on ROW 1, amounts trio next, the schedule
   * block on its OWN row — never beside identity. For wide detail panels
   * where a grid-sized schedule cramming beside the name reads poorly.
   */
  stacked?: boolean;
}

export const FormComposite: Component<FormCompositeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "identity",
    "amounts",
    "schedule",
    "breakWidth",
    "stacked",
    "class",
  ]);
  const rootClass = () =>
    [
      "sui-form-composite",
      local.stacked ? "sui-form-composite--stacked" : "",
      local.class ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  return (
    <div
      class={rootClass()}
      style={{ "--fc-break": local.breakWidth ?? "38rem" }}
      {...others}
    >
      <Show when={local.identity}>
        <div class="sui-form-composite__identity">{local.identity}</div>
      </Show>
      <Show when={local.amounts}>
        <div class="sui-form-composite__amounts">{local.amounts}</div>
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
