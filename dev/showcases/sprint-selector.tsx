import { type Component, createSignal } from "solid-js";
import {
  SprintSelector,
  type SprintSummary,
} from "../../src/components/SprintSelector";
import { NarrowStack } from "../../src/components/Layout";

export const SprintSelectorShowcase: Component = () => {
  const [idx, setIdx] = createSignal(2);
  const sprints: SprintSummary[] = [
    {
      label: "Sprint 22",
      planned_complete: 28,
      planned_incomplete: 2,
      unplanned_complete: 0,
      unplanned_incomplete: 0,
    },
    {
      label: "Sprint 23",
      planned_complete: 14,
      planned_incomplete: 18,
      unplanned_complete: 0,
      unplanned_incomplete: 0,
    },
    {
      label: "Sprint 24",
      planned_complete: 0,
      planned_incomplete: 25,
      unplanned_complete: 0,
      unplanned_incomplete: 0,
    },
  ];
  return (
    <div class="component-section">
      <h2>SprintSelector — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Pick a sprint from a horizontal strip; shows label + progress per
        sprint. Reactive over <code>selectedIndex</code>.
      </p>
      <NarrowStack class="example-group">
        <SprintSelector
          sprints={sprints}
          selectedIndex={idx()}
          onSelect={(i) => setIdx(i)}
        />
        <p class="text-meta">selected: {sprints[idx()]?.label}</p>
      </NarrowStack>
    </div>
  );
};
