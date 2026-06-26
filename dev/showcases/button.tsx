import { createSignal, Component, JSX } from "solid-js";
import { Button } from "../../src/components/Button/Button";
import {
  DefaultButton, PrimaryButton, SecondaryButton, DangerButton, WarningButton, GhostButton,
  OutlinedButton, TextButton, IconOnlyButton,
} from "../../src/components/Button";
import { Stack } from "../../src/components/Layout/Stack";
import { SpreadRow, ClusterRow, WrapRow } from "../../src/components/Layout";
import { CardSurface } from "../../src/components/Surface";
import { Text } from "../../src/components/Text/Text";

// One "when to use" row: the rendered button in a fixed-width column beside a
// concise usage guideline. Keeps the buttons left-aligned in a tidy column so
// the relative weight of each style is easy to compare at a glance.
const GuidanceRow: Component<{ button: JSX.Element; children: JSX.Element }> = (props) => (
  <ClusterRow style={{ "align-items": "flex-start", gap: "16px" }}>
    <div style={{ "min-width": "150px", display: "flex" }}>{props.button}</div>
    <Text variant="body">{props.children}</Text>
  </ClusterRow>
);

// One practical example: a framed card with a title, a one-line caption that
// explains the hierarchy choice, and the live composition underneath.
const Example: Component<{ title: string; caption: string; children: JSX.Element }> = (props) => (
  <Stack gap="xs" style={{ "max-width": "520px" }}>
    <Text variant="sublabel">{props.title}</Text>
    <CardSurface>{props.children}</CardSurface>
    <div class="text-meta">{props.caption}</div>
  </Stack>
);

