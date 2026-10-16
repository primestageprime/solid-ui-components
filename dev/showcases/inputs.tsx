import type { Component } from "solid-js";
import { FillTextArea, ThemedInput, ThemedTextarea } from "../../src/components/Inputs";
import { FillColumn } from "../../src/components/Layout";
import { TextSublabel } from "../../src/components/Text";
import { ConstrainedBox, NarrowStack } from "../../src/components/Layout";

export const InputsShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Inputs — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (ThemedInputs.css), no component imports. Styled text input and
        textarea with labels.
      </p>

      <div class="example-group">
        <h3>ThemedInput</h3>
        <ConstrainedBox>
          <NarrowStack>
            <ThemedInput label="Vessel Name" placeholder="Enter vessel name..." />
            <ThemedInput
              label="Engine Power (kW)"
              placeholder="1200"
              type="number"
            />
            <ThemedInput placeholder="Without label..." />
          </NarrowStack>
        </ConstrainedBox>
      </div>

      <div class="example-group">
        <h3>ThemedTextarea</h3>
        <div class="inputs-demo">
          <NarrowStack>
            <ThemedTextarea
              label="Note (optional)"
              placeholder="Add a note explaining the approval..."
            />
            <ThemedTextarea placeholder="Without label..." />
          </NarrowStack>
        </div>
      </div>

      <div class="example-group">
        <h3>FillTextArea</h3>
        <div class="fill-text-area-demo">
          <FillColumn>
            <TextSublabel>The column is 200px tall; the notes field takes what the line above leaves.</TextSublabel>
            <FillTextArea label="Notes" placeholder="Write here…" />
          </FillColumn>
        </div>
      </div>
    </div>
  );
};
