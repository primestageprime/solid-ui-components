// ============================================
// IntervalInput — Composite (Depth 2).
// Owns CSS (IntervalInput.css). Composes `ThemedNumberInput` + `Select`
// (both Atomic Primitives) plus the `Row` Layout primitive and the
// `TextUnits`/`TextLabel` Text curried variants; uses the shared
// `fieldWidthForChars` util (a data/util import, not a component import) to
// cap the number field's width the way `CurrencyInput` does.
//
// An "Every [#] [unit]" cadence control — a single row reading
// "Every  [3]  [weeks]". `value`/`onChange` carry a plain
// `{ every, unit }` object (not an accessor pair), matching how a caller
// keeps one signal for the whole cadence rather than two.
//
//   <IntervalInput
//     value={{ every: 2, unit: "week" }}
//     onChange={setCadence}
//   />
//
// Pure helpers (`clampEvery`, `unitLabel`, `defaultIntervalUnits`) are
// exported so the clamping/pluralisation rules are unit-testable without
// mounting the component (repo's "smallest tests prove shape" commandment).
// ============================================
import { type Component, Show, createMemo } from "solid-js";
import {
  ThemedNumberInput,
  type ThemedNumberInputProps,
} from "../ThemedNumberInput/ThemedNumberInput";
import { Select, type SelectOption } from "../Select/Select";
import { Row } from "../Layout/Row";
import { TextLabel, TextUnits } from "../Text/variants";
import { fieldWidthForChars } from "../../internal/fieldWidth/fieldWidth";
import { find, map } from "../../fn";
import "./IntervalInput.css";

/** The four cadence units this control ships with. */
export type IntervalUnit = "day" | "week" | "month" | "year";

/** The plain data shape this control edits — one signal, not two. */
export interface IntervalValue {
  every: number;
  unit: IntervalUnit;
}

/** One entry in the unit dropdown. */
export interface IntervalUnitOption {
  value: IntervalUnit;
  label: string;
}

export interface IntervalInputProps
  extends Pick<ThemedNumberInputProps, "disabled"> {
  /** Current `{ every, unit }` cadence. */
  value: IntervalValue;
  /** Called with the next `{ every, unit }` whenever either field changes. */
  onChange: (value: IntervalValue) => void;
  /**
   * Unit options. Defaults to all four (`day`/`week`/`month`/`year`) with
   * labels pluralised from the CURRENT `every` (`"week"` at 1, `"weeks"`
   * otherwise) via `unitLabel`/`defaultIntervalUnits`.
   *
   * When you pass your own `units`, their `label` strings are used
   * VERBATIM — they are not re-pluralised — since a caller providing
   * explicit labels has already decided what they should read.
   */
  units?: IntervalUnitOption[];
  /** Smallest allowed `every` (integers only). Default `1`. */
  min?: number;
  /** Optional group label rendered above the row. */
  label?: string;
  /** Form field name for the number input. Default `"interval-every"`. */
  name?: string;
}

const DEFAULT_MIN = 1;

/** Widest expected `every` is 3 digits (≤ 999); +4rem stepper/padding chrome
 *  matches CurrencyInput's convention (see fieldWidth.ts). */
const EVERY_WIDTH_REM = fieldWidthForChars(3, 4);

const UNIT_NOUNS: Record<IntervalUnit, string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

const ALL_UNITS: IntervalUnit[] = ["day", "week", "month", "year"];

/**
 * Pluralises a unit noun for the given `every` count: singular at exactly 1,
 * plural (`+"s"`) otherwise — including 0 and negative counts, which read
 * more naturally as plural ("Every 0 days").
 *
 * @example
 *   unitLabel("week", 1) // "week"
 *   unitLabel("week", 2) // "weeks"
 */
export function unitLabel(unit: IntervalUnit, every: number): string {
  const noun = UNIT_NOUNS[unit];
  return every === 1 ? noun : `${noun}s`;
}

/**
 * The default four unit options, labels pluralised for the given `every`.
 *
 * @example
 *   defaultIntervalUnits(1) // [{value:"day",label:"day"}, ...]
 *   defaultIntervalUnits(3) // [{value:"day",label:"days"}, ...]
 */
export function defaultIntervalUnits(every: number): IntervalUnitOption[] {
  return map(
    (unit: IntervalUnit) => ({ value: unit, label: unitLabel(unit, every) }),
    ALL_UNITS,
  );
}

/**
 * Clamps a raw numeric input to an integer `>= min`. `undefined` or `NaN`
 * (an in-progress clear/edit) falls back to `min` rather than propagating.
 *
 * @example
 *   clampEvery(2.7, 1)      // 3 (rounded)
 *   clampEvery(0, 1)        // 1 (floored at min)
 *   clampEvery(undefined, 1) // 1
 */
export function clampEvery(value: number | undefined, min: number): number {
  if (value === undefined || Number.isNaN(value)) return min;
  return Math.max(min, Math.round(value));
}

export const IntervalInput: Component<IntervalInputProps> = (props) => {
  const min = createMemo(() => Math.max(1, Math.trunc(props.min ?? DEFAULT_MIN)));
  const every = createMemo(() => clampEvery(props.value.every, min()));

  const unitOptions = createMemo<SelectOption[]>(() =>
    map(
      (u: IntervalUnitOption) => ({ value: u.value, label: u.label }),
      props.units ?? defaultIntervalUnits(every()),
    ),
  );

  const selectedOption = createMemo<SelectOption | null>(
    () =>
      find((o: SelectOption) => o.value === props.value.unit, unitOptions()) ??
      null,
  );

  const handleEveryChange = (raw: number | undefined) => {
    // ThemedNumberInput emits `undefined` while the field is mid-clear; don't
    // snap the value away from what the user is typing.
    if (raw === undefined) return;
    const next = clampEvery(raw, min());
    if (next === props.value.every) return;
    props.onChange({ every: next, unit: props.value.unit });
  };

  const handleUnitChange = (option: SelectOption | null) => {
    // Select can emit `null` (deselection); a cadence always needs a unit.
    if (!option) return;
    props.onChange({ every: props.value.every, unit: option.value as IntervalUnit });
  };

  return (
    <div class="sui-interval-input">
      <Show when={props.label}>
        <TextLabel>{props.label}</TextLabel>
      </Show>
      <Row class="sui-interval-input__row" gap="sm" align="center">
        <TextUnits>Every</TextUnits>
        <div
          class="sui-interval-input__number"
          style={{ "max-width": `${EVERY_WIDTH_REM}rem` }}
        >
          <ThemedNumberInput
            name={props.name ?? "interval-every"}
            value={every}
            onChange={handleEveryChange}
            min={min()}
            step={1}
            formatOptions={{ maximumFractionDigits: 0 }}
            disabled={props.disabled}
            aria-label="Every"
          />
        </div>
        <Select
          options={unitOptions}
          value={selectedOption}
          onChange={handleUnitChange}
          disabled={props.disabled}
          aria-label="Unit"
        />
      </Row>
    </div>
  );
};
