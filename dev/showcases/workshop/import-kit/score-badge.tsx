// ScoreBadge — one evidence badge with its reason in a tooltip.
// The prototype draws each badge in a colour from the score weight. SUI has no
// weight-gradient badge, so the badge maps the tone to a status variant.
// A plain tone tells nothing, so it must look neutral. StatusBadge has no
// neutral variant ("pending" uses the warning colour), so a plain badge is a
// TagPill in muted ink.
import { type Component, For, Show } from "solid-js";
import { SmStatusBadge, TagPill } from "../../../../src/components/Badge";
import type { StatusBadgeVariant } from "../../../../src/components/Badge/StatusBadge";
import { InlineText } from "../../../../src/components/InlineText";
import { TightStack, WrapRow } from "../../../../src/components/Layout";
import { TextBody } from "../../../../src/components/Text";
import { Tooltip } from "../../../../src/components/Tooltip";
import type { Badge } from "./types";

const VARIANT: Readonly<Record<string, StatusBadgeVariant>> = {
	ok: "compliant",
	weak: "warning",
	neg: "violation",
	stop: "violation",
	side: "info",
};

export const variantOf = (tone: string): StatusBadgeVariant =>
	VARIANT[tone] ?? "info";

/** Multi-line tooltip text: one body line per line of the source tip. */
export const TipLines: Component<{ text: string }> = (props) => (
	<TightStack>
		<For each={props.text.split("\n")}>
			{(line) => <TextBody>{line}</TextBody>}
		</For>
	</TightStack>
);

export const ScoreBadge: Component<{ badge: Badge }> = (props) => (
	<Tooltip content={<TipLines text={props.badge.tip} />}>
		<Show
			when={props.badge.tone !== "plain"}
			fallback={
				<InlineText tone="muted">
					<TagPill tag={{ label: props.badge.t }} />
				</InlineText>
			}
		>
			<SmStatusBadge
				variant={variantOf(props.badge.tone)}
				label={props.badge.t}
			/>
		</Show>
	</Tooltip>
);

export const BadgeList: Component<{ badges: readonly Badge[] }> = (props) => (
	<WrapRow>
		<For each={props.badges}>{(b) => <ScoreBadge badge={b} />}</For>
	</WrapRow>
);
