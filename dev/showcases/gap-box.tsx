// GapBox — the canon placeholder for a component SUI does not have yet.
import { type Component } from "solid-js";
import { GapBox } from "../../src/components/GapBox";
import { SectionTitle, MutedBody } from "../../src/components/Text";

export const GapBoxShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>GapBox</SectionTitle>
      <MutedBody>
        A titled surface holding the JSON of the props a missing component would take. Visual gap, behavioural gap, and the bare minimum (title only).
      </MutedBody>
      <div class="gap-box-demo">
        <GapBox title="LocaleSwitcher" kind="visual" nearest="none" props={{ locales: ["en-US"], value: "en-US" }} />
        <GapBox title="useNavKeys" kind="behaviour" nearest="HotkeyButton" props={{ note: "list navigation and chords" }} />
        <GapBox title="ShareDialog" />
      </div>
    </div>
  </div>
);
