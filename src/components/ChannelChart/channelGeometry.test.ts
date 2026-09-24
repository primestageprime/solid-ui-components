import { describe, expect, it } from "vitest";
import {
	barLabelAnchor,
	barSegmentsOf,
	channelModel,
	channelYDomain,
	divergenceDomain,
	formatChannelTable,
	markerTone,
	periodIndexAt,
} from "./channelGeometry";
import { formatKiloCents, RENT_PERIODS, LICENSE_CLIENT_PERIODS } from "./fixtures";

const opts = {
	showDivergence: true,
	labelEnds: true,
	formatValue: formatKiloCents,
};

describe("channelModel — the license-revenue fixture, printed", () => {
	const model = channelModel(LICENSE_CLIENT_PERIODS, opts);

	it("prints the table a reader checks the shape against", () => {
		const table = formatChannelTable(model);
		console.log(`\n${table}\n`);
		expect(table).toBe(
			[
				"i | key     | lo       | hi       | value    | outside | diff     | tone",
				"--|---------|----------|----------|----------|---------|----------|-------",
				"0 | 2026-01 | 2000000  | 4000000  | 3000000  | no      | 0        | inside",
				"1 | 2026-02 | 4000000  | 8000000  | 9600000  | yes     | 2600000  | over",
				"2 | 2026-03 | 6000000  | 12000000 | 14900000 | yes     | 1300000  | over",
				"3 | 2026-04 | 8000000  | 16000000 | 21900000 | yes     | 3000000  | over",
				"4 | 2026-05 | 10000000 | 20000000 | 21900000 | yes     | -2000000 | over",
				"5 | 2026-06 | 12000000 | 24000000 | 21900000 | no      | -2000000 | inside",
				"6 | 2026-07 | 14000000 | 28000000 | 31700000 | yes     | 5800000  | over",
				"7 | 2026-08 | 16000000 | 32000000 | 33600000 | yes     | -100000  | over",
				"8 | 2026-09 | 18000000 | 36000000 | 33600000 | no      | -2000000 | inside",
			].join("\n"),
		);
	});

	it("ends at 336k inside 180k–360k, labelled at the last period", () => {
		expect(model.endLabels.map((l) => l.text)).toEqual([
			"336k",
			"360k",
			"180k",
		]);
		expect(model.markers[8]).toEqual({
			i: 8,
			value: 33_600_000,
			tone: "inside",
			end: true,
		});
	});

	it("labels bars through the caller's formatter, signed", () => {
		expect(model.bars.map((b) => b.label)).toEqual([
			"0",
			"+26k",
			"+13k",
			"+30k",
			"-20k",
			"-20k",
			"+58k",
			"-1k",
			"-20k",
		]);
		expect(model.bars.map((b) => b.tone)).toEqual([
			"zero",
			"over",
			"over",
			"over",
			"under",
			"under",
			"over",
			"under",
			"under",
		]);
	});

	it("shares one period axis and one margin sized across BOTH plots", () => {
		expect(model.xDomain).toEqual([-0.5, 8.5]);
		expect(model.xTicks[1]).toEqual({ i: 1, label: "26-02" });
		// Widest tick across the channel's ticks and the divergence ticks.
		const all = [...model.yTicks, ...model.divTicks].map(formatKiloCents);
		expect(model.leftMarginChars).toBe(Math.max(...all.map((t) => t.length)));
		expect(model.margin.left).toBeGreaterThan(model.leftMarginChars * 6);
		// Right margin makes room for the widest end label.
		expect(model.margin.right).toBeGreaterThan("360k".length * 6);
	});

	it("keeps the channel floor on zero and pads the top", () => {
		expect(model.yDomain[0]).toBe(0);
		expect(model.yDomain[1]).toBeGreaterThan(36_000_000);
		expect(model.divDomain[0]).toBe(-model.divDomain[1]);
		expect(model.divDomain[1]).toBeGreaterThan(5_800_000);
	});
});

