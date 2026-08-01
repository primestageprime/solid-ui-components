// Variant coverage — the curried variants whose family showcase demonstrates
// the base component but not every named form.
//
// A variant nobody can look at gets adopted by guessing from its type, which is
// how override props and hand-rolled geometry creep back into call sites. This
// page is the backstop: every remaining exported variant, rendered as itself.
// Variants graduate out of here into their family's own showcase when that
// showcase grows a section for them.
import { type Component, createSignal } from "solid-js";
import {
  ContentStack,
  ClusterRow,
  WrappedClusterRow,
  NarrowStack,
} from "../../src/components/Layout";
import { SubsectionTitle, TextSublabel, TextBody } from "../../src/components/Text";
import { InfoAlert, SuccessAlert, WarningAlert, DangerAlert } from "../../src/components/Feedback";
import {
  PrimaryConfirmationModal,
  LargePrimaryConfirmationModal,
  DangerConfirmationModal,
  LargeModal,
  FullscreenModal,
} from "../../src/components/Modal";
import { PlainActionRow, AccentActionRow, DangerActionRow } from "../../src/components/ActionRow";
import { DiffPair, BoldArrowDiffPair, FlowDiffPair } from "../../src/components/DiffPair";
import { BorderedButtonGroup, VerticalButtonGroup } from "../../src/components/ButtonGroup";
import { SmallCheckbox, DoneCheckbox } from "../../src/components/Checkbox";
import { Link, NewTabLink } from "../../src/components/Navigation";
import { UnderlineTabs } from "../../src/components/Tabs";
import { VerticalDivider } from "../../src/components/Divider";
import { LabeledDivider, DateDivider } from "../../src/components/LabeledDivider";
import { ScrollRegionMd, ScrollRegionLg } from "../../src/components/ScrollRegion";
import { SmAvatar, MdAvatar, LgAvatar } from "../../src/components/ParticipantAvatar";
import { SelfBubble, OtherBubble } from "../../src/components/MessageBubble";
import { FlatThreadGroup, IndentedThreadGroup } from "../../src/components/ThreadGroup";
import { SmallTruthIndicator, LargeTruthIndicator } from "../../src/components/TruthIndicator";
import { MdStatusLight } from "../../src/components/StatusLight";
import { TruthToggle } from "../../src/components/Toggle";
import { Kbd } from "../../src/components/Kbd";
import { HotkeyButton } from "../../src/components/HotkeyButton";
import { CodeBlock } from "../../src/components/CodeBlock";
import { InlineText } from "../../src/components/InlineText";
import { ParticipantNameLabel } from "../../src/components/ParticipantNameLabel";
import { ParticipantTimeLabel } from "../../src/components/ParticipantTimeLabel";
import { PrimaryButton, GhostButton } from "../../src/components/Button";
import { BlockPlaceholder, FitPlaceholder } from "../../src/components/Placeholder";
import { Assignees, MdAssigneeChips } from "../../src/components/AssigneeChips";
import "./variant-coverage.css";

const noop = () => undefined;

// AssigneeChips takes ids plus the caller's resolver — the chips never know
// where names come from, so the demo carries a roster like a real app would.
const ROSTER: Record<string, string> = {
  "u-ps": "Peter S.",
  "u-ak": "Adlai A.",
  "u-mb": "Mira B.",
  "u-ln": "Lena N.",
  "u-rt": "Ravi T.",
};
const nameOf = (id: string): string => ROSTER[id] ?? id;

const Family: Component<{ title: string; note: string; children: import("solid-js").JSX.Element }> = (
  props,
) => (
  <ContentStack>
    <SubsectionTitle>{props.title}</SubsectionTitle>
    <TextSublabel>{props.note}</TextSublabel>
    {props.children}
  </ContentStack>
);

