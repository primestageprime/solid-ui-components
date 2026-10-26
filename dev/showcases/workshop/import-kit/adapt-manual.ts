// Adapt (Manual step) — maps the board's Manual step view to MpView. The board
// gives the lane chart's geometry as CSS text; geometry() reads it into numbers.
import type { BMark, BoardVals } from "./live/board-types";
import type {
	MpBar,
	MpChart,
	MpLane,
	MpPaneRow,
	MpSideItem,
	MpView,
} from "./types";

/** Read the board's CSS text of a mark into numbers: "left: 4px; height: 9px" → { left: 4, height: 9 }. */
export const geometry = (style: string): Record<string, number> =>
	Object.fromEntries(
		style
			.split(";")
			.map((kv) => kv.split(":").map((t) => t.trim()))
			.filter(([k, v]) => k && v !== undefined && /^-?[\d.]+(px)?$/.test(v))
			.map(([k, v]) => [k, Number.parseFloat(v ?? "0")]),
	);

/** The board marks a hovered payment with its accent colour. */
const isHot = (style: string): boolean => style.includes("#4c9aff");
const GREEN = "#34c77b";
const YELLOW = "#fde68a";

const bar = (m: BMark, unmatched: boolean): MpBar => {
	const g = geometry(m.style);
	return {
		x: g.left ?? 0,
		w: g.width ?? 3,
		bottom: g.bottom ?? 0,
		h: g.height ?? 0,
		kind: unmatched
			? "unmatched"
			: m.style.includes(GREEN)
				? "ontime"
				: m.style.includes(YELLOW)
					? "late"
					: "unmatched",
		hot: isHot(m.style),
		enter: m.enter ?? (() => undefined),
		leave: m.leave ?? (() => undefined),
	};
};

const lane = (l: BoardVals["mLanes"][number]): MpLane => ({
	name: l.name,
	sub: l.sub,
	h: l.h,
	slots: l.slots.map((s) => {
		const g = geometry(s.style);
		return {
			x: g.left ?? 0,
			w: g.width ?? 0,
			bottom: g.bottom ?? 0,
			h: g.height ?? 0,
			title: s.title,
			missing: s.missing,
			catchup: s.catchup,
			parts: s.parts.map((p) => {
				const pg = geometry(p.style);
				return {
					bottom: pg.bottom ?? 0,
					h: pg.height ?? 0,
					kind: p.cls.includes("gO") ? ("ontime" as const) : ("late" as const),
					hot: isHot(p.style),
					enter: p.enter ?? (() => undefined),
					leave: p.leave ?? (() => undefined),
				};
			}),
		};
	}),
	bars: l.bars.map((b) => bar(b, false)),
	links: l.links.map((k) => {
		const g = geometry(k.style);
		return { x: g.left ?? 0, w: g.width ?? 0, bottom: g.bottom ?? 0 };
	}),
});

const chart = (x: BoardVals): MpChart => ({
	trackW: Number(x.trackW),
	heads: x.mHeads.map((h) => {
		const g = geometry(h.style);
		return {
			x: g.left ?? 0,
			w: g.width ?? 0,
			label: h.label,
			fresh: h.style.includes("#8bbcff"),
		};
	}),
	grid: x.mGrid.map((m) => ({
		x: geometry(m.style).left ?? 0,
		strong: m.style.includes("#33405a"),
	})),
	unmatched: {
		h: Number(x.unLaneH),
		total: x.unTotal,
		boxes: x.unBoxes.map((b) => {
			const g = geometry(b.style);
			return {
				x: g.left ?? 0,
				w: g.width ?? 0,
				bottom: g.bottom ?? 0,
				h: g.height ?? 0,
			};
		}),
		bars: x.unBars.map((b) => bar(b, true)),
	},
	lanes: x.mLanes.map(lane),
});

const BUCKETS = ["review", "matched", "other"] as const;

const sideItems = (x: BoardVals): MpSideItem[] =>
	x.mSections.flatMap((sec, si) =>
		sec.items.map((g) => ({
			key: `${BUCKETS[si] ?? "other"}:${g.name}`,
			bucket: BUCKETS[si] ?? "other",
			name: g.name,
			note: g.note,
			current: g.current === "true",
			pick: g.clickable && g.pick ? g.pick : undefined,
		})),
	);

const paneTone = (color: string): MpPaneRow["tone"] =>
	color === GREEN
		? "ontime"
		: color === YELLOW
			? "late"
			: color === "#7dd3c0"
				? "credit"
				: "unmatched";

const paneRows = (x: BoardVals): MpPaneRow[] =>
	x.mPane.flatMap((g) =>
		g.shown.map((r, i) => ({
			key: `${g.name}:${i}`,
			bucket: g.name,
			date: r.date,
			slot: r.slot,
			amount: r.amount,
			of: r.of,
			tone: paneTone(r.color),
			hot: isHot(r.style),
			enter: r.enter ?? (() => undefined),
			leave: r.leave ?? (() => undefined),
		})),
	);

export const mpView = (
	x: BoardVals,
	edit: MpView["edit"]["state"],
): MpView => ({
	sections: x.mSections.map((s, i) => ({
		key: BUCKETS[i] ?? "other",
		title: s.title,
		count: s.count,
		emptyText: s.emptyText,
	})),
	side: sideItems(x),
	done: {
		on: x.mDone,
		title: x.mDoneTitle,
		text: x.mDoneText,
		next: x.mDoneNext,
		go: x.mDoneGo,
	},
	drop: { on: x.mDropSome, note: x.mDropNote },
	title: x.mTitle,
	why: x.mWhy,
	whyWarn: x.mWhyStyle.includes("#f5a524"),
	sub: x.mSub,
	desc: x.mDesc,
	hasGroup: x.mHasGroup,
	chart: chart(x),
	sugs: x.mSugs.map((s) => ({
		title: s.title,
		amount: s.amount,
		sub: s.sub,
		add: s.add,
	})),
	cfgs: x.mCfgs.map((c) => ({
		name: c.name,
		amount: c.amount,
		sub: c.sub,
		editLabel: c.editLabel,
		delLabel: c.delLabel,
		confirming: c.confirming,
		confirmText: c.confirmText,
		edit: c.edit,
		askDelete: c.askDelete,
		cancelDelete: c.cancelDelete,
		doDelete: c.doDelete,
	})),
	pane: x.mPane.map((g) => ({
		key: g.name,
		name: g.name,
		desc: g.desc,
		count: g.count,
		total: g.total,
		expanded: g.expanded === "true",
		toggle: g.toggle,
	})),
	paneRows: paneRows(x),
	edit: {
		open: x.edOpen,
		title: x.edTitle,
		state: edit,
		fixed: x.edIsFixed,
		variable: x.edIsVar,
		range: x.edRange,
		pickDay: (day) => x.days.find((d) => d.label === String(day))?.pick(),
		pickLast: x.pickLast,
		setAmt: (v) => x.edOnAmt({ target: { value: String(v) } }),
		setGrace: (v) => x.edOnGrace({ target: { value: String(v) } }),
		save: x.edSave,
		close: x.edClose,
	},
	fin: {
		open: x.finOpen,
		items: x.finItems.map((f, i) => ({ id: `fin-${i}`, ...f })),
		sub: x.finSub,
		close: x.finClose,
		go: x.toSummary,
	},
});
