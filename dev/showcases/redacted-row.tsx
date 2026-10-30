// RedactedRow — a row of content the viewer may not see yet. The showcase
// plays the consumer: a discussion-question list where two questions stay
// hidden until the meeting starts, and the toggle reveals them.
import { createSignal, For, Show, type Component } from "solid-js";
import { LockedRow } from "../../src/components/RedactedRow";
import { Checkbox } from "../../src/components/Checkbox";
import { TightStack } from "../../src/components/Layout";
import { SectionTitle, MutedBody, TextBody } from "../../src/components/Text";

const QUESTIONS = [
  { text: "What did the opening chapter promise?", hidden: false },
  { text: "Who changed the most by the midpoint?", hidden: true },
  { text: "Would you recommend it to a friend?", hidden: true },
];

export const RedactedRowShowcase: Component = () => {
  const [started, setStarted] = createSignal(false);
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>RedactedRow · LockedRow</SectionTitle>
        <MutedBody>
          Holds the place of content the viewer may not see yet. Data-only: pass
          the reason as <code>label</code>.
        </MutedBody>
        <div class="redacted-row-demo">
          <TightStack>
            <Checkbox
              label="Meeting has started"
              checked={started()}
              onCheckedChange={setStarted}
            />
            <For each={QUESTIONS}>
              {(q) => (
                <Show
                  when={started() || !q.hidden}
                  fallback={<LockedRow label="Hidden until the meeting" />}
                >
                  <TextBody>{q.text}</TextBody>
                </Show>
              )}
            </For>
          </TightStack>
        </div>
      </div>
    </div>
  );
};
