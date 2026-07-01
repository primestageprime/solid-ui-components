import { type Component, createSignal } from "solid-js";
import { SprintSelector } from "../../src/components/SprintSelector";

export const SprintSelectorShowcase: Component = () => {
  const [idx, setIdx] = createSignal(2);
  const sprints = [
    { label: "Sprint 22", startDate: new Date("2026-04-07"), endDate: new Date("2026-04-20"), pointsClosed: 28, pointsTotal: 30 },
    { label: "Sprint 23", startDate: new Date("2026-04-21"), endDate: new Date("2026-05-04"), pointsClosed: 14, pointsTotal: 32 },
    { label: "Sprint 24", startDate: new Date("2026-05-05"), endDate: new Date("2026-05-18"), pointsClosed: 0, pointsTotal: 25 },
  ];
  return (
    <div class="component-section">
      <h2>SprintSelector — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Pick a sprint from a horizontal strip; shows label + progress per
        sprint. Reactive over <code>selectedIndex</code>.
      </p>
      <div class="example-group">
        <SprintSelector
          label="Sprint"
          sprints={sprints}
          selectedIndex={idx()}
          onSelect={(i) => setIdx(i)}
        />
        <p class="text-meta" style={{ "margin-top": "8px" }}>
          selected: {sprints[idx()]?.label}
        </p>
      </div>
    </div>
  );
};
