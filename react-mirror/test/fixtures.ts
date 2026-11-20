// The states the drift test renders each hand-ported base and dial in: one
// per branch of its markup, so every shape SUI can draw is compared.
type Props = Readonly<Record<string, unknown>>;

export interface Fixture {
  readonly name: string;
  readonly props: Props;
  readonly children?: string;
}

const noop = (): void => undefined;
const format = (n: number): string => `$${Math.round(n / 1000)}K`;
const labels = { remove: "Remove", restore: "Restore", new: "New" };

const slider = {
  domain: [0, 200_000],
  range: [40_000, 90_000],
  label: "Roofer",
};

const roofer = {
  id: "r1",
  label: "Roofer",
  old: 44_000,
  value: 63_000,
  range: [40_000, 90_000],
};
const gone = { ...roofer, value: null };
const dial = {
  entity: roofer,
  domain: [0, 200_000],
  height: 260,
  format,
  labels,
  dragStep: 1,
  keyStep: 1000,
  selected: false,
  onMeasure: noop,
  onMove: noop,
  onCommit: noop,
};
const members = [
  roofer,
  { ...roofer, id: "r2", old: 52_000, value: 52_000 },
  { ...roofer, id: "r3", old: null, value: 70_000 },
];
const group = {
  entity: {
    id: "g",
    label: "Roofer × 3",
    old: 48_000,
    value: 61_667,
    range: [40_000, 90_000],
  },
  members,
  groupLabel: "Roofer",
  open: false,
  onToggle: noop,
  onShift: noop,
  onSettle: noop,
  domain: [0, 200_000],
  height: 260,
  format,
  labels,
  dragStep: 1,
  keyStep: 1000,
  onMeasure: noop,
};

export const BASE_FIXTURES: Readonly<Record<string, readonly Fixture[]>> = {
  MarkedSlider: [
    { name: "a raise", props: { ...slider, prior: 44_000, value: 63_000 } },
    {
      name: "gone, active, two-line delta",
      props: {
        ...slider,
        prior: 44_000,
        value: null,
        deltaLabel: "−$44K\n(100%)",
        active: true,
      },
    },
    {
      name: "new, short, value text, class",
      props: {
        ...slider,
        prior: null,
        value: 63_000,
        deltaLabel: "+$1K",
        priorLabel: "$44K",
        valueText: "$63K",
        height: 200,
        class: "x",
      },
    },
    {
      name: "a prior label",
      props: { ...slider, prior: 44_000, value: 63_000, priorLabel: "$44K" },
    },
    {
      name: "a cut",
      props: { ...slider, prior: 80_000, value: 50_000, deltaLabel: "−$30K" },
    },
  ],
  Icon: [
    { name: "plain", props: { name: "plus" } },
    { name: "spinner", props: { name: "spinner", size: "xs" } },
    {
      name: "flipped chevron",
      props: { name: "chevron-right", size: "sm", flipped: true },
    },
    {
      name: "unflipped chevron",
      props: { name: "chevron-right", flipped: false },
    },
    {
      name: "solid, classed",
      props: { name: "check", variant: "solid", class: "c", title: "t" },
    },
  ],
  SliderField: [
    {
      name: "plain",
      props: { label: "Roofer amount", value: "$63K", onCommit: noop },
    },
    {
      name: "affixed and disabled",
      props: {
        label: "Rate",
        value: "42",
        prefix: "$",
        suffix: "/hr",
        disabled: true,
        onCommit: noop,
      },
    },
  ],
  MutationDial: [
    { name: "a plain dial", props: dial },
    {
      name: "selectable, selected",
      props: { ...dial, onSelect: noop, selected: true },
    },
    {
      name: "gone with restore",
      props: { ...dial, entity: gone, onRestore: noop },
    },
    { name: "gone without restore", props: { ...dial, entity: gone } },
    {
      name: "new",
      props: { ...dial, entity: { ...roofer, old: null }, onRemove: noop },
    },
    {
      name: "reset and delete",
      props: { ...dial, onReset: noop, onRemove: noop },
    },
    {
      name: "reset and delete, unchanged",
      props: {
        ...dial,
        entity: { ...roofer, value: 44_000 },
        onReset: noop,
        onRemove: noop,
      },
    },
    {
      name: "reset only",
      props: { ...dial, resetOnly: true, onReset: noop, onRemove: noop },
    },
    { name: "editable", props: { ...dial, onType: noop } },
    { name: "linked", props: { ...dial, onLink: noop, linked: true } },
    { name: "linkable", props: { ...dial, onLink: noop } },
    { name: "with a note", props: { ...dial, note: "2 new" } },
    { name: "with an empty note", props: { ...dial, note: "" } },
    { name: "readouts beside", props: { ...dial, readout: "beside" } },
  ],
  GroupDial: [
    { name: "closed", props: group },
    {
      name: "open, editable, resettable",
      props: { ...group, open: true, onType: noop, onReset: noop },
    },
    {
      name: "all the same, none new",
      props: { ...group, members: [roofer, { ...roofer, id: "r2" }] },
    },
  ],
};
