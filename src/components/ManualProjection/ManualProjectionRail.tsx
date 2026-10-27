// ============================================
// ManualProjectionRail — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:list, does:pick, does:hover, data:grouped, role:rail
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The two side lists of the Manual (projection) step. `ManualProjectionRail`
// lists the groups by section (to review, matched, other); a click on a
// pickable group calls `onPick`. `ManualPaymentsPane` lists the open group's
// payments by config; the hovered row is `hotKey`, and a focus change calls
// `onHover` with the row key or null.
//
// No CSS. Composes BucketQueue, SpreadRow and Text variants.
// ============================================
import type { Component } from "solid-js";
import { find, map } from "../../fn";
import { type Bucket, BucketQueue } from "../BucketQueue";
import { SpreadRow } from "../Layout";
import { MonoMeta, TextBody } from "../Text";
import type {
	ManualPaneGroup,
	ManualPaneRow,
	ManualRailItem,
	ManualRailSection,
} from "./types";

export interface ManualProjectionRailProps {
	readonly sections: readonly ManualRailSection[];
	readonly items: readonly ManualRailItem[];
	/** The key of the open group. */
	readonly currentKey?: string;
	readonly onPick: (key: string) => void;
}

export const ManualProjectionRail: Component<ManualProjectionRailProps> = (
	props,
) => (
	<BucketQueue<ManualRailItem>
		buckets={map(
			(s: ManualRailSection): Bucket => ({
				key: s.key,
				label: s.title,
				tone: s.tone,
				emptyLabel: s.emptyText,
			}),
			props.sections,
		)}
		items={[...props.items]}
		bucketOf={(i) => i.section}
		keyOf={(i) => i.key}
		selectedKey={props.currentKey}
		onSelect={(key) => {
			const item = find((i: ManualRailItem) => i.key === key, props.items);
			if (item?.pickable) props.onPick(item.key);
		}}
		renderItem={(i) => (
			<SpreadRow>
				<TextBody>{i.name}</TextBody>
				<MonoMeta>{i.note}</MonoMeta>
			</SpreadRow>
		)}
	/>
);

/** Keep "$6,000 of $7,000" on one line: no-break spaces. */
const oneLine = (t: string): string => t.replace(/ /g, " ");

export interface ManualPaymentsPaneProps {
	readonly groups: readonly ManualPaneGroup[];
	readonly rows: readonly ManualPaneRow[];
	/** The key of the hovered row. */
	readonly hotKey?: string;
	readonly onHover: (key: string | null) => void;
}

export const ManualPaymentsPane: Component<ManualPaymentsPaneProps> = (
	props,
) => (
	<BucketQueue<ManualPaneRow>
		buckets={map(
			(g: ManualPaneGroup): Bucket => ({
				key: g.key,
				label: `${g.name} · ${g.count} · ${g.total}`,
				tone: g.warn ? "warning" : "default",
				collapsible: true,
				collapsedByDefault: !g.expanded,
				emptyLabel: g.desc,
			}),
			props.groups,
		)}
		items={[...props.rows]}
		bucketOf={(r) => r.group}
		keyOf={(r) => r.key}
		selectedKey={props.hotKey}
		onFocusChange={(key) => props.onHover(key ?? null)}
		renderItem={(r) => (
			<SpreadRow>
				<MonoMeta>{r.date}</MonoMeta>
				<MonoMeta>{r.slot}</MonoMeta>
				<MonoMeta tone={r.tone}>{oneLine(`${r.amount}${r.of}`)}</MonoMeta>
			</SpreadRow>
		)}
	/>
);
