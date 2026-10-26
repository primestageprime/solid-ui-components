// ============================================
// ScoreBadge — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:badge, shows:tooltip, does:hover, data:scalar, role:inline
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// One evidence badge with its reason in a tooltip. The tone maps to a
// StatusBadge variant. A `plain` tone tells nothing, so it shows as a muted
// TagPill: StatusBadge has no neutral variant ("pending" uses the warning
// colour). `ScoreBadgeList` wraps a row of badges. `TooltipLines` shows a
// multi-line tip, one body line per line of the text.
//
// No CSS. Composes SmStatusBadge, TagPill, InlineText, Tooltip, TightStack,
// WrapRow and TextBody.
// ============================================
import { type Component, For, Show } from "solid-js";
import { SmStatusBadge, TagPill } from "../Badge";
import type { StatusBadgeVariant } from "../Badge/StatusBadge";
import { InlineText } from "../InlineText";
import { TightStack, WrapRow } from "../Layout";
import { TextBody } from "../Text";
import { Tooltip } from "../Tooltip";

/** How strong the evidence is. `plain` is neutral: it tells nothing. */
export type ScoreTone = "ok" | "weak" | "neg" | "stop" | "plain" | "side";

/** One evidence badge. */
export interface ScoreBadgeData {
	/** The short badge text. */
	readonly label: string;
	readonly tone: ScoreTone;
	/** The tooltip text. A newline starts a new line. */
	readonly tip: string;
}

const VARIANT: Readonly<Record<ScoreTone, StatusBadgeVariant>> = {
	ok: "compliant",
	weak: "warning",
	neg: "violation",
	stop: "violation",
	side: "info",
	plain: "info",
};

/** The StatusBadge variant for a tone. */
export const scoreVariantOf = (tone: ScoreTone): StatusBadgeVariant =>
	VARIANT[tone];

/** Multi-line tooltip text: one body line per line of `text`. */
export const TooltipLines: Component<{ text: string }> = (props) => (
	<TightStack>
		<For each={props.text.split("\n")}>
			{(line) => <TextBody>{line}</TextBody>}
		</For>
	</TightStack>
);

export const ScoreBadge: Component<{ badge: ScoreBadgeData }> = (props) => (
	<Tooltip content={<TooltipLines text={props.badge.tip} />}>
		<Show
			when={props.badge.tone !== "plain"}
			fallback={
				<InlineText tone="muted">
					<TagPill tag={{ label: props.badge.label }} />
				</InlineText>
			}
		>
			<SmStatusBadge
				variant={scoreVariantOf(props.badge.tone)}
				label={props.badge.label}
			/>
		</Show>
	</Tooltip>
);

export const ScoreBadgeList: Component<{
	badges: readonly ScoreBadgeData[];
}> = (props) => (
	<WrapRow>
		<For each={props.badges}>{(b) => <ScoreBadge badge={b} />}</For>
	</WrapRow>
);