export const VariantCoverageShowcase: Component = () => {
  const [confirm, setConfirm] = createSignal<null | "primary" | "large" | "danger">(null);
  const [big, setBig] = createSignal<null | "large" | "fullscreen">(null);
  const [tab, setTab] = createSignal("overview");
  const [truth, setTruth] = createSignal(true);

  return (
    <div class="component-section component-section--full">
      <h2>Variant coverage</h2>
      <p class="text-meta">
        The curried variants whose family showcase demonstrates the base
        component but not every named form. Each is rendered as itself — the
        name is the API, so seeing the name beside the result is the whole
        documentation.
      </p>

      <Family title="Alerts" note="Feedback's tone-locked forms — the tone is in the name, never a prop.">
        <NarrowStack>
          <InfoAlert>InfoAlert — a neutral notice</InfoAlert>
          <SuccessAlert>SuccessAlert — the thing worked</SuccessAlert>
          <WarningAlert>WarningAlert — proceed, but know this</WarningAlert>
          <DangerAlert>DangerAlert — the thing failed</DangerAlert>
        </NarrowStack>
      </Family>

      <Family
        title="Confirmation modals"
        note="A confirm is its consequence: pick the modal whose name matches what the button will do."
      >
        <WrappedClusterRow>
          <GhostButton onClick={() => setConfirm("primary")}>PrimaryConfirmationModal</GhostButton>
          <GhostButton onClick={() => setConfirm("large")}>LargePrimaryConfirmationModal</GhostButton>
          <GhostButton onClick={() => setConfirm("danger")}>DangerConfirmationModal</GhostButton>
          <GhostButton onClick={() => setBig("large")}>LargeModal</GhostButton>
          <GhostButton onClick={() => setBig("fullscreen")}>FullscreenModal</GhostButton>
        </WrappedClusterRow>
        <PrimaryConfirmationModal
          open={confirm() === "primary"}
          onClose={() => setConfirm(null)}
          onConfirm={() => setConfirm(null)}
          title="Publish the report"
          description="It becomes visible to everyone with access to the space."
          confirmLabel="Publish"
        />
        <LargePrimaryConfirmationModal
          open={confirm() === "large"}
          onClose={() => setConfirm(null)}
          onConfirm={() => setConfirm(null)}
          title="Apply the aux-engine correction"
          description="The same confirm at the large size, for when the description is a paragraph rather than a line — a recalculation that touches every hour of the call, listed above the buttons so the reviewer can check it before committing."
          confirmLabel="Apply"
        />
        <DangerConfirmationModal
          open={confirm() === "danger"}
          onClose={() => setConfirm(null)}
          onConfirm={() => setConfirm(null)}
          title="Delete the canned explanation"
          description="This cannot be undone."
          confirmLabel="Delete"
        />
        <LargeModal open={big() === "large"} onClose={() => setBig(null)} title="LargeModal">
          <BlockPlaceholder label="a form or a detail pane" />
        </LargeModal>
        <FullscreenModal open={big() === "fullscreen"} onClose={() => setBig(null)} title="FullscreenModal">
          <BlockPlaceholder label="a full-screen editor or report" />
        </FullscreenModal>
      </Family>

      <Family title="Action rows" note="A row of content with its actions at the end, toned by role.">
        <NarrowStack>
          <PlainActionRow actions={[{ label: "Open", onClick: noop }]}>PlainActionRow</PlainActionRow>
          <AccentActionRow actions={[{ label: "Review", onClick: noop }]}>AccentActionRow</AccentActionRow>
          <DangerActionRow actions={[{ label: "Remove", onClick: noop }]}>DangerActionRow</DangerActionRow>
        </NarrowStack>
      </Family>

      <Family title="Diff pairs" note="Before → after, with the arrow carrying the emphasis.">
        <NarrowStack>
          <DiffPair label="Threshold" before="2.4 g/kWh" after="1.9 g/kWh" />
          <BoldArrowDiffPair label="Status" before="queued" after="in_progress" />
          <FlowDiffPair label="Flow" before="2 scfm" after="14 scfm" />
        </NarrowStack>
      </Family>

      <Family title="Button groups" note="Segmented actions — bordered as one unit, or stacked vertically.">
        <ClusterRow>
          <BorderedButtonGroup>
            <PrimaryButton>Day</PrimaryButton>
            <GhostButton>Week</GhostButton>
            <GhostButton>Month</GhostButton>
          </BorderedButtonGroup>
          <VerticalButtonGroup>
            <GhostButton>Approve</GhostButton>
            <GhostButton>Reject</GhostButton>
          </VerticalButtonGroup>
        </ClusterRow>
      </Family>

      <Family title="Checkboxes" note="Size and semantics locked by name.">
        <ClusterRow>
          <SmallCheckbox label="SmallCheckbox" />
          <DoneCheckbox label="DoneCheckbox — a completed item" checked />
        </ClusterRow>
      </Family>

      <Family title="Links" note="Same-tab and new-tab links; the new-tab form carries its own affordance.">
        <ClusterRow>
          <Link href="#/variant-coverage">Link</Link>
          <NewTabLink href="#/variant-coverage">NewTabLink</NewTabLink>
        </ClusterRow>
      </Family>

      <Family title="Tabs" note="UnderlineTabs — the curried underline form.">
        <UnderlineTabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "detail", label: "Detail" },
            { id: "history", label: "History" },
          ]}
          activeTab={tab()}
          onTabChange={setTab}
        />
      </Family>

      <Family title="Dividers" note="A vertical rule between columns, and rules that carry a label.">
        <ClusterRow>
          <FitPlaceholder label="left" />
          <VerticalDivider />
          <FitPlaceholder label="right" />
        </ClusterRow>
        <NarrowStack>
          <LabeledDivider label="LabeledDivider" />
          <DateDivider label="2026-07-27" />
        </NarrowStack>
      </Family>

      <Family title="Scroll regions" note="A region that scrolls its own overflow, at two heights.">
        <ClusterRow>
          <ScrollRegionMd>
            <BlockPlaceholder label="ScrollRegionMd content" />
          </ScrollRegionMd>
          <ScrollRegionLg>
            <BlockPlaceholder label="ScrollRegionLg content" />
          </ScrollRegionLg>
        </ClusterRow>
      </Family>

      <Family title="Participants" note="Avatar sizes, plus the name and time labels that sit beside them.">
        <ClusterRow>
          <SmAvatar initials="PS" color="var(--sui-accent)" />
          <MdAvatar initials="AK" color="var(--sui-success)" />
          <LgAvatar initials="MB" color="var(--sui-warning)" />
          <ParticipantNameLabel color="var(--sui-accent)">Peter</ParticipantNameLabel>
          <ParticipantTimeLabel>08:14</ParticipantTimeLabel>
        </ClusterRow>
      </Family>

      <Family
        title="Assignee chips"
        note="Who is on a work item, resolved from ids. The size is in the name — call sites pass ids and a resolver, never a size."
      >
        <NarrowStack>
          <ClusterRow>
            <TextBody>Assignees (sm) — dense rows, a table cell or a card footer</TextBody>
          </ClusterRow>
          <Assignees ids={["u-ps", "u-ak", "u-mb"]} resolveName={nameOf} />
          <ClusterRow>
            <TextBody>MdAssigneeChips — a detail pane, where the chips are the content</TextBody>
          </ClusterRow>
          <MdAssigneeChips ids={["u-ps", "u-ak", "u-mb", "u-ln", "u-rt"]} resolveName={nameOf} />
        </NarrowStack>
      </Family>

      <Family title="Message bubbles" note="Whose message it is decides the bubble, not a prop.">
        <NarrowStack>
          <OtherBubble title="Reviewer">OtherBubble — someone else's message</OtherBubble>
          <SelfBubble>SelfBubble — your own message</SelfBubble>
        </NarrowStack>
      </Family>

      <Family title="Thread groups" note="Flat for a shallow feed, indented for a reply tree.">
        <NarrowStack>
          <FlatThreadGroup depth={0} color="var(--sui-accent)" variant="other">
            <TextBody>FlatThreadGroup</TextBody>
          </FlatThreadGroup>
          <IndentedThreadGroup depth={2} color="var(--sui-success)" variant="self">
            <TextBody>IndentedThreadGroup at depth 2</TextBody>
          </IndentedThreadGroup>
        </NarrowStack>
      </Family>

      <Family title="Truth" note="A boolean shown as a mark, and toggled as a switch.">
        <ClusterRow>
          <SmallTruthIndicator value={true} label="SmallTruthIndicator" />
          <LargeTruthIndicator value={false} label="LargeTruthIndicator" />
          <TruthToggle checked={truth()} onChange={setTruth} label="TruthToggle" />
          <MdStatusLight variant="success" label="MdStatusLight" />
        </ClusterRow>
      </Family>

      <Family title="Keys and code" note="Keyboard affordances and monospaced blocks.">
        <ClusterRow>
          <Kbd letter="K" rest="⌘" />
          <HotkeyButton hotkey="s" onTrigger={noop}>
            HotkeyButton
          </HotkeyButton>
          <InlineText color="var(--sui-accent)">InlineText</InlineText>
        </ClusterRow>
        <CodeBlock>{"const AddFab = createFab({ icon: \"plus\" });"}</CodeBlock>
      </Family>
    </div>
  );
};
