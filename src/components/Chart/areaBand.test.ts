import { describe, expect, it } from "vitest";
import { buildBandPath } from "./areaBand";

// Identity scales keep the path readable: pixel = data.
const id = (v: number) => v;
interface P {
	x: number;
	hi: number;
	lo: number;
}
const band = (points: readonly P[], skipMissing?: boolean) =>
	buildBandPath(
		points,
		(p) => p.x,
		(p) => p.hi,
		(p) => p.lo,
		id,
		id,
		skipMissing,
	);

describe("buildBandPath", () => {
	it("runs forward along y and back along lower, then closes", () => {
		expect(
			band([
				{ x: 0, hi: 10, lo: 2 },
				{ x: 1, hi: 12, lo: 4 },
				{ x: 2, hi: 14, lo: 6 },
			]),
		).toBe(
			"M0.00,10.00L1.00,12.00L2.00,14.00L2.00,6.00L1.00,4.00L0.00,2.00Z",
		);
	});

	it("a NaN on either edge breaks the band into two closed subpaths", () => {
		const d = band([
			{ x: 0, hi: 10, lo: 2 },
			{ x: 1, hi: 12, lo: 4 },
			{ x: 2, hi: 14, lo: Number.NaN },
			{ x: 3, hi: 16, lo: 8 },
			{ x: 4, hi: 18, lo: 9 },
		]);
		expect(d).toBe(
			"M0.00,10.00L1.00,12.00L1.00,4.00L0.00,2.00Z" +
				"M3.00,16.00L4.00,18.00L4.00,9.00L3.00,8.00Z",
		);
		expect(d).not.toContain("NaN");
	});

	it("one point closes on itself as a sliver, never NaN", () => {
		expect(band([{ x: 5, hi: 20, lo: 10 }])).toBe(
			"M5.00,20.00L5.00,10.00Z",
		);
	});

	it("lower above y is still the region between the two edges", () => {
		expect(
			band([
				{ x: 0, hi: 2, lo: 10 },
				{ x: 1, hi: 4, lo: 12 },
			]),
		).toBe("M0.00,2.00L1.00,4.00L1.00,12.00L0.00,10.00Z");
	});

	it("empty data, or every point missing, draws nothing", () => {
		expect(band([])).toBe("");
		expect(band([{ x: Number.NaN, hi: 1, lo: 0 }])).toBe("");
	});
});
