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
  CompliantBadge,
  DangerButton,
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
  trendOf,
} from "../../../../src";
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

// ── ConfigFrame ──────────────────────────────────────────────────────────────
export const ConfigFrame: Component<{
  header: JSX.Element;
  pane: JSX.Element;
  rail: JSX.Element;
}> = (props) => (
  <CardSurface>
    <TightStack>
      {props.header}
      <AutoStackRow breakWidth="52rem">
        <AutoStackItem>{props.pane}</AutoStackItem>
        <AutoStackItem>{props.rail}</AutoStackItem>
      </AutoStackRow>
    </TightStack>
  </CardSurface>
);
