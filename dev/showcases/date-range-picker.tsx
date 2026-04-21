import { type Component, createSignal } from "solid-js";
import {
  DateRangePicker,
  type DateRange,
  type DateRangePreset,
} from "../../src/components/DateRangePicker";
import { Stack } from "../../src/components/Layout/Stack";

const PRESETS: DateRangePreset[] = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const DAY_MS = 86_400_000;
const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

const debugBlock = {
  "margin-top": "8px",
  padding: "8px 12px",
  background: "rgba(255, 255, 255, 0.04)",
  "border-radius": "4px",
  "font-size": "12px",
  color: "var(--sui-text-secondary, #7aa8c0)",
  "font-family": "var(--sui-font-mono, monospace)",
  "white-space": "pre",
} as const;

const Debug = (props: { range: DateRange }) => (
  <div style={debugBlock}>
    {`start: ${props.range.start.toISOString()}\nend:   ${props.range.end.toISOString()}`}
  </div>
);

export const DateRangePickerShowcase: Component = () => {
  const initial: DateRange = { start: daysAgo(14), end: new Date() };
  const [withPresets, setWithPresets] = createSignal<DateRange>(initial);
  const [bare, setBare] = createSignal<DateRange>(initial);
  const [capped, setCapped] = createSignal<DateRange>({
    start: daysAgo(7),
    end: new Date(),
  });
  const [withTime, setWithTime] = createSignal<DateRange>(initial);

  return (
    <div class="component-section">
      <h2>DateRangePicker — Composite (Depth 2)</h2>
      <p class="text-meta">
        Owns CSS (DateRangePicker.css). Composes the upstream `Button` (Atomic)
        and `@kobalte/core/popover`. Internal `CalendarGrid`, `CalendarHeader`,
        `PresetButtons`, `TimeInputs` live as private files under the component
        directory and are NOT re-exported. Date math uses vanilla `Date` +
        `Intl.DateTimeFormat` — no Luxon / date-fns dependency.
      </p>

      <div class="example-group">
        <h3>With presets</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `presets` is caller-supplied. Each preset selects `[now - days, now]`.
        </div>
        <Stack>
          <DateRangePicker
            value={withPresets}
            onChange={setWithPresets}
            presets={PRESETS}
          />
          <Debug range={withPresets()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>No presets</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Without `presets` the preset row is suppressed — click days to pick
          start, then end.
        </div>
        <Stack>
          <DateRangePicker value={bare} onChange={setBare} />
          <Debug range={bare()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Max-range constraint (30 days)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `maxRangeDays={30}` disables days beyond the cap once an anchor is
          selected; preset selections are clamped to the same bound.
        </div>
        <Stack>
          <DateRangePicker
            value={capped}
            onChange={setCapped}
            presets={PRESETS}
            maxRangeDays={30}
          />
          <Debug range={capped()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Time-of-day controls</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Toggle "Set time" inside the popover to reveal the `HH:mm` inputs —
          the committed range then includes hours/minutes.
        </div>
        <Stack>
          <DateRangePicker
            value={withTime}
            onChange={setWithTime}
            presets={PRESETS}
          />
          <Debug range={withTime()} />
        </Stack>
      </div>
    </div>
  );
};
