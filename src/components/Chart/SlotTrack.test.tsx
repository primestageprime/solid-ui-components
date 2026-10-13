import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { SlotTrack, SlotTrackSwatch, type SlotState } from "./SlotTrack";

interface Slot {
  readonly from: number;
  readonly to: number;
  readonly state: SlotState;
  readonly hits: number;
}

const slots: readonly Slot[] = [
  { from: 10, to: 20, state: "filled", hits: 1 },
  { from: 40, to: 41, state: "empty", hits: 0 },
  { from: 70, to: 80, state: "partial", hits: 1 },
];

const mount = (height?: number, minWidth?: number) =>
  render(() => (
    <Chart width={236} height={100} xDomain={[0, 100]} yDomain={[-1, 1]} margin={{ top: 0, right: 0, bottom: 0, left: 36 }}>
      <SlotTrack
        data={slots}
        from={(s) => s.from}
        to={(s) => s.to}
        y={0}
        state={(s) => s.state}
        caption={(s) => (s.state === "partial" ? `${s.hits} of 2` : undefined)}
        title={(s) => `${s.from}–${s.to}`}
        height={height}
        minWidth={minWidth}
      />
    </Chart>
  ));

describe("SlotTrack", () => {
  it("draws one lozenge per slot, carrying its state as a class", () => {
    const { container } = mount();
    const groups = [...container.querySelectorAll<SVGGElement>(".sui-chart__slot")];
    expect(groups.map((g) => g.dataset.state)).toEqual(["filled", "empty", "partial"]);
    expect(groups[1]!.classList.contains("sui-chart__slot--empty")).toBe(true);
  });

  it("sits on the stated y, as wide as the window and never narrower than minWidth", () => {
    const { container } = mount(8, 22);
    const rects = [...container.querySelectorAll<SVGRectElement>(".sui-chart__slot rect")];
    // The plot is 200px over a domain of 100, so 10 units = 20px < 22.
    expect(rects.map((r) => Number(r.getAttribute("width")))).toEqual([22, 22, 22]);
    expect(Number(rects[0]!.getAttribute("y"))).toBe(50 - 4);
    expect(Number(rects[0]!.getAttribute("rx"))).toBe(4);
  });

  it("captions only the slots that state one, and titles every slot", () => {
    const { container } = mount();
    const captions = [...container.querySelectorAll(".sui-chart__slot-caption")].map((t) => t.textContent);
    expect(captions).toEqual(["1 of 2"]);
    expect(container.querySelector(".sui-chart__slot rect title")?.textContent).toBe("10–20");
  });

  it("the swatch is one lozenge with a dot in the stated state", () => {
    const { container } = render(() => <SlotTrackSwatch state="empty" />);
    const svg = container.querySelector("svg")!;
    expect(svg.classList.contains("sui-chart__slot--empty")).toBe(true);
    expect(svg.querySelector("rect")).not.toBeNull();
    expect(svg.querySelector("circle")).not.toBeNull();
  });
});
