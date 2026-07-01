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
  background: "var(--sui-bg-secondary)",
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
  const [tzLa, setTzLa] = createSignal<DateRange>(initial);
  const [tzNy, setTzNy] = createSignal<DateRange>(initial);
  const [tzUtc, setTzUtc] = createSignal<DateRange>(initial);
  const [custom, setCustom] = createSignal<DateRange>(initial);

  return (
    <div class="component-section">
      <style>
        {`.sui-drp-demo-custom-trigger {
            border-color: var(--sui-accent) !important;
            border-width: 2px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }`}
      </style>
      <h2>DateRangePicker — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (DateRangePicker.css). Wraps `@kobalte/core/popover` (matches
        the Combobox/Select/Tooltip/Toast/ThemedNumberInput Kobalte-wrapping
        pattern). Internal `CalendarGrid`, `CalendarHeader`, `PresetButtons`,
        `TimeInputs` live as private files under the component directory and are
        NOT re-exported. Date math uses vanilla `Date` + `Intl.DateTimeFormat` —
        no Luxon / date-fns dependency.
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

      <div class="example-group">
        <h3>Pinned timezone — America/Los_Angeles</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `timeZone="America/Los_Angeles"` pins the trigger label, month header,
          calendar-day highlighting, and committed time-of-day selections to LA
          — regardless of the browser's local TZ. Useful when the host app
          renders all other timestamps in a fixed TZ.
        </div>
        <Stack>
          <DateRangePicker
            value={tzLa}
            onChange={setTzLa}
            presets={PRESETS}
            timeZone="America/Los_Angeles"
          />
          <Debug range={tzLa()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Pinned timezone — America/New_York</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Same component, `timeZone="America/New_York"`. Viewed side-by-side
          with the LA picker above, the trigger labels and highlighted cells may
          differ by one calendar day at TZ boundaries — this is the correctness
          guarantee the prop provides.
        </div>
        <Stack>
          <DateRangePicker
            value={tzNy}
            onChange={setTzNy}
            presets={PRESETS}
            timeZone="America/New_York"
          />
          <Debug range={tzNy()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Pinned timezone — UTC</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `timeZone="UTC"` anchors all display and math to UTC — the
          deterministic choice for cross-region dashboards.
        </div>
        <Stack>
          <DateRangePicker
            value={tzUtc}
            onChange={setTzUtc}
            presets={PRESETS}
            timeZone="UTC"
          />
          <Debug range={tzUtc()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Custom trigger class (class-merge demo)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Custom `class` is APPENDED to the default `sui-drp__trigger` class —
          host overrides layer on top of default styling instead of replacing
          it. The demo class here adds a thicker accent border.
        </div>
        <Stack>
          <DateRangePicker
            value={custom}
            onChange={setCustom}
            presets={PRESETS}
            class="sui-drp-demo-custom-trigger"
          />
          <Debug range={custom()} />
        </Stack>
      </div>
    </div>
  );
};
