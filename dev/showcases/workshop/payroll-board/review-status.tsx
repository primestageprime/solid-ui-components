// Review status for the payroll-board bench. When the agent working a
// section finishes its tasks, flip that section to "ready" here; the section
// title then carries a [READY FOR APPROVAL] tag. Peter approves → the section
// moves into the Approved fold and its entry is removed.
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { InfoBadge } from "../../../../src/components/Badge";
import { TagRow } from "../../../../src/components/Layout";
import { SubsectionTitle } from "../../../../src/components/Text";

export type ReviewStatus = "working" | "ready";

export const REVIEW_STATUS: Record<string, ReviewStatus> = {
  combo: "working",
  changes: "working",
};

export function ReviewTitle(props: { id: string; children: JSX.Element }) {
  return (
    <TagRow>
      <SubsectionTitle>{props.children}</SubsectionTitle>
      <Show when={REVIEW_STATUS[props.id] === "ready"}>
        <InfoBadge label="READY FOR APPROVAL" />
      </Show>
    </TagRow>
  );
}
