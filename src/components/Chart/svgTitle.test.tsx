import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { PointSeries } from "./Series";
import { SlotTrack } from "./SlotTrack";
import { StackedAreaSeries } from "./StackedAreaSeries";
import { TickSeries } from "./TickSeries";

const SVG_NS = "http://www.w3.org/2000/svg";

// Solid compiles a <title> that starts its own template (behind a Show or a
// ternary) as an HTML <title>, and Chrome took a mark's tooltip for the tab
// title (thorcasting, 2026-10-16). Every chart <title> must be an SVG one.
describe("chart <title> elements", () => {
  const pts = [{ x: 1, y: 1 }];
  const mount = (withTitles: boolean) =>
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 2]} yDomain={[0, 2]} title={withTitles ? "Chart" : undefined}>
        <StackedAreaSeries series={[{ id: "a", label: "A", points: [{ at: 0, value: 1 }, { at: 2, value: 1 }] }]} />
        <PointSeries data={pts} x={(d) => d.x} y={(d) => d.y} title={withTitles ? () => "point" : undefined} />
        <SlotTrack data={pts} from={() => 0} to={() => 1} y={1} state={() => "filled"} title={withTitles ? () => "slot" : undefined} />
        <TickSeries data={pts} x={(d) => d.x} y={(d) => d.y} title={withTitles ? () => "tick" : undefined} />
      </Chart>
    ));

  it("are all in the SVG namespace, with or without a title, and leave document.title alone", () => {
    document.title = "Page";
    for (const withTitles of [true, false]) {
      const { container, unmount } = mount(withTitles);
      const titles = [...container.querySelectorAll("title")];
      expect(titles.length).toBeGreaterThan(0);
      expect(titles.filter((t) => t.namespaceURI !== SVG_NS).map((t) => t.textContent)).toEqual([]);
      expect(document.title).toBe("Page");
      unmount();
    }
  });

  it("carry the mark's text", () => {
    const { container } = mount(true);
    const texts = [...container.querySelectorAll("title")].map((t) => t.textContent);
    expect(texts).toEqual(expect.arrayContaining(["Chart", "point", "slot", "tick"]));
  });
});
