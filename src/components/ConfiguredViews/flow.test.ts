import { describe, expect, it } from "vitest";
import { flowSection, type FlowSection } from "../../listDetail/views";
import { flowColumnOf, flowEdgesOf, flowHeightOf, flowNodesOf } from "./ConfiguredViews";

type Step = { id: string; name: string; state: "done" | "active" | "next"; gap?: string };
type Job = { id: string; steps: Step[] };
const JOB: Job = {
  id: "j",
  steps: [
    { id: "s1", name: "one", state: "done", gap: "18 min" },
    { id: "s2", name: "two", state: "done", gap: "3 min" },
    { id: "s3", name: "three", state: "active" },
    { id: "s4", name: "four", state: "next" },
  ],
};
const SECTION = flowSection<Job, Step>({
  rowsOf: (j) => j.steps,
  nodeOf: (s) => ({ label: s.name, size: s.state }),
  edgeLabelOf: (prev) => prev.gap,
}) as unknown as FlowSection<Job, object>;

describe("flow section helpers", () => {
  it("maps rows to nodes, consecutive pairs to labelled edges, sizes to columns", () => {
    const { nodes, edgeLabels } = flowNodesOf(SECTION, JOB);
    expect(nodes.map((n) => n.id)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(edgeLabels).toEqual(["18 min", "3 min", undefined, undefined]);
    expect(flowEdgesOf(nodes, edgeLabels)).toEqual([
      { source: "s1", target: "s2", label: "18 min" },
      { source: "s2", target: "s3", label: "3 min" },
      { source: "s3", target: "s4", label: undefined },
    ]);
    expect(nodes.map(flowColumnOf)).toEqual([-1, -1, 0, 1]);
  });
  it("heights the chart by its tallest column", () => {
    const { nodes } = flowNodesOf(SECTION, JOB);
    expect(flowHeightOf(nodes)).toBe(Math.max(100 + 56, 236) + 48);
    expect(flowHeightOf([])).toBe(236 + 48);
  });
});
