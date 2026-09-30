import { type Component, Match, Show, Switch, createSignal } from "solid-js";
import { CardSurface, NoteText, SegmentedInput, SpacedStack } from "../../../../src";
import { SIDE_OPTIONS } from "../projection-forms.fixtures";
import {
  AMOUNT_OPTIONS,
  type AmountId,
  type CascadeState,
  type LeafId,
  NOT_BUILT,
  NO_EXPENSE_FORMS,
  type SideId,
  leafOptions,
  settle,
} from "../projection-forms.cascade";
import { HourlyForm } from "./hourly-form";
import { LabeledField } from "./kit";
import { LicenseForm } from "./license-form";

// The cascade: each split decides what the next one offers, down to a leaf
// form. Every level stays on screen so the path is visible.
export const CascadeSection: Component = () => {
  const [state, setState] = createSignal<CascadeState>(
    settle({ side: "revenue", amount: "fixed", leaf: "license" }),
  );
  const choose = (next: Partial<CascadeState>) => setState(settle({ ...state(), ...next }));
  const leaves = () => leafOptions(state().side, state().amount);
  const leaf = () => state().leaf;

  return (
    <CardSurface>
      <SpacedStack>
        <LabeledField label="Direction">
          <SegmentedInput
            options={SIDE_OPTIONS}
            value={state().side}
            onChange={(id) => choose({ side: id as SideId })}
          />
        </LabeledField>
        <LabeledField label="Amount">
          <SegmentedInput
            options={AMOUNT_OPTIONS}
            value={state().amount}
            onChange={(id) => choose({ amount: id as AmountId })}
          />
        </LabeledField>
        <Show when={leaves().length > 0} fallback={<NoteText>{NO_EXPENSE_FORMS}</NoteText>}>
          <LabeledField label="Type">
            <SegmentedInput
              options={leaves()}
              value={leaf() ?? ""}
              onChange={(id) => choose({ leaf: id as LeafId })}
            />
          </LabeledField>
        </Show>
        <Switch>
          <Match when={leaf() === "license"}>
            <LicenseForm />
          </Match>
          <Match when={leaf() === "hourly"}>
            <HourlyForm />
          </Match>
          <Match when={leaf() !== null}>
            <NoteText>{NOT_BUILT[leaf() as LeafId]}</NoteText>
          </Match>
        </Switch>
      </SpacedStack>
    </CardSurface>
  );
};
