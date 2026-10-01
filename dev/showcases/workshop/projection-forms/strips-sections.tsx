import { type Component, For, Index, type JSX, createSignal } from "solid-js";
import {
  CardSurface,
  CodeBlock,
  NoteText,
  SectionTitle,
  SegmentedInput,
  SpacedStack,
  TextLabel,
  TextSublabel,
  TightStack,
  CardGrid,
  createGrid,
} from "../../../../src";
import {
  CADENCES,
  CADENCE_SAMPLE,
  EXCEPTIONS,
  FORMS,
  LABEL_KEYS,
  type AmountValue,
  type CadenceValue,
  type FormDef,
  type Side,
  type StripsState,
  type WindowValue,
  amountFragments,
  assemble,
  cadenceFragment,
  cadenceLabels,
  ALL_CADENCES,
  labelFragment,
  prettyJson,
  windowFragments,
} from "../projection-forms.strips";
import {
  AmountDials,
  AmountStrip,
  CadenceStrip,
  LabelStrip,
  ReadOnly,
  ScenarioFrame,
  WindowStrip,
} from "./strips-ui";
import { LabeledField } from "./kit";

/** Gallery cards: 27rem wide at least (min/typical/max at $9,999 need ~410px
 *  on one line), one column on a phone. */
const GalleryGrid = createGrid({
  columns: "repeat(auto-fit, minmax(min(100%, 27rem), 1fr))",
  gap: "sm",
});

const SIDE_OPTIONS = [
  { id: "revenue", label: "Revenue" },
  { id: "expense", label: "Expense" },
];
const MODE_OPTIONS = [
  { id: "minimal", label: "Minimal" },
  { id: "scenario", label: "Scenario" },
];

const Fragment: Component<{ json: string }> = (props) => <CodeBlock>{props.json}</CodeBlock>;

// ── A. STRIP CATALOG ────────────────────────────────────────────────────────

const Variant: Component<{ title: string; children: JSX.Element; json: string }> = (
  props,
) => (
  <CardSurface>
    <SpacedStack>
      <TextLabel>{props.title}</TextLabel>
      {props.children}
      <Fragment json={props.json} />
    </SpacedStack>
  </CardSurface>
);

/** A variant that holds its own sample state so the control is live. */
const CadenceVariant: Component<{ id: (typeof CADENCES)[number]["id"]; label: string; anchor: string }> = (
  props,
) => {
  const [value, setValue] = createSignal<CadenceValue>({ ...CADENCE_SAMPLE, id: props.id });
  return (
    <Variant title={`${props.label} (anchor: ${props.anchor})`} json={cadenceFragment(props.id)}>
      <CadenceStrip
        value={value()}
        allowed={[props.id]}
        onChange={(next) => setValue({ ...value(), ...next })}
      />
    </Variant>
  );
};

const AmountVariant: Component<{ title: string; start: AmountValue; fragment: unknown }> = (props) => {
  const [value, setValue] = createSignal<AmountValue>(props.start);
  return (
    <Variant title={props.title} json={prettyJson(props.fragment)}>
      <AmountStrip
        value={value()}
        cadence="biweekly"
        onChange={(next) => setValue({ ...value(), ...next })}
      />
    </Variant>
  );
};

const WindowVariant: Component<{ title: string; start: WindowValue; fragment: unknown }> = (props) => {
  const [value, setValue] = createSignal<WindowValue>(props.start);
  return (
    <Variant title={`Window: ${props.title}`} json={prettyJson(props.fragment)}>
      <WindowStrip value={value()} mode="any" onChange={(next) => setValue({ ...value(), ...next })} />
    </Variant>
  );
};

const LabelVariant: Component = () => {
  const [name, setName] = createSignal("Pro licenses");
  return (
    <CardSurface>
      <SpacedStack>
        <TextSublabel>One input; the same value is the label in every JSON shape below.</TextSublabel>
        <LabelStrip value={name()} onChange={setName} />
        <CardGrid>
          <For each={LABEL_KEYS}>
            {(k) => (
              <TightStack>
                <TextSublabel>{k.kind}</TextSublabel>
                <Fragment json={labelFragment(k.key, name())} />
              </TightStack>
            )}
          </For>
        </CardGrid>
      </SpacedStack>
    </CardSurface>
  );
};

export const CatalogSection: Component = () => (
  <SpacedStack>
    <SectionTitle>A. Strip catalog</SectionTitle>
    <NoteText>
      Four strips build every simple form. Each variant is live, with the key(s) it writes underneath.
    </NoteText>
    <TextLabel>1. Label</TextLabel>
    <LabelVariant />
    <TextLabel>2. Amount</TextLabel>
    <SpacedStack>
      <For each={amountFragments}>
        {(a) => <AmountVariant title={a.title} start={a.value} fragment={a.fragment} />}
      </For>
    </SpacedStack>
    <TextLabel>3. Cadence</TextLabel>
    <SpacedStack>
      <For each={CADENCES}>{(c) => <CadenceVariant id={c.id} label={c.label} anchor={c.anchor} />}</For>
    </SpacedStack>
    <TextLabel>4. Window</TextLabel>
    <SpacedStack>
      <For each={windowFragments}>
        {(w) => <WindowVariant title={w.title} start={w.value} fragment={w.fragment} />}
      </For>
    </SpacedStack>
  </SpacedStack>
);

