/**
 * Checkbox + CheckboxField — the form-checkbox family.
 *
 * Checkbox is a leaf control: a visually-hidden native input + a painted box,
 * with an optional inline label (left/right). CheckboxField is the zero-config
 * form-field composition: the Checkbox on the left, a clickable label + optional
 * hint text stacked on the right.
 */
import { type Component, createSignal } from "solid-js";
import { Checkbox, CheckboxField } from "../../src/components/Checkbox";

const Row: Component<{ children: any }> = (props) => (
  <div class="example-row" style={{ "align-items": "center", gap: "20px" }}>
    {props.children}
  </div>
);

export const CheckboxShowcase: Component = () => {
  const [a, setA] = createSignal(true);
  const [b, setB] = createSignal(false);
  const [c, setC] = createSignal(true);
  const [d, setD] = createSignal(false);
  const [e, setE] = createSignal(true);

  return (
    <div class="component-section">
      <h2>Checkbox — leaf control</h2>
      <p class="text-meta">
        Visually-hidden native input + painted box. Optional inline label
        (labelPosition left/right). Sizes sm/md/lg; color variants tint the
        checked fill.
      </p>

      <div class="example-group">
        <h3>Sizes</h3>
        <Row>
          <Checkbox size="sm" label="Small" checked={a()} onCheckedChange={setA} />
          <Checkbox size="md" label="Medium" checked={a()} onCheckedChange={setA} />
          <Checkbox size="lg" label="Large" checked={a()} onCheckedChange={setA} />
        </Row>
      </div>

      <div class="example-group">
        <h3>Color variants (checked)</h3>
        <Row>
          <Checkbox label="Accent" checked onCheckedChange={() => {}} />
          <Checkbox color="primary" label="Primary" checked onCheckedChange={() => {}} />
          <Checkbox color="success" label="Success" checked onCheckedChange={() => {}} />
          <Checkbox color="danger" label="Danger" checked onCheckedChange={() => {}} />
        </Row>
      </div>

      <div class="example-group">
        <h3>Label position &amp; states</h3>
        <Row>
          <Checkbox label="Label right" checked={b()} onCheckedChange={setB} />
          <Checkbox
            label="Label left"
            labelPosition="left"
            checked={c()}
            onCheckedChange={setC}
          />
          <Checkbox label="Disabled" disabled checked onCheckedChange={() => {}} />
          <Checkbox label="Disabled off" disabled onCheckedChange={() => {}} />
        </Row>
      </div>

      <h2 style={{ "margin-top": "32px" }}>CheckboxField — form-field composition</h2>
      <p class="text-meta">
        Composes Checkbox + a label/hint text column. The row is laid out with
        Layout variants (control cluster + tight text stack); the field passes
        only data (label, hint, checked).
      </p>

      <div class="example-group">
        <h3>Label + hint</h3>
        <div style={{ display: "flex", "flex-direction": "column", gap: "12px", "max-width": "420px" }}>
          <CheckboxField
            label="Email notifications"
            hint="Send a digest when a batch completes."
            checked={d()}
            onCheckedChange={setD}
          />
          <CheckboxField
            label="Auto-retry failed decompositions"
            hint="Retries up to three times before surfacing the error."
            checked={e()}
            onCheckedChange={setE}
          />
          <CheckboxField label="No hint — single line" checked onCheckedChange={() => {}} />
          <CheckboxField
            label="Disabled field"
            hint="Not editable in this context."
            disabled
            checked
            onCheckedChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
};
