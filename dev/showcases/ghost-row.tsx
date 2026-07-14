import { type Component, For, createSignal } from "solid-js";
import { GhostRow, IndentedGhostRow } from "../../src/components/GhostRow";
import { NoWrapSublabel, TextLabel, TextSublabel } from "../../src/components/Text";
import { InlineMetaIcon } from "../../src/components/Icon";
import { SpreadRow, TightStack } from "../../src/components/Layout";

const ROWS = [
  { id: "a", name: "data quality officer view — y-axis alarm chart", who: "Ryan" },
  { id: "b", name: "get Ryan's email for the 1-1 Vessel Call", who: "Ryan" },
  { id: "c", name: "user should be able to filter todos", who: "Adlai" },
];

export const GhostRowShowcase: Component = () => {
  const [selected, setSelected] = createSignal("a");
  return (
    <div class="component-section">
      <h2>GhostRow — Atomic (Depth 1)</h2>
      <p class="text-meta">
        De-emphasized clickable row: dimmed unless <code>selected</code>,
        pointer only when <code>onClick</code> is wired. Born from the triage
        bench's rail children and dependency links.
      </p>

      <div class="example-group">
        <h3>IndentedGhostRow — rail children (click to select)</h3>
        <TightStack>
          <TextLabel>BLOCKED · PERSON</TextLabel>
          <For each={ROWS}>
            {(r) => (
              <IndentedGhostRow selected={r.id === selected()} onClick={() => setSelected(r.id)}>
                <SpreadRow>
                  <TextSublabel>{r.name}</TextSublabel>
                  <NoWrapSublabel>
                    <InlineMetaIcon name="user" /> {r.who}
                  </NoWrapSublabel>
                </SpreadRow>
              </IndentedGhostRow>
            )}
          </For>
        </TightStack>
      </div>

      <div class="example-group">
        <h3>GhostRow — link row (no indent); inert without onClick</h3>
        <TightStack>
          <GhostRow onClick={() => setSelected("a")}>
            <TextSublabel>→ need category for salaries</TextSublabel>
          </GhostRow>
          <GhostRow>
            <TextSublabel>→ a dependency with no target (not clickable)</TextSublabel>
          </GhostRow>
        </TightStack>
      </div>
    </div>
  );
};