// ── B. FORM GALLERY ─────────────────────────────────────────────────────────

const FormCard: Component<{ def: FormDef; mode: string; side: Side }> = (props) => {
  const [state, setState] = createSignal<StripsState>(props.def.start);
  const patch = (next: Partial<StripsState>) => setState({ ...state(), ...next });
  const json = () => prettyJson(assemble(props.def, state(), props.side));
  const sideText = () => (props.def.side === "split" ? props.side : `${props.def.side} (fixed by kind)`);
  const narrowed = () => props.def.cadences.length < ALL_CADENCES.length;
  return (
    <CardSurface>
      <SpacedStack>
        <TightStack>
          <TextLabel>{props.def.name}</TextLabel>
          <TextSublabel>{`Recipe: ${props.def.recipe}`}</TextSublabel>
          <TextSublabel>{`Direction: ${sideText()} · kind: ${props.def.kind}`}</TextSublabel>
        </TightStack>
        <NoteText>
          {narrowed()
            ? `Cadence narrowed from 8 to ${props.def.cadences.length}: ${cadenceLabels(props.def.cadences)}.${props.def.note ? ` ${props.def.note}` : ""}`
            : `Cadence: ${cadenceLabels(props.def.cadences)}.${props.def.note ? ` ${props.def.note}` : ""}`}
        </NoteText>
        {props.mode === "minimal" ? (
          <SpacedStack>
            <LabeledField label="1. Label">
              <LabelStrip value={state().label} onChange={(label) => patch({ label })} />
            </LabeledField>
            <LabeledField label="2. Amount">
              <AmountStrip
                value={state().amount}
                cadence={state().cadence.id}
                onChange={(next) => patch({ amount: { ...state().amount, ...next } })}
              />
            </LabeledField>
            <LabeledField label="3. Cadence">
              <CadenceStrip
                value={state().cadence}
                allowed={props.def.cadences}
                onChange={(next) => patch({ cadence: { ...state().cadence, ...next } })}
              />
            </LabeledField>
            <LabeledField label="4. Window">
              <WindowStrip
                value={state().window}
                mode={props.def.window}
                onChange={(next) => patch({ window: { ...state().window, ...next } })}
              />
            </LabeledField>
          </SpacedStack>
        ) : (
          <ScenarioFrame title={state().label}>
            <AmountDials
              label={state().label}
              value={state().amount}
              start={props.def.start.amount}
              onChange={(next) => patch({ amount: { ...state().amount, ...next } })}
            />
            <ReadOnly
              title="Cadence"
              text={CADENCES.find((c) => c.id === state().cadence.id)?.label ?? ""}
            />
            <ReadOnly
              title="Window"
              text={
                state().window.start === "" && state().window.end === ""
                  ? "none"
                  : `${state().window.start || "…"} to ${state().window.end || "…"}`
              }
            />
          </ScenarioFrame>
        )}
        <Fragment json={json()} />
      </SpacedStack>
    </CardSurface>
  );
};

export const GallerySection: Component = () => {
  const [mode, setMode] = createSignal("minimal");
  const [side, setSide] = createSignal<Side>("revenue");
  return (
    <SpacedStack>
      <SectionTitle>B. Form gallery</SectionTitle>
      <NoteText>
        Each card stacks the four strips. Direction (money in or out) is this split, not a strip; counterparties
        and accounts are placeholder labels in the JSON.
      </NoteText>
      <LabeledField label="Direction (plain forms)">
        <SegmentedInput options={SIDE_OPTIONS} value={side()} onChange={(id) => setSide(id as Side)} />
      </LabeledField>
      <LabeledField label="View">
        <SegmentedInput options={MODE_OPTIONS} value={mode()} onChange={setMode} />
      </LabeledField>
      <GalleryGrid>
        <Index each={FORMS}>
          {(def) => <FormCard def={def()} mode={mode()} side={side()} />}
        </Index>
      </GalleryGrid>
    </SpacedStack>
  );
};

// ── C. EXCEPTIONS ───────────────────────────────────────────────────────────

export const ExceptionsSection: Component = () => (
  <SpacedStack>
    <SectionTitle>C. Exceptions: forms the four strips do not cover</SectionTitle>
    <CardSurface>
      <SpacedStack>
        <For each={EXCEPTIONS}>
          {(e) => (
            <TightStack>
              <TextLabel>{e.form}</TextLabel>
              <NoteText>{e.why}</NoteText>
            </TightStack>
          )}
        </For>
      </SpacedStack>
    </CardSurface>
  </SpacedStack>
);

