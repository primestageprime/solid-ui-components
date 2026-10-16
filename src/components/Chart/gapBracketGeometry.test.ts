import { describe, expect, it } from "vitest";
import { buildGapBracket } from "./gapBracketGeometry";

describe("buildGapBracket", () => {
	it("runs the stem top to bottom whatever order the ends arrive in", () => {
		const a = buildGapBracket({ x: 100, y1: 40, y2: 10 });
		const b = buildGapBracket({ x: 100, y1: 10, y2: 40 });
		expect(a.stem).toEqual({ x1: 100, x2: 100, y1: 10, y2: 40 });
		expect(b.stem).toEqual(a.stem);
		expect(a.extent).toBe(30);
	});

	it("ticks point back toward the plot and the caption seats right of the midpoint", () => {
		const m = buildGapBracket({
			x: 100,
			y1: 10,
			y2: 40,
			tick: 5,
			captionGap: 6,
		});
		expect(m.ticks[0]).toEqual({ x1: 95, x2: 100, y1: 10, y2: 10 });
		expect(m.ticks[1]).toEqual({ x1: 95, x2: 100, y1: 40, y2: 40 });
		expect(m.mid).toBe(25);
		expect(m.caption).toEqual({ x: 106, y: 25, textAnchor: "start" });
	});

	it("reports a zero extent when the ends coincide", () => {
		expect(buildGapBracket({ x: 0, y1: 7, y2: 7 }).extent).toBe(0);
	});
	it("centres each tick on the stem for a whisker's caps", () => {
		const m = buildGapBracket({ x: 100, y1: 40, y2: 10, tick: 6, tickAlign: "center" });
		expect(m.ticks[0]).toEqual({ x1: 97, x2: 103, y1: 10, y2: 10 });
		expect(m.ticks[1]).toEqual({ x1: 97, x2: 103, y1: 40, y2: 40 });
		expect(m.stem).toEqual({ x1: 100, x2: 100, y1: 10, y2: 40 });
	});
});
