// dev/showcases/animated-swimlane-chart.tsx
/**
 * The data-only demo. Pass `nodes`, get the animation. The "Next"
 * button mutates `nodes` to a new reference; the chart animates.
 *
 * Notice what this showcase does NOT do: it never imports
 * LaneLayoutConfig, LaneTimingConfig, SwimlaneAnimatedLaneSpec, or any
 * internal type. The library's defaults cover everything.
 */
import { createSignal, type Component } from "solid-js";
import { createAnimatedSwimlaneChart } from "../../src/components/AnimatedSwimlaneChart";
import { advanceChildren } from "./workshop-layout";
import type { StatusFlowNode } from "../../src/components/StatusFlowChart";

const ProjectFlow = createAnimatedSwimlaneChart({});

const INITIAL: StatusFlowNode[] = [
  { id: "p", title: "Build the deck", status: "TODO" },
  { id: "saw", title: "Saw planks to length", status: "TODO", parentId: "p" },
  { id: "drill", title: "Drill pilot holes", status: "TODO", parentId: "p", dependsOn: ["saw"] },
  { id: "screw", title: "Screw planks down", status: "TODO", parentId: "p", dependsOn: ["drill"] },
  { id: "stain", title: "Stain the deck", status: "TODO", parentId: "p", dependsOn: ["screw"] },
];

export const AnimatedSwimlaneChartShowcase: Component = () => {
  const [nodes, setNodes] = createSignal<StatusFlowNode[]>(INITIAL);
  const next = () => setNodes((cur) => advanceChildren(cur));
  const reset = () => setNodes(INITIAL);

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "12px", padding: "24px" }}>
      <div style={{ "font-size": "14px", color: "rgba(255,255,255,0.7)" }}>
        Data-only consumer. Pass nodes, get animation. Click Next to mutate the
        node array; the chart animates the transition.
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={next}>Next</button>
        <button type="button" onClick={reset}>Reset</button>
      </div>
      <ProjectFlow nodes={nodes()} />
    </div>
  );
};