describe("channelModel — the rent fixture (an expense group, one late month)", () => {
	it("goes under in the late month and over when it is paid twice", () => {
		const model = channelModel(RENT_PERIODS, opts);
		expect(model.rows[3].tone).toBe("under");
		expect(model.bars[3].tone).toBe("under");
		expect(model.bars[4].tone).toBe("over");
		expect(model.rows[4].tone).toBe("inside");
	});
});

describe("channelModel — edges never produce NaN", () => {
	const noNaN = (value: unknown) =>
		expect(JSON.stringify(value)).not.toContain("null");

	it("empty periods: an empty model on a unit domain", () => {
		const model = channelModel([], opts);
		expect(model.n).toBe(0);
		expect(model.xDomain).toEqual([-0.5, 0.5]);
		expect(model.yDomain).toEqual([0, 1]);
		expect(model.markers).toEqual([]);
		expect(model.bars).toEqual([]);
		expect(model.endLabels).toEqual([]);
		noNaN(model);
	});

	it("one period: one marker, one bar", () => {
		const model = channelModel([LICENSE_CLIENT_PERIODS[1]], opts);
		expect(model.markers).toHaveLength(1);
		expect(model.bars).toHaveLength(1);
		expect(model.xDomain).toEqual([-0.5, 0.5]);
		noNaN(model);
	});

	it("all zero: the y and divergence domains widen instead of collapsing", () => {
		const zero = [{ key: "a", lo: 0, hi: 0, value: 0, diff: 0 }];
		expect(channelYDomain(zero)).toEqual([0, 1]);
		expect(divergenceDomain(zero)).toEqual([-1, 1]);
		noNaN(channelModel(zero, opts));
	});

	it("a negative running value (a refund) stays on screen", () => {
		const [lo] = channelYDomain([{ key: "a", lo: 0, hi: 10, value: -5 }]);
		expect(lo).toBeLessThan(-5);
	});
});

describe("helpers", () => {
	it("markerTone: geometric unless outside is stated", () => {
		expect(markerTone({ key: "a", lo: 0, hi: 10, value: 11 })).toBe("over");
		expect(markerTone({ key: "a", lo: 5, hi: 10, value: 1 })).toBe("under");
		expect(
			markerTone({ key: "a", lo: 0, hi: 10, value: 11, outside: false }),
		).toBe("inside");
		expect(markerTone({ key: "a", lo: 0, hi: 10, value: 5, outside: true })).toBe(
			"over",
		);
	});

	it("barSegmentsOf: a zero bar becomes a flat tick centred on zero", () => {
		expect(barSegmentsOf({ i: 0, diff: 0, tone: "zero", label: "0" }, 2)).toEqual([
			{ value: 2, tone: "zero" },
			{ value: -2, tone: "zero" },
		]);
		expect(
			barSegmentsOf({ i: 0, diff: -5, tone: "under", label: "-5" }, 2),
		).toEqual([{ value: -5, tone: "under" }]);
	});

	it("barLabelAnchor centres a label over a bar's end, outside the bar", () => {
		// 1 data unit per px on both axes; a 20px label, 10px tall, 6px body gap.
		const up = barLabelAnchor({ i: 3, diff: 50, tone: "over", label: "+50" }, 20, 10, 6, 1, 1);
		expect(up).toEqual({ x: 3 - 16, y: 50 + 8 });
		const down = barLabelAnchor({ i: 3, diff: -50, tone: "under", label: "-50" }, 20, 10, 6, 1, 1);
		expect(down.y).toBe(-58);
	});

	it("periodIndexAt snaps a raw pick to the nearest period, clamped", () => {
		expect(periodIndexAt(1.4, 9)).toBe(1);
		expect(periodIndexAt(-0.4, 9)).toBe(0);
		expect(periodIndexAt(12, 9)).toBe(8);
		expect(periodIndexAt(0, 0)).toBe(-1);
	});
});
