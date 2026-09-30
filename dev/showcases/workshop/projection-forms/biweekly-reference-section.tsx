import { type Component, For, Show, createSignal } from "solid-js";
import {
  ChipGrid,
  CurrencyInput,
  DatePicker,
  FormComposite,
  GhostButton,
  ListItem,
  NoteText,
  ScrollList,
  SegmentedInput,
  SpacedStack,
  SpreadRow,
  TextSublabel,
  TightStack,
} from "../../../../src";
import {
  buildBiweeklyReference,
  landsIn,
  legacyText,
  wireFromLegacy,
  wireText,
} from "../projection-forms.config";
import {
  BIWEEKLY_REFERENCE,
  CONFIG_TYPES,
  DEFINITION_HELP,
  DEFINITION_OPTIONS,
  EXPENSE_CATEGORIES,
  REVENUE_CATEGORIES,
  ROLE_HELP,
  ROLE_OPTIONS,
  SIDE_OPTIONS,
  bucketIdFor,
  formatCents,
  perPaycheckCents,
} from "../projection-forms.fixtures";
import {
  CandidateCard,
  ChipChoice,
  ConfigFrame,
  ConfigHeader,
  ConfigOutput,
  LabeledField,
  ScenarioRail,
} from "./kit";

const PREVIEW_ROWS = 5;

// Reference form 2 — Expense "Michael A Arnold", Bi-weekly (reference date).
// Shape: header · Role · Definition · Interpretations · [annual][reference
// payday] · derived footnote · rail (source transactions + per-scenario).
export const BiweeklyReferenceSection: Component = () => {
  const [name, setName] = createSignal(BIWEEKLY_REFERENCE.name);
  const [side, setSide] = createSignal(BIWEEKLY_REFERENCE.side);
  const [category, setCategory] = createSignal(BIWEEKLY_REFERENCE.category);
  const [type, setType] = createSignal(BIWEEKLY_REFERENCE.type);
  const [role, setRole] = createSignal(BIWEEKLY_REFERENCE.role);
  const [pick, setPick] = createSignal(BIWEEKLY_REFERENCE.pick);
  const [candidate, setCandidate] = createSignal(BIWEEKLY_REFERENCE.candidates[0].id);
  const [annual, setAnnual] = createSignal<number | undefined>(BIWEEKLY_REFERENCE.annual);
  const [referenceDate, setReferenceDate] = createSignal(BIWEEKLY_REFERENCE.referenceDate);
  const [showAll, setShowAll] = createSignal(false);

  const categories = () => (side() === "revenue" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES);
  const echo = () => `= ${formatCents(perPaycheckCents(annual() ?? 0))}/paycheck`;
  const txns = () =>
    showAll() ? BIWEEKLY_REFERENCE.sourceTxns : BIWEEKLY_REFERENCE.sourceTxns.slice(0, PREVIEW_ROWS);
  // The row this form emits, live (FormContext: bucket from Category, accounts
  // from side; the payee is the person's name).
  const row = () =>
    buildBiweeklyReference(
      { name: name(), annual: annual(), referenceDate: referenceDate(), role: role() },
      {
        side: side() === "revenue" ? "revenue" : "expense",
        bucketId: bucketIdFor(side(), category()),
        mineAccount: "Columbia Bank Checking",
        counterparty: name(),
      },
    );
  const show = (action: string) => () =>
    console.table({ action, name: name(), side: side(), category: category(), type: type(), role: role(), pick: pick(), candidate: candidate(), annual: annual(), referenceDate: referenceDate() });

  return (
    <ConfigFrame
      header={
        <ConfigHeader
          side={side()}
          name={name()}
          type={type()}
          onRename={setName}
          onDelete={show("delete")}
          onSave={show("save")}
        />
      }
      pane={
        <SpacedStack>
          <LabeledField label="Role" help={ROLE_HELP}>
            <SegmentedInput options={ROLE_OPTIONS} value={role()} onChange={setRole} />
          </LabeledField>
          <LabeledField label="Definition" help={DEFINITION_HELP}>
            <SegmentedInput options={DEFINITION_OPTIONS} value={pick()} onChange={setPick} />
          </LabeledField>
          <LabeledField label="Interpretations">
            <ChipGrid>
              <For each={BIWEEKLY_REFERENCE.candidates}>
                {(c) => <CandidateCard candidate={c} selected={c.id === candidate()} onPick={setCandidate} />}
              </For>
            </ChipGrid>
          </LabeledField>
          <Show when={candidate() === "manual"}>
            <LabeledField label="Direction">
              <SegmentedInput options={SIDE_OPTIONS} value={side()} onChange={setSide} />
            </LabeledField>
            <ChipChoice label="Category" options={categories()} value={category()} onChange={setCategory} />
            <ChipChoice label="Type" options={CONFIG_TYPES} value={type()} onChange={setType} />
          </Show>
          <FormComposite
            stacked
            identity={
              <CurrencyInput
                name="annual"
                label="Annual salary ($)"
                description={echo()}
                value={annual}
                onChange={setAnnual}
                step={0.01}
              />
            }
            schedule={
              <LabeledField label="Reference payday">
                <DatePicker value={referenceDate()} onChange={setReferenceDate} />
              </LabeledField>
            }
          />
          <NoteText>{BIWEEKLY_REFERENCE.note}</NoteText>
        </SpacedStack>
      }
      rail={
        <SpacedStack>
          <TightStack>
            <SpreadRow>
              <TextSublabel>{`Source transactions (${BIWEEKLY_REFERENCE.sourceTxns.length})`}</TextSublabel>
              <GhostButton onClick={() => setShowAll(!showAll())}>
                {showAll() ? "Show fewer" : "Show all"}
              </GhostButton>
            </SpreadRow>
            <ScrollList>
              <For each={txns()}>
                {(t) => <ListItem secondary={t.amount}>{t.date}</ListItem>}
              </For>
            </ScrollList>
            <NoteText>{BIWEEKLY_REFERENCE.sourceStats}</NoteText>
          </TightStack>
          <ScenarioRail scenarios={BIWEEKLY_REFERENCE.scenarios} />
        </SpacedStack>
      }
      output={
        <Show
          when={type() === BIWEEKLY_REFERENCE.type}
          fallback={<NoteText>{`The ${type()} form is not built on this bench yet.`}</NoteText>}
        >
          <ConfigOutput
            legacyJson={legacyText(row())}
            wireJson={wireText(wireFromLegacy(row()))}
            landing={landsIn(row())}
          />
        </Show>
      }
    />
  );
};
