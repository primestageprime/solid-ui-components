// The bench's binding of the src LaneChart: maps the board's chart (MpChart,
// whose marks carry their own enter/leave handlers) to plain LaneChart data
// with a key per mark, and sends a hover back to the right handler.
import { type Component, createMemo } from "solid-js";
import {
	LaneChart,
	type LaneBar,
	type LaneChartData,
} from "../../../../src/components/LaneChart";
import type { MpBar, MpChart } from "./types";

interface Hover {
	readonly enter: () => void;
	readonly leave: () => void;
	readonly hot: boolean;
}

interface Bound {
	readonly data: LaneChartData;
	readonly marks: ReadonlyMap<string, Hover>;
}

const bind = (c: MpChart): Bound => {
	const marks = new Map<string, Hover>();
	const bar =
		(prefix: string) =>
		(b: MpBar, i: number): LaneBar => {
			const key = `${prefix}b${i}`;
			marks.set(key, b);
			return { key, x: b.x, width: b.w, bottom: b.bottom, height: b.h, kind: b.kind };
		};
	const data: LaneChartData = {
		trackWidth: c.trackW,
		heads: c.heads.map((h) => ({ x: h.x, width: h.w, label: h.label, fresh: h.fresh })),
		grid: c.grid,
		unmatched: {
			height: c.unmatched.h,
			total: c.unmatched.total,
			boxes: c.unmatched.boxes.map((b) => ({ x: b.x, width: b.w, bottom: b.bottom, height: b.h })),
			bars: c.unmatched.bars.map(bar("u")),
		},
		lanes: c.lanes.map((l, li) => ({
			name: l.name,
			sub: l.sub,
			height: l.h,
			slots: l.slots.map((s, si) => ({
				x: s.x,
				width: s.w,
				bottom: s.bottom,
				height: s.h,
				title: s.title,
				missing: s.missing,
				late: s.late || s.catchup,
				parts: s.parts.map((p, pi) => {
					const key = `l${li}s${si}p${pi}`;
					marks.set(key, p);
					return { key, bottom: p.bottom, height: p.h, kind: p.kind };
				}),
			})),
			bars: l.bars.map(bar(`l${li}`)),
			links: l.links.map((k) => ({ x: k.x, width: k.w, bottom: k.bottom })),
		})),
	};
	return { data, marks };
};

export const BoardLaneChart: Component<{ chart: MpChart }> = (props) => {
	const bound = createMemo(() => bind(props.chart));
	const hotKey = () =>
		[...bound().marks].find(([, m]) => m.hot)?.[0];
	let last: string | null = null;
	const onHover = (key: string | null) => {
		if (key) {
			last = key;
			bound().marks.get(key)?.enter();
		} else if (last) {
			bound().marks.get(last)?.leave();
			last = null;
		}
	};
	return <LaneChart data={bound().data} hotKey={hotKey()} onHover={onHover} />;
};
