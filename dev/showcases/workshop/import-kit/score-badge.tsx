// ScoreBadge — one evidence badge with its reason in a tooltip.
// The prototype draws each badge in a colour from the score weight. SUI has no
// weight-gradient badge, so the badge maps the tone to a status variant.
import { type Component, For } from "solid-js";
import { SmStatusBadge } from "../../../../src/components/Badge";
import type { StatusBadgeVariant } from "../../../../src/components/Badge/StatusBadge";
import { TightStack, WrapRow } from "../../../../src/components/Layout";
import { TextBody } from "../../../../src/components/Text";
import { Tooltip } from "../../../../src/components/Tooltip";
import type { Badge } from "./types";

const VARIANT: Readonly<Record<string, StatusBadgeVariant>> = {
	ok: "compliant",
	weak: "warning",
	neg: "violation",
	stop: "violation",
	plain: "pending",
	side: "info",
};

export const variantOf = (tone: string): StatusBadgeVariant =>
	VARIANT[tone] ?? "pending";

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
		<SmStatusBadge
			variant={variantOf(props.badge.tone)}
			label={props.badge.t}
		/>
	</Tooltip>
);

export const BadgeList: Component<{ badges: readonly Badge[] }> = (props) => (
	<WrapRow>
		<For each={props.badges}>{(b) => <ScoreBadge badge={b} />}</For>
	</WrapRow>
);