export const ButtonShowcase: Component = () => {
  const [saving, setSaving] = createSignal(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 2000);
  };

  return (
    <div class="component-section">
      <h2>Button — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (Button.css), no component imports. Multi-variant button with loading spinner.
        Prefer the curried variants (PrimaryButton, GhostButton, …) at call sites so emphasis is
        chosen by name, not by a `variant` prop.
      </p>

      {/* ============================================================ */}
      {/* WHEN TO USE EACH STYLE                                        */}
      {/* ============================================================ */}
      <div class="example-group">
        <h3>When to use each style</h3>
        <p class="text-meta">
          One emphasis per intent. Pick the style by the job the button does, not by how it looks —
          a consistent hierarchy is what makes a screen readable.
        </p>

        <Stack gap="sm" style={{ "margin-top": "12px" }}>
          <GuidanceRow button={<PrimaryButton>Save changes</PrimaryButton>}>
            <strong>primary</strong> — the single main affirmative action of a view or dialog
            (submit / save / confirm). At most one per context; if everything is primary, nothing is.
          </GuidanceRow>

          <GuidanceRow button={<SecondaryButton>Back</SecondaryButton>}>
            <strong>secondary</strong> — a neutral, supporting action that sits next to a primary
            (e.g. "Back" in a wizard). Visible, but clearly subordinate.
          </GuidanceRow>

          <GuidanceRow button={<DefaultButton>Edit</DefaultButton>}>
            <strong>default</strong> — a standard action with no strong emphasis. Use when the
            button is just one of several equals and none deserves the spotlight.
          </GuidanceRow>

          <GuidanceRow button={<OutlinedButton>Filter</OutlinedButton>}>
            <strong>outlined</strong> — secondary emphasis where you want a visible boundary but not
            a filled fill: toolbar actions, "Cancel" next to a filled primary.
          </GuidanceRow>

          <GuidanceRow button={<GhostButton>Dismiss</GhostButton>}>
            <strong>ghost</strong> — low-emphasis, tertiary action. The quiet "Cancel" / "Dismiss"
            in a crowded UI where you don't want to compete with the primary.
          </GuidanceRow>

          <GuidanceRow button={<TextButton>Learn more</TextButton>}>
            <strong>text</strong> — link-like, the lightest weight of all. Inline tertiary actions
            and "Learn more" style affordances with no border or fill.
          </GuidanceRow>

          <GuidanceRow button={<DangerButton>Delete</DangerButton>}>
            <strong>danger</strong> — destructive or irreversible actions (delete, remove, revoke).
            Red. Reserve it so red always means "this can't be undone".
          </GuidanceRow>

          <GuidanceRow button={<WarningButton>Override</WarningButton>}>
            <strong>warning</strong> — amber, for caution / attention that is <em>not</em>{" "}
            destructive (e.g. "Override", "Proceed anyway"). Per the source note, distinct from
            danger: amber-informational vs. red-destructive.
          </GuidanceRow>

          <GuidanceRow button={<IconOnlyButton aria-label="Close">×</IconOnlyButton>}>
            <strong>icon-only</strong> — a compact square action with no label. Always pass an
            `aria-label`. Good for close / overflow affordances inside dense chrome.
          </GuidanceRow>
        </Stack>
      </div>

      {/* ============================================================ */}
      {/* PRACTICAL EXAMPLES                                            */}
      {/* ============================================================ */}
      <div class="example-group">
        <h3>Practical examples</h3>
        <p class="text-meta">
          Buttons rarely appear alone — hierarchy is established by how they sit together. Each
          composition below pairs a quiet dismiss with exactly one emphasised action.
        </p>

        <Stack gap="sm" style={{ "margin-top": "12px" }}>
          <Example
            title="Dialog footer — save"
            caption="Ghost 'Cancel' recedes; one filled primary carries the affirmative action."
          >
            <Stack gap="sm">
              <Text variant="body">You have unsaved changes. Save before closing?</Text>
              <SpreadRow>
                <GhostButton>Cancel</GhostButton>
                <PrimaryButton loading={saving()} onClick={handleSave}>
                  {saving() ? "Saving…" : "Save changes"}
                </PrimaryButton>
              </SpreadRow>
            </Stack>
          </Example>

          <Example
            title="Dialog footer — destructive confirm"
            caption="Same shape, but the affirmative slot is danger: red signals the action is irreversible."
          >
            <Stack gap="sm">
              <Text variant="body">Delete this project? This can't be undone.</Text>
              <SpreadRow>
                <GhostButton>Cancel</GhostButton>
                <DangerButton>Delete permanently</DangerButton>
              </SpreadRow>
            </Stack>
          </Example>

          <Example
            title="Form footer"
            caption="Secondary 'Back' stays available without competing; primary 'Submit' is the clear forward action."
          >
            <SpreadRow>
              <SecondaryButton>Back</SecondaryButton>
              <PrimaryButton>Submit</PrimaryButton>
            </SpreadRow>
          </Example>

          <Example
            title="Toolbar / action bar"
            caption="Outlined + ghost tools share equal, low emphasis on the left; one primary owns the main action on the right."
          >
            <SpreadRow>
              <ClusterRow>
                <OutlinedButton>Filter</OutlinedButton>
                <OutlinedButton>Sort</OutlinedButton>
                <GhostButton>Export</GhostButton>
              </ClusterRow>
              <PrimaryButton>New item</PrimaryButton>
            </SpreadRow>
          </Example>

          <Example
            title="Destructive-confirmation row"
            caption="Inline confirm: ghost 'Cancel' first, danger 'Delete' as the deliberate, weighted choice."
          >
            <ClusterRow>
              <GhostButton>Cancel</GhostButton>
              <DangerButton>Delete</DangerButton>
            </ClusterRow>
          </Example>
        </Stack>
      </div>

      {/* ============================================================ */}
      {/* MODIFIERS REFERENCE                                           */}
      {/* ============================================================ */}
      <div class="example-group">
        <h3>Modifiers reference</h3>
        <p class="text-meta">
          Size, shape, tone and state are orthogonal modifiers — they compose with any of the
          styles above. Kept brief; the emphasis policy is the when-to-use guidance.
        </p>

        <Stack gap="sm" style={{ "margin-top": "12px" }}>
          <div>
            <Text variant="sublabel">Sizes</Text>
            <div class="example-row" style={{ "align-items": "center" }}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          <div>
            <Text variant="sublabel">Pill shape + tone</Text>
            <div class="text-meta">Pure shape variant; composes with size and the accent/outline/muted tone matrix.</div>
            <WrapRow style={{ "align-items": "center", "margin-top": "8px" }}>
              <Button variant="pill">Default</Button>
              <Button variant="pill" size="sm">Small</Button>
              <Button variant="pill" tone="accent">Accent</Button>
              <Button variant="pill" tone="outline">Outline</Button>
              <Button variant="pill" tone="muted">Muted</Button>
            </WrapRow>
          </div>

          <div>
            <Text variant="sublabel">States</Text>
            <div class="example-row">
              <Button disabled>Disabled</Button>
              <PrimaryButton loading={saving()} onClick={handleSave}>
                {saving() ? "Loading…" : "Click me"}
              </PrimaryButton>
              <Button active>Active / selected</Button>
            </div>
          </div>

          <div class="text-meta">
            Curried variants (DefaultButton, PrimaryButton, SecondaryButton, DangerButton,
            WarningButton, GhostButton, OutlinedButton, TextButton, IconOnlyButton, plus Small*/Large*
            size-locked forms) are exported from the Button barrel and are the preferred call-site
            form — emphasis is chosen by name, never by a `variant` prop.
          </div>
        </Stack>
      </div>
    </div>
  );
};
