// Bench-local composition helpers for the Projection Forms bench. Every piece
// here is SUI components only (no CSS, no inline style). They exist to NAME the
// recurring shapes across thorcasting's forms so the pattern is visible:
//
//   LabeledField   label above a control + helper below (SegmentedInput,
//                  DatePicker, DayOfMonthPicker and chip rows carry neither)
//   ChipChoice     a wrapping row of single-select chips
//   ConfigHeader   [side badge · name · type badge]   [Delete · Save]
//   ConfigFrame    header over [form pane | right rail]
//   CandidateCard  one ranked interpretation, selectable
//   ScenarioRail   "this config, per scenario" — sparkline per scenario
//
// LabeledField and ChipChoice are CANDIDATE GAPS: each is a one-line composition
// today, but it recurs in every form. Nothing is promoted from here.
import { type Component, type JSX, For, Index, Show } from "solid-js";
import {
  AutoStackItem,
  AutoStackRow,
  CardSurface,
  ChipCluster,
  CodeBlock,
  CompliantBadge,
  DangerButton,
  InfoBadge,
  InteractiveCard,
  NameInput,
  NoteText,
  PendingBadge,
  PrimaryButton,
  SmallButton,
  SpreadRow,
  TextLabel,
  TextSublabel,
  TextValue,
  TightStack,
  TrendSparkline,
  ViolationBadge,
  WarningBadge,
  trendOf,
} from "../../../../src";
import type { Landing } from "../projection-forms.config";
import type { Candidate, ScenarioLine } from "../projection-forms.fixtures";

// ── LabeledField ─────────────────────────────────────────────────────────────
export const LabeledField: Component<{
  label: string;
  help?: string;
  children: JSX.Element;
}> = (props) => (
  <TightStack>
    <TextSublabel>{props.label}</TextSublabel>
    {props.children}
    <Show when={props.help}>
      <NoteText>{props.help}</NoteText>
    </Show>
  </TightStack>
);

// ── ChipChoice ───────────────────────────────────────────────────────────────
export const ChipChoice: Component<{
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}> = (props) => (
  <LabeledField label={props.label}>
    <ChipCluster>
      <For each={props.options}>
        {(option) => (
          <SmallButton
            active={option === props.value}
            onClick={() => props.onChange(option)}
          >
            {option}
          </SmallButton>
        )}
      </For>
    </ChipCluster>
  </LabeledField>
);

// ── ConfigHeader ─────────────────────────────────────────────────────────────
export const ConfigHeader: Component<{
  side: string;
  name: string;
  type: string;
  onRename: (next: string) => void;
  onDelete: () => void;
  onSave: () => void;
}> = (props) => (
  <AutoStackRow breakWidth="40rem">
    <AutoStackItem>
      <ChipCluster>
        <Show
          when={props.side === "revenue"}
          fallback={<ViolationBadge>EXPENSE</ViolationBadge>}
        >
          <CompliantBadge>REVENUE</CompliantBadge>
        </Show>
        <NameInput
          aria-label="Config name"
          value={props.name}
          onInput={(e) => props.onRename(e.currentTarget.value)}
        />
      </ChipCluster>
    </AutoStackItem>
    <AutoStackItem>
      <ChipCluster>
        <PendingBadge>{props.type.toUpperCase()}</PendingBadge>
        <DangerButton onClick={props.onDelete}>Delete</DangerButton>
        <PrimaryButton onClick={props.onSave}>Save</PrimaryButton>
      </ChipCluster>
    </AutoStackItem>
  </AutoStackRow>
);

// ── CandidateCard ────────────────────────────────────────────────────────────
export const CandidateCard: Component<{
  candidate: Candidate;
  selected: boolean;
  onPick: (id: string) => void;
}> = (props) => (
  <InteractiveCard
    active={props.selected}
    onClick={() => props.onPick(props.candidate.id)}
  >
    <TightStack>
      <TextLabel>
        {props.candidate.star ? "★ " : ""}
        {props.candidate.title}
      </TextLabel>
      <TextSublabel>
        {props.candidate.kind} · {props.candidate.why}
      </TextSublabel>
      <Show when={props.candidate.band}>
        <TextValue>{props.candidate.band}</TextValue>
      </Show>
    </TightStack>
  </InteractiveCard>
);

// ── ScenarioRail ─────────────────────────────────────────────────────────────
export const ScenarioRail: Component<{ scenarios: ScenarioLine[] }> = (props) => (
  <TightStack>
    <TextSublabel>This config, per scenario</TextSublabel>
    <Index each={props.scenarios}>
      {(line) => (
        <TightStack>
          <SpreadRow>
            <TextLabel>{line().label}</TextLabel>
            <TextValue>{line().total}</TextValue>
          </SpreadRow>
          <TrendSparkline
            values={line().series}
            trend={trendOf(line().series[0], line().series[line().series.length - 1])}
            width={220}
          />
        </TightStack>
      )}
    </Index>
  </TightStack>
);

// ── ConfigOutput ─────────────────────────────────────────────────────────────
// What the form emits, live: the row the form saves, the stored config the fold
// reads, and the builder tab that picks the line up.
export const ConfigOutput: Component<{
  legacyJson: string;
  wireJson: string;
  landing: Landing;
}> = (props) => (
  <TightStack>
    <TightStack>
      <TextSublabel>Lands in</TextSublabel>
      <ChipCluster>
        <Show
          when={props.landing.claimed}
          fallback={<WarningBadge>{props.landing.builder.toUpperCase()}</WarningBadge>}
        >
          <InfoBadge>{props.landing.builder.toUpperCase()}</InfoBadge>
        </Show>
        <Index each={props.landing.also}>
          {(also) => <PendingBadge>{`ALSO ${also().toUpperCase()}`}</PendingBadge>}
        </Index>
      </ChipCluster>
      <NoteText>{props.landing.rule}</NoteText>
    </TightStack>
    <AutoStackRow breakWidth="52rem">
      <AutoStackItem>
        <LabeledField label="Form emits: the row Save writes (legacy triple)">
          <CodeBlock>{props.legacyJson}</CodeBlock>
        </LabeledField>
      </AutoStackItem>
      <AutoStackItem>
        <LabeledField label="Stored as: config_json the fold reads (effect, params)">
          <CodeBlock>{props.wireJson}</CodeBlock>
        </LabeledField>
      </AutoStackItem>
    </AutoStackRow>
  </TightStack>
);

// ── ConfigFrame ──────────────────────────────────────────────────────────────
export const ConfigFrame: Component<{
  header: JSX.Element;
  pane: JSX.Element;
  rail: JSX.Element;
  output: JSX.Element;
}> = (props) => (
  <CardSurface>
    <TightStack>
      {props.header}
      <AutoStackRow breakWidth="52rem">
        <AutoStackItem>{props.pane}</AutoStackItem>
        <AutoStackItem>{props.rail}</AutoStackItem>
      </AutoStackRow>
      {props.output}
    </TightStack>
  </CardSurface>
);
