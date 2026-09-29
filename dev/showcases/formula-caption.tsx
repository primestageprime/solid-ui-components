// FormulaCaption — a one-line caption that shows its work: `× $125 = $1,000`.
//
// The page plays the CONSUMER twice. First standalone: a figure, and under it
// the factor applied and what it came to, with a scrubber so the result can be
// watched moving. Then in its real seat: plugged into a `GroupedMutationSliders`
// axis `caption`, where each dial's caption multiplies that dial's hours by its
// role's rate. The row holds ONE entity whose name the card title already
// says, so `showNames={false}`.
//
// Formatting is curried ONCE (`createFormulaCaption`), so every call site
// passes numbers only — the drop-in form.
import { type Component, createSignal } from "solid-js";
import {
  FormulaCaption,
  createFormulaCaption,
} from "../../src/components/FormulaCaption";
import {
  type GroupedMeasureAxes,
  type GroupedMutationEntity,
  GroupedMutationSliders,
  type MeasureCaptionProps,
} from "../../src/components/GroupedMutationSliders";
import { Slider } from "../../src/components/Slider";
import { CardSurface } from "../../src/components/Surface";
import {
  ConstrainedBox,
  SpacedStack,
  TightStack,
} from "../../src/components/Layout";
import {
  CaptionLabel,
  MutedBody,
  SectionTitle,
  SteadyMonoValue,
  SubsectionTitle,
  TextTitle,
} from "../../src/components/Text";

const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** The drop-in: this page's money format, curried once. */
const CostCaption = createFormulaCaption({
  formatFactor: dollars,
  formatResult: dollars,
});

const Standalone: Component = () => {
  const [hours, setHours] = createSignal(8);
  return (
    <ConstrainedBox>
      <CardSurface>
        <TightStack>
          <SteadyMonoValue>{`${hours()} h`}</SteadyMonoValue>
          <CostCaption operand={hours()} factor={125} />
          <Slider
            label="Hours"
            value={hours()}
            onChange={setHours}
            min={0}
            max={40}
            step={1}
          />
          <CaptionLabel>
            No factor yet: the line is kept, blank, so nothing below it jumps.
          </CaptionLabel>
          <FormulaCaption operand={hours()} factor={null} />
        </TightStack>
      </CardSurface>
    </ConstrainedBox>
  );
};

/** Each role's hourly rate, by measure position. */
const RATES: readonly number[] = [95, 125, 70];

/** The slot's adapter: one line from the dial's data to the display's props. */
const RateCaption: Component<MeasureCaptionProps> = (p) => (
  <CostCaption operand={p.value} factor={RATES[p.measure] ?? null} />
);

const AXES: GroupedMeasureAxes = [
  {
    label: "Tear-off",
    group: "hours",
    domain: [0, 24],
    snap: 1,
    format: (n) => `${n} h`,
    caption: RateCaption,
  },
  {
    label: "Install",
    group: "hours",
    domain: [0, 48],
    snap: 1,
    format: (n) => `${n} h`,
    caption: RateCaption,
  },
  {
    label: "Cleanup",
    group: "hours",
    domain: [0, 12],
    snap: 1,
    format: (n) => `${n} h`,
    caption: RateCaption,
  },
];

const InSliders: Component = () => {
  const [job, setJob] = createSignal<GroupedMutationEntity>({
    id: "job-3",
    label: "Harold tear-off",
    measures: [
      { prior: 12, value: 14, range: [0, 24] },
      { prior: 30, value: 26, range: [0, 48] },
      { prior: 4, value: 4, range: [0, 12] },
    ],
  });
  return (
    <CardSurface>
      <TightStack>
        <TextTitle>#3 Harold tear-off</TextTitle>
        <GroupedMutationSliders
          entities={[job()]}
          axes={AXES}
          showNames={false}
          onChange={(_id, measure, value) =>
            setJob((j) => ({
              ...j,
              measures: j.measures.map((m, i) =>
                i === measure ? { ...m, value } : m,
              ),
            }))
          }
        />
      </TightStack>
    </CardSurface>
  );
};

export const FormulaCaptionShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SpacedStack>
      <TightStack>
        <SectionTitle>FormulaCaption</SectionTitle>
        <MutedBody>
          Composite (Depth 2) over Text: a caption that shows its work under a
          figure. Standalone, and as the display in a GroupedMutationSliders
          axis caption slot.
        </MutedBody>
      </TightStack>

      <div class="example-group">
        <SubsectionTitle>Standalone</SubsectionTitle>
        <Standalone />
      </div>

      <div class="example-group">
        <SubsectionTitle>In a dial's caption slot</SubsectionTitle>
        <CaptionLabel>
          One entity, its name hidden (showNames=false) because the card title
          says it. Drag a dial: its caption follows.
        </CaptionLabel>
        <InSliders />
      </div>
    </SpacedStack>
  </div>
);
