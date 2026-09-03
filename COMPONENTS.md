# Component Manifest

SolidJS UI component library. All components accept standard HTML attributes via spread props. Factory functions (`createX`) produce curried variants with baked-in defaults.

**Always prefer a curried variant over configuring a base component.** If no curried variant exists for your use case, propose one upstream rather than repeatedly passing the same props.

## Curried-only exports (read this first)

This library exports **only curried components**. A component you import exposes only props knowable at runtime or set per-client (data, ids, callbacks, content) — every visual/static decision (`variant`, `size`, `tone`, `glow`, `corners`, `align`, …) is baked at variant-definition time. The config-bearing **base** components are intentionally **not exported**.

If you reach for a base component and a config prop, you are doing it wrong. Do one of:

1. **Use a named curried variant** — e.g. `PrimaryButton`, `CompliantBadge`, `TightStack`, `LargeModal`, `InfoPanel`.
2. **Curry your own once** with the factory and reuse it — e.g. `const ToolbarButton = createButton({ variant: "ghost", size: "sm" })`. Bake the config in one place; never pass it at the call site.
3. If neither fits, **add a variant upstream** in the component's `variants.ts` rather than threading config through call sites.

Components with no design-config props (e.g. `CountChip`, `AppShell`, `AppMain`, `Page`, `Tooltip`, `ListItem`, `InlineChartErrorOverlay`) are exported directly — they are already effectively curried.

### Removed in 0.54.0 — `HUD*` base aliases

The deprecated `HUDSection`, `HUDPanel`, and `HUDList` aliases re-exported base components and have been removed. Migrate as follows:

| Removed export | Use instead |
|---|---|
| `HUDPanel` | a Panel variant (`InfoPanel`, `AccentPanel`, `DangerPanel`, `CompactPanel`, …) or `createPanel({ … })` for a custom config. A plain default panel is `createPanel({})`. |
| `HUDSection` | a Section variant (`CollapsibleSection`, `DecoratedSection`, `BorderedSection`) or `createSection({})` for a plain section. |
| `HUDList` | `ScrollList` (scrolling) or `createList({})` for a plain non-scrolling list. `ListItem` is unchanged and still exported. |

(`HUDModal`, `HUDTabs`, `HUDButtonGroup` already resolve to curried variants; `HUDPage`, `HUDListItem`, `createHUDPanel` are unchanged.)

## Theming

Components use `--sui-*` CSS custom properties for all colors, spacing, and visual tokens. The library ships two built-in themes:

- **`themes/default.css`** — Clean, neutral theme suitable for standard business applications.
- **`themes/hud.css`** — Sci-fi / heads-up-display theme with glow effects, scan lines, and angular decorations.

Import the bundled component CSS **and** one theme in your app entry point:

```ts
import "solid-ui-components/index.css"; // per-component bundled CSS
import "solid-ui-components/themes/hud.css"; // theme tokens + global baseline
```

Each shipped theme file (`default.css`, `hud.css`, `bronze.css`, `bronze-dark.css`)
starts with `@import "./_baseline.css";`, so importing one theme also pulls in the
global baseline layer — the page-level rules (`body` background/color, box-sizing
reset, native `button`/`input`/scrollbar styling, and all `.sui-*` component
classes) that `index.css` does NOT contain. **`index.css` alone is not enough:**
without a theme import the `<body>` stays unstyled (white background, unstyled
native controls).

To create a custom theme, define `--sui-*` variables in a CSS file and pull in the
baseline yourself:

```ts
import "solid-ui-components/themes/_baseline.css";
import "./my-tokens.css"; // your own :root { --sui-*: … }
```

The baseline (`themes/_baseline.css`) and every `themes/*.css` file are exported
via the package `exports` map. See the built-in themes for the full list of
available tokens.

### Spacing Scale

Both built-in themes expose an identical `--sui-space-*` scale for `padding`, `margin`, `gap`, `inset`, and positional offsets. The scale is a 4px base grid with explicit half-steps for off-grid values (6px, 10px) that recur often in real-world UI code.

| Token | Value | Typical use |
|-------|-------|-------------|
| `--sui-space-0` | `0` | Reset / no-space |
| `--sui-space-px` | `1px` | Hairline; prefer for borders/rules |
| `--sui-space-0-5` | `2px` | Tight dividers, sub-pixel rhythm |
| `--sui-space-1` | `4px` | Icon-to-label, chip inner padding |
| `--sui-space-1-5` | `6px` | Off-grid compact spacing |
| `--sui-space-2` | `8px` | Default small gap |
| `--sui-space-2-5` | `10px` | Off-grid medium spacing |
| `--sui-space-3` | `12px` | Form-control inner padding, row gap |
| `--sui-space-4` | `16px` | Section gutter, card padding |
| `--sui-space-5` | `20px` | Loose row spacing |
| `--sui-space-6` | `24px` | Page gutter, large panel padding |

Spacing does not vary by theme — only the typographic / decorative tokens do. Use literal `px` for border widths (`1px`, `2px`) and `var(--sui-clip-*)` for clip-path inset distances.

**Shared types** exported from the library root:

- `ColorVariant` — `"default" | "primary" | "danger" | "warning" | "success"`
- `CornerStyle` — `"clip" | "bracket" | "notch" | "round" | "none"`

---

## Patterns

Compositions the library does not ship as a component — because the reactive
model belongs to the consuming app — but which have a settled shape and a
working bench. Read the bench before rebuilding one of these; the behaviours
listed are each a bug if omitted, not polish.

### Cross-filtering breakdown tiles

**Bench:** `dev/showcases/workshop/cross-filtering.tsx` (dev harness → Workshop →
Cross-Filtering Tiles). Runs on static fixture data — no data layer to connect.

Several breakdown tiles over one row-grain fact, each grouping by its own
dimension, all sharing one filter. A row click toggles that member; every tile
and the metric row re-aggregate. The same filter is editable from a
`MultiSelectFilter` chip row. Composition is **AND across dimensions, OR within
one**.

Built entirely from existing exports — `SectionTable` (its `onRowClick` is a
behaviour prop, so interactive rows need no new component), `MultiSelectFilter`,
`MetricCard`, `WrapRow`/`TightStack`, `GhostButton`. **No SUI component owns the
filter state**: it is a signal in the consuming app, because filter state is
per-viewer and its persistence (URL, storage, none) is an app decision.

Four behaviours carry the pattern:

1. **Two-way toggle** — a row click adds the member, the same click again
   removes it. Chips and rows edit one filter, so they cannot disagree.
2. **Own-dimension exclusion** — a tile applies every active filter *except its
   own*. Without it a selected tile collapses to one row, and since toggle-off
   lives on the rows, the selection becomes unclearable.
3. **Rank before cap, then pin** — rank the full list, cap after, then append a
   selected member that fell below the cap **carrying its true rank**.
   Cap-then-rank silently drops the selection out of a capped tile, which then
   keeps showing unfiltered rows while everything else has narrowed.
4. **Empty means all** — no selection in a dimension is no filter on it. This is
   already `MultiSelectFilter`'s own convention, so no "all" pseudo-member is
   needed.

Active rows are marked **in the data** (a leading `›` glyph in the rank cell),
not by styling the row: there is no active-row visual for a plain table, and
adding one at the call site would be custom styling.

---

## Badge
- **StatusBadge** — Colored status pill with 5 compliance-themed variants. **The base is NOT exported — `import { StatusBadge }` does not work.** Key data props: `label`, `href`, `variant` (`compliant`|`violation`|`warning`|`pending`|`info` — data, deliberately not locked, so a runtime-driven status can still set it). Override prop (baked at definition time): `size` (`sm`|`md`). Factory: `createStatusBadge`. Curried Variants: `CompliantBadge`, `ViolationBadge`, `WarningBadge`, `PendingBadge`, `InfoBadge` (one per variant, default size), plus `SmStatusBadge` (small size baked, `variant` left to the caller — use this when the status comes from data). Use for: inline status indicators, compliance badges, optionally as links.
- **StatusLight** — Atomic. Small colored indicator dot (LED-style) with optional keepalive pulse animation. Key props: `variant` (`success`|`warning`|`danger`|`info`|`idle`), `size` (`sm`|`md`|`lg`), `pulse` (animates a slow expanding halo — use when the source is actively reporting), `label` (optional inline text rendered to the right). Honors `prefers-reduced-motion`. Uses `--sui-success`, `--sui-warning`, `--sui-danger`, `--sui-info`, `--sui-text-muted`. Use for: dispatcher liveness, connection state, daemon keepalive, sensor health.
- **CountBadge** — Composed (Depth 2). A tiny numeric pill for overlaying a trigger's corner. Composes `DigitRoller`, so the number **rolls** when it changes. Owns `CountBadge.css` (a deliberate Depth-2 exception — the corner-pill chrome is intrinsic styling no atomic variant expresses, same rationale as `CountChip`). Single non-danger tone (#2 Rule — one visual per component). Accepts standard `<span>` attributes via spread. **The roll requires the instance to survive count changes** — give it a stable position/key at the call site, never remount it. Key props: `count` (number). Exported type: `CountBadgeProps`. Use for: unread counts on a bell/inbox trigger, any corner-anchored numeric badge. Note: `NotificationCenter` already composes this — reach for `CountBadge` directly only when building your own trigger.

## BulkActionBar
- **BulkActionBar** — Composite (Depth 2). Composes `CountChip` + `PrimaryButton` (+ optional `GhostButton` for "Clear"). Owns a minimal structural CSS file (`position: sticky; bottom`, centered max-content strip, elevation) — a deliberate Depth-2 CSS exception for the stick-to-bottom geometry, same rationale as `Fab`. A multi-select action strip: a count chip ("N cells") on the left, a primary action on the right ("Align to baseline"), and an optional "Clear" ghost button. **Render it gated behind `<Show when={count > 0}>`** — it has no internal visibility logic. The host scroll/grid container needs `position: relative` so the bar sticks to its bottom edge. Zero-config call site — pass only data + callbacks; the noun auto-pluralizes (trailing `s` when `count !== 1`). Key props: `count` (number), `noun` (singular, e.g. `"cell"`), `actionLabel` (e.g. `"Align to baseline"`), `onAction` (`() => void`), `onClear?` (`() => void` — renders the Clear button when present), `disabled?` (greys the primary action while a bulk op is in flight). Exported type: `BulkActionBarProps`. Uses `--sui-bg-elevated`, `--sui-border-bright`, `--sui-border`, `--sui-radius-md`, `--sui-space-*`. Use for: one-row multi-select bulk actions over a grid (e.g. "Align N cells to baseline" on `/calibrate`), batch operations over any selection that isn't a `SelectableTable`.
  - Example:
    ```tsx
    import { BulkActionBar } from "solid-ui-components";
    import { Show } from "solid-js";

    // host container is position: relative
    <Show when={selected().size > 0}>
      <BulkActionBar
        count={selected().size}
        noun="cell"
        actionLabel="Align to baseline"
        onAction={alignSelected}
        onClear={() => setSelected(new Set())}
      />
    </Show>
    ```

## ConnectionStatus
A three-layer family for showing service liveness as a sparkline that tracks how stale a heartbeat is. Designed to be reassuring, not distracting: a healthy service draws a flat low line; an idle service sawtooths to a peak then resets; an errored service blinks red; an off service flat-lines at the top. Caller passes `lastHeartbeatAt` (the most recent heartbeat) and `timeoutMs` (when stale → disconnected). Each tick, the sparkline plots `(now - lastHeartbeatAt) / timeoutMs` clamped 0..1.

State derivation:
- `errorAt >= lastHeartbeatAt` (or no heartbeat yet) → **error** (red, blinks)
- `lastHeartbeatAt == null` → **disconnected/off** (grey, flat top)
- `now - lastHeartbeatAt >= timeoutMs` → **disconnected** (grey, flat top)
- otherwise → **connected** (green, line trending toward 0)

- **HeartbeatSparkline** — Atomic (Depth 1). Pure SVG rectangular sparkline. No timers, no business logic — caller feeds samples. Owns CSS. Key props: `state` (`connected`|`disconnected`|`error`), `samples` (number[] of 0..1, oldest first), `width` (default 48), `height` (default 12), `capacity` (window size, default 60), `pulse` (glow trailing dot). Honors `prefers-reduced-motion`. Uses `--sui-success`, `--sui-danger`, `--sui-text-muted`, `--sui-surface-sunken`, `--sui-border`. Use for: any "% of budget over time" sparkline (rate-limit headroom, queue depth, heartbeat freshness).
  - Example:
    ```tsx
    import { HeartbeatSparkline } from "solid-ui-components";
    // Caller-managed samples — each value is fraction-of-timeout consumed.
    <HeartbeatSparkline state="connected" samples={[0.05, 0.1, 0.05, 0.1]} width={120} height={16} />
    ```

- **LiveHeartbeatTrace** — Composed (Depth 2). Wraps `HeartbeatSparkline` with the timer + sample buffer + state derivation. Pushes a fresh sample on each tick, derives connection state from `lastHeartbeatAt` / `timeoutMs` / `errorAt`. Key props: `lastHeartbeatAt` (`number | Date | null`), `timeoutMs` (number), `errorAt` (optional), `tickMs` (default 1000), `capacity` (default 60), `width`, `height`, `pulseWhenConnected` (default true), `forceState` (escape hatch for fixtures/showcases). Use for: dropping a live heartbeat trace into a dense table cell or compact row without the surrounding label.
  - Example:
    ```tsx
    import { LiveHeartbeatTrace } from "solid-ui-components";
    import { createSignal, onMount, onCleanup } from "solid-js";

    const [beat, setBeat] = createSignal(Date.now());
    onMount(() => {
      const id = setInterval(() => setBeat(Date.now()), 1000);
      onCleanup(() => clearInterval(id));
    });

    <LiveHeartbeatTrace lastHeartbeatAt={beat()} timeoutMs={5000} width={120} height={16} />
    ```

- **ConnectionStatus** — Composed (Depth 3). Stacked indicator: name label on top, sparkline (or `StatusLight` dot in compact mode) beneath. No time-since text — just the trace, so a healthy service is reassuring rather than distracting. Composes `LiveHeartbeatTrace` + `StatusLight` + `TextLabel` + `Stack`. Key props: `name` (string), `lastHeartbeatAt`, `timeoutMs`, `errorAt`, `showSparkline` (default true; false → `StatusLight` dot), `sparklineWidth` (default 96), `sparklineHeight` (default 14), `tickMs` (default 1000). Use for: dispatcher / worker / service liveness rows in dashboards and HUDs.
  - Example:
    ```tsx
    import { ConnectionStatus, LooseWrapRow } from "solid-ui-components";
    import { createSignal, onMount, onCleanup } from "solid-js";

    const [healthy, setHealthy] = createSignal(Date.now());
    const [idle, setIdle] = createSignal(Date.now());
    const [problemBeat, setProblemBeat] = createSignal(Date.now());
    const [problemErr, setProblemErr] = createSignal(Date.now());

    onMount(() => {
      // Healthy worker: heartbeat every 1s, timeout 5s → stays low.
      const a = setInterval(() => setHealthy(Date.now()), 1000);
      // Idle: heartbeat every 3s, timeout 4s → sawtooths up to ~75% then resets.
      const b = setInterval(() => setIdle(Date.now()), 3000);
      // Problem: still beating, but errorAt is fresher than lastHeartbeatAt → blinks red.
      const c = setInterval(() => {
        const t = Date.now();
        setProblemBeat(t);
        setProblemErr(t + 1);
      }, 1000);
      onCleanup(() => { clearInterval(a); clearInterval(b); clearInterval(c); });
    });

    <LooseWrapRow>
      <ConnectionStatus name="worker-bee" lastHeartbeatAt={healthy()} timeoutMs={5000} />
      <ConnectionStatus name="idle"       lastHeartbeatAt={idle()}    timeoutMs={4000} />
      <ConnectionStatus name="problem"    lastHeartbeatAt={problemBeat()} errorAt={problemErr()} timeoutMs={5000} />
      <ConnectionStatus name="off"        lastHeartbeatAt={null}      timeoutMs={5000} />
    </LooseWrapRow>
    ```

## ServiceHealthDot
- **ServiceHealthDot** — Composite (Depth 2). 6px dot + name label for app-shell navbar liveness clusters. Alive: success color, opacity decays `max(0.15, 1 − (ageMs/staleThresholdMs) × 0.85)` as the heartbeat ages toward the staleness horizon. Dead (`ageMs` null/undefined or ≥ threshold): danger color at full opacity with a 1s pulse animation. Hover reveals a popover: service name + age label, a `HeartbeatSparkline` (state `"connected"` or `"error"`), and a `Xs ago / now` footer. **No internal clock** — pure render of caller-supplied `ageMs` + `samples`; the 1 Hz tick and history accumulation live in the caller. **No curried variant** — all props are data props. Key props: `name` (string), `ageMs` (number | null | undefined), `staleThresholdMs` (default 15 000), `samples` (number[] 0..1, oldest first). Uses `--sui-success`, `--sui-danger`, `--sui-text-muted`, `--sui-bg-primary`, `--sui-border`. Use for: navbar/app-shell service heartbeat indicators, dispatcher health clusters.
  - Example:
    ```tsx
    import { ServiceHealthDot } from "solid-ui-components";
    import { createSignal, onMount, onCleanup } from "solid-js";

    const [ageMs, setAgeMs] = createSignal<number | null>(null);
    const [samples, setSamples] = createSignal<number[]>([]);
    const THRESHOLD = 15_000;

    onMount(() => {
      let lastBeat = Date.now();
      // Simulate a heartbeat every 2s from an external source.
      const beatId = setInterval(() => { lastBeat = Date.now(); }, 2_000);
      // 1 Hz tick owned by the caller — push sample, update ageMs.
      const tickId = setInterval(() => {
        const age = Date.now() - lastBeat;
        setAgeMs(age);
        setSamples(prev => [...prev.slice(-29), Math.min(1, age / THRESHOLD)]);
      }, 1_000);
      onCleanup(() => { clearInterval(beatId); clearInterval(tickId); });
    });

    <ServiceHealthDot
      name="broker"
      ageMs={ageMs()}
      staleThresholdMs={THRESHOLD}
      samples={samples()}
    />
    ```

## ChartHeader
- **ChartHeader** — Composed (Depth 2). The standard chart title strip: mono accent title on the left, muted mono meta readout on the right, spread across the chart's top edge (Row + curried Text; owns zero CSS). Data-only call site. Key props: `title` (JSX.Element), `meta` (JSX.Element, optional). Use for: the header line above any chart (counts, windows, units).
  - Example:
    ```tsx
    import { ChartHeader } from "solid-ui-components";

    <ChartHeader title="Completion Timeline" meta={`${total} completions in window`} />
    ```

## Sparkline
- **Sparkline** — Atomic (Depth 1). Generic inline SVG polyline: arbitrary values → tiny chart strip. Two render modes: `line` (smooth polyline, default) and `sawtooth` (drops to baseline between samples — per-period values like batch throughput). Color is prop-driven (explicit CSS string or token), no trend-class coupling: for trend-colored sparklines use `TrendSparkline`; for 0..1 connection-health strips use `HeartbeatSparkline`. Owns CSS (structural geometry only). Key props: `values` (number[], oldest first, auto-scaled), `mode` (`"line"`|`"sawtooth"`), `color` (default `var(--sui-accent)`), `width` (default 80), `height` (default 20). Exported types: `SparklineProps`, `SparklineMode`. Use for: inline throughput/count strips where the caller owns the color semantics.
  - Example:
    ```tsx
    import { Sparkline } from "solid-ui-components";

    <Sparkline values={[0, 400, 600, 800, 700, 900]} mode="sawtooth" color="var(--sui-success)" />
    ```

## TrendSparkline
- **TrendSparkline** — Atomic (Depth 1). Tiny value sparkline (no axes). Series scaled into a fixed rect, stroked by trajectory — UP green, DOWN red, FLAT grey. Exports `trendOf(initial, final)` as the pure color rule (`final > initial` → `"up"`, `< initial` → `"down"`, equal → `"flat"`). Distinct from `HeartbeatSparkline` (which plots 0..1 connection health): `TrendSparkline` plots arbitrary numeric series — projected balances, rolling totals, any "which direction is this heading?" micro-visual. Owns CSS. Key props: `values` (number[], oldest first), `trend` (`"up"`|`"down"`|`"flat"`), `width` (default 120), `height` (default 24), `capacity` (max points; longer series downsampled, default 80), `yDomain` ([min, max] — shared scale for groups of sparklines; omit for per-series auto-scale). Exported types: `SparklineTrend`, `TrendSparklineProps`. Exported helper: `trendOf`. Use for: projected balances, running totals, any compact "where is this heading?" indicator alongside a value.
  - Example:
    ```tsx
    import { TrendSparkline, trendOf } from "solid-ui-components";

    const values = [10, 18, 15, 25, 22, 30];
    <TrendSparkline values={values} trend={trendOf(values[0], values[values.length - 1])} width={120} height={24} />
    ```

## DistributionSparkline
- **DistributionSparkline** — Atomic (Depth 1). The sparkline for a series whose SPREAD matters, not just its direction: a solid box for min..max filled with the direction shading, two dashed rules for the percentile band (always inside the box — a percentile cannot escape the values it came from), a hairline at the mean, and the series itself clipped to the plot. Distinct from `TrendSparkline`, which answers only "which way is this heading" and is the right choice when that is the whole question. Owns CSS. **`yDomain` is required and is DATA, not visual config**: auto-scaled, every range box fills its rect and the encoding says nothing — the picture only means something when a whole set of sparklines shares one domain. What counts as "the set" (all sources? the filtered ones? one source over time?) is a modelling decision the CLIENT owns; the component takes the answer rather than guessing it. **Responsive with no size prop**: fills its container in both axes and stretches, so it absorbs height from its row and width from its column — one component serves a 28px table row and a 120px dashboard tile. Strokes are non-scaling, so a wide short cell does not produce fat horizontals and hairline verticals. Marks thin themselves out via container queries as space runs out (percentile rules below 100px wide or 40px tall, mean below 60px/24px) — four horizontal marks in a table row is mud. Key props: `values` (number[], oldest first), `yDomain` ([min, max], required), `band` ([lo, hi] percentiles, default `[0.05, 0.95]`), `marks` (`{ range, typical, mean }`, all default true), `capacity` (max points; longer series downsampled, default 80). Exported types: `DistributionSparklineProps`, `DistributionSparklineDataProps`, `DistributionMarks`, `DistributionTrend`. Exported helpers: `p95DomainOf` (pooled percentile band + padding — the common shared-axis rule), `extentDomainOf` (true extremes, nothing clipped), `percentileOf`, `distributionTrendOf`. Factory: `createDistributionSparkline`. Curried variant: `P95Sparkline`. Use for: a dashboard tile, table column or definition list where the reader needs to know how wide the spread is and where the series usually sits, not just where it ended.
  - Example:
    ```tsx
    import { P95Sparkline, p95DomainOf } from "solid-ui-components";

    // ONE domain for the whole set — the caller decides what the set is.
    const axis = p95DomainOf(sources.map((s) => s.values));

    <For each={sources}>
      {(s) => <P95Sparkline values={s.values} yDomain={axis} />}
    </For>
    ```

## ConversationTree
- **ConversationTree** — Pure Composite (Depth 2). Composes `ConversationStack` (Layout Curried Variant) + `LabeledDivider` (semantic alias `DateDivider` available) + `ThreadGroup` + `ParticipantAvatar` + `ParticipantNameLabel` + `ParticipantTimeLabel` + `MessageBubble` + `Duration`. Owns zero CSS and zero inline `style={}` — visual styling lives in the composed Primitives. Multi-participant message thread, optionally tree-structured via `replyToId`. Deterministic per-participant color (HSL hash from `id`, override with `Participant.color`); fallback initials avatar (override with `avatarUrl`); consecutive same-author messages within `groupWithinMs` (default 5min) fold into a single header+body block; day-change or gap > `absoluteAfterMs` (default 1h) inserts a `LabeledDivider` ("Today, 3:14 PM" / "Yesterday, 9:02 AM" / "Mar 4, 11:30 AM"); per-bubble full timestamp on hover via native `title`. Threaded replies indent (`threaded`, default true) with a `ThreadGroup` left rail colored by the replying author. When `currentUserId` matches a participant, that participant's `ThreadGroup` + `MessageBubble` flip to `variant="self"` (right-aligned, accented). Long bubbles collapse behind a (more…) toggle (`clampLines` default 5; `maxLines` default 20). Key props: `participants` (`Participant[]`), `messages` (`ConversationMessage[]` with `id`, `participantId`, `text`, `timestamp`, optional `replyToId`), `groupWithinMs`, `absoluteAfterMs`, `threaded`, `now` (reference for relative time, default `Date.now()`), `currentUserId`, `clampLines`, `maxLines`, `onMessageClick`. Use for: code review threads, ops incident timelines, multi-actor decision logs, team status posts.
  - Example:
    ```tsx
    import { ConversationTree, Participant, ConversationMessage } from "solid-ui-components";

    const participants: Participant[] = [
      { id: "peter",  name: "Peter Stradinger" },
      { id: "alex",   name: "Alex Chen" },
      { id: "morgan", name: "Morgan Reyes", color: "#e0a14a" }, // explicit color
    ];

    const messages: ConversationMessage[] = [
      { id: "1", participantId: "peter",  timestamp: Date.now() - 3 * 3600_000,
        text: "Should we ship the new heatstream rollup before the demo?" },
      { id: "2", participantId: "alex",   timestamp: Date.now() - 2.9 * 3600_000,
        text: "I'd hold — the partial-status edge case isn't covered.", replyToId: "1" },
      { id: "3", participantId: "morgan", timestamp: Date.now() - 2.8 * 3600_000,
        text: "Agreed. Demo path doesn't hit it but support will.",     replyToId: "2" },
    ];

    <ConversationTree participants={participants} messages={messages} />
    ```
- **ThreadGroup** — Atomic Primitive (Depth 1). Owns `ThreadGroup.css`. The structural block for one author-grouped message thread inside a conversation: depth-padded left-bordered row with an avatar on the leading edge and a body column carrying a header + bubble stack. `variant="self"` reverses the avatar/body axis. The required `depth` prop drives left padding (24px × depth, when `threaded`), and the required `color` paints the left border at depth > 0; both are applied via inline style inside the Primitive (the allowed location for data-driven inline style). Key data props: `depth` (number), `color` (CSS color string), `variant` (`self` | `other`), `avatar` (JSX slot), `header` (JSX slot), `bubbles` (JSX slot). Override prop: `threaded` (default `true`). Factory: `createThreadGroup`. Curried Variants: `IndentedThreadGroup` (`threaded: true`), `FlatThreadGroup` (`threaded: false`). Uses `--sui-space-1`, `--sui-space-2`. Use for: per-author message blocks within a conversation, or any nested-thread structural row that needs depth/accent affordances.
  - **Not built on `NestedList` — deliberately (2026-08-04).** `ThreadGroup`'s `depth × 24px` is a *visual* inset that conveys nothing to assistive tech; `NestedList` is a *semantic* hierarchy primitive (`role=listitem` + `aria-level`). Re-expressing this on top of it would mean either widening `NestedList` with a configurable step to accommodate this one legacy consumer (Rule Zero: never widen an API to fit an existing call site) or adopting the 12px step, which silently changes every shipped `ConversationTree` render. Neither is non-breaking, so the duplication stands. The same reasoning covers `IndentedGhostRow`'s one-step inset and `Section`'s `indent` — both are binary insets, not recursive depth. **New hierarchies use `NestedList`; do not add a fourth mechanism.**
- **ParticipantAvatar** — Atomic Primitive (Depth 1). Owns `ParticipantAvatar.css`. Circular avatar — image when `imageSrc` is set, otherwise the supplied `initials` on a tinted disc (background paints from the `color` prop, which the Primitive applies inline). Key data props: `initials?`, `imageSrc?`, `color?`, `alt?` (image branch only; defaults to decorative `""`). Override prop: `size` (`sm`/20px | `md`/24px | `lg`/36px, default `md`). Factory: `createParticipantAvatar`. Curried Variants: `SmAvatar`, `MdAvatar`, `LgAvatar`. Uses `--sui-surface-sunken`, `--sui-space-*`. For roster-consistent `initials`, derive them with `deriveInitials(names)` (see below) rather than hand-picking per avatar. Use for: per-participant identity affordances in conversation rows, member lists, mention chips.
- **ParticipantNameLabel** — Atomic Primitive (Depth 1). Owns `ParticipantNameLabel.css`. The author-name pill rendered above a message group: fixed weight/size/nowrap typography, with per-participant `color` applied inline (data-driven). Key data props: `color?`, `children` (the name). Factory: `createParticipantNameLabel` (no overrides locked yet). Use for: author names inside `ThreadGroup` headers, mention surfaces, anywhere a colored participant name needs consistent typography.
- **ParticipantTimeLabel** — Atomic Primitive (Depth 1). Owns `ParticipantTimeLabel.css`. The relative-time caption rendered beside a participant name in a message-group header: small, faded, non-selectable cursor. Key data props: `title?` (full absolute timestamp tooltip), `children` (the relative-time text — typically a `<Duration>` + `" ago"`). Factory: `createParticipantTimeLabel` (no overrides locked yet). Use for: "5m ago" / "2h ago" captions in conversation headers.
- **MessageBubble** — Atomic Primitive (Depth 1). Owns `MessageBubble.css`. A single chat bubble with optional line clamping and a `(more…)` / `(less)` toggle that appears only when the rendered text actually overflows (measured at mount via `scrollHeight`/`clientHeight` and re-measured on `ResizeObserver`). `bg` and `textColor` apply inline so the consumer can drive per-participant tints. `clampLines` and `maxLines` flow into the bubble as `--sui-message-bubble-clamp` / `--sui-message-bubble-max` custom properties on the text node. Key data props: `bg?`, `textColor?`, `title?`, `onClick?`, `children`. Override props: `variant` (`self` | `other`), `clampLines` (default `5`), `maxLines` (default `20`). Factory: `createMessageBubble`. Curried Variants: `SelfBubble` (`variant: "self"`), `OtherBubble` (`variant: "other"`). Uses `--sui-surface-sunken`, `--sui-message-bubble-clamp`, `--sui-message-bubble-max`. Use for: chat bubbles, comment threads, any per-message text container that needs overflow-aware clamping.
- **LabeledDivider** — Atomic Primitive (Depth 1). Owns `LabeledDivider.css`. Horizontal rule with a centered text label — the rule segments are pseudo-elements on either side of the label. `aria-label` defaults to the string form of `label` when supplied. Key data props: `label?` (JSX or string), `aria-label?`, plus native `<div>` attributes. Factory: `createLabeledDivider` (no overrides locked yet). Curried Variants: `DateDivider` (semantic alias for date-style separators between conversation groups). Uses `--sui-border`, `--sui-text-muted`. Use for: day-change or large-gap separators in conversation streams, named section breaks in vertical lists.

## Button
- **Button** — Multi-variant button with loading spinner. Key props: `variant` (9 values, see below), `size` (`sm`|`md`|`lg`), `loading`, `active`. Use for: all clickable actions. Disables automatically when loading. The `active` prop applies a selected/pressed visual state (useful in ButtonGroup toggle patterns).
  - Variants:
    - `default` — neutral action; elevated background, bordered
    - `primary` — filled accent; the main call-to-action
    - `secondary` — neutral/supporting filled action (grey palette); pair with `primary`
    - `danger` — destructive action; red-themed, outlined
    - `warning` — amber-informational action (NOT destructive); distinct from `danger` in both hue (amber vs red) and intent (attention/caution vs destruction)
    - `ghost` — transparent until hover; for low-emphasis chrome actions
    - `outlined` — transparent fill with accent border + text; mid-emphasis
    - `text` — link-like; no border, no fill, accent text only
    - `icon-only` — 1.4rem square, accent-colored glyph, no border or fill; pair with an icon child
- **PrimaryButton / SecondaryButton / DangerButton / WarningButton / GhostButton / OutlinedButton / TextButton / IconOnlyButton / SmallPrimaryButton / SmallDangerButton / SmallGhostButton / SmallOutlinedButton / SmallWarningButton / LargePrimaryButton** — Pre-configured curried variants via `createButton()`. Use for: avoiding repetitive variant/size props. Note: these exports carry explicit `Component<ButtonDataProps>` annotations in `variants.ts` for pnpm/github-dep portability — without the annotation, `vite-plugin-dts` can inline solid-js paths through pnpm's ephemeral build-store temp dir (TS2742), stripping the declarations from the shipped `.d.ts` and producing TS2305 downstream. The same annotations were subsequently applied to the Cell variants (`3152ef7`) and the Layout variants (`0c1dba4`).

## ButtonGroup
- **ButtonGroup** — Button arrangement container. Key props: `orientation` (`horizontal`|`vertical`), `gap` (`none`|`sm`|`md`|`lg`), `bordered`. Use for: grouping related buttons, toggle-style button groups (use Button's `active` prop for selection state).

## Fab
- **Fab** — Composite (Depth 2). Composes `Button` + `Icon` (both Depth-1 atomics). Owns a minimal structural CSS file (circle / fixed 56px / elevation) — a deliberate exception to "Depth 2 = zero CSS" because the float/circle/size geometry is structural and not expressible as a Button variant. Floating action button: round 56px, default color (Button's default variant), placement-agnostic. On hover the icon adopts the accent color for free via Button's default hover. Key props: `icon` (`IconName`), `label` (required — used as both `aria-label` and `title`; the FAB renders no visible text). All standard `<button>` attributes pass through. Has `createFab` factory for curried variants. Use for: primary floating actions anchored to a container corner.
  - **AddFab** — Curried variant via `createFab({ icon: "plus" })`. Call site provides only `label` and callbacks — no presentational props. Use for: floating "add item" actions.
    - Example:
      ```tsx
      import { AddFab } from "solid-ui-components";

      <AddFab label="Add item" onClick={handleAdd} />
      ```

## Card
- **RemovableItemCard** — Composite (Depth 2). Composes `InteractiveCard` (Surface curried variant) + `SpreadRow` (Layout curried variant) + `FlexLabel` (Text curried variant) + `Button` (Atomic Primitive). Interactive card displaying a named item with title, optional remove button, and details slot. Key props: `title`, `active`, `onRemove`, `details`. Use for: selectable list items.

## Placeholder
- **Placeholder** — Composite (Depth 2, owns CSS). A themed "fill me in" box for section/tile SKELETONS during the sections-first build phase, before real components land — it shows how pieces will ARRANGE without inventing throwaway markup. Owns only appearance + width/min-height (no flex/grid geometry — centering comes from the composed `CenteredStack`, label from `TextSublabel`), so it stays layout-pure. Two behaviour axes plus tile-size presets are baked into curried variants (the raw `fit`/`multiline`/`size` props on the base are escape hatches): `FitPlaceholder` (shrinkwraps to its label, single line — chips/tags), `FillPlaceholder` (fills width, single line — bars/inputs), `BlockPlaceholder` (fills width, tall block — paragraphs/content), and the tile presets `SmallPlaceholder` (60px), `MediumPlaceholder` (120px, KPI tiles), `LargePlaceholder` (200px, chart/table tiles). Data prop: `label`. Factory: `createPlaceholder`. Type: `PlaceholderDataProps`, `PlaceholderProps`, `PlaceholderSize`. Use for: skeleton dashboards / section stubs while composing a page before the real content exists.

## ChartCanvas
- **ChartCanvas** — Atomic Primitive (Depth 1). Owns `ChartCanvas.css`; no library-component imports. A positioned container wrapping a Chart.js `<canvas>` — replaces the hand-rolled `<div style={{height}}><canvas ref/></div>` pattern that Chart.js consumers repeat. The container owns `position: relative` + `width: 100%`; the chart-area **height is baked per curried variant** (`createChartCanvas({ height })`) and applied inline by the primitive (a static variant decision, not a call-site override). The relative positioning establishes the containing block for an optional **overlay slot** passed as `children` — typically an `InlineChartErrorOverlay` gated behind a `<Show>` to cover the canvas when data is unavailable. Wire your Chart.js instance to the canvas via the forwarded `ref`. No explicit canvas dimensions are set — Chart.js (`responsive: true, maintainAspectRatio: false`) sizes the canvas to the container's determinate height. **Curried-only exports** (the config-bearing base is not exported): `createChartCanvas({ height })` factory + `ChartCanvasMd` (240px), `ChartCanvasLg` (300px), `ChartCanvasMlg` (350px), `ChartCanvasXl` (420px). `height` is a **number of px** — the raw-CSS-string form was removed in 0.130.0 (ADR 0003: geometry props are semantic, not CSS strings), so a viewport-relative height needs a `class` on the container instead. Data props at the call site: `ref` (canvas ref callback) + optional `children` (overlay slot); standard `<div>` attributes (`class`, `id`, `data-*`, aria) pass through to the container. Exported type: `ChartCanvasDataProps`. Owns no theme tokens (purely structural — colours come from the chart and the optional overlay). Use for: any Chart.js chart that previously lived in a height-styled wrapper div.
  - Example:
    ```tsx
    import { ChartCanvasMd } from "solid-ui-components";
    import { InlineChartErrorOverlay } from "solid-ui-components";
    import { Show, onMount } from "solid-js";
    import Chart from "chart.js/auto";

    let canvasRef: HTMLCanvasElement | undefined;
    onMount(() => {
      if (canvasRef) new Chart(canvasRef, { /* type, data, options */ });
    });

    <ChartCanvasMd ref={(c) => (canvasRef = c)}>
      <Show when={!hasData()}>
        <InlineChartErrorOverlay title="No data" subtitle="Nothing to plot for this range" />
      </Show>
    </ChartCanvasMd>
    ```
  - Need a height the three variants don't cover? Curry your own once and reuse it — `const ChartCanvasTall = createChartCanvas({ height: 520 });` — rather than passing a height at the call site.

## DagChart
- **DagChart** — SVG directed acyclic graph with dagre-computed layout. Key props: `nodes` (array of `DagNode` with `id`, `label`, `status` (`ColorVariant`), optional `metadata`, optional `sublabel`, optional `avatar`), `edges` (array of `DagEdge` with `source`/`target`), `onNodeClick`, `direction` (`TB`|`LR`), `height`. Nodes render as rounded rects colored by status. When `avatar` is provided, a circular 20px image renders left-aligned inside the node and the label shifts right. When `sublabel` is provided, muted smaller text renders below the label. Edges are directed paths with arrowheads. SVG auto-sizes viewBox to fit all content. Uses `--sui-*` CSS variables. Exported types: `DagNode`, `DagEdge`, `DagChartProps`. Use for: task dependency graphs, workflow DAGs, pipeline visualization.

## DateAxis
- **DateAxis** — Atomic (Depth 1). Cadence-generic horizontal cell ribbon. Pass any `Cell[]` produced by the exported helpers (`dailyCells`, `weeklyCells`, `monthlyCells`, `hourlyCells`) or a custom array, plus a `renderCell` function. The axis owns the scroll container, the selected-cell highlight, the today highlight (the cell whose `[start, end)` contains `today`), and click/keyboard activation. Key props: `cells` (`C[]` where `C extends Cell`), `selected?` (number index), `today?` (`Date`), `cellWidth?` (default `40`), `onCellClick?` (`(index, cell) => void`), `renderCell` (required), `scrollableRef?` (callback receiving the scroll container, used by `ScrubChart` to subscribe to scroll position). When `selected` is provided, the axis scrolls smoothly to centre it (skipped while the user is actively panning — a recent-scroll-delta check). `DateAxisCellContext` passed to `renderCell` = `{ isToday, isSelected, index }`. The `Cell` time-bucket type lives in `./components/DateAxis` and is exported from the package root as **`DateAxisCell`** (the bare name `Cell` is already taken by the table-cell component). Exported pure helpers: `dailyCells`, `weeklyCells`, `monthlyCells`, `hourlyCells`, `isSameCalendarDay`, `dayCellContent`, `dayCellContext`. Exported types: `DateAxisProps`, `DateAxisOverrides`, `DateAxisDataProps`, `DateAxisCellContext`, `DayCellContext`. Uses `--sui-accent`, `--sui-border`, `--sui-text-muted`, `--sui-text-secondary`, `--sui-radius-md`, `--sui-font-family`. Use for: scrubber/date-header ribbons, per-cell heatmaps at any cadence, linked time-axis controls above a graph.
  - **createDateAxis factory** — `createDateAxis({ cellWidth })` returns a curried `Component<DateAxisDataProps<C>>` with the one presentational override frozen.
  - **DailyDateAxis** — Curried day-cell variant. Restores the original ergonomics: takes `start: Date`, `end: Date`, optional `selected: Date` and `onDayClick: (day: Date) => void`, plus an optional `renderDay` whose `DayCellContext` includes `isFirstOfMonth` / `isLastOfMonth`. Use for the common day-cell case so you don't have to wire `dailyCells(...)` + index mapping yourself.
  - Example:
    ```tsx
    import { DailyDateAxis } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const [selected, setSelected] = createSignal<Date>(new Date("2026-05-27"));
    <DailyDateAxis
      start={new Date("2026-05-01")}
      end={new Date("2026-07-14")}
      selected={selected()}
      onDayClick={setSelected}
    />
    ```
  - Bare-DateAxis example with a custom renderer:
    ```tsx
    import { DateAxis, dailyCells, dayCellContext, type DateAxisCell } from "solid-ui-components";

    const cells = dailyCells(new Date("2026-05-01"), new Date("2026-07-14"));
    <DateAxis
      cells={cells}
      today={new Date("2026-05-27")}
      renderCell={(cell, ctx) => {
        const dayCtx = dayCellContext(cell, ctx);
        return <MyCashflowCell day={cell.start} ctx={dayCtx} />;
      }}
    />
    ```

## ScrubChart
- **ScrubChart** — Composite (Depth 2). Composes `DateAxis` (Atomic) + a user-supplied chart slot. Renders the chart at **linear** scale (every cell the same pixel pitch — `width / cells.length`) and draws a translucent **window** rect over the slice of cells currently visible in the DateAxis viewport. Classic overview + detail: the chart is the minimap, the axis is the zoomed-in detail view. Generic over `C extends Cell`; consumers attach payload to each cell and read it back inside `renderChart`. Scrubbing supports axis-cell click and drag-on-chart; linear pitch means each pointer move maps directly to one cell — no anchored layout, no tween. The axis auto-scrolls to keep the selected cell centred, so the window-band tracks the selection. Key props: `cells: C[]`, `selected: number`, `onScrub: (index, cell) => void`, `renderChart: (ctx) => JSX.Element`, `renderCell` (forwarded to the inner DateAxis), `chartHeight?` (default `200`), `cellWidth?` (default `40`, the axis cell width), `today?`, `showGridlines?` (opt-in, default `false` — draws a horizontal rule across the plot at every y-axis tick, the same shape `Chart`'s `Grid` slot draws: solid `--sui-border`, 1px, never dashed. The rules use the SAME tick set as the y-axis labels, so a line never sits where no label is, and they paint BENEATH the `renderChart` series. Horizontal only; no effect without `yDomain`), `highlights?` (opt-in, default none — `ScrubChartHighlight[]`, one shaded band per entry: `{ from, to, class? }` where `from` and `to` are CELL INDICES, both ends INCLUSIVE and covering the whole cell. Bands paint in the BOTTOM layer of the frame — beneath the gridlines and beneath the `renderChart` series — so a band backs the data instead of dimming it, unlike the window band above it. ScrubChart clamps both ends to the cell range and swaps them when `from > to`, so a band computed from live data cannot draw outside the plot. Bands render in array order, so a later band paints over an earlier one. Style one band through its own `class` — it always wins, because the faint neutral default rides on the rect as a presentation attribute rather than as a rule on the shared base class `.sui-scrub-chart__highlight`, so stylesheet order cannot decide the colour. Themes move the default through `--sui-scrub-chart-highlight-fill` and `--sui-scrub-chart-highlight-opacity`. Vertical extent is always the full plot — for a band bounded in Y see `CashflowBalanceSeries.fill`). `yFitDomain?` (opt-in, default none — `(from, to) => [number, number] | null`, the Y-DOMAIN of a cell range in data units. ScrubChart calls it with the VISIBLE window in `"visible"` mode and with the WHOLE cell range (`[0, cells.length - 1]`) in `"series"` mode; both ends are INCLUSIVE cell indices, matching `ScrubChartHighlight`. The callback exists because `renderChart` is a slot — the chart never sees the values, so the caller states the extent, and one array could not serve a chart that draws two series. Return the RAW extent: ScrubChart pads it by `yFitMargin`, snaps it with `nice()`, then applies `yFitPin`. Returning `null` falls back to `yDomain`. Precedence for the ONE effective domain that drives the ticks, the labels, `yToPlot`, `yAxisWidth` and `showGridlines`: `yFitDomain` when set and non-null, else `yDomain`, else no y-axis. Setting this prop also renders the fit control — ONE small icon button in the chart's AXIS ORIGIN CORNER: in the y-axis label column, left of `plotLeft`, and CENTRED on the x-axis tick labels. It is a plain `<button>`, not `Button`: at rest it is the BARE GLYPH, with no fill, no border and no ring, and it strokes in `--sui-accent` — the same token the default series line takes, so the control names the line it rescales. Hover draws a small rounded border INSIDE the button, 20px against the 26px hit target, because a pseudo-element carries it; the target itself stays 26px for a pointer and for a keyboard. `:focus-visible` keeps an outline, so the affordance is not hover-only. It reserves NO row of its own. The x-axis row grows from its 22px label height to the button's 28px footprint, which costs the plot 6px. The DEFAULT `yAxisWidth` grows to 38px — that footprint plus a 10px GUTTER. The gutter moves the y tick labels right, which leaves the button clear of them; the frame hides its overflow, so the button cannot move left instead. An explicit `yAxisWidth` is used as given and a narrow one clips the control. With `xTickCadence="none"` there is no label row, so the footprint IS the row. Levelling the button on the x labels lifts its top edge a few px ABOVE `plotBottom`, where the lowest y tick sits. ScrubChart therefore BOTTOM-ALIGNS the lowest y label on its own gridline instead of centring it there, so the label's whole line box clears the button; the gridline and the tick stub do not move. The same clamp holds a label off the frame's top edge, and the two bounds cannot fight — they cross only in a frame shorter than one label, and the label then centres in the room it has. The button covers no data and never intercepts the pan gesture. The button shows the ACTION a click performs, not the current mode: under `"visible"` it draws `zoom-out` and names itself "Fit to all", and under `"series"` it draws `zoom-in` and names itself "Fit to visible". It carries no `aria-pressed` — this is a switch between two named modes, not a pressed toggle), `yFitMargin?` (default `0.08` — fraction of the fitted extent added above and below a FREE end. A pinned end takes no margin), `yFitPin?` (opt-in, default none — `{ min?, max?, visible?: { min?, max? }, series?: { min?, max? } }`. A pinned end ignores the fitted extent, the margin and the snap, and renders EXACTLY as given; the free end still gets all three, so the ticks read 0, 20, 40 rather than 0, 17.3, 34.6. `min` / `max` apply to BOTH modes and a mode key overrides them for that mode only, resolved as `yFitPin[mode]?.min ?? yFitPin.min`. Two pinned ends are used as given, with no padding and no snap. The pin is a PROP rather than the caller's job because the callback returns a raw extent that ScrubChart pads afterwards — a caller who returned 0 as its min would watch the margin push it below zero), `yFitBounds?` (opt-in, default none — `Partial<Record<"visible" | "series", { min?, max? }>>`, one entry per y-scale mode. A bound only WIDENS the fitted domain: the low end takes `Math.min(fitted min, min)` and the high end takes `Math.max(fitted max, max)`. Data outside the bound therefore stays on the plot, which is what separates it from `yFitPin` — a pin OVERRIDES an edge and clips that data away. A series of 300..900 bounded at `{ min: 0 }` draws 0..900, and the same bound on a series of -50..900 draws -50..900. The bound applies LAST, after `yFitMargin` and after the `nice()` snap, so a bound of 0 puts the floor on exactly zero while the opposite end keeps its snap. A mode with no entry keeps the domain it fitted), `yScaleMode?` / `onYScaleModeChange?` (`"visible" | "series"` — controlled mode. Omit `yScaleMode` and ScrubChart owns the signal, starting at `"visible"`). EXPAND: `chartHeightExpanded?` (opt-in, default none — the height in px the chart grows to, and THE MASTER SWITCH for the expand control. Setting it draws ONE small chevron in the bottom-RIGHT corner of the frame, opposite the y-fit button, and a click moves the frame between `chartHeight` (the collapsed height) and this one. Leave it unset and the chart keeps `chartHeight` and draws no chevron. The chevron mirrors the y-fit button exactly: same 26px hit target, same 2px inset, same bare glyph in `--sui-accent`, same hover border and focus ring, and the same line on the x-axis row, because both take the shared classes `.sui-scrub-chart__corner` and `.sui-scrub-chart__corner-btn`. Only the edge differs, so the two coexist on one chart. Each button also carries a name of its own — `.sui-scrub-chart__y-fit-btn` and `.sui-scrub-chart__expand-btn` — as the hook a consumer overrides one of them with. The chevron shows the STATE and the direction a click moves the frame: `chevron-down` collapsed, named "Expand chart", and `chevron-up` expanded, named "Collapse chart". Like the y-fit button it reserves no row of its own; the x-axis row grows to the same 28px footprint), `expanded?` / `onExpandedChange?` (`boolean` — controlled state. Omit `expanded` and ScrubChart owns the signal, starting COLLAPSED, and `onExpandedChange` reports every click either way), `expandTransition?` (default `240` ms, `false` jumps — the time the frame takes to reach the other height. ONE height accessor drives the plot span, the axis rows, the window band and the `viewBox` together, so the whole chart eases with the frame rather than jumping inside it. The easing is the same exponential approach the fitted y-domain takes, and a reader who sets `prefers-reduced-motion: reduce` gets the new height at once. No effect without `chartHeightExpanded`, so a caller that moves `chartHeight` itself keeps the jump it has always had). The `ScrubChartContext` passed to `renderChart` exposes `cellToX(i)`, `cellBounds(i)`, `dayPitch`, `selected`, `cells`, `windowCells` (`[firstIdx, lastIdx]`), `windowBounds` (`[leftX, rightX]`), `width`, `height`. Exported types: `ScrubChartProps`, `ScrubChartContext`, `ScrubChartHighlight`, `ScrubChartOverrides`, `ScrubChartDataProps`, `ScrubChartYScaleMode`, `ScrubChartYFitPin`, `ScrubChartYFitBound`. Theme tokens: `--sui-accent`, `--sui-border`, `--sui-bg-elevated`, `--sui-bg-base`, `--sui-radius-md`, plus override CSS variables `--sui-scrub-chart-window-fill` and `--sui-scrub-chart-window-stroke` for the window band's colours. Use for: linked chart + axis pairings where the chart needs to show the big picture while the axis is the user's zoomed-in detail view.
  - Example:
    ```tsx
    import { ScrubChart, dailyCells, type DateAxisCell } from "solid-ui-components";
    import { createSignal } from "solid-js";

    type Row = DateAxisCell & { balanceCents: number };
    const cells: Row[] = dailyCells(start, end).map((c, i) => ({ ...c, balanceCents: runningBalances[i] }));
    const [selected, setSelected] = createSignal(0);

    <ScrubChart<Row>
      cells={cells}
      selected={selected()}
      onScrub={(i) => setSelected(i)}
      renderCell={myCellRender}
      renderChart={(ctx) => (
        <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`} preserveAspectRatio="none">
          <polyline
            points={ctx.cells.map((c, i) => `${ctx.cellToX(i)},${balanceToY(c.balanceCents)}`).join(" ")}
            fill="none"
            stroke="var(--sui-accent)"
          />
          {/* The window band is drawn by ScrubChart itself — no need to render it here. */}
        </svg>
      )}
    />
    ```
  - **createScrubChart factory; no concrete variant (intentional).** `createScrubChart({ chartHeight, cellWidth })` returns a curried `Component<ScrubChartDataProps<C>>` with the two sizing knobs frozen — call sites then pass only data / callbacks. Per STYLE_GUIDE.md "Variant Surface: keep it minimal," no concrete named variant ships yet: defaults handle the only known use case. Add a named variant when a second emerges.

## CashflowScrubChart
- **CashflowScrubChart** — Domain Composite (Depth 3). Composes `ScrubChart` (Depth 2) with a baked-in cashflow day-cell renderer (date corner + diverging green/red bar + dollar amount) and a baked-in running-balance line drawing. Zero-config at the call site: just pass `cells: CashflowCell[]` + `selected` + `onScrub`. Per-cell payload `CashflowCell = Cell & { cashflowCents: number; balanceCents: number }`: `cashflowCents` is the day's net flow (negative for an expense day); `balanceCents` is the cumulative running balance. The bar's fill fraction is hand-tuned for typical cashflow magnitudes (saturates at $2,200/day-equivalent); the line plots `balanceCents` across all cells. Inherits ScrubChart's window-band overlay, axis auto-scroll, and pointer scrub behaviour. Key props: `cells: CashflowCell[]`, `selected: number`, `onScrub: (index, cell) => void`, `today?`, `chartHeight?` (default `200`), `cellWidth?` (default `60` — matches the cashflow cell's content; not `40` like bare ScrubChart), `lineClass?` (CSS class added to every mark of the PRIMARY balance line alongside each mark's base class — the polyline AND the primary dot on the hover crosshair; the counterpart of `CashflowBalanceSeries.class`, which reaches the same set of marks for an overlay series; colour / dash / opacity are the consumer's. One class per line across every mark is what lets a consumer hide a whole line: a class that stopped at the polyline left the crosshair dot behind, visible and matching nothing in the tooltip), `showGridlines?` (opt-in, default `false` — forwards to `ScrubChart.showGridlines`: a dim horizontal rule at every y-axis tick, undashed because every short dash pattern on this chart already means another line type), `highlights?` (forwards to `ScrubChart.highlights` unchanged — shaded bands over day ranges, drawn beneath the balance line and every overlay series. The shape stays `ScrubChartHighlight` rather than gaining a cashflow alias, because a band carries no cashflow vocabulary). Y-FIT: `yFitDomain?`, `yFitMargin?`, `yFitBounds?`, `yFitTransition?`, `yScaleMode?`, `onYScaleModeChange?` and `yAxisWidth?` forward to `ScrubChart` unchanged, and each takes its type from `ScrubChartProps` so the two cannot drift. Setting `yFitDomain(from, to)` — the balance extent of an INCLUSIVE cell range, in cents — draws the fit toggle in the chart's origin corner, which switches the y-axis between fitting the visible window and fitting the whole series. The fitted domain OUTRANKS `yMin` / `yMax` / `yPadFraction`: those three still compute a domain and it stays the FALLBACK, applying whenever the callback is absent or returns `null`, so a caller that sets none of the six keeps the chart it had. `yAxisWidth?` is forwarded for one reason worth stating: ScrubChart auto-measures the y-axis column and, with `yFitDomain` set, widens that default until the toggle button fits — a host that cannot state the width cannot correct a clipped button. `yFitBounds?` states the edges the fitted domain always includes, per mode, in cents: `{ series: { min: 0 } }` holds the zero line on the axis while every day that dips below it stays on the plot, because a bound widens the domain and never narrows it. `yFitPin` is NOT forwarded yet. EXPAND: `chartHeightExpanded?`, `expanded?`, `onExpandedChange?` and `expandTransition?` forward to `ScrubChart` unchanged as well, each typed through an indexed access. Setting `chartHeightExpanded` draws the expand chevron in the bottom-right corner of the frame, opposite the y-fit toggle, and a click moves the chart between `chartHeight` and that height over `expandTransition` ms. A host that draws every chart through this wrapper therefore needs no expand button of its own. Omit `expanded` and the chart owns the state, starting collapsed; a caller that sets no `chartHeightExpanded` keeps the height and the chrome it had. Owns `CashflowScrubChart.css`; allowed at Depth 3 because the diverging-polarity visual is genuinely domain-specific and not expressible as variants of upstream atomics. Theme tokens: `--sui-cashflow-positive`, `--sui-cashflow-negative` (bar + amount colour); `--sui-cashflow-cell-positive-bg`, `--sui-cashflow-cell-negative-bg` (cell background tint); inherits `--sui-scrub-chart-window-fill`, `--sui-scrub-chart-window-stroke` from `ScrubChart`. LINE AND MARKER LABELS: a `CashflowBalanceSeries` with a `label` draws that label on the chart, and a `CashflowChartMarker` does too once it names a zone. `labelPlacement?: CashflowLabelZone` (`"auto" | "body" | "right" | "below"`, default `"auto"`) states a PREFERENCE, not a lock — the chart walks body → right → below and takes the first zone the measured text fits, and a label that fits nowhere is dropped in silence (nothing is logged). The zone rides on the DATA rather than on a curried variant because one chart routinely needs different zones for different lines; a variant would force them all into one. Only an EXPLICIT zone buys frame space: `"right"` widens a gutter past the plot, `"below"` adds a row under the x-axis ticks (two rows at most), and an `"auto"` label uses whatever another label bought but never creates space itself — so a chart with no labels, or with `"auto"` labels alone, keeps every pixel it had. Exported types: `CashflowCell`, `CashflowScrubChartProps`, `CashflowBalanceSeries`, `CashflowSeriesFill`, `CashflowChartMarker`, `CashflowLabelZone`. Use for: cashflow / coffers visualisations that need both per-day detail (the axis ribbon) and the running-balance arc (the chart). No factory: every prop is data or sizing — there's nothing presentational to freeze.
  - Example:
    ```tsx
    import { CashflowScrubChart, dailyCells, type CashflowCell } from "solid-ui-components";
    import { createSignal } from "solid-js";

    let runningTotal = 0;
    const cells: CashflowCell[] = dailyCells(rangeStart, rangeEnd).map((cell, i) => {
      const cashflowCents = myCashflowAt(i);
      runningTotal += cashflowCents;
      return { ...cell, cashflowCents, balanceCents: runningTotal };
    });
    const [selectedIdx, setSelectedIdx] = createSignal(0);

    <CashflowScrubChart cells={cells} selected={selectedIdx()} onScrub={setSelectedIdx} today={today} />
    ```

## CashflowChart
- **WeeklyCashflowChart** — Composite (Depth 2). Weekly revenue/expense cashflow chart: for each week, up to four stacked SVG bars (recurring + project revenue rising from the $0 baseline, recurring + one-time expenses dropping below it) plus a running-balance ("coffers") line — solid for past weeks, dashed for projected — with a "now" marker, optional bankruptcy annotation, and an interactive hover popover breaking down each segment's line items. Container-driven sizing: a ResizeObserver measures the wrapping `div` and the SVG fills that box on both axes (no width-locked aspect ratio, no horizontal scroll); auto-scales the y-domain to the data extent with 10% headroom, degenerate/empty data rests on the $0 baseline. Key prop: `data` (`WeeklyCashflowChartData` — `bars: WeeklyChartBar[]` plus optional `todayWeek`, `bankruptcyWeek`, `bankruptcyDate`); `height` (number, optional — pins an explicit viewBox height, otherwise measured; floor 160px); `yMax` (number | null — pins the top of the y-domain and enables the fixed -$100k floor). Each `WeeklyChartBar` carries per-segment cents (revenue/expense/balance) plus `revenue_items`/`expense_items`/`recurring_expense_items`/`onetime_expense_items` (`BarLineItem[]` of `{ name, amount_cents }`) and `isProjected`. Exported types: `WeeklyCashflowChartProps`, `WeeklyCashflowChartData`, `WeeklyChartBar`, `BarLineItem`. Uses d3-scale (`scaleBand`/`scaleLinear`); CSS tokens `--sui-accent`, `--sui-success`, `--sui-danger`, `--sui-warning`, `--sui-text`, `--sui-text-muted`, `--sui-border`, `--sui-border-bright`, `--sui-bg`, `--sui-bg-elevated`. Use for: financial runway/coffers dashboards, weekly burn-vs-revenue forecasting.
  - Example:
    ```tsx
    import { WeeklyCashflowChart, type WeeklyCashflowChartData } from "solid-ui-components";

    const data: WeeklyCashflowChartData = {
      todayWeek: "2026-03-02",
      bars: [
        {
          week_start: "2026-03-02",
          month_label: "Mar '26",
          revenue_cents: 500000,
          recurring_revenue_cents: 300000,
          project_revenue_cents: 200000,
          product_revenue_cents: 0,
          expense_cents: 420000,
          recurring_expense_cents: 350000,
          onetime_expense_cents: 70000,
          balance_cents: 80000,
          revenue_items: [{ name: "Retainer", amount_cents: 300000 }],
          expense_items: [{ name: "Payroll", amount_cents: 350000 }],
          recurring_expense_items: [{ name: "Payroll", amount_cents: 350000 }],
          onetime_expense_items: [{ name: "Laptop", amount_cents: 70000 }],
          isProjected: false,
        },
      ],
    };

    <div style={{ height: "320px" }}>
      <WeeklyCashflowChart data={data} />
    </div>
    ```

## CompletionTimeline
- **CompletionTimeline** — Composite (Depth 2). Buckets a stream of completion events into 30-minute slots across a trailing time window and renders them via the `Chart` primitive family (`Chart` + `Grid` + `XAxis`/`YAxis` + `BarSeries` + `ChartTooltip`): bars show per-bucket counts, a header shows the accent-colored title and total completions in window, and hovering a bar reveals its start time, count, and running cumulative total (events before the window seed the cumulative baseline). Fixed 800×260 chart with ~6 evenly-spaced hour ticks. Key props: `completions` (`CompletionEvent[]`, each `{ tableName: string; completedAt: number /* epoch ms */; rowCount: number }`); `windowHours` (number, default 8). Exported types: `CompletionTimelineProps`, `CompletionEvent`. CSS tokens: `--sui-accent`, `--sui-text-muted`. Use for: ETL/ingestion dashboards, activity-over-time monitors showing what completed and cumulative progress.
  - Example:
    ```tsx
    import { CompletionTimeline, type CompletionEvent } from "solid-ui-components";

    const completions: CompletionEvent[] = [
      { tableName: "orders", completedAt: Date.now() - 3_600_000, rowCount: 12000 },
      { tableName: "users", completedAt: Date.now() - 1_800_000, rowCount: 340 },
    ];

    <CompletionTimeline completions={completions} windowHours={8} />
    ```

## Alarm
- **Alarm** — Composite (Depth 2). A family of chart-overlay renderers plus a pure pipeline for turning raw time-series points into "alarm" overlays inside a `<Chart>`. Three layers: (1) pure helpers in `alarm.ts`, (2) base SVG renderers, (3) the curried `AlarmOverlay`. Core types: `Pt` (`{ x: number; y: number }`), `Range` (`{ start: number; end: number }`), `HotZone` (`Range & { count: number }`). Use for: marking regions of a chart where a signal crosses a threshold — smooth translucent bands for normal alarms, striped "barcode" blocks with `×N` badges for dense clusters, with per-series lane subdivision when multiple channels share a panel.
  - **AlarmOverlay** — curried one-call overlay. Props: `series` (`readonly AlarmSeries[]`, each `{ data: readonly Pt[]; threshold: number }`), `padFraction?` (fraction of x-domain to widen each range, default `0`), `depthThreshold?` (absolute concurrent-range count above which a region collapses to a striped block, default `5`), `patternId?`. Reads the chart x-domain from `useChart()` context; runs `detectRanges → padRanges → findHotZones → subtractZones → clampRanges` per series and emits `AlarmStripeDefs` + `AlarmBands` + `AlarmHotZones` in lanes. Exported types `AlarmOverlayProps`, `AlarmSeries`.
  - **AlarmBands** — pure SVG renderer of translucent red rectangles, one per pre-computed `Range`. Props: `ranges` (`readonly Range[]`), `laneIndex?` (0-based, default 0), `laneCount?` (default 1 = full height). Styled via `--sui-alarm-band-fill` (#ff4040) and `--sui-alarm-band-fill-opacity` (0.22). Type `AlarmBandsProps`.
  - **AlarmHotZones** — pure renderer of a striped block + thick border + `×N` count badge per `HotZone`. Props: `zones` (`readonly HotZone[]`), `laneIndex?`, `laneCount?`, `patternId?`. Requires an `AlarmStripeDefs` in the same chart so `fill="url(#…)"` resolves. Styled via `--sui-alarm-zone-stroke`, `--sui-alarm-zone-stroke-width`, `--sui-alarm-count-fill`, `--sui-alarm-count-size`, `--sui-alarm-count-font`, `--sui-alarm-count-weight`. Type `AlarmHotZonesProps`.
  - **AlarmStripeDefs** — SVG `<defs>` registering the diagonal-stripe pattern used by `AlarmHotZones`. Props: `patternId?` (default `"alarm-stripe"`), `spacing?` (numeric tile size, default 10 — numeric because SVG geometry attrs don't resolve `var()`), `strokeWidth?` (default 3). Paint themed via `--sui-alarm-zone-stripe-fill`, `--sui-alarm-zone-stripe-bg-opacity`, `--sui-alarm-zone-stripe-line-opacity`. Type `AlarmStripeDefsProps`.
  - **Pure helpers** — `detectRanges(data, yThreshold)`, `padRanges(ranges, padFraction, xDomainWidth)`, `findHotZones(ranges, depthThreshold)` (sweep-line), `subtractZones(ranges, zones)`, `clampRanges(ranges, xMin, xMax)`, and `alarmPipeline(data, opts)` (canonical composition returning `{ ranges, padded, hotZones, visibleRanges, visibleHotZones }`). Each is total, deterministic, and render-free — compose them directly for custom overlays.
  - Example:
    ```tsx
    import { Chart, LineSeries, Grid, XAxis, YAxis, AlarmOverlay } from "solid-ui-components";

    <Chart width={480} height={220} xDomain={[0, 199]} yDomain={[0, 100]}>
      <AlarmOverlay
        series={[
          { data: pointsA, threshold: 60 },
          { data: pointsB, threshold: 40 },
        ]}
        padFraction={0.12}
        depthThreshold={5}
      />
      <Grid /><XAxis /><YAxis />
      <LineSeries data={pointsA} x={(d) => d.x} y={(d) => d.y} stroke="#ff8080" />
    </Chart>
    ```

## SwimlaneChart
- **SwimlaneChart** — Atomic Primitive (Depth 1). Owns `SwimlaneChart.css`; consumes shared SVG render helpers (`DagArrowMarker`, `DagSvgNode`, `DagSvgEdge`, `bezierThroughChannelPath`) from `src/internal/dag-svg/` plus type/data imports from `../DagChart` (`createPanZoom`, `DAGNode`, `DAGEdge`, `NodeRenderState`) — utility-module/data imports, not component imports, per the Primitive rule. SVG horizontal swimlane chart that places nodes on signed-integer columns (negative = left of center, 0 = center, positive = right). Key props: `nodes` (`DAGNode<T>[]`), `edges` (`DAGEdge[]`), `swimlaneFor` (returns the column for each node), `renderNode` (receives `node` and `NodeRenderState`; `{ kind: "collapsed", collapsedCount }` for nodes that overflowed the depth window), `maxDepth` (rings on each side of center; default 2), `responsiveCollapse` (default true — shrinks depth to fit `containerWidth`), `centerCol` (default 0), `nodeSize`, `columnGap`, `rowGap`, `interactive`, `arrows`, `onNodeClick`. Nodes outside the visible depth window collapse into boundary badges (circle + count) at the outer edge of the outermost visible anchor. Width budgeting is purely symmetric — chart reserves `depth` columns on each side of center, so DOING-anchored layouts never push content off-screen. Leaving nodes play a 360ms mirrored compress-into-badge animation (rect → circle, shrinks toward the badge side); entering nodes mirror the leave in reverse (emerge from the badge as a circle, expand to rect). Use for: current-step-in-workflow displays, DOING-centered Kanban, dependency chain visualizations with overflow summarization.
- **LinearFlowSwimlaneChart** — Curried variant of SwimlaneChart pre-configured for "current step in a sequential workflow" displays. Locks `maxDepth=3`, `responsiveCollapse=true`, `centerCol=0`, `nodeSize=[160, 56]`, `interactive=false`. Consumer passes only `nodes`, `edges`, `swimlaneFor` (signed distance from DOING), and `renderNode`. Use for: linear flow / pipeline animations where the chart drives itself off data updates rather than user pan/zoom.

## AnimatedSwimlaneChart (public `SwimlaneChart`)
**Curried-only — the published component accepts DATA ONLY.** The package exports the animated chart under two default names, `SwimlaneChart` and `AnimatedSwimlaneChart`; both are the curried, data-only variant. The only props at the call site are `nodes: StatusFlowNode[]` and `onNodeClick?: (id) => void`. All visual/layout config (`nodeSize`, `columns`, `centerStatus`, `terminalStatus`, `timing`, `routingStyle`, `breakpoints`, `renderNode`, `renderPopover`, gaps, …) is baked at currying time and is **not** reachable on the exported component.

- **Status-driven, data-only.** Pass nodes with a `status`; the chart computes columns, lanes, overflow lozenges, and dependency arrows itself. Animates between ticks when `nodes` changes.
- **Responsive width is rAF-coalesced.** The chart measures its container with a `ResizeObserver` to drive the responsive depth window. The measured width is written on the next `requestAnimationFrame` (newest width wins; pending frame cancelled on cleanup) rather than synchronously inside the observer dispatch, so resizing never emits the benign `ResizeObserver loop completed with undelivered notifications` warning (0.65.1). No call-site impact — behaviour and API are unchanged.
- **`StatusFlowNode` fields the default card renders:** `id`, `title` (clamps to 3 lines; full text shows in the hover popover), `subtitle?`, `status`, `claimedBy?` (top-left, status sits top-right), `estimate?` (bottom-left), `actual?` (bottom-right, accent-colored), `parentId?` (groups children into a lane), `dependsOn?` (draws dependency arrows). Card layout is fixed: `claimedBy ┄ status` on top, title filling the middle, `estimate ┄ actual` pinned to the bottom. All of `claimedBy`/`subtitle`/`estimate`/`actual` are optional — a row/line is omitted when its values are absent.
- **Basic use:** `import { SwimlaneChart } from "@primestageprime/solid-ui-components";` then `<SwimlaneChart nodes={tasks} onNodeClick={select} />`. Nothing else is configurable at the call site by design.
- **Need different visuals (custom `renderNode`, `nodeSize`, `columns`, timing, …)?** Curry your own once and reuse it: `const ProjectFlow = createSwimlaneChart({ nodeSize: [300, 120], renderNode: myCard }); … <ProjectFlow nodes={tasks} />`. Do not look for a config prop on `SwimlaneChart` — there isn't one.
- **BREAKING (0.55.0):** the base component and the `SwimlaneChartProps` / `SwimlaneChartOverrides` / `AnimatedSwimlaneChartProps` / `AnimatedSwimlaneChartOverrides` types are no longer exported. If you were passing overrides directly — `<SwimlaneChart nodeSize={…} renderNode={…} nodes={…} />` — move them into a curry: `const Chart = createSwimlaneChart({ nodeSize, renderNode }); <Chart nodes={…} />`. The data-prop type is exported as `SwimlaneChartDataProps` (alias of `AnimatedSwimlaneChartDataProps`).

## StatusFlowChart
- **StatusFlowChart** — Composite (Depth 2). Status-driven flow chart built on top of SwimlaneChart. Caller passes nodes with `status` (no positional hints in the data); the chart computes columns by mapping each node's status to a configured column, computes the visible column count from container width via breakpoints, and lays out symmetric around `centerStatus`. **The base is NOT exported — curry it with `createStatusFlowChart`, which is the only entry point.** Key data props (all the curried variant accepts): `nodes` (`StatusFlowNode[]` with `id`, `title`, `subtitle?`, `status`, `parentId?`, `dependsOn?`), `onNodeClick?`. Override props (baked at definition time): `columns` (`StatusFlowColumn[]` — each column is `{ label, statuses[] }`, ordered left→right), `centerStatus` (anchors col 0; also drives parent effective-status), `terminalStatus` (when a parent's effective status equals terminal, its children collapse into a `+N` badge on the parent), `nodeWidth`, `nodeHeight`, `minArrowWidth`, `breakpoints` (`{ minWidth, visibleCols }[]` — `visibleCols` should be odd so the chart stays symmetric around center), plus optional `rowGap`, `renderNode`, `colFor`, `routingStyle`. Factory: `createStatusFlowChart`. Curried Variants: **none, deliberately** — there is no universal status taxonomy for SUI to bake, so every consumer defines its own variant once. Parent effective-status rules (in priority order): (1) ANY child in `centerStatus` → parent is `centerStatus`; (2) ALL children share the same status → parent takes that status; (3) mixed without any `centerStatus` → parent keeps its own input status. When any parent has visible (non-collapsed) children, the chart container outlines a dashed "lane" border. Pure layout logic is exported so you can unit-test a column configuration without mounting a chart: `pickVisibleCols(width, breakpoints)`, `assignColumns(nodes, columns, centerStatus, visibleCols)` → `Map<id, {col, visible, side}>`, `resolveParentStatuses(nodes, centerStatus)`. Exported types: `StatusFlowChartDataProps`, `StatusFlowChartOverrides`, `StatusFlowRenderContext`, `StatusFlowNode`, `StatusFlowColumn`, `StatusFlowBreakpoint`, `ColAssignment`. Use for: kanban-style status flow where the data model is status-based rather than position-based, and where parent tasks should auto-summarize once all their children complete.
  - **The taxonomy is definition-time on purpose.** `columns` / `centerStatus` / `terminalStatus` are required by the factory rather than optional, so a variant that cannot lay anything out is a compile error instead of a blank box. Letting a call site pass its own `columns` is how two views of the same board end up disagreeing about where "blocked" belongs.
  - **NEW IN 0.143.0.** Before this, `src/index.ts` re-exported only the `StatusFlowNode` type from this folder — the component, the layout helpers and every other type were unreachable from the package root even though this entry described them. Nothing here is a breaking change; it is a surface that was documented but never shipped.
  - Example:
    ```tsx
    import { createStatusFlowChart, type StatusFlowNode } from "solid-ui-components";

    // Define the variant ONCE, at module scope — not inside a component.
    const ProjectFlow = createStatusFlowChart({
      columns: [
        { label: "Done",  statuses: ["done"] },
        { label: "Doing", statuses: ["doing", "review"] },
        { label: "Todo",  statuses: ["todo", "blocked"] },
      ],
      centerStatus: "doing",
      terminalStatus: "done",
      nodeWidth: 220,
      nodeHeight: 88,
      minArrowWidth: 48,
      breakpoints: [
        { minWidth: 0,   visibleCols: 1 },
        { minWidth: 900, visibleCols: 3 },
      ],
    });

    const tasks: StatusFlowNode[] = [
      { id: "epic", title: "Billing rewrite", status: "doing" },
      { id: "a", title: "Schema migration", status: "done",  parentId: "epic" },
      { id: "b", title: "Proration rules",   status: "doing", parentId: "epic" },
    ];

    <ProjectFlow nodes={tasks} onNodeClick={select} />
    ```

## BatchBar
- **BatchBar** — Atomic (Depth 1). Owns `BatchBar.css`; no component imports. A single horizontal **self-estimating** progress bar for one table being extracted by N parallel batches. **DECLARATIVE API (preferred):** pass `batches: { rows: number; state: "pending" | "running" | "done" }[]` (`BatchSpec[]` — discrete states, **NO fractions**) + `totalRows` + `committedRows` (rows already committed). BatchBar OBSERVES the lifecycle, timestamps each batch when first seen `running`, MEASURES its wall-clock duration on `running → done`, folds the real `(rows, durationMs)` sample into an internal online linear regression `T̂(rows) = base + perRow·rows` (seeded with a low-weight prior so batch #1 isn't garbage and the denominator is never singular), and EASES each running batch's fill on an internal `requestAnimationFrame` loop: **race** (`e ≤ T̂`: near-linear to ~90% at the estimate), **creep** (`e > T̂`: decelerating, asymptotes below 1 with `τ = max(0.35·T̂, 1.5·σ)`), **snap** (a real `done` event tweens to 1.0 over ~180ms). The curve NEVER self-reaches 1.0 — only a real completion finishes the bar. The render is one solid green fill at `(committedRows + Σ p(e)·batchRows) / totalRows`, driven by `scaleX` (compositor-only, no layout). The rAF loop starts on demand and STOPS itself the frame nothing is animating (no wasted frames when idle/done); cleans up on unmount. All easing constants (`P_KNEE = 0.90`, `SNAP_MS ≈ 180`, the prior, τ coefficients) are ENCAPSULATED and not configurable. To SHARE one learned model across many bars (a whole board), pass a `controller` from `useBatchProgress()`; omit it and each bar learns its own. The app passes **only declarative data** — never a fraction, estimate, duration, or interpolation. **LEGACY API (deprecated):** numeric `donePct` / `inFlightPct` / `batches: number[]` render the old three-region stacked-stripe bar with no internal estimation; kept for backward compat — migrate to the declarative API. Presentational props (both APIs): `height` (default 24), `maxWidth` (default 400; `null` removes the cap), `doneColor` / `batchColor` / `todoColor`, `label`. Factory `createBatchBar(defaults)` bakes the visual config; the returned component takes data props only. `useBatchProgress()` returns a `ProgressController` (`{ engine, tick, observe }`) — one learned model + its internal rAF loop. Uses `--sui-success`, `--sui-accent`, `--sui-text-muted`. Exported types: `BatchBarProps`, `BatchBarDataProps`, `BatchSpec`, `ProgressController`. Use for: a smooth, confidence-reading extraction progress bar that animates toward a learned estimate and only completes on a real `done` event.
  - Example (declarative, sharing one model across two bars):
    ```tsx
    import { BatchBar, useBatchProgress } from "@primestageprime/solid-ui-components";

    const progress = useBatchProgress(); // one learned model for the whole view
    <BatchBar id="FACT_A" controller={progress} totalRows={50000} committedRows={20000}
      batches={[{ rows: 10000, state: "done" }, { rows: 10000, state: "running" }, { rows: 10000, state: "pending" }]} />
    <BatchBar id="FACT_B" controller={progress} totalRows={8000} committedRows={0}
      batches={[{ rows: 8000, state: "running" }]} />
    ```

## ExtractionBoard
- **ExtractionBoard** — Composite (Depth 2) swimlane board for an ETL extraction view. One swimlane per configured category; columns left → right are `Summary │ Done │ Doing │ Todo │ +N` lozenge. The client supplies CONFIG (baked once) and a REACTIVE `tables` array; the board DERIVES the whole view as pure functions over `tables` (there is NO simulation inside). Props: `config` (`ExtractionBoardConfig`) and `tables` (`BoardTable[]`, pass `tables()` from a signal/store). `ExtractionBoardConfig` = `{ categories: { id, label, description? }[]` (order = default swimlane order + tiebreaker once lanes sort by status)`, dataTypes: { id, label, icon }[]` (the per-card "icon over count" stats + the summary aggregate; a card's `colsByType` keys must be a subset of these ids)`, columns?: { summary?, done?, doing?, todo? }` (header labels)`, multiBatchAbove?` (default 10_000 — tables above this render a multi-batch self-easing `BatchBar` from `batches`; smaller tables drive one synthetic whole-table batch)`, timing?: { slurpMs?, moveMs?, enterMs?, resortMs? } }`. `BoardTable` = `{ name, category` (must match a `CategoryConfig.id`; unknown categories ignored)`, status: "todo" | "doing" | "done" | "skipped", totalRows, transferredRows` (COMMITTED rows only — jumps on completion, NOT interpolated)`, colsByType: Record<string, number>, batches?: TableBatch[] }` where `TableBatch = { rows: number; state: "pending" | "running" | "done" }` — **declarative, NO fractions**. The board creates ONE shared progress engine per instance and hands every Doing bar the same learned duration model, so the in-flight fill animates itself on an internal rAF loop (race → creep → snap; see BatchBar) and the estimate sharpens across the whole extraction. The app emits only `{rows, state}` — never a fraction, estimate, duration, or interpolation. **Migration from ≤0.69:** the old `batches: { total, done, inFlight: number[] }` (app-computed in-flight fractions) is removed; emit `batches: { rows, state }[]` and let `transferredRows` carry committed rows only (delete any app-side `interpolatedRows`). Per category the board derives: the Summary aggregate (counts + colsByType sum + monotonic status — none done → pending, some → active, all → complete), the latest Done/Skipped card (the last resolved table in array order — caller controls "latest" by store ordering), the Doing card(s), the next Todo, and the `+N` lozenge (counts the queued tables beyond the one shown). Lanes sort by Summary status (active → top, pending → middle, complete → bottom; config order breaks ties) with a `resortMs`-debounced re-sort so a lane is seen completing before it sinks. Empty/skipped tables live in the Done column with a SKIPPED badge. Structural transitions animate via an internal FLIP engine in strict beats: SLURP the folded Done card into its Summary anchor → SLIDE the just-finished Doing card into the empty Done slot → ENTER the next Todo growing out of the lozenge (only horizontal column moves animate; vertical reflow snaps; a bulk change >4 slurps snaps). Curried-only convenience: `createExtractionBoard(config)` bakes the config and returns a component taking `tables` (+ div attrs) only. Use for: a live ETL extraction / ingestion dashboard where a data store advances tables todo → doing → done and you want the swimlane board + card motion for free.

## ThroughputChart
- **ThroughputChart** — Composed (Depth 2). TWO modes, one component. **RATE mode (default)** — instantaneous rows/min over a time window: area + line + average reference + crosshair tooltip. Props: `dataPoints` (`{ timestamp, rowsPerMinute }[]`), `windowHours?` (default 8). This is the original behaviour and is fully preserved whenever the completion props are absent. **COMPLETION mode (opt-in — pass `completions`)** — plots PROGRESS instead of rate: per-hour completed-item bars + a cumulative-% line on one shared 0–100 axis (bars scaled by the busiest bucket so the two series coexist without a second axis). The chart buckets the raw events itself and SELF-SIZES (measures its own container width via `ResizeObserver`, SSR/jsdom-safe fallback), so the consumer hosts no bucketing and no measurement code. Completion props: `completions` (`{ completedAt: number }[]` — presence selects COMPLETION mode; filtered to the window), `now?` (epoch ms right edge; default now), `windowHours?` (default 48 in this mode; one bar per hour), `totalCount?` (cumulative-% denominator), `baselineCompleted?` (items done before the window opened, so the line starts at the right baseline; default 0), `barsLabel?` / `cumulativeLabel?` (legend labels), `height?` (default 200 completion / 260 rate), `initialWidth?` (fallback before the observer reports; default 1000). Composes the `Chart` family + `Legend`. Use RATE for live ingestion rate; COMPLETION for an ETL "tables done per hour + cumulative % complete" header (item-agnostic).

## BandRail
- **BandRail** — Primitive (Depth 1). A one-dimensional value axis whose thumb rides its own consequences. One horizontal rail, a draggable thumb, and named ticks standing off the rail at the values where the answer changes. The ticks are model OUTPUTS plotted on the axis of the model INPUT, so the control and the readout are one object — which is what separates it from a slider with a caption beside it. **It is not a chart**: no second axis, no fill, no gridlines. **It does no arithmetic and never snaps**: the consumer computes the thresholds, and the value reported back is never rounded to one. Key props: `domain` (`[number, number]`, the consumer's own units), `value`, `onChange`, `thresholds` (`Threshold[]`), `bands` (`Band[]`), `label` (accessible name — required), `format?` (renders a threshold's second text line; default `String`), `disabled?`. **Two marks, and the difference matters.** A `Threshold` says *where* the answer changes; it carries `value`, `label` (required, so meaning is never colour-only), `tone?` (the shared `Tone` union — the theme owns the colour) and `side?` (`"above"` | `"below"`, default `"above"`). A `Band` says *what* the answer becomes and over what span, which is the ambiguity a tick alone cannot fix — "insolvent in 6 mo" never said which side was the insolvent side. It carries `start?` and `end?` (both optional, defaulting to the domain ends, so a band may be bounded or half-open), `label`, `tone?` and `side?` (default `"below"`, so bands and thresholds separate without the consumer doing anything). A band draws as a labelled bar with a cap and a tick at each end it claims, and **dims when the value leaves it** — that dimming is how the reader learns the direction. Bands NEVER share a lane: two bars at one height would read as a single bar spanning both, a span neither band claims, so the box grows instead. The thumb carries one arc per holding band, and the crossing the value sits on is marked on the crossing itself rather than by colouring the thumb. `aria-valuetext` names the value, every holding band, and the crossing, so a screen reader gets the same answer the dimming gives a sighted reader. Factory: `createBandRail({ format })` — curry the formatter when the currency or unit is a static decision. Exported types: `BandRailProps`, `BandRailDataProps`, `BandRailOverrides`, `Band`, `PlacedBand`, `Threshold`, `ThresholdSide`, `PlacedThreshold`, `LabelAnchor`, `LaneGeometry`. Uses `--sui-border`, `--sui-border-focus`, `--sui-accent`, `--sui-success`, `--sui-warning`, `--sui-danger`, `--sui-highlight`, `--sui-chart-tick-color`, `--sui-text-secondary`, `--sui-font-mono`. Use for: a draw dial, a price dial, any "at what point does this stop working" control. **Renamed from `ThresholdRail`.** `ThresholdRail`, `createThresholdRail`, `ThresholdRailProps`, `ThresholdRailDataProps` and `ThresholdRailOverrides` still export as deprecated aliases for one minor version; the `sui-threshold-rail__*` CSS prefix does not — it is now `sui-band-rail__*`. `Threshold`, `ThresholdSide` and `PlacedThreshold` keep their names, because a threshold is still what they describe.
  - **Three things the rail absorbs, and the reason a consumer cannot compose it from a slider plus an axis.** *Lanes* — colliding labels stack outward from the rail, capped at four lanes so a label can never leave the box; the two sides stack independently, because `side` is the consumer's declaration. *Anchor fitting* — a label near either end anchors `start` or `end` instead of spilling out. *Self-sizing* — the viewBox grows only for the lanes actually used. Text is measured by estimate (~6.0px per monospace character), not `getBBox`, so the lane rules stay testable under jsdom.
  - **The thumb has two forms.** Between thresholds it is an arrow on a stem. Landed on one, it becomes a ring holding a dot, and the ring takes that threshold's tone — so the nesting reads as "you are on THIS one", not merely "you are on one". `aria-valuetext` names the threshold too, so the state is not colour-only.
  - **Keyboard.** Arrow keys move one hundredth of the domain, Shift multiplies by ten, Home and End go to the domain ends, and PageUp/PageDown jump between thresholds.
  - Example:
    ```tsx
    import { BandRail, type Threshold } from "solid-ui-components";

    const crossings: Threshold[] = [
      { value: 200, label: "safe in 6 mo", tone: "success" },
      { value: 3800, label: "safe in 12 mo", tone: "success" },
      { value: 11000, label: "max draw · breaks even", tone: "muted", side: "below" },
    ];

    <BandRail
      domain={[0, 11550]}
      value={draw()}
      onChange={setDraw}
      thresholds={crossings}
      format={(v) => (v >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${v}`)}
      label="Monthly owner draw"
    />
    ```

## Slider
- **Slider** — Atomic (Depth 1). A labelled range control that prints its own live value. Owns `Slider.css`; wraps `@kobalte/core/slider` (matches the Combobox/Select/Tooltip/Toast/ThemedNumberInput/DateRangePicker Kobalte-wrapping pattern — see CONTEXT.md). The label line carries the caption on the left and `format(value)` right-aligned on the right, so a control reads `Safety buffer` / `6 months` on one line and needs no separate readout beside it. **The value stays in the CONSUMER'S OWN UNITS** — the component runs no arithmetic beyond Kobalte's step snapping and formats nothing itself, so a dial that keeps integer cents passes cents and supplies a `format` that renders dollars. Assuming dollars would put a unit in the widget that only the consumer knows. Key props: `value` (`number`, controlled), `onChange` (`(value: number) => void`), `min`, `max`, `step` (default `1`), `label` (accessible name and visible caption — required), `format?` (`(value: number) => string`, default `String`), `disabled?`, `editable?` (`boolean`, default off — turns the readout into a field; see the note below), `ticks?` (`boolean | readonly number[]` — notches drawn on the track: `true` marks every `step` from `min` to `max` inclusive, an array marks exactly those values and ignores `step`, and omitted or `false` draws nothing; a value outside `[min, max]` is dropped rather than pulled to the edge, an end notch sits half its own width inside the track, and every notch is `aria-hidden` and takes no pointer events). Any other `SliderRootProps` (e.g. `name`, `onChangeEnd`, `inverted`, `orientation`) is forwarded via spread. Exported types: `SliderProps`, `SliderDataProps`, `SliderOverrides`. Factory: `createSlider({ format, ticks })` — curry the formatter and the tick set when the unit and the scale are static decisions. Uses `--sui-accent`, `--sui-accent-rgb`, `--sui-bg-primary`, `--sui-border`, `--sui-border-focus`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-font-family`, `--sui-font-mono`, `--sui-space-2` theme tokens. Use for: a bounded numeric input where the reader wants the value and the position at once — a runway dial, a buffer, a draw amount. For a value axis that also carries named threshold ticks, use `BandRail`.
  - **It does NOT emit `onChange` at mount, and that is why it exists.** `ThemedNumberInput` fires one `onChange(undefined)` at mount; a form that persists on every change writes that mount value over the stored one, which cost thorcasting a guard in `MoneyField`. This control emits only on a drag or a key that moves the thumb. Two tests pin it: none at mount, and none when the `value` prop changes.
  - **The track insets by half a thumb; the label line does not.** Kobalte places the thumb at `left: calc(pct%)` of the track with `translateX(-50%)`, so a flush track lets the thumb hang half its width outside the component — 8px past the right edge of a 290px column at max, where it overlaps the next control or is clipped by any parent that clips. The track carries a horizontal margin of half a thumb, the way a native range input insets it, and it must NOT also carry `width: 100%` or that beats the margin and pushes the thumb out instead. The inset is horizontal only, so a slider still lines up with the number input beside it.
  - **`aria-valuetext` is overridden on purpose.** Kobalte's own `aria-valuetext` comes from its internal number formatter, **not** from `getValueLabel` — that only feeds `ValueLabel`. Left alone a screen reader reads `6` where the sighted user sees `6 months`. The thumb carries `aria-valuetext={format(value)}`; Kobalte spreads `others` last on the thumb, so it wins.
  - **Keyboard.** Arrow keys move by `step`, PageUp and PageDown by a page, and Home and End go to the domain ends. **Home and End act on the FOCUSED thumb**, so they are no-ops until the thumb takes focus; arrow keys carry the thumb index and need no focus. The thumb takes a visible focus ring.
  - **`ticks` draws notches, and Kobalte supplies none.** There is no tick primitive in `@kobalte/core/slider`, so each notch is an absolutely positioned span inside `KobalteSlider.Track`, beside the fill and under the thumb. A notch the fill has passed flips to the page colour, which reads as a cut in the fill rather than a mark beside it; an unpassed notch stays darker than the grey track. `ticks: true` on a wide domain is dense on purpose — `min: 0, max: 20_000_000, step: 200_000` draws 101 notches and reads as a hatch. There is no cap and no silent downgrade: a caller who wants fewer notches passes the list. Sizing rides on `--sui-slider-tick-width` and `--sui-slider-tick-height`.
  - **`editable` makes the readout a field, and it is `type="text"`.** A number
    input draws the browser's spinner arrows, and a spinner beside a thumb is a
    second stepper saying the same thing, so the field is a text input with
    `inputmode="decimal"`. It shows `format(value)` at rest and the RAW number
    while focused, because `format` runs one way — a caller rendering `6 months`
    hands over no parser to run it backwards. Enter or blur commits: the text is
    read as a number, clamped to `[min, max]`, then snapped to the nearest step
    counted FROM `min`, so a typed value can never land where a drag cannot.
    Escape, and text that is not a number, revert and emit nothing. The field
    stops keydown propagation so arrow keys move the caret rather than the thumb,
    and it carries `aria-label` because a caption on the label line is not its
    accessible name.
  - **No `variants.ts`, deliberately.** `format` and `ticks` are the only overrides, and a real caller's formatter carries its own units and currency — the same reason `BandRail` ships the base alongside its factory rather than a set of curried variants. Curry one at the call site with `createSlider`.
  - Example:
    ```tsx
    import { Slider, createSlider } from "solid-ui-components";

    // Minimal
    <Slider label="Safety buffer" value={months()} onChange={setMonths} min={3} max={18} />

    // Money kept as integer cents, rendered as dollars
    <Slider
      label="Monthly draw"
      value={cents()}
      onChange={setCents}
      min={0}
      max={1_155_000}
      step={10_000}
      format={(c) => `$${(c / 100).toLocaleString()}/mo`}
    />

    // Notches: a named list, or every step
    <Slider label="Months to sample" value={months()} onChange={setMonths}
            min={3} max={24} ticks={[3, 6, 12, 18, 24]} />
    <Slider label="Annual raise" value={raise()} onChange={setRaise}
            min={0} max={15} step={0.5} ticks />

    // Curry the formatter and the ticks when the unit and the scale are static
    const MonthsSlider = createSlider({
      format: (n) => `${n} months`,
      ticks: [3, 6, 12, 18],
    });
    <MonthsSlider label="Runway" value={months()} onChange={setMonths} min={3} max={18} />
    ```

## Cell
- **Cell** — Table cell primitive (`<td>` or `<th>`) with alignment, color, and weight. Key props: `align`, `color`, `weight`, `as` (`td`|`th`). Use for: building custom table layouts.
- **CellTable** — `<table>` wrapper with optional `<thead>`. Key props: `header`. Use for: wrapping Cell-based rows.
- **CellRow** — `<tr>` wrapper with border and highlight options. Key props: `border`, `highlight`. Use for: rows in CellTable.
- Curried variants exported: `KVTable`, `BorderRow`, `DataTerm`, `DataTermMuted`, `DataValue`, `DataValueHighlight`, `DataValueSuccess`, `DataValuePrimary`, `DataValueMuted`, `DataHeader`, `DataHeaderRight`, `DataHeaderCenter`. Use for: key-value data tables without wiring alignment/weight manually.

## Combobox
- **Combobox** — Unified single- and multi-combobox built on `@kobalte/core/combobox`. The `multiple?` literal narrows `value`/`onChange`: `false`/absent → `ComboboxOption | null`; `true` → `ComboboxOption[]`. Key props: `options` (`Accessor<ComboboxOption[]>`), `value`, `onChange`, `placeholder`, `disabled`, `id`, `onInputChange`, `onCreate` (fires on Enter when input doesn't match an existing option — parent appends to `options`), plus (multi-only) `onRemove`, `showChips` (default `true`). Any other kobalte `ComboboxRootProps` field (e.g., `placement`, `gutter`, `open`/`defaultOpen`, `onOpenChange`, `defaultFilter`) is forwarded via spread. Exported types: `ComboboxProps`, `ComboboxOption`, `SingleComboboxProps`, `MultiComboboxProps`. Uses `--sui-bg-elevated`, `--sui-bg-primary`, `--sui-border`, `--sui-border-bright`, `--sui-accent`, `--sui-accent-rgb`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-danger`, `--sui-danger-rgb`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: searchable selects, tag editors, freeform "pick-or-create" inputs.
  - API divergence from downstream: single-site `onCreateNew` is renamed to `onCreate` (aligned with the multi-site contract).
  - Example:
    ```tsx
    import { Combobox, type ComboboxOption } from "solid-ui-components";

    // Single with create-on-Enter
    <Combobox
      options={countries}
      value={country}
      onChange={setCountry}
      onCreate={(label) => addCountry({ value: slug(label), label })}
    />

    // Multi with chips
    <Combobox
      multiple
      options={tags}
      value={selectedTags}
      onChange={setSelectedTags}
      onCreate={(label) => addTag({ value: slug(label), label })}
      onRemove={(opt) => console.log("removed", opt)}
    />
    ```

## DataDisplay
- **Duration** — Atomic Primitive (Depth 1, styleless). Pure ms → text formatter wrapped in a bare `<span>` — no class, no inline style, typography inherits from the parent. Key props: `ms` (number | null | undefined; renders `"--"` for null), `verbose` (when true, forces `"4m 8s"` shape even for sub-10s durations). Format branches: `<1s` → `"123ms"`, `1–10s` → `"12.3s"`, `≥10s with hours` → `"2h 13m"`, otherwise → `"4m 8s"`. Per CONTEXT.md, the CSS-file requirement is waived for styleless Primitives — there is no styling for `Duration` to own. Use for: durations alongside relative-time captions (e.g. inside `ParticipantTimeLabel`), task runtime readouts, retry-delay displays. For range labels see `formatCompactRange`.
- **DateTimeRange** — Composite (Depth 2). Composes the `NowrapBody` Text Curried Variant; the pure formatter lives in `formatDateTimeRange` (also exported) so other Primitives can reuse the rule. Key props: `start`, `end`, `mode` (`date`|`datetime`). Use for: displaying time periods.
- **formatDateTimeRange(start, end?, mode?)** — Pure-function string helper exported alongside `DateTimeRange`. Same formatting rules. Exists so Atomic Primitives like `TitledTimeRangeHeader` can render the formatted string without composing the `DateTimeRange` Composite — Primitives cannot import library components.
- **formatCompactDuration(ms)** / **formatCompactRange(start, end)** / **formatStartTimestamp(date)** — Pure-function string helpers exported from `solid-ui-components/Duration`. Vanilla `Date` + `Intl.DateTimeFormat` (no Luxon, matching the DateRangePicker convention). `formatCompactDuration(ms)` renders deterministic compact durations (`Ns` / `Nm` / `Nh Mm` / `Nd Mh` / `Nd Mm`); no wall-clock fallback, keeps a smaller unit when the next-larger is zero (`24h30m → "1d 30m"`). `formatCompactRange(start, end)` keeps both timestamps but strips redundant date fields from the end side (same-day: `May 13 11:35 → 12:05 · 30m`; same-month: `May 13 11:35 → 14 12:05 · 1d 30m`; different month: full both sides), appends the duration via `formatCompactDuration`, and renders `end === null` as `"… → ongoing · <duration>"` (duration vs. `Date.now()`). `formatStartTimestamp(date)` exposes the `"MMM dd HH:mm"` shape for callers that mix custom JSX with `formatCompactRange` output. Use for: alarm-period labels, history lists, "zoomed to" indicators.
- **DigitRoller** — Atomic Primitive (Depth 1). Owns `DigitRoller.css`. Animated digit-by-digit value transition — direction-aware mod-10 odometer (increases roll up, decreases roll down, per-digit stagger). **Auto-rolls by default**: with no `previousValue` prop it tracks its own prior value and rolls on every `value` change; pass `previousValue` explicitly only to replay a specific transition; opt out with `animate={false}`. SURVIVAL CONTRACT: the instance must survive the value change — lists that rebuild row objects render with `<Index>`/stable keys, not `<For>` (a remount resets the history; see STYLE_GUIDE "List Identity"). Key props: `value`, `previousValue?`, `animate?` (default true), `duration`, `stagger`, `onAnimationEnd`. Use for: any animated numeric display; `CountChip` and numeric `TagPill` labels compose it automatically.
- **MetricCard** — Atomic Primitive (Depth 1). Owns `MetricCard.css`; no library-component imports. Labeled value card with optional units and color-tinted value text (`default` | `success` | `warning` | `danger`). When `units` is supplied the value uses the same monospace face as the sibling `NumberWithUnits` Primitive so numeric readouts line up. Key props: `label`, `value`, `units`, `color`. Use for: KPI/metric display tiles.
- **NumberWithUnits** — Atomic Primitive (Depth 1). Owns `NumberWithUnits.css`; no library-component imports. Monospace value paired with a faded units label, baseline-aligned on a single line. Data-driven `color` flows as inline style on the value span (allowed inside a Primitive per CONTEXT.md). Key props: `value`, `units`, `precision`, `color`. Use for: any numeric display that needs units.
- **ResultDisplay** — Atomic Primitive (Depth 1). Owns `ResultDisplay.css`; no library-component imports. Header (label + sublabel) over a value+units row with optional badge slot and trailing children area. Data-driven `valueColor` flows as inline style on the value span. Key props: `value`, `units`, `label`, `sublabel`, `badge`, `valueColor`. Use for: primary calculation results.
- **ResultPanel** — Wraps ResultDisplay in a FormulaProvider + NarrowStack. Key props: `label`, `value`, `units`, `sublabel`, `valueColor`, `badge`, `formulaProvider`. Use for: result sections that include formula/variable breakdowns.
- **StatsTable** — Simple typed data table with column definitions. Key props: `columns` (array of `StatsColumn`), `rows`, `getRowClass`, `caption`. Use for: quick statistical summary tables.
- **FormulaDecomposition** — Factory functions for compliance formula panels. Exports: `createFormulaResult`, `createGivens`, `createFormula`, `createFormulaPanel`. Key config: `FormulaConfig` with `vars`, `threshold`, `compute`, `latex`. Use for: interactive formula display with result, givens table, and LaTeX rendering.

## DataList
- **DTable** — Compact key-value data table wrapper. Use for: definition-list style data.
- **DTableWithHeader** — Data table with `<thead>` support. Key props: `header`. Use for: multi-column data tables with headers.
- **DRow** — Data table row. Key props: `border`, `highlight`. Use for: rows inside DTable.
- **DT** — Term/label cell. Key props: `muted`. Use for: left-side labels in key-value rows.
- **DD** — Value cell with variant colors. Key props: `highlight`, `success`, `primary`, `muted`, `center`. Use for: right-side values in key-value rows.
- **DH** — Header cell. Key props: `align`. Use for: column headers in DTableWithHeader.
- **DHeader** — Header row wrapper. Use for: wrapping DH cells.
- **Val** — Inline numeric display with precision and fallback. Key props: `value`, `precision`, `fallback`. Use for: formatted numbers in table cells.
- **SigFig** — Inline numeric display with significant figures. Key props: `value`, `figures`, `fallback`. Use for: scientific precision display.
- **Units** — Muted inline units suffix. Use for: appending unit text after values.
- **Badge** — Backwards-compatible wrapper around StatusBadge. Key props: `variant` (`default`|`high`|`success`|`warning`|`error`). Use for: inline badges within data lists.

## DateRangePicker
- **DateRangePicker** — Atomic Primitive (Depth 1). Owns `DateRangePicker.css`; wraps `@kobalte/core/popover` (matches the Combobox/Select/Tooltip/Toast/ThemedNumberInput Kobalte-wrapping pattern — see CONTEXT.md). Preset chips render as native `<button class="sui-drp__preset-btn">` styled by the Primitive's own CSS — no library component imports. Internal `CalendarGrid`, `CalendarHeader`, `PresetButtons`, `TimeInputs` live as private files under the component directory and are NOT re-exported (zero-config call site). Date math is vanilla `Date` + `Intl.DateTimeFormat` — no Luxon / date-fns dependency; locale-aware month and short-date formatting comes from the browser's built-in i18n. Key props: `value` (`Accessor<DateRange>`), `onChange` (`(range: DateRange) => void`), `presets?` (`DateRangePreset[]` — caller-supplied, no defaults; omit to suppress the preset row), `maxRangeDays?` (disables days beyond the cap once an anchor is selected and clamps preset/second-click selections to the same bound; non-positive values log a console error and are dropped), `placeholder?`, `class?` (appended to the default `sui-drp__trigger` class — caller styles layer on top of the default trigger styling rather than replacing it), `timeZone?` (IANA TZ identifier, e.g. `"America/Los_Angeles"`, `"UTC"` — pins the trigger label, month header, calendar-day highlighting, and committed time-of-day selections to this TZ; omit for browser-local). Exported types: `DateRangePickerProps`, `DateRange`, `DateRangePreset`. Uses `--sui-bg-primary`, `--sui-bg-elevated`, `--sui-border`, `--sui-border-bright`, `--sui-border-focus`, `--sui-accent`, `--sui-accent-rgb`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: time-range filters, alarm-investigation timespan controls, reporting period selection.
  - Formatter contract: the component formats the trigger label ("Apr 13 – Apr 20, 2026") and month header ("April 2026") itself via `Intl.DateTimeFormat` using the browser's default locale. No `formatDate` / `parseDate` props are required from callers. Timezone handling: set `timeZone` to pin the picker to a specific IANA TZ; omit for browser-local. Pinning prevents off-by-one mismatches in apps that render the rest of their timestamps in a non-local TZ (e.g. operational dashboards fixed to Pacific or UTC).
  - Selection model: first click sets the pending start, second click commits `[start, end]` via `onChange`. Presets select `[now - days, now]`. When the optional "Set time" toggle is enabled, committed ranges apply the configured `HH:mm` to both ends.
  - Example:
    ```tsx
    import { DateRangePicker, type DateRange, type DateRangePreset } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const PRESETS: DateRangePreset[] = [
      { label: "24h", days: 1 },
      { label: "7d",  days: 7 },
      { label: "30d", days: 30 },
    ];

    const now = new Date();
    const [range, setRange] = createSignal<DateRange>({
      start: new Date(now.getTime() - 14 * 86_400_000),
      end: now,
    });

    <DateRangePicker
      value={range}
      onChange={setRange}
      presets={PRESETS}
      maxRangeDays={30}
    />

    // Pin to a specific TZ (display + committed times resolved in LA)
    <DateRangePicker
      value={range}
      onChange={setRange}
      presets={PRESETS}
      timeZone="America/Los_Angeles"
    />
    ```
  - Divergences from the downstream driving sites (intentional):
    - Internal sub-components are private, not exported (downstream has them as separate `CalendarGrid` / `CalendarHeader` / `PresetButtons` / `TimeInputs` files inside the feature folder; upstream treats them as implementation details).
    - Downstream uses Luxon for weekday/month formatting and the `MMM d`/`MMMM yyyy` trigger label; upstream uses vanilla `Date` arithmetic plus `Intl.DateTimeFormat`. Behavior and layout match; the library surface does not add Luxon as a dependency.
    - Downstream uses SCSS CSS modules (`dateRangePicker.module.scss`); upstream uses a single plain CSS file (`DateRangePicker.css`) with BEM-ish `.sui-drp__*` class names and `--sui-*` tokens.

## BigNumberInput
- **BigNumberInput** — Atomic (Depth 1). Editable numeric input rendered at a large `Text variant="value"` headline size for editing a money amount in place. The `value` (`number`, controlled) is masked as localized currency via `Intl.NumberFormat` for display while `onChange` (`(n: number) => void`) always emits the parsed raw `number` — the symbol, grouping and decimal mark are locale-driven presentation, never part of the value. Format-on-blur: while focused it shows the bare editable number (no grouping) so the caret never jumps mid-edit; on blur it reformats to the masked currency string. A local string buffer mirrors the input and only re-syncs from `value` when the parsed number actually diverges, keeping it controlled and loop-free. Key props: `locale` (`string`, default `"en-US"`), `currency` (ISO-4217 `string`, default `"USD"`), `align` (`"left" | "right"`, default `"left"`), `selectOnFocus` (`boolean`, default `true` — selects all contents on focus, deferred one frame). Extends `JSX.InputHTMLAttributes` (minus `onChange`/`value`/`type`). (The pre-Intl `prefix`/`sign` static-glyph props were pruned 2026-07-15 — unused by every production consumer.) Exported types: `BigNumberInputProps`. Factory: `createBigNumberInput(defaults)` for curried variants. CSS tokens: `--sui-accent`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-space-1`. Use for: inline editing of a headline money/number figure.
  - Example:
    ```tsx
    import { BigNumberInput } from "solid-ui-components";

    <BigNumberInput value={amount()} onChange={setAmount} currency="EUR" locale="de-DE" />
    ```

## SegmentedInput
- **SegmentedInput** — Atomic (Depth 1). Single-select segmented control: a horizontal row of connected, keyboard-focusable buttons (`role="radiogroup"`) where the selected segment gets the accent treatment. Key props: `options` (`SegmentedInputOption[]`, each `{ id: string; label: string }`), `value` (`string`, the selected id), `onChange` (`(id: string) => void`), `compact` (`boolean`, default `false`). In compact mode it renders a content-width stepper (`‹ label ›`) instead of the full strip, clamped at the ends (no wrap), with chevron clicks, left/right arrow keys, and swipe (30px threshold). Extends `JSX.HTMLAttributes<HTMLDivElement>` (minus `onChange`). Exported types: `SegmentedInputProps`, `SegmentedInputOption`. Factory: `createSegmentedInput(defaults)` for curried variants. CSS tokens: `--sui-accent`, `--sui-bg-deep`, `--sui-bg-elevated`, `--sui-border`, `--sui-radius-sm/md`, `--sui-text-primary/secondary`, `--sui-space-*`. Use for: mutually-exclusive choices among a small fixed set (view toggles, filters, mode pickers).
  - Example:
    ```tsx
    import { SegmentedInput } from "solid-ui-components";

    <SegmentedInput
      options={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }]}
      value={range()}
      onChange={setRange}
    />
    ```

## RangeAmountGroup
- **RangeAmountGroup** — Atomic (Depth 2). Responsive trio of labeled amount inputs (min / standard / max): all three on one line when there's room, otherwise each on its own line — never the awkward 2+1 wrap (holy-albatross flex basis). Composes `TightStack` (Layout) and `ThemedNumberInput`. Key props: `slots` (`RangeAmountSlot[]`, each `{ label: string; value: number | undefined; onChange: (value: number | undefined) => void }` — empty labels fall back to `Min`/`Standard`/`Max`), `step` (`number`, default `0.01`, forwarded to each input), `name` (`string`, prefixes input names `name-0/1/2`). Pass `children` (`JSX.Element`) instead of `slots` to reuse the responsive container for arbitrary triple inputs (e.g. three date pickers). Extends `JSX.HTMLAttributes<HTMLDivElement>` (minus `children`). Exported types: `RangeAmountGroupProps`, `RangeAmountSlot`. Factory: `createRangeAmountGroup(defaults)` for curried variants. The stack/side breakpoint is frozen at the `--rag-break` CSS fallback (`30rem`) — no runtime prop. CSS tokens: `--rag-break`, `--sui-space-2`, `--sui-text-secondary`. Use for: min/typical/max amount ranges (budget bands, price tiers, estimate spreads).
  - Example:
    ```tsx
    import { RangeAmountGroup } from "solid-ui-components";

    <RangeAmountGroup
      slots={[
        { label: "Min", value: min(), onChange: setMin },
        { label: "p95", value: typical(), onChange: setTypical },
        { label: "Max", value: max(), onChange: setMax },
      ]}
    />
    ```

## MultiSelectFilter
- **FilterBar** — Composed (Depth 1). Owns `FilterBar.css`; composes no library components. **Progressive-disclosure filter bar: height-locked to ONE line, with every expansion rendered as an overlay, so filtering never pushes the content below it down.** That is the whole reason it exists — a chip bar that wraps reflows the page while you are using it. Promoted from the matchmaking workshop bench (spec: `docs/superpowers/specs/2026-07-28-progressive-filter-bar-design.md`). Semantics are **OR within a dimension, AND across dimensions**, and an empty/absent group means *all* — the same empty-means-all convention as `MultiSelectFilter`, so the two interoperate and a consumer's cross-filtering state layer needs no translation. **Presentational and controlled**: it never sees rows and holds no filter state; the caller derives `filters` from its own selection and applies the callbacks. Key props: `filters` (`FilterGroup[]` — the ACTIVE groups only), `availableDimensions` (`{id,label}[]`), `scopeLabel`, `onRemoveFilter`, `onAddTerm`, `onRemoveTerm`, `onClearAll`. Exported types: `FilterBarProps`, `FilterGroup`, `FilterMember`. **`FilterMember.count` is optional** and should be omitted rather than guessed: an honest facet count for a member of dimension *d* must be computed with *d*'s own filter excluded, or every unselected member of an active dimension reads 0 and the picker looks broken exactly when someone is switching selections. **"Added but empty" is internal state.** Picking a dimension from `(+)` shows its group and focuses the combobox, but that is a disclosure detail, not a filter — it is never reported to the caller, so a consumer serialising filter state (e.g. to a URL) never encodes a half-made filter. There is deliberately no `onAddFilter`. **Three overflow tiers**, all so the height lock can never hide an active filter: ≤2 terms render inline as lozenges; more collapse to a count chip that opens the overlay; and when the collapsed chips still overrun the line, trailing GROUPS collapse into a `+N` chip whose overlay lists them, each reachable and removable. The third tier is a width decision and is measured through `internal/dom/observeSize` (same approach as `OverflowNav`: cache natural widths, recompute against the container). Without it, a row that is `overflow: hidden` would silently clip active filters — invisible, unremovable, and still filtering, which is worse than the reflow the bar replaces. `INLINE_TERM_LIMIT` is a constant, not a prop: how the bar degrades is the bar's own business and a prop would invite call sites to disagree. Own-dimension exclusion (a tile ignoring its own dimension's filter) belongs to the consumer's query layer, not here — the bar cannot do it, and correspondingly it always offers a dimension's FULL member list minus terms already chosen, so switching a selection is always possible. Use for: a page-level faceted filter over many dimensions whose state several tiles read from.
- **MultiSelectFilter** — Atomic (Depth 1). Responsive multi-select that renders as a horizontal chip/button bar when the container is wide enough to fit all options, and collapses to a dropdown popover with checkmarks when it isn't (measured via `ResizeObserver`); same data model either way. Composes Layout variants (`GrowClusterRow`, `GrowWrapRow`, `GrowBox`, `ActionSlot`). Selection semantics: an empty `selected` array means "all" (no filter applied, no separate "all" chip) — clicking an inactive chip with an empty selection focuses to just that one (replaces), clicking another inactive chip while some are selected adds it, and clicking an active chip toggles it off (possibly returning to empty=all). Key props: `options` (`readonly MultiSelectOption[]`, each `{ value: string; label?: string }` — label falls back to value), `selected` (`readonly string[]`), `onChange` (`(next: string[]) => void`), `label` (`string`, rendered left of the control), `allLabel` (`string`, default `"all"`, shown in the collapsed trigger when nothing is selected). (Bar-vs-menu fit uses a fixed ~90px-per-option estimate; the `optionWidthEstimate` tuning prop was pruned 2026-07-15 — no production caller ever set it.) Exported types: `MultiSelectFilterProps`, `MultiSelectOption`. No factory / curried variants. CSS tokens: `--sui-accent`, `--sui-accent-hover`, `--sui-bg-base/elevated/hover`, `--sui-border`, `--sui-border-strong`, `--sui-text-primary/muted`. Use for: a compact category/status filter that adapts to available width in toolbars and filter bars.
  - Example:
    ```tsx
    import { MultiSelectFilter } from "solid-ui-components";

    <MultiSelectFilter
      label="Status"
      options={[{ value: "open" }, { value: "closed" }, { value: "wip", label: "In progress" }]}
      selected={statuses()}
      onChange={setStatuses}
    />
    ```
  - Building a filter bar that drives breakdown tables? See **Patterns → Cross-filtering breakdown tiles** and its bench; the empty-means-all convention above is load-bearing there.

## Dropdown
- **Dropdown** — Atomic (Depth 1). Trigger button plus popover listbox for single selection, with full keyboard support: roving-tabindex options, ArrowUp/Down to open and move focus, Home/End, Escape and click-outside to close (refocusing the trigger), and Tab to leave the widget. Global mousedown/keydown listeners live only while open. Key props: `items` (`DropdownItem[]`, each `{ id: string; label: string; color?: string; shape?: Shape }` — a color alone renders as an indicator dot; adding a `shape` (the chart `Shape` union) renders that shape as the indicator instead, in the trigger and the menu alike, for identities that are double-coded colour *and* shape so they survive small sizes, colour-blindness and greyscale), `value` (`string`, the selected id), `onChange` (`(id: string) => void`), `placeholder` (`string`, default `"Select..."`), `footer` (`JSX.Element`, e.g. an "Add new" action rendered below the list), `size` (`"sm" | "md"`, default `"md"`), `subtle` (`boolean` — trigger looks like read-only text until hovered), `class` (`string`). Exported types: `DropdownItem`, `DropdownProps`, `DropdownOverrides`, `DropdownDataProps`. Factory: `createDropdown({ size, subtle })`; curried variant **`InlineSubtleDropdown`** (`size:"sm"`, `subtle:true`) — the compact inline picker that reads as plain text until hovered. Use for: single-value selection with optional color indicators and a menu footer action (status pickers, category selectors). Theming: `Dropdown.css` owns its colors via `--sui-*` tokens (like Button/NavLink/PopoverMenu), so it adapts to any loaded theme with zero per-theme rules — trigger `color: var(--sui-text-primary)`, opaque menu `background: var(--sui-bg-elevated)` + `border: var(--sui-border-bright)` + plain elevation shadow, `--subtle` transparent-until-hover reading legible text. (The token-driven color layer was added 2026-07-20; before that the component CSS was structural-only, leaving the trigger dark-on-dark and the menu transparent under every theme except `hud`, which ships its own explicit dropdown skin that still wins under hud.)
  - Example:
    ```tsx
    import { Dropdown } from "solid-ui-components";

    <Dropdown
      items={[
        { id: "todo", label: "To do", color: "#888" },
        { id: "done", label: "Done", color: "#3c9" },
      ]}
      value={status()}
      onChange={setStatus}
    />
    ```

## DayOfMonthPicker
- **DayOfMonthPicker** — Atomic (Depth 1). Compact calendar-style ARIA grid (`role="grid"` / `role="gridcell"`) for picking a day of the month, composed from the Layout `Grid` primitive as `repeat(7, var(--dom-cell-size, 3.5rem))` with `gap="xs"`; the selected cell gets the accent treatment. Key props: `value` (`number | "last" | null`), `onChange` (`(day: number) => void`, required), `max` (number, default 31 — capped to 28 in lastOfMonth mode), `lastOfMonth` (boolean — replaces the 29/30/31 slots with one wide "Last of month" cell that avoids the short-month scheduling trap), `onSelectLast` (`() => void`, fired when that cell is clicked and shown selected when `value === "last"`). Cell size is frozen at the `--dom-cell-size` CSS fallback (`3.5rem`) — no runtime prop. Spreads remaining `JSX.HTMLAttributes<HTMLDivElement>` (minus `onChange`). Exports type `DayOfMonthPickerProps` and factory `createDayOfMonthPicker(defaults)` for curried variants. CSS tokens: `--sui-accent`, `--sui-bg-deep`, `--sui-bg-elevated`, `--sui-bg-primary`, `--sui-border`, `--sui-radius-sm`, `--sui-text-primary`. Use for: monthly recurring-schedule day selection, day-of-month filters.
  - Example:
    ```tsx
    import { DayOfMonthPicker } from "solid-ui-components";
    const [day, setDay] = createSignal<number | "last" | null>(9);
    <DayOfMonthPicker
      value={day()}
      lastOfMonth
      onChange={(d) => setDay(d)}
      onSelectLast={() => setDay("last")}
    />
    ```

## DayOfWeekPicker
- **DayOfWeekPicker** — Atomic (Depth 1). A 7-cell single-select ARIA grid row for Sun..Sat, sibling of DayOfMonthPicker and sharing its `--dom-cell-size` sizing so the two read as a family; composed from the Layout `Grid` primitive as `repeat(7, var(--dom-cell-size, 3.5rem))` with `gap="xs"`. Cells are labeled `Sun Mon Tue Wed Thu Fri Sat`; the selected cell gets the accent treatment. Key props: `value` (`number | null`, 0=Sun..6=Sat), `onChange` (`(day: number) => void`, required, receives the 0..6 index). Cell size is frozen at the shared `--dom-cell-size` CSS fallback (`3.5rem`) — no runtime prop. Spreads remaining `JSX.HTMLAttributes<HTMLDivElement>` (minus `onChange`). Exports type `DayOfWeekPickerProps` and factory `createDayOfWeekPicker(defaults)` for curried variants. CSS tokens: `--sui-accent`, `--sui-bg-deep`, `--sui-bg-elevated`, `--sui-bg-primary`, `--sui-border`, `--sui-radius-sm`, `--sui-text-primary`. Use for: weekly recurring-schedule day selection, weekday filters.
  - Example:
    ```tsx
    import { DayOfWeekPicker } from "solid-ui-components";
    const [dow, setDow] = createSignal<number | null>(1);
    <DayOfWeekPicker value={dow()} onChange={setDow} />
    ```

## MonthOfYearPicker
- **MonthOfYearPicker** — Atomic (Depth 1). Compact ARIA grid for picking a month of the year (1..12), the natural sibling of DayOfMonthPicker in the same visual language; composed from the Layout `Grid` primitive as `repeat(4, var(--moy-cell-size, 3.5rem))` with `gap="xs"`. Cells are labeled `Jan..Dec`; the selected cell gets the accent treatment. Key props: `value` (`number | null`, 1..12), `onChange` (`(month: number) => void`, required, receives 1..12). Cell size is frozen at the `--moy-cell-size` CSS fallback (`3.5rem`) — no runtime prop. Spreads remaining `JSX.HTMLAttributes<HTMLDivElement>` (minus `onChange`). Exports type `MonthOfYearPickerProps` and factory `createMonthOfYearPicker(defaults)` for curried variants. CSS tokens: `--sui-accent`, `--sui-bg-deep`, `--sui-bg-elevated`, `--sui-bg-primary`, `--sui-border`, `--sui-radius-sm`, `--sui-text-primary`. Use for: yearly/annual-schedule month selection, month-of-year filters.
  - Example:
    ```tsx
    import { MonthOfYearPicker } from "solid-ui-components";
    const [month, setMonth] = createSignal<number | null>(4);
    <MonthOfYearPicker value={month()} onChange={setMonth} />
    ```

## WeekCalendar
- **WeekCalendar** — Composite (Depth 2). Pure weekly time-grid layout primitive: a left time gutter with hourly marks plus one column per day, each holding absolute-positioned block slots. Owns its CSS, imports no other components, and delegates block content entirely to a caller-supplied `renderBlock` callback. Times follow the dside convention where bare hours 1–8 are treated as PM (parsed via the exported `parseWeekCalendarTime`). Key props: `days` (string[], column identities), `startHour`/`endHour` (numbers; `endHour` may be fractional like 16.5), `blocks` (`WeekCalendarBlock[]`, each `{ day; startAt: "H"|"H:MM"; durationInHrs; key? }`), `renderBlock` ((block) => JSX.Element), `pxPerHour` (default 60), `dayLabel` (optional `(day, index) => JSX.Element` custom header), `highlight` (`WeekCalendarHighlight | null` — `{ day, startAt }` to flag one block), `gutterWidth` (default 56), `headerHeight` (default 24), `class`. Reactive to `pxPerHour` so a consumer can scale the grid live (e.g. via ResizeObserver). Exported types: `WeekCalendarProps`, `WeekCalendarBlock`, `WeekCalendarHighlight`. Factory: `createWeekCalendar(defaults)` returns a pre-configured component. Exported helper: `parseWeekCalendarTime`. CSS tokens: `--sui-accent`, `--sui-accent-rgb`, `--sui-border`, `--sui-text-primary`, `--sui-text-muted`. Use for: schedule/agenda views, design-session planners, any per-day time-block layout.
  - Example:
    ```tsx
    import { WeekCalendar, type WeekCalendarBlock } from "solid-ui-components";

    const blocks: WeekCalendarBlock[] = [
      { day: "Mon", startAt: "9:00", durationInHrs: 1.5 },
      { day: "Wed", startAt: "2", durationInHrs: 2 }, // 2 → 2 PM (dside convention)
    ];

    <WeekCalendar
      days={["Mon", "Tue", "Wed", "Thu", "Fri"]}
      startHour={8}
      endHour={17}
      blocks={blocks}
      renderBlock={(b) => <div>{b.day} · {b.startAt}</div>}
    />
    ```

## FormComposite
- **FormComposite** — Composite (Depth 2, zero CSS). Composes the `AutoStackRow` / `AutoStackItem` Layout primitives — owns only layout (grouping, gap, responsive stacking), never field internals, so field components stay independent and standalone. Slot-based form layout `[[identity][amounts][schedule]]`: `identity?` holds the fields that read the same across variants (name + a single amount), `amounts?` holds an atomic min/typical/max trio kept together between identity and schedule, `schedule?` holds the curry-varying picker (day-of-month, weekday, payday, …). Each provided slot is wrapped in an `AutoStackItem` with class `sui-form-composite__{identity,amounts,schedule}`. Blocks sit side by side when there's room and stack otherwise. Props (extends `JSX.HTMLAttributes<HTMLDivElement>`): `identity?`, `amounts?`, `schedule?` (all `JSX.Element`), `breakWidth?` (CSS length below which blocks stack, default `"38rem"`), `stacked?` (force fully-stacked arrangement at every width). `createFormComposite(defaults)` factory for curried variants. Use for: recurring-payment / schedule forms where a name+amount block pairs with a variant-specific cadence picker.
  - Example:
    ```tsx
    import { FormComposite } from "solid-ui-components";
    <FormComposite
      identity={<><NameInput value={name()} onInput={setName} /><AmountInput value={amt()} /></>}
      schedule={<DayOfMonthPicker value={day()} onChange={setDay} />}
    />
    ```

## Divider
- **Divider** — Content separator line (own component directory). Key props: `orientation` (`horizontal`|`vertical`), `variant` (`solid`|`dashed`|`dotted`), `spacing` (`sm`|`md`|`lg`). Use for: visual separation between content blocks.

## Dot
- **Dot** — Atomic (Depth 0). Generic colored indicator dot — caller supplies any CSS color via the `color` prop (hex, rgb, `var(--…)`, named color). Domain-agnostic, no variants. Use when `StatusLight`'s fixed variant set doesn't fit — e.g., severity palettes mapped to arbitrary hex colors from a caller-supplied scheme, chart-series legends rendered alongside other labels, etc. Key props: `color` (required CSS color string), `size` (number of px; default `8`). Renders an `aria-hidden` `<span>` with `border-radius: 50%`, `flex-shrink: 0`, `display: inline-block`. Owns `Dot.css`.
  - Example:
    ```tsx
    import { Dot } from "solid-ui-components";

    <Dot color="#f59e0b" />
    <Dot color="var(--sui-danger)" size={10} />
    ```

## Feedback
- **AlertBox** — Status-colored alert with title, description, and action slot. **The base is NOT exported — `import { AlertBox }` does not work.** Key data props: `title`, `description`, `action`. Override prop (baked at definition time): `variant` (`info`|`warning`|`success`|`danger`). Factory: `createAlertBox`. Curried Variants: `InfoAlert`, `WarningAlert`, `SuccessAlert`, `DangerAlert`. Use for: warnings, errors, success messages, info banners.
- **EmptyState** — Centered placeholder with icon and message. The exported `EmptyState` is itself a curried variant (nothing baked), so it takes **data props only**: `message`, `icon`. Override props (baked at definition time, NOT accepted at the call site): `variant` (`default`|`muted`|`accent`), `size` (`sm`|`md`|`lg`). Factory: `createEmptyState`. Curried Variants: `EmptyState`, `MutedEmptyState`. Use for: empty lists, no-data states, loading placeholders.
- **InlineChartErrorOverlay** — Absolute-positioned overlay for chart error states. Key props: `title`, `subtitle`. Use for: overlaying error messages on chart areas.

## Legend
- **Legend** — Atomic (Depth 1). Data-driven row (or column) of color-swatch + label pairs. Domain-agnostic: caller supplies any `{ color, label }` list; the swatch's background is the only place caller-supplied color is applied (inline on the swatch element). All layout/spacing/typography lives in the component's CSS. Key props: `items` (`LegendItem[]`, required), `orientation` (`horizontal`|`vertical`, default `horizontal` — horizontal wraps on overflow), `swatchSize` (number → px, or any CSS length; default 12px via `--sui-legend-swatch-size`), `class` (appended), `highlightedLabel` (controlled highlight — string matched against `item.label`, or `null`), `onItemHover` (`(label: string | null) => void` — fires once with label on enter, once with `null` on leave). Highlight matches by `label`, so items must have unique labels for highlight binding to behave sensibly. Highlighted item gets an outline + brightness bump via `.sui-legend__item--highlighted` (outline-based, no layout shift); override the outline color with `--sui-legend-highlight-outline`. Exported types: `LegendProps`, `LegendItem`. Uses `--sui-border`, `--sui-text-secondary`, `--sui-font-family`, `--sui-legend-highlight-outline`. Use for: explaining a color encoding in a chart, heatmap, dot-chart, or any other visualisation (chart series, category tiers, severity buckets, etc.) — and for two-way hover linking between the legend and a paired visual.
  - Example:
    ```tsx
    import { Legend } from "solid-ui-components";

    <Legend
      items={[
        { color: "#3b82f6", label: "Revenue" },
        { color: "#10b981", label: "Profit" },
        { color: "#f59e0b", label: "Costs" },
      ]}
    />
    ```
  - Two-way hover binding:
    ```tsx
    const [hovered, setHovered] = createSignal<string | null>(null);
    <Legend
      items={items}
      highlightedLabel={hovered()}
      onItemHover={setHovered}
    />
    // a paired chart can also call setHovered(label)/setHovered(null)
    // and read hovered() to highlight its own corresponding element
    ```

## Heatmap
- **Heatmap** — Grid of status-colored cells (full/partial/missing/empty) with row and column labels. Key props: `rows` (array of `HeatmapRow`), `columnLabels`, `variant` (`default`|`compact`|`sparkline`), `showLegend`, `showTooltips`, `onCellClick`. Use for: data completeness grids, coverage matrices.
- **HeatmapMulti** — Multi-category heatmap where each cell contains stacked status bars per category. Key props: `rows` (array of `HeatmapMultiRow`), `categoryLabels`, `columnLabels`, `variant` (`default`|`compact`|`sparkline`|`expanded`), `showLegend`, `onCellClick`. Use for: multi-dimension data completeness (e.g., vessel call coverage by data type).

## HeatStack
- **HeatStack** — Vertical stack of items with status cells per key (earliest at bottom). Key props: `items` (array of `HeatStackItem`), `keys`, `variant` (`default`|`compact`), `showLegend`, `showLabels`, `onItemClick`. Use for: chronological data completeness stacks with compact hover preview.

## HeatStream
- **HeatStream** — Transposed stream: keys as rows, items as columns (earliest left). Key props: `items` (array of `HeatStreamItem`), `keys`, `variant` (`default`|`compact`), `showLegend`, `showLabels`, `onItemClick`. Use for: horizontal timeline-style data completeness.

## HeatStreamGrid
- **HeatStreamGrid** — Table where each cell contains a compact HeatStream. Key props: `rows`, `columns`, `keys`, `data` (function returning items per row/col), `onCellClick`, `selectionStore`. Use for: asset-by-time-window data completeness matrices with selection support.

## Icon
- **Icon** — SVG icon component with 45 named icons across 8 groups (status, navigation, data, time, actions, UI, auth, cache; includes `pause`, `agent`, `dependency`, `edit`, `trash`, `gear`, `zoom-in`, `zoom-out`). **`gear` and `settings` are different glyphs**: `gear` draws six teeth on a rim around a hub hole, and `settings` draws a hub with eight rays. Reach for `gear` when the affordance opens configuration, because a reader finds a gear by the teeth; `settings` reads as a sun or a brightness mark. **`zoom-in` and `zoom-out` extend the `search` family**: they keep the `search` lens and handle, and add a plus or a minus inside the lens. Reach for the pair for any scale control, such as a chart axis that fits to the visible data or to all of it. Key props: `name` (e.g., `check`, `warning`, `chevron-down`, `search`, `spinner`), `variant` (`outline`|`solid`), `size` (`xs`|`sm`|`md`|`lg`|`xl`). `variant`/`size` are Overrides — curry them via `createIcon`; **`InlineMetaIcon`** (outline, xs) is the shipped variant for icon-beside-sublabel meta rows. Use for: all iconography. Spinner icon auto-animates.

## Checkbox
- **Checkbox** — Atomic boolean control: a native `input[type=checkbox]` (visually hidden) behind a themed box + checkmark, with an optional inline label. Mirrors the `Toggle` API so the two are interchangeable. Key props: `checked`, `size` (`sm`|`md`|`lg`), `color` (`ColorVariant`, tints the checked fill), `label`, `labelPosition` (`left`|`right`), `onCheckedChange(checked)` (value handler) plus all native `<input>` attributes and `onChange`. Uses `--sui-accent`, `--sui-border`, `--sui-success`, `--sui-danger`, `--sui-bg-deep` tokens. Curried: `createCheckbox(defaults)`, `SmallCheckbox`, `DoneCheckbox`. Use for: standalone checkboxes (do NOT hand-roll an `<input type=checkbox>`).
- **CheckboxField** — Form-field row: the `Checkbox` control + a clickable label and optional `hint` line, tied together by `id`. Zero-config call site — pass only data + a handler. Key props: `id`, `label`, `hint`, `checked`, `disabled`, `size`, `color`, `onChange`, `onCheckedChange`. Uses `--sui-text`, `--sui-text-muted` tokens. Use for: checklists and settings rows.
  - Example:
    ```tsx
    import { CheckboxField } from "solid-ui-components";
    <CheckboxField id="ci" label="Wire up CI" hint="Lint + test on push"
      checked={done()} onChange={() => setDone((d) => !d)} />
    ```

## FileDropZone
- **FileDropZone** — Composite (Depth 2, owns minimal structural CSS: the dashed outline, its drag-over/disabled states, and the density padding — same documented exception as `Fab`). A drop target that is also a click-to-browse picker, keyboard-operable (Enter/Space) and screen-reader-labelled. Pure INPUT surface: it validates the extension, shows a self-clearing rejection notice (`PDF only — drop a .pdf file`, derived from `accept`), and hands the file to the caller; upload, parsing, progress, and results are the caller's. Curried variants: `FileDropTarget` (a file tool's empty state) and `CompactFileDropTarget` (tucked into an existing banner/toolbar row). Key props: `accept` (dotted lowercase extensions, e.g. `[".pdf"]` — drives both the browse filter and the notice), `onFile` (`(file: File) => void`), `label` (the one-line prompt, in the caller's domain words), `disabled?`. Override prop (baked into the variants): `density`. Types: `FileDropZoneProps`, `FileDropZoneOverrides`, `FileDropZoneDataProps`. Use for: OCR/import/upload tools — anywhere a file enters the app.

## Inputs
- **ThemedInput** — Styled text input with optional label. Key props: `label`, plus all native `<input>` attributes. Use for: themed form text inputs.
- **ThemedNumberInput** — Themed numeric field built on `@kobalte/core/number-field` with stacked increment/decrement triggers. Key props: `value` (`Accessor<number | undefined>`), `onChange` (`(value: number | undefined) => void`), `name`, `label`, `description`, `errorMessage`, `min`, `max`, `step` (default `1`), `size` (`"sm" | "md"`, default `"md"`). Friendly names `min`/`max` map to kobalte's `minValue`/`maxValue`; any other `NumberFieldRootProps` (e.g. `disabled`, `required`, `format`, `formatOptions`, `changeOnWheel`) is forwarded via spread. When `errorMessage` is set, the field renders in invalid state and suppresses the description. Kobalte emits `NaN` on clear — normalized to `undefined` before `onChange`. `size="sm"` is the toolbar size: a 29px-tall field that lines up with `Button size="sm"` / `Dropdown size="sm"`; the default `md` is 43px and is the tallest control in the family, so a compact row needs `sm` or the number input sets the row height. Uses `--sui-bg-secondary`, `--sui-border`, `--sui-border-focus`, `--sui-accent`, `--sui-accent-rgb`, `--sui-danger`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: numeric form fields (RPM, counts, thresholds, bounded parameters).
  - Example:
    ```tsx
    import { ThemedNumberInput } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const [rpm, setRpm] = createSignal<number | undefined>(undefined);

    <ThemedNumberInput
      name="rpm"
      label="Engine RPM"
      description="Target steady-state RPM."
      value={rpm}
      onChange={setRpm}
      min={0}
      max={10000}
      step={50}
    />
    ```
- **CurrencyInput** — Curried variant of `ThemedNumberInput` (Depth 1). Owns `CurrencyInput.css`; composes `ThemedNumberInput` + the shared `fieldWidthForChars` util. A money-amount field: the Primitive's stepper + keyboard semantics, plus USD currency masking (`formatOptions: { style: "currency", currency }`) and a **fixed width capped to the widest expected value** so it never stretches to fill its column. The cap is **derived, not magic** — `"$10,000,000,000.00"` is 18 chars → `18 × 0.62rem + 4rem` stepper chrome = **15.16rem** (via `currencyWidthRem`/`fieldWidthForChars`). Tabular figures keep the masked digits from reflowing as you type. Key props: everything `ThemedNumberInput` takes (`value`, `onChange`, `name`, `label`, `min`, `max`, `step`, `errorMessage`, `description`) **plus** `maxValue?` (default `$10,000,000,000` — drives both the width cap and kobalte's `maxValue` unless `max` is set) and `currency?` (ISO-4217, default `"USD"`). Locale is the app's i18n default (en-US). Exports the `currencyWidthRem(maxValue?)` helper for sharing the exact rem cap. Use for: any money input — pick a smaller `maxValue` for a tighter column. **This is the curried money field; do not configure `ThemedNumberInput` with `formatOptions` at the call site.**
  - Example:
    ```tsx
    import { CurrencyInput } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const [amount, setAmount] = createSignal<number | undefined>(0);

    <CurrencyInput name="amount" label="Amount ($)" value={amount} onChange={setAmount} />
    // narrower cap for a column that never exceeds a million:
    <CurrencyInput name="fee" maxValue={1_000_000} value={amount} onChange={setAmount} />
    ```
- **ThemedTextarea** — Styled textarea with optional label. Key props: `label`, plus all native `<textarea>` attributes. Use for: themed form textareas.

### Element measurement convention

Any component that measures an element with a `ResizeObserver` and writes the result to a signal **must** go through `observeSize(el, onSize)` from `src/internal/dom/observeSize` — never `new ResizeObserver(...)` directly. Writing a signal synchronously inside the observer callback re-renders during the browser's notification-delivery phase, which mutates layout, re-queues the observer in the same frame, and makes the browser emit *"ResizeObserver loop completed with undelivered notifications."* `observeSize` change-guards (an unchanged rounded box size never reaches the callback) and rAF-defers with coalescing (only the newest measurement lands per frame, so there is no lag behind a drag — unlike a debounce). It returns a disposer for `onCleanup`, and is a no-op where `ResizeObserver` is undefined, so callers need no SSR/jsdom guard of their own.

The callback may ignore the supplied size and re-measure the element itself (`clientWidth`, `scrollHeight`, …) — the size argument governs *when* the callback runs, not what it must use. Two consequences to design around: sizes are **rounded**, and a measurement lands **one frame after** the resize (and not at all while the tab is hidden, since `requestAnimationFrame` is frozen — it lands when the tab is next rendered). **Every** measuring component routes through it — `src` contains exactly one `new ResizeObserver`, inside the primitive itself. Treat a raw `new ResizeObserver` in a review as a defect. Where a component needs to watch several elements (`ScrollRegion` watches its viewport and its content wrapper; `BucketQueue` watches its root, row, header and empty strip), call `observeSize` once per element and dispose each; every element then gets its own change-guard. To re-point at a swapped-in element, dispose that slot's observation and start a fresh one — a new observation always delivers its first measurement, so re-pointing re-measures.

**If the callback measures the BORDER box** (`offsetHeight`), pass `{ box: "border-box" }` as the third argument. Default content-box observation does not fire when only padding or a border changes, so a themed padding change — or a consumer's render slot swapping its own padding — would silently stop updating the component: no error, no warning, just stale metrics. Observe the box you measure. The change-guard and rAF coalescing apply on every path, so the option changes only *when* the observer fires.

### Fixed-width fields convention

Fields whose rendered content has a **known maximum width** should reserve exactly that space and never flex to fill their column. The shared rule lives in `src/internal/fieldWidth` — `fieldWidthForChars(chars, chromeRem)` returns a rem cap of `chars × 0.62rem + chromeRem` (rounded up), where `0.62rem` is a generous tabular-glyph advance at the body font size. **Always pair the cap with `font-variant-numeric: tabular-nums`** so the per-char estimate holds. Currently width-capped:

| Field | Max content | Cap | Source |
|---|---|---|---|
| `CurrencyInput` | `maxValue` formatted (default `$10B` = 18 chars) + stepper | `15.16rem` (default) | `currencyWidthRem` → `fieldWidthForChars(18, 4)` |
| `MoneyCell` | `maxValue` formatted (default `$10B`) + cell padding; `maxValue={null}` opts out | `15.16rem` (default) | `fieldWidthForChars(18, 0.5)` |
| `DatePicker` | fixed ISO `YYYY-MM-DD` (10 chars) + caret icon | `8.75rem` | hand-sized in `DatePicker.css`, tabular |

New fixed-width fields (fixed codes, capped numerics) should derive their cap from `fieldWidthForChars` rather than picking a magic rem.

## Layout
- **Stack** — Flex-column container. Key props: `gap` (`xs`|`sm`|`md`|`lg` — 4/8/12/16px), `align`, `justify`, `fill` (`height: 100%; min-height: 0` — forwards height through so a scrolling child like a `fill` BaseTable has concrete height). Use for: vertical stacking of elements.
- **Row** — Flex-row container. Key props: `gap` (`xs`|`sm`|`md`|`lg` — 4/8/12/16px), `align`, `justify`, `wrap`, `fill` (`width: 100%; min-width: 0` — forwards width through, the horizontal mirror of `Stack` `fill`). Use for: horizontal arrangement of elements.
- **Box** — Flex child with grow/shrink control. Key props: `grow`, `shrink`. Use for: controlling flex item sizing.
- **ResizableContainer** — Container with draggable edge handles for manual resize. Key props: `directions` (array of `"top"`|`"right"`|`"bottom"`|`"left"`, default `["right", "bottom"]`), `minWidth`/`maxWidth`/`initialWidth`, `minHeight`/`maxHeight`/`initialHeight`, `onResize` (called with `{ width, height }` during drag), `gridMode` (skip inline width/height when parent grid controls sizing), `externalWidth` (accessor that syncs internal width from an external source). Exports `ResizeDirection` and `ResizeDimensions` types. Use for: side panels, resizable columns, draggable split views. Uses `--sui-accent-rgb` for handle hover color. Note: the `onResize` callback intentionally uses the `{ width, height }` object shape rather than positional `(width, height)` arguments — this is the upstream-canonical signature; downstream callers using the legacy positional form must adapt.
- **NestedList / NestedListItem** — Layout Primitive (Depth 1). Owns `NestedList.css`, imports no other component. **The library's hierarchical-indent primitive — "this row is one level deeper than that row".** `NestedList` is the `role="list"` container (use it once, at the root); `NestedListItem` is one `role="listitem"` row carrying `aria-level`, indented one **`--sui-space-3` (12px)** step per ancestor with a **1px `--sui-border` guide rail at each ancestor's position**. Both are **no-config shells** (like `AutoStackRow` / `ProportionalStack`) — every prop is per-instance data, so there is nothing to curry and no factory.
  - **Recursive by construction.** Depth comes from a Solid context the item provides to its own `subtree`, so a recursive render function is *just the component wrapping itself* — no `level` integer threaded through call sites, no wrapper element for the consumer to get wrong. `subtree` is emitted inside the item's own nested `role="list"`.
  - **Explicit `level` for flat lists.** `level` is 1-based and is the literal `aria-level` value (what you pass is what the DOM carries), so a virtualised list rendering row 4000 without its ancestors mounted can state its depth directly. An explicit `level` **re-seeds** the context, so any subtree continues from it. Level 1 = root = **zero indent, zero rails**. Values below 1 clamp to 1 rather than emitting a dead modifier class (guarded by `assertModifierClass`).
  - **ARIA: `list`/`listitem`, deliberately NOT `tree`/`treeitem`.** WAI-ARIA 1.2 lists `aria-level`, `aria-posinset` and `aria-setsize` as `listitem`'s supported properties — nested lists are their canonical use — so assistive tech receives **exact** depth no matter how few pixels the indent spends. `role="tree"` would also carry `aria-level`, but it owes the full tree keyboard contract (roving tabindex, arrow navigation, Home/End, typeahead, expand/collapse); this Primitive owns neither focus nor selection, so it would be promising navigation that does not exist. **`aria-expanded` is likewise NOT emitted** — it is unsupported on `listitem` and belongs on the consumer's own disclosure *control* (the twisty `<button>` inside the row), not on the row. To tie that button to what it collapses: give the `NestedListItem` an `id`, and its nested group is emitted as `id="<id>-group"` — point the button's `aria-controls` there. Deterministic, and no extra prop. `setSize` / `posInSet` are emitted **only when supplied**: with a complete DOM the AT computes them, and guessing would be worse than omitting them.
  - **Deep nesting degrades, it does not break.** The visual indent is capped at `NESTED_LIST_MAX_INDENT_STEPS` (**8** steps = 96px) so a depth-30 node keeps its full content width. Past the cap the row stops moving right, gains `data-capped="true"` plus the `--capped` modifier (a **dashed** vertical rule at the content edge — a dash pattern, not a hue, so it survives a monochrome or colourblind theme), and **`aria-level` keeps counting exactly**.
  - **Why 12px.** `ThreadGroup` spends 24px per level because raw whitespace is its only depth cue. Here the rails carry the signal, so the step only has to keep two rails apart and out-read ordinary spacing: 12px is the smallest 4px-grid step that is 1.5× the `sm` (8px) gap used between sibling elements — a level shift can never be misread as a gap — and it halves the horizontal cost, so depth 8 is 96px instead of 192px. That is the constraint that bites in a ~380px side rail.
  - **Relationship to the other insets** (`ThreadGroup`'s `depth × 24px`, `IndentedGhostRow`'s one-step inset, `Section`'s `indent`): those are **visual** insets and convey nothing to assistive tech; this is a **semantic hierarchy** primitive. They are not re-expressed on top of it — see the note under `ThreadGroup`. **Reach for `NestedList` for any new tree/hierarchy.**
  - Key props (`NestedListItem`): `level?` (number, 1-based; omit inside a recursive render), `subtree?` (`JSX.Element` — descendants; pass `undefined` for a leaf, an empty `subtree` would emit a list with no items), `setSize?`, `posInSet?`, plus native `<div>` attributes. `NestedList` takes native `<div>` attributes only (give it an `aria-label`). Exported types: `NestedListProps`, `NestedListItemProps`. Exported constant: `NESTED_LIST_MAX_INDENT_STEPS`. Uses `--sui-space-3`, `--sui-border`. Use for: work-breakdown / task trees, file and folder rails, comment-thread outlines, org charts as lists, any dense hierarchy in a narrow panel.
  - Example — the recursive form (note the absence of any depth bookkeeping):
    ```tsx
    import { NestedList, NestedListItem } from "solid-ui-components";
    import { For, type Component } from "solid-js";

    const WorkNode: Component<{ node: Work }> = (p) => (
      <NestedListItem
        subtree={
          p.node.children.length
            ? <For each={p.node.children}>{(c) => <WorkNode node={c} />}</For>
            : undefined
        }
      >
        <SpreadRow>
          <TextSublabel>{p.node.title}</TextSublabel>
          <SmStatusBadge variant={p.node.status} label={p.node.status} />
        </SpreadRow>
      </NestedListItem>
    );

    <NestedList aria-label="Work breakdown">
      <For each={roots}>{(r) => <WorkNode node={r} />}</For>
    </NestedList>
    ```
  - Example — the flat / virtualised form:
    ```tsx
    <NestedList aria-label="Work breakdown">
      <For each={visibleRows()}>
        {(r) => (
          <NestedListItem level={r.depth + 1} posInSet={r.index + 1} setSize={totalRows()}>
            <TextSublabel>{r.title}</TextSublabel>
          </NestedListItem>
        )}
      </For>
    </NestedList>
    ```
- Curried variants: `TightStack`, `NarrowStack`, `SpacedStack`, `ContentStack`, `CenteredStack`, `ConversationStack` (capped reading-width column tuned for multi-participant chat trees — `max-width: 110ch`, conversation typography), `SmRegion`, `MdRegion`, `LgRegion`, `SpreadRow`, `TightSpreadRow` (4px-gap, baseline-aligned key+count row for compact data displays — pairs with `ChipLabel` + `CountText`), `ClusterRow`, `WrappedClusterRow` (center-aligned cluster that wraps on overflow — for header rows where a name + timestamp pair must collapse onto a second line on narrow widths), `ActionSlot`, `GrowBox` (the "growing column" — `flex: 1 1 0%` + `min-width: 0`; fills remaining space while letting fixed siblings keep their width, and shrinks past its content so wide tables/panes don't force a content-width layout — the min-width:0 is the load-bearing part), `FadedBox`, `ConstrainedBox`, `LooseWrapRow` (`WrapRow` at the `sm` 8px step instead of `xs` — tile-to-tile spacing on a dashboard of breakdown widgets. `align` is deliberately **unset**, as in `WrapRow`, so items take the flex default `stretch` and tiles sharing a line render at equal height; that is what separates it from the two `sm` wrap rows that already exist — `WrappedClusterRow` centres a short tile in a tall neighbour's band, `BaselineWrapRow` aligns by first text line. It differs from `WrapRow` in the gap and nothing else), `LooseCardGrid` (`CardGrid` at the `sm` gutter; identical auto-fit tracks ≥280px, only the gutter differs — for a KPI strip needing more air), `WrapItemStack` (ONE item inside a `WrapRow`, held at its content's **natural** width — `min-width:0; max-width:100%`, gap:xs. Deliberately **not** `flex:1`, which is what separates it from `GrowTightStack`/`GrowStack`/`GrowBox`: in a wrapping row `flex:1` equalises the items, cramming wide content and stretching narrow, which destroys the natural-width packing a wrap row exists to do. `min-width:0` lets the item shrink past its content so an inner element that owns its own scroll — a `fit` table — scrolls internally instead of overflowing the page; `max-width:100%` caps it at the row so content wider than the whole row can't blow out the page width. For a grid of naturally-sized table tiles). Use for: common layout patterns without manual gap/align configuration.

## List
- **List** — Styled list with status dots, icons, dividers. Key props: `variant` (`default`|`status`|`menu`), `dividers`, `compact`, `scroll` (fills its flex parent and scrolls internally on overflow: `flex: 1; min-height: 0; overflow-y: auto`). Note: `numbered` variant has been removed. Use for: status lists, menus, settings lists. Has `createList` factory for curried variants.
- **ListItem** — List item with status indicators and interactive states. Key props: `status` (`active`|`inactive`|`warning`|`error`|`success`), `icon`, `secondary`, `interactive`, `selected`. Use for: items within List.
- **ScrollList** — Curried `List` with `scroll: true` baked in. Drop into a height-constrained flex column (e.g. a panel with `display: flex; flex-direction: column`) to get a list that fills the remaining height and scrolls internally instead of pushing siblings. Use for: filter-result lists in a sidebar, log-style streams in a fixed-height panel, any vertical list that may overflow its container.

## SplitQueueList
- **SplitQueueList** — **DEPRECATED, removed in the next major.** A compile shim over `BucketQueue` (see below), kept for one release so existing call sites keep working. It is **not pixel-identical** — the merged component draws its own chrome, so the rendered result is `BucketQueue`'s, not the old two-pane seam. `topCapRows` maps to the resolved bucket's `capRows`; `topOnly`, `topFloorRows`, `animationMs`, and `rowHeight` are accepted but **ignored** on the animated path (the merged component measures rows, collapses empty buckets, and owns its own motion). `static` mode is unaffected — it still delegates to `StaticSplitLayout` below, which is **not** deprecated and keeps using both `rowHeight` and `topCapRows`. Migrate new call sites straight to `BucketQueue`: declare `buckets` and bucket `items` with `bucketOf` rather than relying on this mapping. Full usage guide: `src/components/SplitQueueList/README.md`.
  - **`StaticSplitLayout`** — a standalone, non-animated sibling: the same chrome (labeled top section + seam + bottom block) with **no queue, animation, selection, or keyboard**. Use it when you want the framing around a read-only list of recent items over a bottom block you compose. Props: `items?: T[]`, `renderItem?`, `bottomContent?`, `label="Resolved"`, `emptyLabel="Nothing yet"`, `capRows=3`, `rowHeight=40`, `height?` (omit to fill parent), `class?`. **Prefer this over the deprecated `static` flag on `SplitQueueList`** (which still works but gates a disjoint prop set behind a boolean; it delegates here and will be removed in the next major).
  - Example:
    ```tsx
    import { SplitQueueList } from "solid-ui-components";

    // Resolve = remove from unresolved, append to resolved. SUI animates it.
    const resolve = (id: string) => {
      const item = toCategorize().find((t) => t.id === id);
      if (!item) return;
      setToCategorize((u) => u.filter((t) => t.id !== id));
      setCategorized((r) => [...r, item]);
    };

    <SplitQueueList<Txn>
      resolved={categorized()}
      unresolved={toCategorize()}
      keyOf={(t) => t.id}
      renderItem={(t) => <span>{t.label}</span>}
      selectedKey={selected() ?? undefined}
      onSelect={setSelected}            // open a consumer-composed detail panel
      height={480}
    />
    ```

## BucketQueue
- **BucketQueue** — Layout-tagged Primitive (EXEMPT-AS-LAYOUT, STYLE_GUIDE § Layout Purity). Owns `BucketQueue.css`: the weighted water-fill sizes each bucket in JS, which no CSS rule can express. The library's single queue component — supersedes `SplitQueueList` (see `docs/adr/0004-one-queue-component-and-the-motion-seam.md`). N always-present buckets stacked as one full-height bar, bucketing a **flat `items` list** through its lifecycle as a **progression** (e.g. terminal-happy on top, terminal-unhappy in the middle, transient at the bottom). **Every bucket is shown at all times with its count.** Generic over `T`; the consumer owns the data and row content — `buckets: Bucket[]` (top → bottom, each `{ key, label, tone, weight?, selectable?, emptyLabel?, capRows?, fill?, collapsible?, collapsedByDefault? }`), `items: T[]`, `bucketOf: (item) => bucketKey`, `keyOf`, `renderItem`. **A move is an item whose `bucketOf` result changed** — one atomic `items` mutation plays a transfer animation between whichever two buckets are involved, in either direction; there is no `resolve()`/`unresolve()` pair. **Sizing (ruled 2026-07-22 — a weighted water-fill measured in JS; pure CSS can't express it):** an **empty** bucket collapses to just its summary line (label + count, or `emptyLabel` copy if given); a **populated** bucket **shrink-wraps** to its content; when the populated buckets **overflow** the available height they share it by `weight`. A bucket's `capRows` caps its natural height at that many rows, beyond which its body scrolls — unlike `SplitQueueList`'s old top pane, **a capped bucket never grows past its cap** to absorb slack from a short neighbour. **`fill: true` opts a bucket out of shrink-wrapping**: once every bucket has its natural height, whatever is left over is split among the `fill` buckets by `weight`, so a queue in a fixed column with a control pinned under it reaches the bottom at any list length instead of leaving a dead band. It **overrides `capRows` for that bucket** (the cap refuses content-driven growth, not space nobody wants) and applies only while the bucket is **populated** — an empty one stays on its summary line rather than stretching a "nothing here" strip. Purely additive: declare no `fill` and layout is unchanged. **`collapsible: true` lets the USER collapse a bucket to that same summary line while it still HAS items**, and expand it again — a staging pile (discards, an archive) that must not dominate the queue but has to be openable to pull rows back out. Its header becomes a `<button aria-expanded>` and takes a tone-coloured **chevron in place of its tone dot** (same 8px slot, so labels stay on one left edge and the bucket still carries exactly one role-coloured mark). `collapsedByDefault: true` starts it collapsed and is **ignored without `collapsible`** — alone it would strand the bucket's items behind no affordance. The state is the component's own and **sticks**: `collapsedByDefault` applies only until the user first toggles the bucket, after which their choice holds for the component's life, including across the bucket draining to empty and refilling. A collapsed bucket sizes exactly as an empty one (pinned, out of the water-fill, never fills; `capRows` is moot), drops out of the keyboard sequence, and keeps `selectedKey` untouched. A row moving INTO a collapsed bucket has no slot to open, so the source bucket's gap still closes and the destination's count pulses to show it was received. **Row height is measured PER BUCKET**, so buckets may hold rows of genuinely different heights (one-line rows above two-line cards) and each is sized from its own. The bar fills its parent's height (drop it in a definite-height flex column) or an explicit `height` in px. **Chrome is thematically NEUTRAL** — uniform border + default header text; the only role color is a small **dot** beside each bucket label (`tone` → theme var). **Selection is controlled:** pass `onSelect(key)` / `selectedKey` for click-to-select; a selected row shows only an inset accent bar, **never a background fill** — hover owns the fill, so a selected-and-unhovered row stays fully readable. **Roving-focus keyboard nav (controlled):** `focusedKey` / `onFocusChange`; Up/Down/Home/End traverse every row across all buckets in render order with no wrap, Enter/Space activates. Only **interactive** rows (a global `onSelect`, or a `selectable` bucket in select mode) join the tab sequence — a read-only row still renders but is skipped by arrows and never takes the tab stop. **Select mode is on iff `checkedKeys` is present — there is no `selectMode` prop.** An empty `Set` means "mode on, nothing checked." It applies only to buckets marked `selectable: true`; rows elsewhere keep selecting on click even while select mode is on. `onToggleCheck(key, { shift, meta })` fires instead of `onSelect` for a checkable row's click/Enter/Space; never both. **A consumer can veto individual rows:** `isCheckable?: (item: T) => boolean` is consulted only for rows in a `selectable` bucket while select mode is on, and a row it refuses renders **dimmed in place** — no check toggle, and deliberately no fall-through to `onSelect`, so it is fully inert. It keeps its tab stop and stays an arrow-key target with `aria-disabled="true"`, because dropping refused rows from the roving sequence is the keyboard equivalent of hiding them. `uncheckableReason?: (item: T) => string | undefined` supplies the row's `title` for a refused row — a prop rather than the consumer's job because `renderItem`'s output does not cover the check affordance. Both are **fail-open**: omit them, or return `true`, and every row in a selectable bucket is checkable exactly as before. Typically derived from `checkedKeys`, which is what makes unchecking back to zero restore full checkability with no special case. `scrollToKey` reacts on change to scroll a row into view (also used internally to reveal a row after it transfers). Key props (16 total): `buckets`, `items: T[]`, `bucketOf: (item: T) => string`, `keyOf: (item: T) => string`, `renderItem: (item: T) => JSX.Element`, `selectedKey?`, `onSelect?: (key: string) => void`, `focusedKey?`, `onFocusChange?: (key: string | null) => void`, `checkedKeys?: ReadonlySet<string>`, `onToggleCheck?: (key: string, modifiers: { shift: boolean; meta: boolean }) => void`, `isCheckable?: (item: T) => boolean`, `uncheckableReason?: (item: T) => string | undefined`, `scrollToKey?`, `height?` (omit to fill parent), `class?`. The pure sizing core is exported as `naturalHeights(input): number[]` and `allocateHeights(input): number[]` (with the `NaturalInput` / `AllocateInput` types) for callers who need the sizing math outside the component. No factory — the data/buckets are per-call, so the base component is already curried. Motion (the transfer animation) is curried, not a prop — see the README's Motion bucket and the ADR for the swappable choreographer seam. Use for: a compliance/triage sidebar where items live in a few lifecycle states you always want visible with counts (fortnight vessel calls by compliance, review queues split happy/unhappy/pending, transaction categorization). **Full usage guide: `src/components/BucketQueue/README.md`.**
  - Example:
    ```tsx
    import { BucketQueue, type Bucket } from "solid-ui-components";

    const BUCKETS: Bucket[] = [
      { key: "compliant", label: "Compliant", tone: "success" },
      { key: "non-compliant", label: "Non-compliant", tone: "danger" },
      { key: "in-review", label: "In review", tone: "accent", weight: 2, selectable: true },
    ];

    <BucketQueue<VesselCall>
      buckets={BUCKETS}
      items={calls()}
      bucketOf={(c) =>
        c.nox_compliant == null || c.rog_compliant == null
          ? "in-review"
          : c.nox_compliant && c.rog_compliant
            ? "compliant"
            : "non-compliant"
      }
      keyOf={(c) => c.vessel_call_id}
      renderItem={(c) => <span>{c.vessel_name}</span>}
      selectedKey={selected()}
      onSelect={setSelected}
    />
    ```

## MutableList
- **MutableList** — Composite (Depth 3). Owns `MutableList.css`. A `SortableList` specialized into editable, deletable cards: it composes `<SortableList>` (inheriting the grip, placeholder gap, and live drag-reflow from the headless `createDnDReorder` hook) and supplies a `renderItem` card built from `ClusterRow`/`ContentStack`/`ActionSlot` Layout variants — an inline-editable name button on the left (click → bare `<input>`; Enter commits, Escape reverts, blur commits) and a hover-revealed `IconOnlyButton` × delete on the right. During editing it toggles the enclosing `.sui-sortable-list__row`'s native `draggable` off (interactive zones also carry `draggable={false}`) so the input keeps its caret/selection. Generic over `T`; all props are data/callbacks: `items: T[]` (controlled order), `getId: (item) => string`, `getName: (item) => string`, `onReorder: (orderedIds: string[]) => void`, `onRename: (id, name) => void` (fires only on a changed, non-empty commit — never on unchanged/cleared/Escape), `onDelete: (id) => void` (consumer owns confirmation), `label?`, `renderDetail?: (item) => JSX.Element` (secondary line below the name). NO curried variant by rule — data-only components are already zero-config at the call site. Use for: editable ordered card lists (rename + reorder + delete), e.g. category or line-item managers.
  - Example:
    ```tsx
    import { MutableList } from "solid-ui-components";
    <MutableList
      items={cats()}
      getId={(c) => c.id}
      getName={(c) => c.name}
      label="Categories"
      onReorder={(ids) => reorder(ids)}
      onRename={(id, name) => rename(id, name)}
      onDelete={(id) => remove(id)}
      renderDetail={(c) => <span>{c.count} items</span>}
    />
    ```

## ActionList
The ActionList family — a drop-in editable action-row list, graduated from the ListItem workshop bench. Bench visuals/behavior are final; extraction is pixel-faithful. Depth 3 `ActionList` composes SortableList + the Depth-2 `ActionListItem`, which composes four Depth-1 primitives. All row text rides one thematic foreground (`--sui-accent` / `currentColor`).

Where the constituents live (design decision — prefer siblings of existing families over parallel folders): **AssigneeIcon** ships from `src/components/ParticipantAvatar/` (the outline sibling of the filled avatar), **TagPill** and **StatusChip** from `src/components/Badge/` (siblings of CountChip / StatusBadge). None is a curried variant of its family's base — each is a distinct primitive with its own data model/rendering, exactly like `CountChip` lives beside `StatusBadge`. **EditableTitle** stays in its own `src/components/EditableTitle/` folder because `InlineText` (its nearest relative) is styleless and non-editable — genuinely different, not a variant. `ActionListItem` and `ActionList` keep their own folders (composites with no existing family). All six remain exported from the root barrel, so the public import surface is unchanged.

- **ActionList** — Composite (Depth 3). Owns a thin `ActionList.css` (wrapper column + the multi-select actions bar only — a deliberate exception like BulkActionBar/Fab, since the bar is a list-level element with no home in SortableList or ActionListItem); composes `SortableList` (`rowChrome="bare"`, `gap={1}`) + `ActionListItem`. A data-driven list of editable rows (todo queues, filter results, work items). Curried via `createActionList` with a single presentational override `statusTones` (the status→row-tone map), following the `createButton`/`createPanel` Overrides/DataProps split; the exported **`ActionList`** variant bakes the default tones (`{ DONE: "dim", DOING: "highlight" }`, neutral fallback) so app call sites are data-only. Each callback opts a behavior in: `onSort` → drag reorder, `onDelete` → the × cap, `onRename` → inline title edit, `onStatusChange` → chip edit/select; omit one and that affordance is inert. **Multi-select:** passing `actions: ActionListAction[]` (`{ hotkey, label, onApply(ids) }`) enables selection — clicking a row's non-interactive area toggles it (clicks on the title/status/× do their own thing, so selection never fights inline editing or drag-to-reorder), a selected row lights a persistent accent border + subtle accent wash (geometry-safe), and an actions bar appears while the selection is non-empty. Each action renders as a **reused `HotkeyButton`** (the exact `[c]laim` affordance — the bracketed letter is the hotkey); pressing that key, or clicking the button, applies `onApply(selectedIds)` and then **clears the selection** (the batch is done) — pass `clearSelectionOnApply={false}` to keep the selection after an action fires (e.g. in-place claim/release). **Shift-click range:** shift-clicking a row applies the anchor row's (the last plain-clicked row's) current selected state to the whole contiguous span between anchor and click — selecting the anchor then shift-clicking selects the span, deselecting it deselects the span; the anchor stays put so a further shift-click re-ranges. `rangeSelectMode` picks the fold: `"extend"` (default) is that anchor-state-across-span merge; `"replace"` makes shift-click produce exactly the `[anchor..click]` span, discarding any selection outside it (classic file-list semantics — dside's original behavior), in both controlled and uncontrolled modes. The fold math lives in a pure, unit-tested `foldRange` helper beside `idRange`. Escape clears the selection unless an inline editor is focused (the editor's Escape-cancel wins). **Selection modes:** uncontrolled by default (owned by ActionList, observed via `onSelectionChange`); pass `selectedIds: string[]` to make it fully **controlled** — the internal state is ignored, the passed ids render as selected, and the list never mutates on its own (every toggle / shift-range / Escape / apply is emitted as an intent via `onSelectionChange` for the consumer to honour). **Selection metadata:** `onSelectionChange(ids, meta?)` takes an optional second `ActionListSelectionMeta` (`{ kind: "toggle" | "range" | "clear" | "apply"; clickedId?; shiftKey? }`) describing the gesture — e.g. the `clickedId` of a mouse toggle to sync a vim `j`/`k` cursor; a prune emits no meta and single-arg consumers ignore the extra arg. **Clickable tags:** pass `onTagClick(item, tag)` to turn tag pills into buttons — clicks fire the callback (never toggling row selection), hover brightens the pill via colour only (geometry-stable); without it tags stay inert. (BulkActionBar was not reused: it is a single-action, CountChip + elevated floating toolbar; this needs N flat accent-cyan hotkey actions.) Key data props: `items: ActionListItemData[]` (`{ id, name, status?, assignee?, assignees?, tags? }` — plural `assignees` wins over singular `assignee`, rendered as a tight glyph roster), `statusOptions?`, `onSort?`, `onDelete?`, `onRename?`, `onStatusChange?`, `actions?`, `selectedIds?`, `clearSelectionOnApply?`, `rangeSelectMode?` (`"extend"` | `"replace"`, default `"extend"`), `onTagClick?`, `onSelectionChange?` (`(ids, meta?)`), `label?`. Types: `ActionListAction` (`{ hotkey, label, onApply(selectedIds) }`), `ActionListSelectionMeta` (`{ kind: "toggle" | "range" | "clear" | "apply"; clickedId?; shiftKey? }`), `RangeSelectMode` (`"extend" | "replace"`), `ActionListTag` (`{ label, active? }` where a `":"` in the label splits, or `{ key, value, active? }`), `ActionListAssignee` (`{ initials, kind?: "person"|"ai", active? }`). Use for: dense editable item lists where each row carries a status, assignee(s), tags, and inline rename — with optional batch actions over a (uncontrolled or controlled) selection.
  - Example:
    ```tsx
    import { ActionList } from "solid-ui-components";

    <ActionList
      items={tasks()}                                  // { id, name, status?, assignee?, tags? }[]
      statusOptions={["TODO", "DOING", "BLOCKED", "DONE"]}
      onSort={(ids) => setTasks(reorder(tasks(), ids))}
      onDelete={(id) => setTasks((t) => t.filter((x) => x.id !== id))}
      onRename={(id, name) => setTasks((t) => t.map((x) => x.id === id ? { ...x, name } : x))}
      onStatusChange={(id, status) => setTasks((t) => t.map((x) => x.id === id ? { ...x, status } : x))}
      actions={[                                        // presence enables multi-select
        { hotkey: "c", label: "claim", onApply: (ids) => assignTo("P", ids) },
        { hotkey: "r", label: "release", onApply: (ids) => clearAssignee(ids) },
      ]}
      onSelectionChange={(ids) => console.log("selected", ids)}
      label="Task list"
    />
    ```
- **ActionListItem** — Composite (Depth 2). Owns `ActionListItem.css` as a deliberate Depth-2 exception (structural row geometry only: flex layout, transparent-border hover outline that lights with zero geometry shift, tone opacity, the flipped semicircle dismiss cap with negative margins). The row `[StatusChip][EditableTitle][meta: AssigneeIcon, TagPills, dismiss ×]`. `tone` (`"dim"`/0.25 | `"neutral"`/0.5 | `"highlight"`/1 + chip fill) is a presentational prop supplied by ActionList from its `statusTones` map. INVARIANT: hover reveals via opacity only — never geometry. Multi-select hooks (set by ActionList): `onSelect(e)` makes the row's non-interactive area a click-to-toggle target (a single `closest("button, input, …")` guard excludes every inner control at once) and passes the click through so the parent can branch on `shiftKey` for range select; `selected` lights a persistent accent border + subtle accent wash — both colour-only, so selection is as geometry-stable as hover. `assignees` renders a tight roster of glyphs (wins over singular `assignee`); `onTagClick` turns tag pills into buttons (colour-only hover, `stopPropagation` so they never toggle the row). Key props: `title`, `status?`, `statusOptions?`, `assignee?`, `assignees?`, `tags?`, `tone?`, `selected?`, `onStatusChange?`, `onTitleChange?`, `onDismiss?`, `onSelect?`, `onTagClick?`.
- **StatusChip** — Atomic Primitive (Depth 1). Owns `StatusChip.css`. Fixed-width (ch of the longest option) editable status chip: centered text, click-text-to-edit inline input, hover-revealed caret opening a select menu, Escape-cancels-without-commit, `highlight` accent fill for the active status. The **editable sibling of `StatusBadge`** (display-only compliance enum) — use StatusBadge to show a status, StatusChip to edit one. Data-only, no curried variant (SortableList exemption). Key props: `status`, `options?`, `onChange?`, `highlight?`, `title`.
- **EditableTitle** — Atomic Primitive (Depth 1). Owns `EditableTitle.css`. Inert text or hover-underlined click-to-edit title whose inline input is fitted to the rendered text via a hidden inline-grid replica (`::after { content: attr(data-value) }`); Enter/blur commit, Escape cancels via the `cancelled` flag. **Separate from `InlineText`** (a styleless, non-editable `<span>` that only recolors inherited text) because it adds the click-to-edit input + commit/cancel lifecycle. Data-only, no curried variant. Key props: `title`, `onChange?`.
- **AssigneeIcon** — Atomic Primitive (Depth 1). Owns `AssigneeIcon.css`. The **outline sibling of `ParticipantAvatar`**: where ParticipantAvatar is a filled circular disc for showing who is present, AssigneeIcon is a `currentColor`-driven outline glyph (person silhouette or antennaed robot head) with up-to-2-char centered initials, for showing person/AI assignment. Do NOT modify ParticipantAvatar; the two are distinct roles. `active` is a data class hook. One Override: `size` (glyph height px; width keeps the 25:23 box, viewBox scales stroke + initials) — freeze it via **`createAssigneeIcon({ size })`** (`AssigneeIconOverrides`/`AssigneeIconDataProps` split); the bare export stays the zero-config 23px row default. Data props: `initials`, `kind?: "person"|"ai"`, `active?`, `title?` (full-name hover text; falls back to `initials`). `initials` is truncated to 2 chars and does NOT disambiguate on its own — to derive roster-consistent initials (so two "Peter …" people don't both read "P"), call **`deriveInitials(names)`** (below) once and feed the result in.
- **deriveInitials** — Pure helper (not a component), shipped from the ParticipantAvatar family (`src/components/ParticipantAvatar/initials.ts`). `deriveInitials(names: string[]) => Map<name, initials>`. Decides WHICH up-to-2 characters each name shows so a roster disambiguates instead of collapsing to a wall of identical "P"s. Rule: default is the first letter of the first word; a colliding name uses **as many letters as necessary** — the shallowest ladder rung (first initial → **word initials** → **first-word letters**) whose value stays globally unique ("Peter Stradinger" + "Peter Falk" → `PS` + `PF`; "Peter Falk" + "Paula Falk" → `Pe` + `Pa`). A name is **not** dragged deeper just because a neighbour must: in {Peter Stradinger, Peter Falk, Paula Falk, Peter Strong} Peter Falk stays at its unique `PF` while Paula drops to `Pa` — Falk is never merged into the Stradinger/Strong pair. Capped at 2 chars (AssigneeIcon's fit): names indistinguishable within the cap ("Peter Stradinger" + "Peter Strong") **share** their longest common initials (`Pe`) and rely on the caller's `title`/tooltip for the full name. Deterministic and order-independent (result is a function of the name SET); unicode-aware (first code point per word). Identical full names collapse to one key → identical initials. Feed the map's values into `AssigneeIcon` / `ParticipantAvatar` `initials`. Use for: assignee rosters, member lists, any avatar cluster that must stay legible when names share letters.
- **TagPill** — Composed (Depth 2; owns `TagPill.css` as a deliberate exception — pill chrome is intrinsic). Pill tag; a `":"` in the label (or the explicit `{ key, value }` shape) renders as a split lozenge (bold namespace segment, hairline divider, value segment, same colors both sides); `active` adds the accent tint. A **purely-numeric plain label rolls odometer-style on change** (composes `DigitRoller` — counts roll by default; requires the pill instance to survive the change, see STYLE_GUIDE "List Identity"). The **free-text, filter-oriented sibling of `StatusBadge`/`CountChip`** in the Badge family (those encode a fixed enum / a count; TagPill carries an arbitrary label or namespace:value pair). Data-only, no curried variant. Key prop: `tag` (`TagPillData`).
- **GhostRow / IndentedGhostRow** — Atomic (Depth 1). Owns `GhostRow.css`. De-emphasized clickable row: dimmed (0.7) unless `selected` (data flag, full strength), pointer cursor only when `onClick` is wired, color/opacity-only hover (geometry-stable). `IndentedGhostRow` bakes the one-step inset for rail children under a section heading (`createGhostRow` factory, `indent` is the Override). Born from the triage bench's right-rail children + dependency-link rows. Key props: `selected?`, `onClick?`, children.
- **composeTagPairs** — Pure helper (not a component), shipped from the Badge family (`src/components/Badge/tagPairs.ts`, exported from the family index and root barrel). `composeTagPairs(tags: SourceTag[], cfg: TagDisplayConfig) => ComposedTag[]`. Decides HOW a flat list of `{ dim, value }` tags is presented, so an app renders composed split lozenges instead of a row of labeled pills; TagPill owns the pixels, this owns the composition. A pair rule (`{ parent, child }`) whose **both** dims are present collapses those two tags into ONE lozenge of the two VALUES — the dim names drop out but survive in `title` for hover recovery (`customer:acme` + `project:apollo` → key `acme`, value `apollo`, title `customer: acme · project: apollo`, `sources` = `[parent, child]`). A dim present **without** its partner is not abbreviated and falls through to the labeled form (`key = dim`, `value = value`, title `dim: value`). Deterministic: pairs first in rule order, then remaining labeled tags in input order — or by `cfg.order` (unknown dims after, stable) when supplied. Each source tag is consumed at most once; a duplicated dim pairs on its first occurrence and extras stay labeled. Pure, no DOM; empty inputs → `[]`. Each `ComposedTag`'s `{ key, value }` drops straight onto `ActionListTag` / `TagPill`. Use for: turning app-side dimensional tags (customer/project, owner/assignee) into compact tag rows.

## ActionRow
- **ActionRow** — Composite (Depth 2). A row with an optional leading slot, a growing body (`children`), an optional trailing slot, and a hover/focus-revealed action bar underneath. The action bar stays layout-stable via `visibility` toggling (hidden until `:hover`/`:focus-within` on the row), so rows don't reflow. Arrangement is composed from Layout variants (`NarrowStack` outer column, `ClusterRow` main row, `NoShrinkClusterRow` leading/trailing clusters, `GrowBox` body, `EndWrapRow` action bar); this component owns only intrinsic styling and the hover-reveal. Props: `tone` (`ActionRowTone` = `"default"`|`"danger"`|`"accent"`, default `"default"`; danger/accent tint the border + background), `leading`/`trailing`/`children` (`JSX.Element` slots), `actions` (`ActionRowAction[]`), `class`. Each `ActionRowAction` is `{ label: JSX.Element; onClick: () => void; tone?: ActionRowActionTone; title?: string; disabled?: boolean }` where `ActionRowActionTone` is `"accent"`|`"muted"`|`"outline"`. Exported types: `ActionRowDataProps`, `ActionRowAction`, `ActionRowActionTone`. The base `ActionRow` is intentionally not exported from the barrel — use the `createActionRow(defaults)` factory (returns `Component<ActionRowDataProps>`, baking `tone`/`leading` as `ActionRowOverrides`) or the curried variants `PlainActionRow` (default), `DangerActionRow` (`tone: "danger"`), `AccentActionRow` (`tone: "accent"`). CSS tokens: `--sui-border`, `--sui-text-primary`, `--sui-text-muted`, `--sui-danger`, `--sui-accent`, `--sui-accent-rgb`, `--sui-bg-deep`. Use for: list/table rows that expose per-row actions only on hover, with an optional status slot and destructive/emphasis tinting.
  - Example:
    ```tsx
    import { PlainActionRow, DangerActionRow } from "solid-ui-components";

    <PlainActionRow
      trailing={<span>3 items</span>}
      actions={[
        { label: "Edit", tone: "outline", onClick: () => edit(row) },
        { label: "Delete", tone: "muted", onClick: () => remove(row) },
      ]}
    >
      {row.name}
    </PlainActionRow>

    <DangerActionRow actions={[{ label: "Undo", tone: "accent", onClick: undo }]}>
      Deletion pending
    </DangerActionRow>
    ```

## GroupBracket
- **GroupBracket** — Atomic Primitive (Depth 1). A thin right-edge bracket cue for a single list/table row that marks which rows belong to the same contiguous run of a group; stacking N members renders one unbroken `]`-shape. Renders a `<div>` gutter with a `spine` plus optional top/bottom `stub`s and a `badge`, driven entirely by `position`: `GroupBracketPosition` = `"none"` (not in a group — empty gutter, keeps geometry stable across boundaries), `"interior"` (spine only), `"leader"` (spine + top stub + badge), `"tail"` (spine + bottom stub), `"leader-tail"` (sole row — spine + both stubs + badge). Props: `position` (required), `color?` (stroke + badge border, sets `--sui-group-bracket-color`; falls back to inherited text color), `badgeFill?` (badge fill, sets `--sui-group-bracket-badge-fill`, composited over an opaque base so the spine doesn't read through), `badge?` (`JSX.Element`, typically `×N`, only rendered on `leader`/`leader-tail`), plus all `JSX.HTMLAttributes<HTMLDivElement>` (except `color`) spread onto the root. Colors are the only inline payload (CSS-variable channel); all other styling lives in the stylesheet. Sets `aria-hidden` when no badge is shown. Exported types: `GroupBracketProps`, `GroupBracketPosition`. Use for: a per-row grouping gutter in dense lists/tables where contiguous runs of a group should read as a single visual bracket with an optional count on the leader.
  - Example:
    ```tsx
    import { GroupBracket } from "solid-ui-components";

    <GroupBracket
      position="leader"
      color="var(--sui-accent)"
      badgeFill="rgba(var(--sui-accent-rgb), 0.2)"
      badge={`×${run.length}`}
    />
    ```

## AssigneeChips
- **AssigneeChips** — Atomic (Depth 1). Renders a filled accent-colored pill per id, applying a caller-supplied `resolveName` to display each label; renders nothing when `ids` is empty. The wrapping chip row is composed from the `ChipCluster` Layout variant; this component owns only the intrinsic pill styling. Props: `ids` (`string[]`), `resolveName` (`(id: string) => string`), `size` (`"sm"`|`"md"`, default `"sm"` — sm is 9px/min-height 12px, md is 10px/min-height 14px), `class`. Exported type `AssigneeChipsDataProps` (`Omit` of `size`). The base `AssigneeChips` is intentionally not exported from the barrel — use the `createAssigneeChips(defaults)` factory (bakes `size` as `AssigneeChipsOverrides`, returns `Component<AssigneeChipsDataProps>`) or the curried variants `Assignees` (default, small) and `MdAssigneeChips` (`size: "md"`). CSS tokens: `--sui-accent` (pill fill), `--sui-bg-deep` (label color). Use for: compact rows of assignee/owner name pills on cards or table rows where the caller owns id→name resolution.
  - Example:
    ```tsx
    import { Assignees } from "solid-ui-components";

    <Assignees ids={task.assigneeIds} resolveName={(id) => users[id]?.name ?? id} />
    ```

## TruthIndicator
- **TruthIndicator** — Atomic (Depth 1). Boolean status glyph: a green check for `true`, a red prohibition (circle-with-diagonal-slash) for `false`. Read-only by default (renders a `<span role="img">`); supplying `onClick` upgrades it to a real `<button>` with native click + keyboard activation and reset chrome so the `sui-truth*` classes fully govern appearance. Base `TruthIndicator` is intentionally NOT exported — consume the curried variants or the factory. Key props: `value` (boolean, required), `size` (`"sm"`|`"md"`|`"lg"` → 12/16/22px, default `md`), `label` (string, optional aria-label override; defaults to "true"/"false"), `onClick` ((e: MouseEvent) => void, optional); also spreads remaining `HTMLAttributes`. Factory: `createTruthIndicator(defaults)`. Curried variants (all with `size` baked, `value`/`onClick`/`label` left as runtime data): `TruthIndicator` (md default), `SmallTruthIndicator` (sm, for dense rows), `LargeTruthIndicator` (lg, for prominent status). Exported types: `TruthIndicatorDataProps` (plus `TruthIndicatorOverrides`, `TruthIndicatorSize` internally). CSS tokens: `--sui-success`, `--sui-danger`, `--sui-accent`, `--sui-bg-secondary`. Use for: boolean cells in tables, feature-flag/health status, toggleable yes/no fields.
  - Example:
    ```tsx
    import { TruthIndicator, SmallTruthIndicator, LargeTruthIndicator } from "solid-ui-components";

    <TruthIndicator value={true} />
    <SmallTruthIndicator value={false} label="unverified" />
    <LargeTruthIndicator value={true} onClick={() => toggle()} />
    ```

## MathFormula
- **MathFormula** — KaTeX LaTeX renderer with interactive variable highlighting via `\var{id}{content}` syntax. Key props: `latex`, `displayMode`, `class`. Use for: rendering mathematical formulas with hover-linked variables.
- **FormulaProvider** — Context provider enabling hover interactions between MathFormula variables and table rows. Use for: wrapping formula + variable table pairs.
- **FormulaVarRow** — Table `<tr>` that highlights when its corresponding formula variable is hovered. Key props: `varId`. Use for: variable definition rows that link to formula terms.

## CodeBlock
- **CodeBlock** — Atomic Primitive (Depth 1). Owns `CodeBlock.css`, no component imports. Recessed dark monospace `<pre>` for raw code / JSON: preserves whitespace/newlines (`white-space: pre`) and scrolls horizontally on overflow (`overflow: auto`). Extends `JSX.HTMLAttributes<HTMLPreElement>`, so any native `<pre>` attr passes through. Only styling prop is `size?: "sm" | "md" | "lg"` (default `"md"`, mapping to 0.8125/0.875/1rem). Children render literally. `createCodeBlock(defaults)` factory yields curried variants (none pre-defined in-folder). CSS tokens: `--sui-font-mono`, `--sui-space-3`, `--sui-border`, `--sui-radius-sm`, `--sui-bg-deep`, `--sui-text-primary`. Use for: displaying JSON payloads, config snippets, log dumps, raw code in showcases.
  - Example:
    ```tsx
    import { CodeBlock } from "solid-ui-components";
    <CodeBlock size="sm">{JSON.stringify(payload, null, 2)}</CodeBlock>
    ```

## Markdown
- **Markdown / MarkdownEditor** — Atomic + Composite. Owns `Markdown.css`. Tiny hand-rolled markdown viewer (extracted from dside-ui's inline SimpleMarkdown) — no external parser.
  - **Markdown** — Atomic (Depth 1). Renders `source: string` into a `.sui-markdown` div via `innerHTML`. Supports `#`–`###` headings, `-`/`*` bullet lists, `**bold**`, `*italic*`, `` `code` ``, and blank-line-separated paragraphs; inline HTML in the source is escaped first (`&`,`<`,`>`) before inline markup is applied. Props: `source: string`, `class?`. Exports the pure helper `renderMarkdownHtml(source): string` (the string generator, usable standalone) and `createMarkdown(defaults)` factory.
  - **MarkdownEditor** — Composite (Depth 2). Composes `Grid` (`columns="1fr 1fr"`, `gap="md"`) for a 50/50 textarea-plus-live-preview split, feeding the textarea value straight into `<Markdown>`. Props: `value: string`, `onChange: (next: string) => void`, `rows?` (default `12`), `class?`. Factory `createMarkdownEditor(defaults)`.
  - Use for: rendering stored markdown notes/descriptions; the editor for authoring markdown with live preview (design-doc panels).
  - Example:
    ```tsx
    import { Markdown, MarkdownEditor } from "solid-ui-components";
    const [text, setText] = createSignal("# Notes\n- **first**\n- second");
    <MarkdownEditor value={text()} onChange={setText} rows={8} />
    <Markdown source={text()} />
    ```

## Kbd
- **Kbd** — Atomic Primitive (Depth 1). Owns `Kbd.css`, no component imports. Renders a `<kbd>` keyboard hint with two mutually-exclusive modes: pass `letter?` (+ optional `rest?`) to get an underlined hotkey letter followed by plain trailing text (`<Kbd letter="C" rest="onfirm" />` → **C**onfirm), or pass `children` for literal content (`<Kbd>Esc</Kbd>`). Presence of `letter` (even `""`) switches to letter mode via `Show`. Props: `letter?`, `rest?`, `children?`, `class?`. `createKbd(defaults)` factory for curried variants. Emits spans `.sui-kbd__letter` / `.sui-kbd__rest`. Use for: command-palette hotkey hints, inline keyboard shortcut labels.
  - Example:
    ```tsx
    import { Kbd } from "solid-ui-components";
    <Kbd letter="C" rest="onfirm" />
    <Kbd>Esc</Kbd>
    ```

## ResponsiveMoney
- **ResponsiveMoney** — Atomic (Depth 1). Renders the widest dollar rendering of a cents value that still fits its container, stepping down through a candidate ladder (`$330,285 → $330k → $0.3m`) as the container shrinks, measured via a hidden `Text` twin and a `ResizeObserver`. Abbreviation is view-only — callers keep passing exact integer cents; it never rounds the underlying value, only its display. The ladder (`formatMoneyLadder`) adds tiers by magnitude: full always, `k` at |dollars| ≥ 1,000 (0 fraction digits), `m` at ≥ 1,000,000 (1 fraction digit), with the sign rendered once before the `$` (`-$1,234`). Key props: `cents` (number, integer, may be negative), `variant` (`TextVariant`, default `"value"`), `color` (string). Spreads remaining `JSX.HTMLAttributes<HTMLSpanElement>` (minus `children`). Exports type `ResponsiveMoneyProps`. Composes the `Text` component; no curry factory (styling rides on `Text`; owns `.sui-responsive-money` layout). Use for: money figures in width-constrained cells, dashboard KPIs, responsive table columns.
  - Example:
    ```tsx
    import { ResponsiveMoney } from "solid-ui-components";
    <ResponsiveMoney cents={33028500} variant="value" />
    ```

## Modal
- **Modal** — Portal-based modal with overlay, escape-to-close, and footer slot. Key props: `open`, `onClose`, `title`, `subtitle`, `corners` (`CornerStyle`), `variant` (`ColorVariant`), `size` (`sm`|`md`|`lg`|`xl`|`fullscreen`), `showClose`, `footer`. Use for: dialog windows.

## ConfirmationModal
- **ConfirmationModal** — Confirmation dialog with Cancel/Confirm footer built on Modal. Key props: `open`, `onClose`, `onConfirm`, `title`, `subtitle`, `description`, `size`, `corners`, `variant`, `confirmLabel`, `loadingLabel`, `cancelLabel`, `loading`, `confirmVariant` (`primary`|`danger`). Use for: destructive action confirmations, submit confirmations.

## BottomSheet
- **BottomSheet** — Atomic (Depth 1). Owns `BottomSheet.css`, no component imports (raw `div`s + a raw `<button>` grabber + `<Show>`). A controlled sheet that slides up from the bottom of its *parent container* — distinct from `Modal`, which is a viewport portal with a fixed overlay. **Bounding contract:** both the scrim and the sheet panel are `position: absolute`, so they are clipped to the nearest `position: relative` ancestor (the caller's container). The sheet caps at `max-height: 60%` of that container and slides in via `transform: translateY`; it can never escape the box or cover a sibling region above it. Dismiss paths: grabber tap, or a *direct* click on the scrim (a click on the sheet body is ignored). Key props: `open` (boolean — controlled), `onClose` (`() => void`), `children?` (`JSX.Element` — sheet body), `label?` (`string` — `aria-label` for the dialog region). The parent must set `position: relative` to bound the sheet. Use for: container-scoped action sheets, in-pane detail drawers, mobile-style option pickers within a bounded app region.
  - **No curried variant — intentional.** Every prop is data or a callback (`open` / `onClose` / `children` / `label`); there are no presentational props to freeze, so a `createBottomSheet` factory would add nothing. The base component is already zero-config at the call site (data + events only). This is a clean demonstration of STYLE_GUIDE.md "Variant Surface: keep it minimal" — ship only what the use case needs and skip the speculative size/color matrix.
  - Example:
    ```tsx
    import { BottomSheet } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const [open, setOpen] = createSignal(false);

    // The parent MUST be position: relative — it bounds the sheet.
    <div style={{ position: "relative", height: "480px" }}>
      <button onClick={() => setOpen(true)}>Open</button>
      <BottomSheet open={open()} onClose={() => setOpen(false)} label="Options">
        <p>Sheet contents</p>
      </BottomSheet>
    </div>
    ```

## Navigation
- **NavLink** — Anchor link with active state, color variants, and optional badge. Key props: `active`, `color` (`accent`|`warning`|`danger`|`success`), `badge`. Use for: navigation menus, sidebar links.
- **Link** — Minimal themed anchor wrapper. Use for: inline text links.
- **NewTabLink** — Link that always opens in a new tab (`target="_blank"`). Use for: external links.

## OverflowNav
- **OverflowNav** — Pure Composite (Depth 2). Composes `Row` (Layout Primitive) + `NavLink` (Atomic Primitive) + `PopoverMenu` (Atomic Primitive). Owns zero CSS and zero inline `style={}` (other than the `style={props.style}` passthrough on the outer `Row`). Horizontal nav row that automatically collapses items that don't fit horizontally into a trailing kebab (⋮) `PopoverMenu`, re-evaluated on container resize via `ResizeObserver` (rAF-debounced). Items render as full `NavLink`s while they fit; spilled items render as menu entries inside the kebab popover and activate via their `onClick` (or `href` fallback). Measurement strategy: on mount and whenever `items` change, all items render inline for one frame so the component can snapshot each item's natural `offsetWidth`; on subsequent resizes the cached widths drive the trim. A ~48px budget is reserved for the kebab trigger so the boundary case ("fits without kebab" ↔ "fits with kebab") doesn't oscillate. Key props: `items` (`OverflowNavItem[]` — `id`, `label`, optional `href`, `active`, `color` (`accent`|`warning`|`danger`|`success`), `badge`, `onClick`), `gap` (`xs`|`sm`, default `"sm"` — forwarded to `Row`; deliberately narrower than `Row`'s own `xs`|`sm`|`md`|`lg`, since no shipped consumer has asked for the wider steps here and its `gapPx()` overflow budget only accounts for these two), `align` (default `"center"`), `class?`, `style?`. Exported types: `OverflowNavProps`, `OverflowNavItem`. Inherits theme styling from `NavLink` (`--sui-*` / theme tokens already wired through `nav-link*` classes) and from `PopoverMenu` (kebab trigger + dropdown panel). Use for: top nav bars, breadcrumb-style tab rows, any horizontal nav list that must adapt to a constrained container width without wrapping.
  - Example:
    ```tsx
    import { OverflowNav, type OverflowNavItem } from "solid-ui-components";

    const items: OverflowNavItem[] = [
      { id: "overview",  label: "Overview",  href: "/overview", active: true },
      { id: "alarms",    label: "Alarms",    href: "/alarms", badge: 3, color: "warning" },
      { id: "vessels",   label: "Vessels",   href: "/vessels" },
      { id: "reports",   label: "Reports",   href: "/reports" },
      { id: "settings",  label: "Settings",  href: "/settings" },
    ];

    <OverflowNav items={items} />
    ```

## RecentStarred
- **RecentStarred** — Composite (Depth 2). A reusable "recently-visited" + "starred" shortcut feature for any navigable items (cases, customers, dashboards — anything with a stable id), shipped as a framework-agnostic store plus two bundled UI pieces. Item shape `RecentStarredItem` = `{ id: string; label: string; meta?: Record<string, unknown> }` (meta is a small JSON-safe payload that round-trips through localStorage so a click can navigate without re-fetching). Both lists persist to localStorage; `recent` is newest-first, de-duped, FIFO-capped; `starred` is id-keyed. CSS tokens: `--sui-star-fill`, `--sui-star-empty`, `--sui-star-hover`, `--sui-star-size`, `--sui-recent-bg`, `--sui-recent-border`, `--sui-recent-item-fg`, `--sui-recent-item-hover`, `--sui-recent-item-radius`, `--sui-recent-section-fg`, `--sui-recent-empty-fg`, `--sui-warning`, `--sui-bg-elevated`, `--sui-bg-secondary`, `--sui-border`, `--sui-radius-sm`, `--sui-text-muted`, `--sui-text-secondary`. Exports:
  - **createRecentStarredStore(opts)** — store factory. `opts: CreateRecentStarredOpts` = `{ storageKey: string; recentLimit?: number }` (default limit 20; writes `<storageKey>.recent` and `<storageKey>.starred`). Returns `RecentStarredStore` = `{ recent: Accessor<RecentStarredItem[]>; starred: Accessor<RecentStarredItem[]>; pushRecent(item); toggleStar(item); isStarred(id): boolean; clearAll() }`.
  - **StarToggle** — a 5-point star `<button>` that fills when the item is starred; click flips state via `store.toggleStar`. Props `StarToggleProps`: `store` (RecentStarredStore), `item` (RecentStarredItem), `ariaLabel?` (`(isStarred: boolean) => string`, defaults to "Starred"/"Not starred"), `title?` (string tooltip).
  - **RecentStarredSidebar** — pure sidebar renderer (no navigation/persistence) built on Layout `NarrowStack` + `BaselineSpreadRow`, showing starred and recent sections (both always render, with counts). Props `RecentStarredSidebarProps`: `store`, `onPick` (`(item) => void`, required), `starredTitle?` (default "Starred"), `recentTitle?` (default "Recent"), `starredEmpty?`/`recentEmpty?` (JSX.Element empty-state copy), `renderItem?` (`(item) => JSX.Element` label override), `class?`.
  - Use for: navbar/sidebar quick-access shortcuts, star-to-pin favorites, recently-viewed lists.
  - Example:
    ```tsx
    import {
      createRecentStarredStore,
      StarToggle,
      RecentStarredSidebar,
    } from "solid-ui-components";

    const cases = createRecentStarredStore({ storageKey: "rth.cases" });
    cases.pushRecent({ id: "r123", label: "R12345", meta: { tenant_id } });

    <StarToggle store={cases} item={{ id: "r123", label: "R12345" }} />
    <RecentStarredSidebar
      store={cases}
      onPick={(item) => navigateToCase(item.meta)}
    />
    ```

## Page
- **Page** — Full-page container with optional scanline and grid overlays. Key props: `scanLines`, `gridPattern`. Use for: top-level page wrapper. Scanline and grid effects are theme-dependent.

## Panel
- **Panel** — Styled container with corner decorations, glow effects, and edge accents. Key props: `title`, `corners` (`CornerStyle`), `variant` (`ColorVariant`), `size` (`none`|`sm`|`md`|`lg` — replaces old `padding` prop), `glow` (`none`|`subtle`|`medium`|`strong`), `edgeAccents`. Has `createPanel` factory for curried variants. Use for: decorated content containers.
- **InfoPanel** — Default color, subtle glow, clipped corners.
- **AccentPanel** — Primary color, medium glow, bracket corners.
- **DangerPanel** — Danger color, strong glow, clipped corners.
- **WarningPanel** — Warning color, subtle glow, clipped corners.
- **SuccessPanel** — Success color, subtle glow, clipped corners.
- **CompactPanel** — Small size, no glow, clipped corners.
- **DecoratedPanel** — Bracket corners with edge accents and medium glow.
- **SimplePanel** — Small size, no decorations. (Formerly CompactJTFPanel.)
- **SpaciousPanel** — Large size.

## CollapsiblePanel
- **CollapsiblePanel** — Composite (Depth 2). A side panel (`<aside>`) that collapses to a vertical strip with a rotated label and a chevron. Expanded, it shows a collapse tab plus a body wrapping `children`; collapsed, it becomes a clickable strip button that expands on click. Optionally mirrors the collapsed boolean to `window.localStorage` under `persistKey` (SSR-safe; reads `"1"`/`"true"` as collapsed). Props: `side` (`"left"`|`"right"` — drives chevron direction and edge styling), `label` (string, shown rotated on the strip and in expand/collapse titles), `persistKey?` (localStorage key), `defaultCollapsed?` (initial state when no persisted value, default `false`), `class?` (extra class on the outer `<aside>`), `children?`. Exported type `CollapsiblePanelProps`. Both the base `CollapsiblePanel` and the `createCollapsiblePanel(defaults)` factory are exported. Use for: dockable left/right sidebars (filters, inspectors, tool panels) that a user can fold to a thin labeled strip and whose state should persist across reloads.
  - Example:
    ```tsx
    import { CollapsiblePanel } from "solid-ui-components";

    <CollapsiblePanel side="left" label="Filters" persistKey="designview.filters">
      <FilterList />
    </CollapsiblePanel>
    ```

## ScrollRegion
- **ScrollRegion** — Atomic Primitive (Depth 1). Owns `ScrollRegion.css`; no library-component imports. A self-contained, **DYNAMIC** scroll affordance: a `position: relative` frame wrapping an `overflow-y: auto` viewport (holding `children`) with TOP and BOTTOM fade overlays whose visibility is **computed at runtime from scroll position**, not painted by static CSS. The component evaluates `overflowing = scrollHeight > clientHeight + threshold`, `atTop`, and `atBottom`; the top fade shows only when `overflowing && !atTop`, the bottom only when `overflowing && !atBottom`, and **NEITHER** when the content fits — so a fade always means "there is more content this way you can't see," never "this is the edge." The recompute fires on three triggers wired up on mount and torn down in `onCleanup`: the viewport's `onScroll`, a `ResizeObserver` (watching both the viewport and the content wrapper, so loading data / toggling rows re-evaluates the fades), and a `MutationObserver` (children added/removed change `scrollHeight` without firing scroll or, in some flex configs, resize). The component is **height-agnostic** — it fills its flex parent rather than baking in a fixed height, so a `height: 100%` / flex child resolves against the viewport while real overflow still scrolls. Colours key off `--sui-*` theme tokens; the fade gradients fade `transparent → var(--sui-bg-primary)` so they match the panel/background in every theme. BEM classes: `.sui-scroll-region` (frame), `__viewport`, `__content`, `__fade` + `__fade--top`/`__fade--bottom` with an `is-visible` state class. Props: `children`, `class`/`style` (inner viewport), `frameStyle` (outer frame), `threshold` (rounding tolerance, default 1), plus standard `<div>` attributes (`id`, `data-*`, aria, `ref`) passing through to the frame. The base `ScrollRegion` IS exported (it is the primary, behaviour-bearing API). **Factory + variants** are optional convenience presets for bounded, non-flex call sites: `createScrollRegion({ style | frameStyle | threshold })` plus `ScrollRegionMd` (viewport caps at 240px) and `ScrollRegionLg` (360px) — these only bake a viewport `max-height`, they do not change the fade behaviour. Exported types: `ScrollRegionProps`, `ScrollRegionOverrides`. Use for: any scrollable list/panel where a "more below/above" cue is wanted and a hard edge should read as the end.

## PopoverMenu
- **PopoverMenu** — Atomic Primitive (Depth 1). Trigger button with positioned action dropdown. Key props: `trigger` (JSX content for the trigger button), `header?` (optional non-interactive JSX rendered above the items — e.g. the signed-in user's email in an account menu; excluded from keyboard nav and menu a11y via `role="presentation"`, separated from the items by a bottom border; omit it and the panel is byte-identical to before), `items` (array of `PopoverMenuItem` with `id`, `label`, optional `icon`), `onSelect` (callback with item `id`), `align` (`left`|`right`), `size` (`sm`|`md`). Internals: native `<button class="sui-popover-menu__trigger">` with inline chevron SVG (via `ICON_PATHS` data import) and `<ul class="sui-popover-menu__panel">` of `<li role="menuitem">` items (the optional header is a leading `<li class="sui-popover-menu__header" role="presentation">`) — no library component imports. Closes on click-outside and Escape; items support `Enter`/`Space` keyboard activation. Use for: action menus, user menus, account menus, context menus.
- **RightPopoverMenu** — Right-aligned, small trigger (inherits `header`). Use for: header action menus, account dropdowns (email header + Logout).

## NotificationCenter
- **NotificationCenter** — Composed (Depth 3). A bell trigger with a count badge that opens an **inbox panel** of notifications. Owns a minimal `NotificationCenter.css` for overlay chrome only — the trigger's skin and corner anchoring, plus the row's intrinsic decoration (tone well, unread dot, hover wash) — a deliberate structural exception, the same one `Fab` takes (positioning geometry no atomic variant expresses). All content composes `Icon` (bell + tone glyph + spinner), `CountBadge`, `TagPill` (header count lozenge), `Divider`, `InboxPopoverSurface` (panel), the `FillColumn`/`ScrollColumn`/`SpreadRow`/`WrapRow`/`TopClusterRow`/`GrowTightStack` layout variants, `TextTitle`, `TextSublabel`, `MutedBody`, `TextButton`, and `Link`. **Panel shape — the inbox shell** (see `docs/agents/design-decision-tree.md` › Notification/activity panel): `FillColumn` → pinned header (`SpreadRow`: label + de-emphasized `TagPill` count) → `Divider` → `ScrollColumn` of rows → optional `Divider` + pinned footer action. Each row is a **media object**, unboxed at rest and washed on hover: `TopClusterRow` → [unread gutter dot, tone glyph well, `GrowTightStack` → (`SpreadRow`: `TextTitle` title left / `TextSublabel` `when` right, `TextSublabel` detail, optional consumer `body`, `WrapRow` action row)]. The leading well is what keeps an unboxed row reading as a unit; the `WrapRow` left-packs the actions so the link and button branches share one indent, wraps when several actions don't fit, and doubles as the click-isolation barrier that stops an action click activating the row beneath it. The row itself lives in `NotificationRow.tsx`; `types.ts` and `actions.ts` carry the data contract and the prefab builders. This **supersedes the three-line `CompactSurface` card canon** the component shipped with (2026-07-24) — the only `Surface` in the panel is now the `InboxPopoverSurface` itself. Beyond that chrome CSS, the only inline styling is the dynamic panel position — a `Portal` + `fixed` wrapper measured from the trigger (the sanctioned overlay carve-out of Layout Purity). **Router-agnostic and domain-agnostic**: the consumer supplies `items` and does the navigating inside `onAction` — the component never imports a router, ships no date formatter (hence the pre-formatted `when` string), and needs no consumer CSS. Supports both **uncontrolled** (manages its own open state) and **controlled** (`open` + `onOpenChange`) use; a controlled `open` lets the consumer auto-open on new activity. Closes on click-outside and Escape. **Trigger states**: transparent at rest, a faint accent wash on hover, and while open an accent-tinted well with an accent border **plus** the bell glyph swapping `outline`→`solid` — two independent signals, so the open state survives a monochrome or colourblind theme (matches `.sui-dropdown--subtle.sui-dropdown--open`, so every subtle overlay trigger marks "my panel is showing" the same way). Each action renders as a `Link` with a `→` suffix when it has an `href` (plain left-click SPA-navigates; modifier/middle-clicks fall through so new-tab gestures still work) or as a `TextButton` in its `tone` when it doesn't — the arrow means "this navigates", so it rides the anchor branch only — `Link`, not `NavLink`, because `NavLink` is a nav-RAIL item and bakes `padding-left:16px`. Items marked `transient` show a spinner in their well instead of an action and are excluded from the badge count. Key props: `items` (`NotificationItem[]`), `badgeCount?` (number — defaults to the count of items that are neither `transient` nor `read`), `busy?` (boolean — overlays a spinner on the bell and announces "Working…"), `open?` (boolean — presence switches to controlled mode), `onOpenChange?` (`(open: boolean) => void`), `onAction?` (`(item: NotificationItem) => void` — fires when the row BODY is activated, and as the fallback for an action carrying no `onClick` of its own; **supplying it is also what makes the row body clickable**, wiring `role="button"`, a tab stop, and Enter/Space — omit it and the row is inert), `onMarkAllRead?` (`() => void` — **supplying it is what mounts the pinned footer**; omit it and neither the footer nor its divider render, so the panel never shows a dead affordance), `markAllReadLabel?` (string, default `"Mark all as read"`), `emptyLabel?` (string, default `"You're all caught up."`), `label?` (string, default `"Notifications"` — used as the trigger's `aria-label`, the panel's landmark label, and the header title). Exported types: `NotificationCenterProps`, `NotificationItem` (`id`, `title`, `detail?`, `body?`, `actions?`, `action?` — **deprecated**, `transient?`, `tone?`, `when?`, `read?`), `NotificationAction` (`label`, `onClick?`, `href?`, `tone?`, `icon?`, `disabled?`, `dismissPanel?`), `NotificationActionTone`, `NotificationTone`. **`items[].actions` takes any number of actions**; whether each closes the panel is per-action — navigating ones do, in-place ones don't, `dismissPanel` overrides. **`items[].body`** is a THUNK (`() => JSX.Element`) rendering arbitrary content between the detail line and the action row — a thunk because feeds get built as module-scope arrays, where eagerly-constructed JSX escapes the reactive root and stops tracking. Exported builders: `viewAction(href, label?)`, `dismissAction(fn, label?)`, `markReadAction(fn, label?)`, `acceptAction(fn, label?)`, `declineAction(fn, label?)`, `deleteAction(fn, label?)`, plus the `resolveActions`/`closesPanel` resolvers. `NotificationItem.tone` (`info`|`task`|`warning`, default `info`) is **live** — it colours the row's glyph well and picks the glyph (`info` → info, `task` → clock, `warning` → warning). `when` is a pre-formatted relative time the consumer humanizes ("2m", "1d"); `read` drops the item's unread dot and removes it from the badge count. Accessibility: the trigger carries `aria-label`/`aria-haspopup`/`aria-expanded` and `aria-busy` while working; a visually-hidden `.sui-sr-only` `aria-live="polite"` region announces transient item titles (or "Working…"); the panel is a named `<section aria-label>`, which is an implicit region landmark; the unread dot and tone glyph are `aria-hidden` decoration. Theming: the trigger and well derive from `--sui-accent-rgb`/`--sui-warning-rgb`/`--sui-text-muted`; all other color/spacing comes from the composed atoms and their tokens. Use for: a global notification/inbox bell in an app header, an activity feed with per-item follow-through actions, surfacing background-task progress (transient rows + `busy`).

## ProgressCheck
- **ProgressCheck** — Three-state progress indicator: empty checkbox (0%), partial fill (1-99%), green check (100%). Key props: `progress` (0-1 number), `size` (`xs`|`sm`|`md`|`lg`|`xl`, default `sm`). SVG-based, matches Icon sizing. Use for: task completion indicators, goal progress, hierarchical rollup status.

## BurndownChart
- **BurndownChart** — SVG burndown bar chart with dual-axis stacked bars and trendline. Key props: `bars` (array of `BurndownBar` with `planned_complete`, `planned_incomplete`, `unplanned_complete`, `unplanned_incomplete`), `onSegmentClick` (callback with `barIndex` and `BurndownSegmentKind`), `height`. Above zero: green (planned complete) on grey (planned incomplete). Below zero: orange (unplanned complete) on red (unplanned incomplete). Trendline projects remaining planned work to zero with "+Nd" annotation. Uses `--sui-*` CSS variables. Use for: sprint burndown tracking, planned vs actual visualization.

## SprintSelector
- **SprintSelector** — Atomic (Depth 1). Horizontal row of clickable mini stacked bars for selecting a sprint/week. Each sprint renders a `viewBox="0 0 20 100"` SVG bar whose overall height scales to that sprint's share of the max total across all sprints, internally stacked into four segments — planned-complete, planned-incomplete, unplanned-complete, unplanned-incomplete — with a text label beneath. Each bar-group is a keyboard-accessible `role="button"` (Enter/Space activates). Key props: `sprints` (`SprintSummary[]`, each `{ label; planned_complete; planned_incomplete; unplanned_complete; unplanned_incomplete }` counts), `selectedIndex` (number, optional — applies the selected style), `onSelect` ((index: number) => void, optional). Exported types: `SprintSelectorProps`, `SprintSummary`. Styling shares the `sui-burndown__seg--{pc,pi,uc,ui}` segment classes; CSS tokens `--sui-accent`, `--sui-accent-rgb`, `--sui-text-muted`. Use for: sprint pickers, burndown week navigators, compact multi-period selectors.
  - Example:
    ```tsx
    import { SprintSelector, type SprintSummary } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const sprints: SprintSummary[] = [
      { label: "W1", planned_complete: 6, planned_incomplete: 2, unplanned_complete: 1, unplanned_incomplete: 0 },
      { label: "W2", planned_complete: 4, planned_incomplete: 3, unplanned_complete: 2, unplanned_incomplete: 1 },
    ];
    const [selected, setSelected] = createSignal(0);

    <SprintSelector sprints={sprints} selectedIndex={selected()} onSelect={setSelected} />
    ```

## RingChart
- **RingChart** — Atomic (Depth 0). Radial donut gauge: stacked arc segments over a background track ring, with a bold auto-fitting center label and optional sublabel. Pure SVG — no library dependencies. Segment order is clockwise from the top (rotated -90deg). The center label font-size is auto-fitted to the ring diameter and the label's character count. Key props: `segments` (`{ value: number; color: string; animate?: boolean }[]` — animate adds a 2s pulse on the arc), `total` (denominator for all segments), `label` (bold center text, e.g. `"62%"`), `sublabel?` (secondary text below label), `size?` (diameter in px, default 100). Use for: completion gauges, category-breakdown donuts, any "N of total" ring indicator.
  - Example:
    ```tsx
    import { RingChart } from "solid-ui-components";

    <RingChart
      size={140}
      total={100}
      label="62%"
      sublabel="complete"
      segments={[
        { value: 62, color: "var(--sui-success)" },
        { value: 38, color: "var(--sui-border-bright)" },
      ]}
    />
    ```

## Progress
- **StackedProgressBar** — Multi-segment progress bar. Key props: `segments` (array of `{percentage, color}`), `direction` (`horizontal`|`vertical`), `label`, `background`. Use for: multi-category progress visualization, stacked bar charts.

## ProgressCard
- **ProgressCard** — Step-based progress indicator with icons and connectors. Key props: `title`, `subtitle`, `steps` (array of `ProgressStep` with `id`, `label`, `status`, `icon`), `message`. Use for: multi-step workflow status display.
- **createWorkflowProgressCard** — Factory that derives step statuses from `currentStep` + `status`. Returns a component with props: `title`, `subtitle`, `currentStep`, `status` (`fetching`|`caching`|`completed`|`error`), `message`. Use for: automated workflow progress tracking.
- **CacheProgressCard** — Pre-built 5-step cache workflow progress card (Minutes, Hours, Stats, Coverage, Calcs). Use for: data caching pipeline status.

## WorkerCard
- **WorkerCard** — Composed (Depth 2, owns CSS). Card visualizing a single extraction-worker slot. Composes `Surface` + `Text`; owns `WorkerCard.css`. Animated expand/collapse for the plan row (PK range or single-stream summary) and progress row (fill bar + row count). Border color and background tint derive from `status` + `overdue` — no visual props at the call site. Exports `WorkerStatus` type. Key props: `slotId` (1–4), `status` (`"idle"`|`"claimed"`|`"extracting"`|`"writing"`|`"complete"`), `now` (Date.now() — caller drives the clock), `startedAt` (ms when batch was claimed), `extractStartedAt` (ms when extraction began — drives the fill bar), `jobsCompleted`, `avgRatePerSec`, `estimatedS` (expected duration in seconds), `elapsedS?` (final elapsed, set on complete), `overdue?` (true → crimson badge + border), `rows?` (current row count). Batch-mode extras: `pkStart?`, `pkEnd?`, `batchSize?`. Single-stream extras: `totalRecords?`. Other: `columnCount?`, `currentJob?` (label for the in-flight job). Use for: a live ETL extraction dashboard showing per-worker slot state alongside `ExtractionBoard`.

## EntityCard
- **EntityCard** — Composite (Depth 2, owns CSS). The unified sidebar/list card: SUI owns the fixed 3-column grid, selection affordance (3px left border + accent wash), and hover-revealed remove control; the CLIENT fills each named REGION with its own domain content. A region-slot card (contrast `SlotCard`, whose slots are TYPED and SUI-rendered) — because a region can hold arbitrary domain content, EntityCard carries no value renderers of its own; it is pure layout. Layout: `identifier` (top-left, required) · `status` (top-right) over an optional `detail` line, over a bottom row of `timing` (left) · `progress` (center) · `counts` (right); unused rows collapse. Key props: `identifier` (required), `status?`, `detail?`, `timing?`, `progress?`, `counts?`, `selected?`, `onClick?`, `onRemove?` (hover ✕). Override prop: `class`. Use for: vessel-call pickers, triage queues, report selectors — any list/sidebar card keyed by a domain identifier.

## SlotCard
- **SlotCard** — Composite (Depth 2, owns CSS). Generic typed-slot card family: each card is a fixed, NAMED layout template whose slots are TYPED (`name` / `status` / `count` / `date` / `dots` / `value` / …), each mapping to a themed SUI display component — the card analogue of the `fields.*` column types that drive FieldTable. Contrast `EntityCard` (region slots filled with client-rendered content); use SlotCard when the slot content is a generic typed value SUI can render. Responsive via CONTAINER queries: every slot carries a drop PRIORITY (1 = always, 2 = mid, 3 = low) and low-priority slots shed as the card narrows; the primary slot ellipsises rather than dropping. The `createSlotCard` factory is SUI-internal and NOT exported — the only public surface is the curried templates: single-line (`TitleStatus`, `TitleCount`, `RangeCountStatus`, `DenseStatusRow`, `DenseStatusNote`, `ChipNote`, `IdStatusRange`, `SingleLine`), two-line (`TitleMeta3`, `TitleAssetDate`, `TitleProgress`, `TitleAssetProgress`, `TitleDotsMeta`, `TitleMetaCount`), and overlay/tile (`PickCard`, `StatTile`). A row whose every slot is absent renders nothing at all (no element, no gap) — which is what lets `DenseStatusNote` carry a conditional `error` line that costs a succeeded card nothing. Key props: `values` (the typed `SlotValues` map), `active?`, `onSelect?`, `accent?` (`info`|`success`|`warning`|`danger` tone rail), `corner?`, `onRemove?`, `action?` (`{ label, onClick }` — a trailing SUI-chosen ghost button on templates configured for it, e.g. Cancel on a queued job; the click never reaches `onSelect`), `maxWidth?` (px override of the baked cap; default 40ch). Types: `SlotCardProps`, `SlotValues`, `SlotName`, `AccentTone`. Use for: list/sidebar cards whose fields are generic typed values (name, status, counts, dates, compliance dots).

## WorkProgressCard
- **WorkProgressCard** — Status-aware work card (claimedBy · status / title / progress bar) whose bar is derived **entirely from metadata** — the caller never picks a color or proportion. Data-only props (no visual overrides, so re-exported directly, no factory): `status` (`NEW`|`TODO`|`DOING`|`DONE`|`BLOCKED`|`QUESTION`|`CLOSED`), `title`, `claimedBy?`, `subtitle?`, `estimate?` (number), `actual?` (number, same unit). The bar treatment: in-progress → blue fill to `actual/estimate` + faded-blue remainder; over budget → bar reproportioned so `actual` is full width, estimate's share filled + **crimson** overrun; complete → fill turns **forest green**, unused budget **dark grey**; `BLOCKED`/`QUESTION` → work-so-far in blue, dim remainder, with a ⚠/? sign over the bar; `NEW`/`CLOSED` → empty. Use for: monitor/sprint dashboards showing live task progress vs. estimate.
  - **Live view:** actual time accrues from work segments. Compute it from the clock and pass it in — the card re-renders reactively (no internal timers):
    ```tsx
    import { WorkProgressCard, actualFromSegments, isRunning } from "@primestageprime/solid-ui-components";
    const segs = work.endedAt ? [{ start: work.startMs, end: work.endedMs }] : [{ start: work.startMs }];
    const actual = () => actualFromSegments(segs, now());           // Σ(endᵢ−startᵢ) + (now−start)
    <WorkProgressCard status={isRunning(segs) ? "DOING" : "DONE"} title={work.title}
                      claimedBy={work.assignee} estimate={work.estimateMs} actual={actual()} />
    ```
- **Pure derivation helpers** (exported for custom renderers): `deriveCardBar({ status, estimate?, actual? })` → `{ segments: { width, color }[], sign }` (the single source of truth for the styling); `statusAccent(status)` → border/label color; `actualFromSegments(segments, now)` → Σ of closed segment durations + the open segment to `now` (clamps not-yet-started spans to 0); `isRunning(segments)` → true while any segment is open. Palette constants: `CARD_BAR_COLOR`, `CARD_SIGN_COLOR`. Types: `WorkStatus`, `CardProgressInput`, `CardBar`, `CardBarSegment`, `CardSign`, `WorkSegment`. All unit-tested in `cardProgress.test.ts`.

## SlotFillBar
- **SlotFillBar** — Atomic (Depth 1). Fill-from-left progress bar for an ordered queue / pipeline of equal-sized work slots that move through `todo → doing → done`. Owns its CSS, no component imports. Distinguished from `StackedProgressBar` by its two-transition design: a `todo → doing` transition SLIDES the active overlay (clip-path inset interpolated; colour snaps to the doing tone so the slide reads as one solid wave); a `doing → done` transition FADES the overlay's background colour in place to the done tone, while the static fill grows by one slot's width to absorb it. `transform: scaleX` on the static layer + `clip-path: inset` on the overlay are both compositor-friendly and keep the animation off the layout thread. Honours `prefers-reduced-motion: reduce`. Key props: `slots` (total slot count), `done` (number of fully-done slots), `active` (`{ index, phase: "doing" | "done" } | null`), `height` (default 24), `maxWidth` (default 400, pass `null` to remove the cap), `todoColor` / `doingColor` / `doneColor` (CSS colour overrides), `label` (a11y / hover title; defaults to `"<done>/<slots> done"`). Use for: a queue of work units progressing one at a time (build steps, batch import slots, retry attempts, prompt-cache warm-up phases) — anywhere the audience benefits from seeing both the cumulative completion *and* the in-flight slot's phase change without scanning a separate status pill.
  - Example:
    ```tsx
    import { SlotFillBar } from "solid-ui-components";

    // Queue of 10 work units, 3 already done, slot 4 is now actively being
    // processed (still in "doing"). The overlay sits clipped to slot 4 in
    // the doing colour; the static fill spans slots 1–3 in the done colour.
    <SlotFillBar slots={10} done={3} active={{ index: 3, phase: "doing" }} />
    ```

## ProductGrid
- **ProductGrid** — Pure Composite (Depth 2). Composes `AreaFocusGrid` + `ProductGridCard` + `FocusLabelBand` + `StackedProgressBar`. Owns zero CSS and zero inline `style={}` apart from the consumer pass-through on the root `AreaFocusGrid` — visual treatment lives in those Primitives' own CSS files. (Area × focus) pivot grid where every item lives in one area, attaches to a focus within that area, and sits either above the line (a solution, work tracked through `todo → doing → done`) or below the line (a need, auto-met when every solution it references in `solvedBy` is fully done). The layout (area headers spanning sub-columns; major/minor separators; cell stacks anchored toward the label band) is supplied by `AreaFocusGrid`; per-item cards (with selection/met affordances + an optional progress-bar slot) are `ProductGridCard`; the focus-label band sandwiched between the two stacks (above-aggregate work · below-aggregate met-vs-unmet bars) is `FocusLabelBand`. Selection is bidirectional and either controlled or uncontrolled: clicking a need surfaces its solving solutions, clicking a solution surfaces every need that depends on it, and clicking a focus highlights its whole sub-column. Key props: `items` (`ProductGridItem[]` — `id`, `area`, `focus`, `position`, `shortName` ≤ 3 words, `description`, optional `work`, optional `solvedBy`), `areaOrder` (left-to-right area ordering; empty areas drop out), `work?` (`Record<id, { todo, doing, done }>` overriding each item's static `work`; pass a SolidJS store for animation), `selection?` (`{ kind: "item", id } | { kind: "focus", area, focus } | null`), `onSelectionChange?`, `class?`, `style?`. Also exports `isSolutionSatisfied(work?)` for consumers that need the same met-check logic. Use for: product-strategy roadmaps, OKR boards (objectives below the line, key results above), capability/coverage maps where you want to read at a glance whether the underlying work satisfies the stated needs.
  - Example:
    ```tsx
    import { ProductGrid } from "solid-ui-components";

    <ProductGrid
      areaOrder={["AMYGDALA", "JTF", "RHINO"]}
      items={[
        { id: "a1", area: "AMYGDALA", focus: "DAG-CHART", position: "above",
          shortName: "Hover Tooltip", description: "Add tooltip on dag chart node hover.",
          work: { todo: 0, doing: 0, done: 5 } },
        { id: "b1", area: "AMYGDALA", focus: "DAG-CHART", position: "below",
          shortName: "Friendly Hover", description: "Hovering reveals identity in <100ms.",
          solvedBy: ["a1"] },
      ]}
    />
    ```
- **AreaFocusGrid** — Atomic Primitive (Depth 1). Owns `AreaFocusGrid.css`. (Area × focus) pivot layout: each area is a header that spans its focus sub-columns; each sub-column carries an above-the-line cell stack on top, a focus-label band in the middle, and a below-the-line cell stack at the bottom. Major horizontals divide the rows; major verticals (3px, `--sui-border-bright`) divide adjacent areas; minor verticals (1px, `--sui-border`) divide adjacent focuses within an area. Empty areas drop out of the grid. Content is supplied via render callbacks so the layout is reusable. Key data props: `areas` (`AreaFocusGridArea[]` — each `{ id, label, focuses: { id, label }[] }`), `renderAreaHeader`, `renderFocusLabel`, `renderAboveCell`, `renderBelowCell`, `class?`, `style?`. Override props: `subColumnMinWidth` (default `"120px"`), `cellRowMinHeight` (default `"80px"`). Factory: `createAreaFocusGrid`. Exported types: `AreaFocusGridProps`, `AreaFocusGridArea`, `AreaFocusGridFocus`, `AreaFocusCellKey`. Uses `--sui-border`, `--sui-border-bright`, `--sui-text-primary`, `--sui-text-secondary`. Use for: pivot dashboards where every column belongs to a group that spans multiple sub-columns and each cell has an above/below split — product/OKR grids, coverage matrices.
- **ProductGridCard** — Atomic Primitive (Depth 1). Owns `ProductGridCard.css`. A small selectable card used inside `AreaFocusGrid` cell stacks (or anywhere a dashed-border, optionally selectable, optionally "met" mini-card with a label + progress-bar slot is needed). `selected` and `met` are exposed as `data-selected` / `data-met` attributes so CSS owns the visual treatment; `selected` wins over `met`. Key data props: `selected?`, `met?`, `title?`, `onClick?`, `bar?` (JSX slot — typically a `StackedProgressBar`), `barTitle?`, `children` (label content). Override prop: `class`. Factory: `createProductGridCard`. Uses `--sui-bg-elevated`, `--sui-border`, `--sui-accent`, `--sui-success`. Use for: per-item cards inside `ProductGrid`, or any roadmap/coverage grid card with progress + selection affordances.
- **FocusLabelBand** — Atomic Primitive (Depth 1). Owns `FocusLabelBand.css`. The focus-label cell rendered between the above/below cell stacks of an `AreaFocusGrid` sub-column. Three vertically-stacked regions: optional `aboveBar` slot, the label content (`children`), and optional `belowBar` slot. `selected` is exposed as `data-selected` so CSS owns the highlight. Key data props: `selected?`, `onClick?`, `aboveBar?`, `aboveBarTitle?`, `belowBar?`, `belowBarTitle?`, `children`. Override prop: `class`. Factory: `createFocusLabelBand`. Uses `--sui-accent`. Use for: pivot-grid focus labels with aggregate progress affordances above and/or below.

## PivotTreemap
- **PivotTreemap** — Pure Composite (Depth 2). Composes `Treemap` + `SlotFillBar` + the `PivotPills` sub-Primitive (also exported from this module) + the compact `ChipLabel` / `EllipsizedChipLabel` / `CountText` (Text) + `TightSpreadRow` (Layout) Curried Variants. Owns zero CSS and zero inline `style={}` — typography for keys/counts lives in the Text variants, the leaf row layout lives in the Layout variant, and the outer cell grid + sidebar shells live in the Treemap Primitive. Pivot of a flat `rows: T[]` collection bucketed by two string-tagged dimensions (`outer` and `inner`) — the `Treemap` Primitive lays out the outer columns × inner leaves, this Composite supplies the bucket data, the per-bucket SlotFillBar feeds, and selection lifting. Generic over `T` and a `Dim` union; caller hands in `accessors` describing how rows expose dimension values. Multi-valued dimensions are honest: a row that produces N values for a dim contributes to N buckets, so summed child counts can exceed the parent's `total`. Optional "untagged" sidebar surfaces rows that don't appear under any tagged bucket. Key props: `rows` (`readonly T[]`), `outer` / `inner` (`Dim`), `accessors` (`PivotAccessors<T, Dim>`), `metrics?` (`PivotMetrics<T>` — per-bucket SlotFillBar feed), `untaggedCount?` (default `0`), `selection?` (`PivotSelection | null` — `{ outerKey, innerKey: string | null, scope: "tagged" | "untagged" }`), `onSelect?`. Also exports `bucketByDims`, `EMPTY_INNER_KEY`, and types `PivotAccessors`, `PivotBucket`, `PivotMetrics`. Use for: alarm-tag pivots, ops-data drilldowns, any "rows × two-tag axes" visualization with optional progress affordances.
- **Treemap** — Atomic Primitive (Depth 1). Owns `Treemap.css`. Generic outer-column × inner-leaf treemap layout: caller hands in `cells` (each with a `weight` and `children`, each child also with a `weight`) plus render callbacks for the outer header, optional outer toolbar (e.g. a SlotFillBar summary), and inner-cell content. Predicate-based selection (`isOuterSelected`, `isInnerSelected`) so the parent owns the source of truth — the Primitive only paints the selection ring and forwards click events with `stopPropagation` already handled. Optional trailing `sidebar` pseudo-column for an "untagged" or escape-hatch bucket. Key data props: `cells` (`readonly TreemapCellData[]`), `renderOuterHeader`, `renderOuterToolbar?`, `renderInnerContent`, `isOuterSelected?`, `isInnerSelected?`, `onOuterClick?`, `onInnerClick?`, `outerTitle?`, `innerTitle?`, `sidebar?` (`TreemapSidebar`). Override prop: `class`. Factory: `createTreemap` (preserves generics so each call site keeps full type inference for its cell shape). Curried Variants: `SelectableTreemap` (no overrides locked — equivalent to the raw Primitive but participates in the Factory ecosystem for future overrides). Uses `--sui-bg-deep`, `--sui-bg-elevated`, `--sui-border`, `--sui-accent`. Use for: tag-based pivots, mosaic dashboards, "fraction-of-whole" group-and-leaf layouts.
- **PivotPills** — Atomic Primitive (Depth 1). Owns `PivotPills.css`. Drag-to-reorder pill row that lifts a `Dim[]` permutation to the caller. Position 0 = outer, position 1 = inner, position 2+ = unused. Drag any pill onto another to swap their slot positions. Generic over a `Dim` string union. Key data props: `order` (`Dim[]`), `setOrder` (`(next: Dim[]) => void`), `slotLabels?` (`[string, string, string]`, default `["outer", "inner", "unused"]`). Use for: the dimension-picker control above a `PivotTreemap` (or any other two-slot pivot surface that needs runtime reordering).

## Section
- **Section** — Collapsible section with title, subtitle, corner decorations, and header action slot. Key props: `title`, `subtitle`, `variant` (`ColorVariant` — sets accent color), `corners` (`CornerStyle` — visual corner treatment; replaces old `"bordered"`/`"decorated"` variant values), `fill`, `showHeader`, `headerAction`, `collapsible`, `collapsed`, `onToggleCollapse`, `defaultExpanded`. Has `createSection` factory. Use for: major page sections.

## SegmentedControl
- **SegmentedControl** — Atomic (Depth 1). Owns `SegmentedControl.css`. Single-select control across more than two mutually-exclusive states, rendered as one connected segmented bar with a ridged-groove seam between adjacent segments and a heavier divider at group boundaries. Controlled, with radio-group semantics and full keyboard nav (arrows/Home/End, roving tabindex, disabled segments skipped). Key props: `options` (`SegmentOption[]` — each `{ value, label?, group?, color?, disabled? }`; a divider renders wherever adjacent `group` keys differ), `value` (controlled, single-select), `onValueChange` (`(value: string) => void`, fires only on change), `color` (`ColorVariant` — fallback accent for the selected segment when a segment sets none), `disabled` (whole control), plus `aria-label`/`aria-labelledby` (required for the `radiogroup`) and any other `div` attributes via spread. Fixed single (md) size; always content-width (won't stretch in a flex parent). Has `createSegmentedControl` factory — curry your own app-specific variant (e.g. an `AUTO | (PROD | OFF)` override control) in the consumer's own `variants.ts`; SUI ships no domain-specific variant. Exported types: `SegmentOption`, `SegmentedControlProps`, `SegmentedControlOverrides`, `SegmentedControlDataProps`. Uses `--sui-border`, `--sui-border-bright`, `--sui-accent`, `--sui-accent-rgb`, `--sui-danger`, `--sui-success`, `--sui-warning`, `--sui-bg-deep`, `--sui-text-primary`, `--sui-text-muted`, `--sui-radius-md` theme tokens. Use for: mode/override switches, view togglers, any single choice across 3+ states.

## Select
- **Select** — Unified single- and multi-select built on `@kobalte/core/select`. The `multiple?` literal narrows `value`/`onChange`: `false`/absent → `SelectOption | null`; `true` → `SelectOption[]`. Key props: `options` (`Accessor<SelectOption[]>`), `value`, `onChange`, `label`, `description`, `placeholder`, `id`. Any other kobalte `SelectRootProps` field (e.g. `placement`, `gutter`, `open`/`defaultOpen`, `onOpenChange`, `disabled`) is forwarded via spread. Single-mode uses `disallowEmptySelection={false}`; multi-mode renders a comma-joined preview plus an inline clear button in the trigger. Exported types: `SelectProps`, `SelectOption`, `SingleSelectProps`, `MultiSelectProps`. Uses `--sui-bg-elevated`, `--sui-bg-primary`, `--sui-border`, `--sui-border-bright`, `--sui-accent`, `--sui-accent-rgb`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: priority pickers, status filters, tag selectors, any single- or multi-select form field.
  - Example:
    ```tsx
    import { Select, type SelectOption } from "solid-ui-components";

    const options: SelectOption[] = [
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ];

    // Single
    <Select label="Priority" options={() => options} value={priority} onChange={setPriority} />

    // Multi
    <Select multiple label="Statuses" options={() => options} value={statuses} onChange={setStatuses} />
    ```

## Selector
- **SidebarSelector** — Sidebar card list with selection content area (generic). Key props: `items`, `selectedId`, `onSelect`, `renderCard`, `renderSelection`, `height` (optional fixed layout height), `label`. The sidebar width is frozen in CSS (`280px`); there is no `sidebarWidth`/`maxHeight` runtime prop. Use for: master-detail selection patterns, sidebar navigation with preview pane.

## Surface
- **Surface** — Themed container primitive with padding, radius, background, and border control. Key props: `padding` (`none`|`sm`|`md`), `radius` (`none`|`sm`|`md`), `gap` (`none`|`xs`|`sm`|`md`|`lg` — forwarded verbatim to the inner Stack/Row, so it is that scale plus `none`; takes effect only when `direction` is set), `bg`, `borderColor`, `interactive`, `active`. Use for: base container for cards, panels, and interactive areas.
- Curried variants: `CardSurface`, `CompactSurface`, `InteractiveCard`, `InfoSurface`, `WarningSurface`, `SuccessSurface`, `DangerSurface`, `NoticeBar` (full-width flush informational bar — row/center, accent-tinted like `InfoSurface` but `radius: none` so it sits against app chrome; for top-of-app notices). Use for: pre-themed containers for specific contexts (alerts, cards, status surfaces).
- **`SurfaceDataProps` strips layout overrides.** A curried variant's public type is `SurfaceDataProps = Omit<SurfaceProps, keyof SurfaceOverrides>` — `padding`, `radius`, `bg`, `borderColor`, `interactive`, `shadow`, `direction`, `align`, `gap`, `minWidth`, and `maxWidth` are all baked in at curry time and are **not** accepted at the call site. Passing any of them to e.g. `WarningSurface` fails with TS2322, by design (ADR 0001: visual config is locked at curry time so it can't drift via inline overrides). If a call site needs a different value for one of these, that's a case for a new named variant, not a prop override.

## ValueMatrix
- **ValueMatrix** — Composite (Depth 2). Composes `BaseTable`; owns `ValueMatrix.css`. A row-axis × column-axis grid of COMPUTED values — not a row table: every cell is `value(row, col)` evaluated across two axes (CE levels × power sources, price points × salary counts). Treatment follows the 2026-07-17 ruling: the consumer configures functions, never CSS — `tone?: (value, row, col) => Tone` maps to theme color classes, `selected?: (row, col) => boolean` marks the chosen scenario (weight + soft halo). Generic over `<R, C>`. Key data props: `rows` (`R[]`), `cols` (`C[]`), `rowLabel` / `colLabel` (axis value → `string | JSX.Element` — widened so a column header or row axis label can carry JSX, e.g. `NumberWithUnits`, not just plain text), `rowAxisLabel?` (header over the row-axis column), `value` (`(row, col) => number | null`; null renders blank — ruled 2026-07-18, empty markers distract from real data), `format?` (`(number) => string`), `tone?`, `selected?`. `Tone` is the shared semantic vocabulary from `src/types.ts` (`default | success | warning | danger | accent | muted | highlight`). Factory: `createValueMatrix<R, C>(defaults)` — curries the mapping surface (`ValueMatrixOverrides`: `rowAxisLabel`/`rowLabel`/`colLabel`/`format`/`tone`) into a domain matrix whose call sites pass only `ValueMatrixDataProps` (`rows`/`cols`/`value`/`selected`), generic-preserving like `createTreemap`. Example: `const ComplianceMatrix = createValueMatrix<number, PowerSource>({ rowAxisLabel: "CE", rowLabel: ce => \`${ce}%\`, colLabel: s => s.label, format: v => \`${v.toFixed(2)} g/kWh\`, tone: v => v !== null && v < THRESHOLD ? "success" : "danger" })` → `<ComplianceMatrix rows={ceLevels} cols={sources} value={getValue} selected={isChosen} />`. Use for: compliance/threshold grids, scenario matrices (viable price under N salaries), any "what does the value look like at every combination of two knobs" surface.

## Table
- **Table fields (fields-as-functions)** — the composed-table system (Depth 2), exported from the barrel as the `fields` namespace plus the top-level `FieldTable` component. A table is an ordered gesture of field ids resolved against a plain registry object: `<FieldTable data={rows} fields={["selected", "name", "createdAt", "amount", ["edit", "delete"]]} registry={registry} />`. Field types own ALL geometry (ch/em, zoom-proportionate content bounds + cell chrome); clients never see width/align/style. Known-field factories: `fields.selectionCol(selection)`, `nameCol(key?)` (flowing, ellipsis + full-text tooltip, survey-calibrated 50ch cap), `textCol(key, {tone?})`, `dateCol`, `dateTimeCol`, `intCol(key, {tone?})`, `floatCol(key, {precision?, tone?})`, `moneyCol(centsKey)` (divides cents, strips " Cents" from the header), `durationCol(key, unit)`, `actionCol(icon, onAction)` / `clusterCol([...])`. Data-driven color is a configure-time **tone function** `(value, row) => Tone` — never call-site CSS. Weird cells: `fields.col(id, header, row => JSX, fieldType)` — geometry still comes from the named field type. Selection: `fields.createFieldSelection({ rows, key })` → pass to `selectionCol` for a select-all/none header (indeterminate over partial) and shift-click range selection over the current sort order. `FieldTable` props: `data`, `fields`, `registry`, `emptyMessage?`, `maxRows?` (semantic em-based scroll cap), `onRowHover?` (forwarded to `BaseTable` — fires `(row, index)` on row enter and `(null, -1)` when the pointer leaves the body, for cross-highlighting a row against a chart). **Fill vs. capped (implicit from `maxRows`):** with `maxRows` the table caps at that many rows and scrolls inline (self-sizing — drop it anywhere). WITHOUT `maxRows` the table runs in **fill mode** — the frame becomes a flex column that fills its parent and scrolls internally (sticky header, both axes). Fill mode therefore **requires a definite-height flex parent** at the call site (e.g. a `Stack fill` / flex-column region with a real height); given one it fills it, given an auto-height parent it collapses. Consumer apps with fill-mode tables get a re-eyeball item on the next SUI bump. Lower-level: `fields.resolveFields(specs, registry)` returns `{columns, minCh, maxCh, minW, maxW}` for hand-assembled frames. `columnHelpers` still owns the bare `intCol`/`textCol`/… names at the barrel root until the step ③ swap. Use for: every standard data table; reach for raw `BaseTable` only for features fields doesn't model (grouped headers, spanRow, getRowClass).
- **BaseTable** — Sortable data table with sticky header, striped rows, column groups (colspan). Key props: `data`, `columns` (array of `TableColumn`), `maxHeight`, `fill`, `stickyHeader`, `striped`, `hoverable`, `compact`, `getRowClass`, `onRowClick`, `emptyMessage`, `rowActions` (trailing hover-revealed action cell per row), `spanRow`. **`spanRow?: (row, i) => { fromColumnId, content } | null`** is a per-row "tail collapse": for rows where it returns non-null, the columns from `fromColumnId` onward — including the `rowActions` cell, if any — are replaced by a single centered spanning `<td colspan=…>` holding `content`, while columns before `fromColumnId` render normally; return `null`/omit and the row renders cell-by-cell exactly as before. Use for summary/takeover rows (e.g. a partially-evaluated period showing "X of Y evaluated" + a Run button across the stat columns instead of one value per cell). An unknown `fromColumnId` falls back to normal rendering. Implemented by `BaseTable` and `FilterableTable` (which delegates to it); `SelectableTable` renders its own body and does not honor `spanRow`. Exported type: `TableRowSpan`. Each `TableColumn.header` accepts `string | JSX.Element` — pass a node (e.g. a select-all checkbox) directly, not a function, so Solid keeps the binding live (every renderer inserts `{column.header}` as-is). `fill` now implies internal scrolling: the table fills its (definite-height or flex) parent and scrolls its body with the header pinned — no `maxHeight="100%"` workaround needed. `maxHeight` remains the explicit "cap at Npx and scroll" escape hatch. Pair with `Stack`/`Row` `fill` (or `FilterableTable` `fill`) to forward height through flex ancestors. Use for: standard sortable data tables, including long lists inside a fixed-height pane.
- **SectionTable** — A `BaseTable` BOUND to its own section header (title + record count) as one container: the header spans the table's width, so the record count aligns with the table's right edge (they are one unit, not a header that happens to sit above a table). Extends `BaseTableProps` (pass `columns`, `data`, `compact`, `fixedLayout`, `maxHeight`, … straight through) plus `title`, `total?`, `countNoun?`. The count is derived from the current `data.length` against `total`: "24 records" when they match, "N of 24 records" when a filtered subset is passed. **Owns NO filter UI** — filtering is a separate, disconnected concern (e.g. a dashboard-level control) that just hands this component the already-filtered rows + the unfiltered `total`, keeping filter mechanism and table display decoupled. For a space-between column layout (member absorbs slack; numerics right-aligned at the edge), use `fixedLayout` with the flexing column marked `ellipsis` + `contained`. Use for: a titled report table whose count must track the (possibly externally-filtered) rows.
- **TableSectionHeader** — Composable header for a table/section: title on the left, a record count (or custom `meta`) pushed to the right on the same baseline. Key props: `title`, `count?`, `total?` (when `> count`, the count reads "N of TOTAL records" — reflects an external filter without owning filter UI), `countNoun?` (default "record"), `meta?` (custom right-side node, replaces the count). Composes Layout + Text only. Use directly for a section header, or via `SectionTable` to bind it to a table.
- **SelectableTable** — Table with checkbox selection and action bar. Key props: `data`, `columns`, `getRowId`, `selectionStore`, `selectionActions`. Use for: batch operations on table rows.
- **QuickFilter** — Generic search input that filters a list of items on any text inside them. Key props: `items` (the data), `extract` (optional text extractor; default: JSON.stringify), `placeholder`, `initialQuery`, `onQueryChange`, `children` (render-prop receiving filtered items + query). Use for: text search over any collection — works with lists, tables, trees, or other renderers via the render-prop child.
- **DataTableContainer** — Scrollable container wrapper. Key props: `maxHeight`, `fill`. Use for: constraining table height with scroll.
- **createSelectionStore / fromSignal** — Utilities to create or wrap selection state (`SelectionStore<Id>`). Use for: managing checkbox selection state, optionally backed by persistent storage.
- **GapCell** — Remaining-work table cell: bold count + percentage + a 40×4 completion bar, colored by a severity ramp over percent-remaining (`0`→success, `≤50`→warning, `>50`→danger; pure `gapSeverity()` exported). Blank (`—`) when `total === 0` or `remaining` is nullish. Data-only. Key props: `remaining`, `total`. Use for: census/migration gap columns (source − landed).
- **PivotGrid<RowKey, ColKey, Cell>** — Dense pivot of runtime-derived rows × runtime-derived columns, with two-axis sticky positioning (top header AND left column), optional clickable cells, and optional continuous heat coloring. Caller passes flat `readonly RowKey[]` + `readonly ColKey[]` arrays (caller sorts), label functions (`rowLabel`/`colLabel: (key) => string | JSX.Element`), a `cell(row, col) → Cell | null` lookup, and a `renderCell(cell, row, col) → JSX` formatter. Three optional hooks layer on top: `cellHref` (wraps cells in `<a>` for cross-route navigation), `onCellClick` (button-wrapped fallback for in-page selection), and `getCellHeat → number | null` (the grid does the 0..1 → alpha math). Heat ramp defaults to `Math.sqrt` (perceptual); pass `heatRamp={(v) => v}` for linear. Curried variants `HeatPivotGrid` (type-enforces `getCellHeat`) and `LinkPivotGrid` (type-enforces `cellHref`) ship alongside. Use for: alarm-period grids, ops metrics pivots, flag matrices — anywhere the same row × col × cell shape recurs with dynamic axes.
- **Column helpers**: `floatCol`, `intCol`, `dateTimeCol`, `dateCol`, `textCol` + curried factories (`floatColWith`, `intColWith`, etc.). Use for: declarative column definitions with built-in cell renderers.
- **Cell renderers**: `IdCell`, `StringCell`, `TagCell`, `MoneyCell`, `DateCell`, `DateTimeCell`, `MinuteDateTimeCell`, `DurationCell`, `StatusCell`, `CheckboxCell`, `FloatCell`, `IntCell`, `MetricValueCell`, `LongTextCell`. Use for: typed cell formatting in tables. Compose with `withCellStyle` or `withValueColor` for styled/conditional-color variants.
  - **MoneyCell** props: `value` (number cents-or-units), `currency?` (default `"USD"`), `locale?` (default `"en-US"`), `maxValue?` (default `$10B`). Renders with **tabular figures + right alignment** and a **width cap** derived from `maxValue` (see the Fixed-width fields convention) so a money column reserves no more than its widest value; pass `maxValue={null}` to opt out of the cap. It is the display counterpart to `CurrencyInput` — same width discipline so input and column line up.
  - **LongTextCell** props:
    - `maxLength?: number` (default `50`) — char-count truncation threshold; ignored when `clampLines` is set.
    - `expandable?: boolean` (default `true`) — enables the inline "more..."/"less" toggle in `reveal="inline"` mode.
    - `clampLines?: number` — CSS `-webkit-line-clamp` truncation. Full value is rendered; overflow is measured at runtime (`scrollHeight`/`scrollWidth` vs. client). Use when cell width is dynamic and char-count is too coarse.
    - `reveal?: "inline" | "tooltip"` (default `"inline"`) — how the full value is revealed. `"inline"` shows "more..."/"less" buttons (existing behavior). `"tooltip"` composes the library's `Tooltip` (viewport-aware, auto-flips) and shows the full value on hover.
    - `tooltipPlacement?: "top" | "bottom" | "left" | "right"` (default `"top"`) — preferred placement when `reveal="tooltip"`; Kobalte flips if the placement would overflow.
  - `DateTimeCell` extras (additive, optional): `timeZone` (IANA, e.g. `"America/Los_Angeles"` — formats in that zone instead of host-local), `showZoneAbbreviation` (boolean — appends `(PDT)`-style suffix via `Intl.DateTimeFormat({ timeZoneName: "short" })`), `emptyVariant` (`"default"` italic em-dash, `"plain"` non-italic em-dash). CSS hook `--cell-empty-font-style` also lets ancestors globally restyle the empty italic default.
  - `DateCell` also accepts `timeZone` (IANA, same semantics as `DateTimeCell` — unset means host-local, matching pre-existing behavior). Without it, a UTC instant near midnight can render as the wrong calendar day west of UTC; pass `timeZone` when the value is a UTC instant and the caller needs the date in a specific zone rather than the viewer's.

## TabbedSidePanel
- **TabbedSidePanel** — Pure Composite (Depth 2). Composes `Tabs` (vertical) + `Row` (Layout Curried Variant). Owns zero CSS — visual styling lives entirely in the composed Primitives. Vertical tab strip whose active tab doubles as the collapse trigger: clicking the active tab toggles `isOpen`, clicking any other tab activates it (and opens the panel if closed). Fully controlled — consumer owns both `activeTab` and `isOpen` state. Key props: `tabs` (`TabbedPanelTab[]` — `{ id, label, content, hint?, status?, disabled? }`), `activeTab`, `onTabChange`, `isOpen`, `onOpenChange`, `side?` (`"left"`|`"right"`, default `"right"` — controls DOM order so the tab strip sits flush against the page edge), `tabsVariant?` (forwarded to inner `Tabs`, default `"default"`), `color?` (`ColorVariant`, forwarded to inner `Tabs`). Consumers pre-filter `tabs` via `createMemo` before passing them in; there is no built-in per-tab `available()` flag. Use for: persistent right- or left-side detail panels where the tab strip itself is the open/close affordance (asset detail panes, inspector panels, secondary navigation rails).
- Curried variants (always prefer these over configuring `TabbedSidePanel` directly):
  - **RightDetailTabbedPanel** — `side="right"`, `tabsVariant="default"`. Use for: amygdala-ui's `/assets/:id/:edgeType` detail panel and similar right-anchored inspector panes.
  - **LeftNavTabbedPanel** — `side="left"`, `tabsVariant="default"`. Use for: symmetric left-anchored secondary navigation rails.

## Tabs
- **Tabs** — Tab bar with multiple style variants. Key props: `tabs` (array of `Tab`), `activeTab`, `onTabChange`, `variant` (`default`|`underline`|`boxed`|`pill`), `color` (`ColorVariant`), `orientation` (`"horizontal"`|`"vertical"`, default `"horizontal"` — vertical stacks tabs in a column, used by `TabbedSidePanel`). `Tab` interface supports optional `hint` (muted text after label, e.g., keyboard shortcut hints). Exports `TabStatus` type (`"warning" | "error"`). Use for: switching between views/panels.

## Text
- **Text** — Polymorphic text element with variant and color. Key props: `variant` (`value`|`label`|`title`|`body`|`units`|`sublabel`), `color` (literal `var(--sui-*)` escape hatch), `tone` (`Tone` — `"default"|"success"|"warning"|"danger"|"accent"|"muted"|"highlight"`, the shared semantic vocabulary from `src/types.ts`, same one `Table fields`/`ValueMatrix`/`InlineText` key off; resolves to a themed color class), `as` (`span`|`p`|`pre`|`h1`..`h4`|`div`). `tone` is DATA (ruled 2026-07-17), not a curry-locked visual — it is intentionally left OFF `TextOverrides`, so it stays live on every curried variant below: `<TextBody tone="highlight">`. Use for: all themed text rendering.
- **InlineText** — Atomic Primitive (Depth 1, styleless; owns no CSS file). A bare `<span>` that imposes **no typography of its own** — font-size/weight/family all inherit from the surrounding context — with a single optional **data-driven** colour applied inline (same pattern as `Duration`/`NumberWithUnits`), via either `color?` (a literal `var(--sui-*)` string) or `tone?` (a `Tone` name — `"default"|"success"|"warning"|"danger"|"accent"|"muted"|"highlight"` — resolved internally to its themed token; wins over `color` when both are set). Exported directly (no factory/variants — colour is the only input and it's data, not design-config); pass-through standard `<span>` attrs + `children`. Use for: numeric/text cell values whose colour is computed from data (e.g. muted grey when zero/null, normal otherwise; or flagged/notable when non-zero) while their size must match the host table/list — where no size-baking `Text` variant fits. Replaces bare `<span style={{color: "#somehex"}}>` in dense grids (e.g. `ViolationsPivotGrid` cells, a Census "Gap" column flagging a non-zero remaining count+percent).
  - `tone` example — the zero-config, no-color-value call site (added 2026-08-26, for flagging a notable in-cell value like a non-zero gap count):
    ```tsx
    import { InlineText } from "solid-ui-components";

    <InlineText tone={remaining > 0 ? "highlight" : "default"}>
      {`${remaining} (${pct}%)`}
    </InlineText>
    ```
  - `color` example (legacy form — prefer `tone` above when the value maps to the shared Tone vocabulary):
    ```tsx
    import { InlineText } from "solid-ui-components";

    <InlineText color={value === 0 ? "var(--sui-text-muted)" : undefined}>
      {value}
    </InlineText>
    ```
- Curried variants (always prefer these over configuring `Text` directly):
  - **TextValue** — `variant="value"`. Use for: data values, readouts.
  - **TextLabel** — `variant="label"`. Use for: field labels, captions.
  - **TextTitle** — `variant="title"`. Use for: section/panel titles (renders `<span>`).
  - **PageTitle / SectionTitle / SubsectionTitle / TopicTitle** — `variant="title"` with `as="h1"`/`"h2"`/`"h3"`/`"h4"`. Use for: semantic document headings — pick the level that matches the outline depth (all share the `title` typography).
  - **TextBody** — `variant="body"`. Use for: paragraph text, descriptions.
  - **TextUnits** — `variant="units"`. Use for: unit labels next to values.
  - **TextSublabel** — `variant="sublabel"`. Use for: secondary labels, footnotes.
  - **MonoValue** — Monospace value text. Use for: numeric readouts alongside units.
  - **NowrapBody** — Body text that never wraps. Use for: inline formatted values.
  - **MutedBody** — Dim body text. Use for: secondary descriptions, hints.
  - **AccentBody** — Cyan-accented body text. Use for: highlighted descriptions.
  - **DangerBody / WarningBody / SuccessBody** — Status-tinted body text (`--sui-danger`/`--sui-warning`/`--sui-success`). Use for: inline error reasons, caution notes, confirmation notes in detail panels.
  - **HighlightBody** — `variant="body"`, `tone="highlight"` (`--sui-highlight`). Not a severity color (contrast `DangerBody`/`WarningBody`/`SuccessBody`) — flags a value as notable/worth-a-look. Use for: an in-cell value that should draw the eye at a glance (e.g. a table's remaining-gap count going non-zero) without implying an error or caution state.
  - **TextValueSuccessSm / TextValueDangerSm / TextValueHighlightSm** — `variant="value"` at 0.85rem (sized down to sit inside table rows/cards), tinted `--sui-success`/`--sui-danger`/`--sui-highlight`. Use for: compact in-cell numeric readouts where color carries compliance/notability.
  - **EmphasisBody** — Inline bold (600) body `<span>`. Use for: emphasizing a word/value inside a table cell or label. **AccentEmphasisBody** — accent-colored sibling for emphasized counts/values.
  - **NoteText** — Italic sublabel `<span>`. Use for: parenthetical default/fallback annotations beside a value.
  - **DangerSublabel** — Danger-tinted sublabel `<span>`. Use for: compact inline error captions beside a control.
  - **CaptionLabel** — Uppercase, letter-spaced, secondary-tone `label` (0.9rem). Use for: small section captions above a table/card group. **AccentCaptionLabel** — accent-colored sibling (0.85rem) for settings-style column headings.
  - **MonoMeta** — Mono meta text (11px monospace, muted). Use for: panel subtitles, tiny section labels (SOURCE/LOCAL/COLS-style), footnotes beside data readouts. Library-side replacement for the dev-only `.text-meta` showcase class — library components must not use that class.
  - **FlexLabel** — Label that grows to fill available space. Use for: label + value rows.
  - **InlineUnits** — Inherits parent font-size, muted. Use for: appending units inline.
  - **InfoTitle / WarningTitle / SuccessTitle / DangerTitle** — Status-colored titles. Use for: section headings with semantic color.
  - **ChipLabel** — Small bold key text (11px / 600, `<span>`). Use for: pivot cell keys, legend swatch labels, chip titles. Pairs with **CountText** inside **TightSpreadRow**.
  - **EllipsizedChipLabel** — Single-line truncating `ChipLabel` (11px / 600 + nowrap + ellipsis + min-width:0). Use for: chip keys inside flex parents that may overflow.
  - **CountText** — Small muted count/meta text (10px, muted color, `<span>`). Use for: trailing counts beside a `ChipLabel`, compact metadata.

## ThreePanelLayout
- **ThreePanelLayout** — Atomic (Depth 1). Top-bar + three-column (left / center / right) page scaffold, intended for alarm-lab / analysis-style routes where a primary work area is flanked by a narrow asset picker on the left and a narrow context pane on the right. Owns `ThreePanelLayout.css`; imports zero other library components. Key props: `centerPanel` (required), `topBar?`, `leftPanel?`, `rightPanel?`, `height?` (default `"100%"` — any valid CSS length, e.g. `"100vh"` or `"calc(100vh - var(--app-header-height, 64px))"`; upstream intentionally stays decoupled from app-chrome tokens), `fullHeight?` (backwards-compatible alias mapping to `height="100%"` — `height` wins if both are passed), `leftPanelWidth?` (default `"220px"`), `rightPanelWidth?` (default `"240px"`), `class?` — the geometry props are Overrides: curry them once per app via **`createThreePanelLayout`** (`const TriageLayout = createThreePanelLayout({ leftPanelWidth: "380px" })`) instead of repeating widths at call sites. Omitted side-panel slots collapse their grid column to `0` so the center expands fully. Mobile collapse: the content grid switches to a single column at `max-width: 900px`, side panels drop their border and cap at `200px` max-height (matches the downstream `$mobile-width`). Uses `--sui-bg-primary`, `--sui-text-primary`, `--sui-border` theme tokens; spacing is hardcoded (8 / 12 / 16 px) because the library does not yet define `--sui-space-*` tokens. Use for: multi-pane investigation pages, tuning pages, anywhere the four-slot shape applies.
  - Decision — `height` over app-coupled `headerOffset`: upstream cannot know the host app's header height, so the library exposes a single `height` prop the caller controls explicitly. `fullHeight` stays as a convenience alias for `"100%"` so existing call sites migrate without an API rewrite. For "viewport minus app header" callers pass `height="calc(100vh - var(--app-header-height, 64px))"` (or similar) from the host app.
  - Example:
    ```tsx
    import { ThreePanelLayout } from "solid-ui-components";

    <ThreePanelLayout
      topBar={<BreadcrumbBar />}
      leftPanel={<AssetList />}
      centerPanel={<AlarmExplanation />}
      rightPanel={<ContextPanel />}
    />

    // Viewport-minus-app-header, with wider right pane
    <ThreePanelLayout
      height="calc(100vh - var(--app-header-height, 64px))"
      rightPanelWidth="320px"
      topBar={<TopBar />}
      leftPanel={<AssetList />}
      centerPanel={<Content />}
      rightPanel={<WideContext />}
    />

    // Center only (no side panels / no top bar)
    <ThreePanelLayout centerPanel={<Content />} />
    ```

## Toast
- **Toast** — Kobalte-backed toast built on `@kobalte/core/toast`. Key props: `toastId` (`number`, injected by `toaster.show`), `title` (required), `description?` (`string | JSX.Element`), `variant?` (`info`|`success`|`warning`|`error`, default `info`), `actions?` (array of `ToastAction { label, onClick, variant? }`), `duration?` (ms; falls back to kobalte default), `persistent?` (suppress auto-dismiss + progress bar). Any other `ToastRootProps` field (`priority`, swipe handlers, escape-key, etc.) is forwarded to `Toast.Root`. Exported types: `ToastProps`, `ToastAction`, `ToastVariant`, `ShowToastInput`, `ToastHandle`. Uses `--sui-bg-elevated`, `--sui-bg-secondary`, `--sui-bg-tertiary`, `--sui-border`, `--sui-border-bright`, `--sui-border-focus`, `--sui-accent`, `--sui-accent-rgb`, `--sui-success`, `--sui-success-rgb`, `--sui-warning`, `--sui-warning-rgb`, `--sui-danger`, `--sui-danger-rgb`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: imperative notifications (save confirmations, error messages, prompts with actions, session warnings).
- **ToastRegion** / **ToastList** — Curried atomics that wrap kobalte's `Toast.Region` / `Toast.List` with baked-in viewport styling. Mount once near the app root inside a `Portal`. Exported types: `ToastRegionCurriedProps`, `ToastListCurriedProps`.
- **showToast(input)** — Imperative helper. Returns `{ id: number, dismiss: () => void }`. Accepts the same shape as `ToastProps` minus `toastId`.
- **toaster** — Re-export of kobalte's raw `toaster` for `update` / `clear` / `promise` use cases beyond `showToast`. For sub-components like `Toast.Root` / `Toast.Title` / `Toast.Description` directly, import from `@kobalte/core/toast` (already an installed peer).
  - Example:
    ```tsx
    import { Portal } from "solid-js/web";
    import {
      showToast,
      toaster,
      ToastList,
      ToastRegion,
    } from "solid-ui-components";

    // 1. Mount the region once (near app root):
    <Portal>
      <ToastRegion limit={10}>
        <ToastList />
      </ToastRegion>
    </Portal>

    // 2. Fire toasts imperatively:
    const handle = showToast({
      title: "Unsaved changes",
      description: "Your work will be lost if you leave this page.",
      variant: "warning",
      actions: [
        { label: "Save",    variant: "primary",   onClick: save    },
        { label: "Discard", variant: "secondary", onClick: discard },
      ],
    });

    // 3. Dismiss by handle or by id:
    handle.dismiss();
    toaster.clear();
    ```

## Toggle
- **Toggle** — Checkbox toggle switch with label positioning and accent color. Key props: `size` (`sm`|`md`|`lg`), `label`, `labelPosition` (`left`|`right`), `variant` (`default`|`minimal`|`thematic`), `color` (`ColorVariant`), plus all native checkbox attributes. Note: `power` and `circuit` variants have been removed. Use for: boolean on/off controls.

## Tooltip
- **Tooltip** — Hover/focus-activated tooltip built on `@kobalte/core/tooltip`. Renders an accessible floating panel with arrow and fade animation. Key props: `content` (`string | JSX.Element` or an accessor returning either — re-evaluated per open), `children` (the trigger), `class` (appended to the Kobalte trigger; pass `"sui-tooltip__trigger--cell"` for the dense-table "cell" semantics), `openDelay` (default `100`; `1000` matches the downstream `TooltipCell` pattern), `closeDelay` (default `100`), plus any `TooltipRootProps` field (`placement`, `gutter`, `open`/`defaultOpen`, `onOpenChange`, `disabled`, `triggerOnFocusOnly`, `forceMount`, etc.) which is forwarded to `Kobalte.Tooltip.Root`. Exported types: `TooltipProps`, `TooltipContent`. Uses `--sui-border`, `--sui-bg-secondary`, `--sui-text-primary`, `--sui-radius-sm`, `--sui-border-focus` theme tokens. Use for: field hints, truncated-cell full-text reveals, keyboard-shortcut legends, anything hover-activated. No separate `TooltipCell` is shipped — inline `<Tooltip openDelay={1000} class="sui-tooltip__trigger--cell">` instead.
  - Example:
    ```tsx
    import { Tooltip } from "solid-ui-components";

    <Tooltip content="Deletes the row. Cannot be undone.">
      <DangerButton>Delete</DangerButton>
    </Tooltip>

    // Reactive content via accessor:
    <Tooltip content={() => `Count: ${count()}`}>
      <GhostButton>Hover</GhostButton>
    </Tooltip>

    // Cell semantics (matches the legacy TooltipCell):
    <Tooltip content={row.fullText} openDelay={1000} class="sui-tooltip__trigger--cell">
      <span>{row.truncatedText}</span>
    </Tooltip>
    ```
  - Divergence from initial audit sketch: `class` is used instead of `className` (upstream convention); `openDelay`/`closeDelay` are not separately declared on `TooltipProps` because Kobalte's `TooltipRootProps` already includes them — `mergeProps` injects the 100 ms defaults before the passthrough spread.

## Renderers

The renderers family is a set of small, composable components for displaying field-style data: primitives with labels, before/after diffs, and OHLC candlesticks. They share a `--sui-*` token-driven label/value grid and render zero-config for common cases; host code can opt into a `renderValue` dispatcher hook when a domain needs custom types (status badges, epoch-millis dates, etc.).

- **ValueRenderer** — Atomic (Depth 1). Labeled label/value layout with a pluggable value dispatcher. Key props: `label?`, `value` (`unknown`), `renderValue?` (`(v: unknown) => JSX.Element | undefined` — host override; returning `undefined` falls through to the default dispatcher), `numberPrecision?` (default `2`), `class?`. Default dispatch handles `string`, `number`, `boolean`, `null`/`undefined`, arrays, plain objects, and pre-rendered JSX elements (`$$typeof` sentinel) — everything else falls through to `String(v)`. Objects render as a key/value entry list and recurse through the same `renderValue` pipeline so overrides apply at every nesting level. No component imports; owns `ValueRenderer.css`. Uses `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-font-family` tokens. Use for: generic field display, object dumps, anywhere you previously wrote `<span>{label}:</span><span>{value}</span>`.
  - Example:
    ```tsx
    import { ValueRenderer } from "solid-ui-components";

    // Zero-config primitives
    <ValueRenderer label="Count" value={1234.5678} />
    <ValueRenderer label="Active" value={true} />
    <ValueRenderer label="Missing" value={null} />

    // Objects — recurse through the default dispatcher
    <ValueRenderer
      label="Context"
      value={{ temperature: 45.2, active: true, name: "Engine #3" }}
    />

    // Custom dispatch — host injects a domain renderer; return undefined to
    // defer to the default dispatcher.
    <ValueRenderer
      label="Status"
      value="ALARM"
      renderValue={(v) => (isStatus(v) ? <StatusBadge status={v} /> : undefined)}
    />
    ```

- **DiffPair** — Atomic Primitive (Depth 1). Owns `DiffPair.css` (which `ChangeRenderer`'s layout now lives in entirely). Labeled before/after layout with a directional arrow between the two sides — pure structural Primitive: the consumer supplies whatever JSX represents each side (typically a `ValueRenderer`, but anything goes). When `label` is supplied, renders `{label}: {before} {arrow} {after}` in a two-column grid; without `label`, just the pair. Key data props: `label?`, `before` (`JSX.Element`), `after` (`JSX.Element`), `class?`. Override prop: `arrow` (default `"→"`). Factory: `createDiffPair`. Curried Variants: `BoldArrowDiffPair` (`arrow: "⇒"` — for state-machine transitions), `FlowDiffPair` (`arrow: "➔"` — for sequence/flow diffs). Uses `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-font-family`. Use for: any labeled before/after pair display where the two sides need a shared layout + arrow but the per-side rendering is the consumer's concern.

- **ChangeRenderer** — Pure Composite (Depth 2). Composes `DiffPair` + two `ValueRenderer` instances (one per side). Owns zero CSS — the labeled-grid + flex-pair layout lives entirely in `DiffPair.css`. Before/after pair display with a directional arrow. Both sides dispatch through `ValueRenderer`, so any `renderValue` override applies to both sides and recurses through nested objects consistently. Key props: `label?`, `before` (`unknown`), `after` (`unknown`), `renderValue?` (shared override applied to both sides), `numberPrecision?`, `arrow?` (`JSX.Element`; default `"→"`), `class?`. Use for: single-field diffs, alarm before/after displays, config change rows.
  - Example:
    ```tsx
    import { ChangeRenderer } from "solid-ui-components";

    <ChangeRenderer label="Count" before={12} after={15} />
    <ChangeRenderer
      label="Context"
      before={{ temp: 45, active: true }}
      after={{ temp: 50, active: true }}
    />
    <ChangeRenderer
      label="Status"
      before="NOMINAL"
      after="ALARM"
      renderValue={(v) => (isStatus(v) ? <StatusBadge status={v} /> : undefined)}
    />
    ```
  - Divergence from initial audit sketch (documented, intentional): the upstream `ChangeRenderer` does not replicate downstream `ChangeObjectRenderer`'s per-key aligned grid with added/removed/changed/unchanged highlighting. Objects on each side render through `ValueRenderer`'s default entry list — the key-level diff remains a domain concern. Host code that needs that behavior can keep it as a domain component wrapping `ValueRenderer` or two `ChangeRenderer`s, following the audit's "absorb what fits, leave domain behavior behind" principle.

- **CandlestickRenderer** — Atomic (Depth 1). OHLC box visualization with open/close flanks, high/low stacked markers, and a mean value inside the box. Key props: `label?`, `candlestick` (`Candlestick | null | undefined` where `Candlestick = { open, close, high, low, mean, openAt?, closeAt? }`), `getBoxColor?` (`(c: Candlestick) => string`; default colors bullish candles green and bearish red via `--sui-success` / `--sui-danger`), `precision?` (default `2`), `class?`. Null/undefined candlestick renders an em-dash. No component imports; owns `CandlestickRenderer.css`. Uses `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-success`, `--sui-danger`, `--sui-warning`, `--sui-radius-sm`, `--sui-font-family` tokens. Use for: price/metric candles, bucket-aggregated statistics (where min/max/avg + open/close make sense). Exported types: `CandlestickRendererProps`, `Candlestick`.
  - To show OHLC details on hover, wrap the component in `Tooltip` and supply your own date/duration formatting — this library's Candlestick is visualization-only.
  - Divergence from downstream: the upstream component does not embed a hover tooltip (the downstream `CandlestickRenderer` uses `useSmartTooltip` with full OHLC breakdown). Callers that need the tooltip wrap the base in the library's `Tooltip` component and supply their own content.
  - Example:
    ```tsx
    import { CandlestickRenderer } from "solid-ui-components";

    <CandlestickRenderer
      label="Price"
      candlestick={{ open: 100, close: 105, high: 107, low: 99, mean: 103 }}
    />

    // Custom color (e.g., doji-aware)
    <CandlestickRenderer
      candlestick={cs}
      getBoxColor={(c) =>
        Math.abs(c.close - c.open) / (c.high - c.low || 1) < 0.03
          ? "var(--sui-warning)"
          : c.close >= c.open ? "var(--sui-success)" : "var(--sui-danger)"
      }
    />
    ```

## DnDHierarchySortBar
- **DnDHierarchySortBar** — Atomic (Depth 1). Owns `DnDHierarchySortBar.css`, no component imports (raw elements + native HTML drag-and-drop events). A controlled horizontal row of draggable "dimension" pills for reordering a tag hierarchy. Uses INSERT semantics: the dragged pill moves to the target index and the others shift — matching dside's `reorder()`. **Distinct from PivotPills**: PivotPills has a fixed 3-slot SWAP system; this is an N-item general list with INSERT semantics. Key props: `items` (`DnDHierarchySortBarItem[]` — ordered list of `{id: string; label: string}` pairs), `onReorder` (`(nextOrderedIds: string[]) => void` — called after a successful drop with the new id order; caller updates `items` in response), `label?` (`string` — label text shown before the pills; defaults to `"nest by"`). Exported types: `DnDHierarchySortBarProps`, `DnDHierarchySortBarItem`. Use for: tag-hierarchy nest-order controls, dimension ordering in pivot/aggregation UIs.
  - **No curried variant — intentional.** Every prop is data or a callback (`items` / `onReorder` / `label`); there are no presentational props to freeze, so a factory would add nothing. The base component is already zero-config at the call site. This mirrors the BottomSheet decision: see STYLE_GUIDE.md "Variant Surface: keep it minimal".
  - Example:
    ```tsx
    import { DnDHierarchySortBar, DnDHierarchySortBarItem } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const [items, setItems] = createSignal<DnDHierarchySortBarItem[]>([
      { id: "region", label: "Region" },
      { id: "product", label: "Product" },
      { id: "quarter", label: "Quarter" },
    ]);

    const handleReorder = (nextIds: string[]) => {
      const lookup = new Map(items().map((item) => [item.id, item]));
      setItems(nextIds.flatMap((id) => { const item = lookup.get(id); return item ? [item] : []; }));
    };

    <DnDHierarchySortBar items={items()} onReorder={handleReorder} />
    // With custom label:
    <DnDHierarchySortBar items={items()} onReorder={handleReorder} label="group by" />
    ```

## DragDrop
- **DragDrop** — Composite (Depth 2). Folder exposing a generic 2x2 quadrant layout for drag-and-drop sorting UIs (the folder currently exports a single component):
  - **QuadrantGrid** — a generic 2x2 grid of labeled, colored drop zones. Prop `cells` is a fixed 4-tuple of `QuadrantCellConfig` = `{ key: string; label: string; color: string; children: JSX.Element }`, rendered in order top-left, top-right, bottom-left, bottom-right; each cell exposes its accent via the `--sui-quadrant-color` CSS var and renders a label plus a content slot (the intended droppable region, keyed by `key`). Spreads remaining `JSX.HTMLAttributes<HTMLDivElement>`. Exports types `QuadrantGridProps` and `QuadrantCellConfig`; no curry factory. CSS tokens: `--sui-quadrant-color`, `--sui-border`, `--sui-surface`.
  - Use for: Eisenhower-style priority matrices, 2x2 categorization boards, drag-to-sort quadrant layouts.
  - Example:
    ```tsx
    import { QuadrantGrid } from "solid-ui-components";
    <QuadrantGrid
      cells={[
        { key: "do", label: "Do first", color: "#22c55e", children: <TaskList bucket="do" /> },
        { key: "schedule", label: "Schedule", color: "#3b82f6", children: <TaskList bucket="schedule" /> },
        { key: "delegate", label: "Delegate", color: "#f59e0b", children: <TaskList bucket="delegate" /> },
        { key: "drop", label: "Drop", color: "#ef4444", children: <TaskList bucket="drop" /> },
      ]}
    />
    ```

## TitledTimeRangeHeader
- **TitledTimeRangeHeader** — Atomic Primitive (Depth 1). Owns `TitledTimeRangeHeader.css`; no library-component imports — the date formatting comes from the pure `formatDateTimeRange` helper. Title + optional badge + ISO date range + duration + optional asset chip + optional action slot, optionally wrapped in a link. Key props: `title`, `start`, `end`, `assetLabel`, `badge`, `action`, `href`. The `start` / `end` shape matches the sibling `DateTimeRange` Composite (both feed `formatDateTimeRange`). Use for: detail-page and list-item headers for titled records with a time range — sessions, runs, calls, jobs, events.

## CensusView
- **CensusView** — Composite (Depth 3). Composes `QuickFilter` + `BaseTable` (one per size bucket) + `InfoPanel` (sticky detail rail) + `GapCell` + `StatusBadge` + `NumberWithUnits` + `CountChip`. Renders a bucketed census of data-source tables: tables are grouped by size/access bucket (`< 100 rows`, `< 100k rows`, `< 1M rows`, `≥ 1M rows`, `Single row`, `Uncounted`, `Empty`, `No access`), each bucket shown as a compact sortable `BaseTable`. Clicking a row opens a sticky detail panel (InfoPanel) with row counts, field-type chips, schema list, and an optional source-specific `actions` slot. Key props: `tables` (`CensusTable[]`), `onSelect` (`(t: CensusTable | null) => void`), `selectedKey` (controlled selection; uncontrolled by default), `actions` (`(t: CensusTable) => JSX.Element | null`). Per-source adapters (`adaptNetSuite`, `adaptAcumatica`, etc.) stay in the consuming app — SUI ships only the normalized types + view.
  - **Exported model types:** `CensusTable`, `CensusColumn`, `NormStatus`, `CensusBucketId`, `CensusViewProps`, `CENSUS_BUCKETS`.
  - **Exported pure function:** `bucketOf(t: CensusTable): CensusBucketId` — deterministic bucket assignment; status buckets win over size buckets.
  - **CSS exception:** `CensusView.css` — structural only (two-column grid + `position: sticky` detail rail). No color/spacing atoms.
  - Example:
    ```tsx
    import { CensusView, type CensusTable } from "solid-ui-components";

    const tables: CensusTable[] = [
      { key: "acct", entity: "Account", fieldCount: 10, sourceRows: 50, localRows: 50, status: "done" },
      { key: "inv",  entity: "Invoice", fieldCount: 48, sourceRows: 220_000, localRows: 218_500, status: "doing" },
    ];

    <CensusView tables={tables} onSelect={(t) => console.log(t?.key)} />
    ```

## Auth
- **ManagedListSection** — Composite (Depth 2). Composes `BorderedSection` + `NarrowStack` + `ClusterRow` + `TextSublabel`/`TextBody`/`NoteText` + `SmallGhostButton`/`SmallPrimaryButton`. Zero CSS. User-confirmed Auth0 account linking — "add a way to sign in to this account" plus removal of linked methods — for an app's Settings page (only reachable signed in). Add is direction-safe since merge-on-link preserves data from either side; removal only offers **secondary** identities (Auth0 can't unlink the primary — its `sub` IS the account), so self-lockout is structurally impossible. First-use Add failures ("Unable to open a popup") arm a two-click retry: the Management-API permission popup consumes the first click's popup allowance but the grant sticks, so a second click goes straight to the re-auth popup. Remove is a two-click confirm ("Remove" → "Confirm remove?"). Key props: `auth` (`AuthApi`), `mergeBeforeLink` (`(secondaryAccessToken: string) => Promise<void>` — the app's server-side merge caller, run BEFORE the Auth0 link so ordering never leaves an unmerged secondary), `class?`, `style?`. Exported type: `ManagedListSectionProps`. Use for: a Settings → Login methods panel where users add/remove ways to sign in to one account.
- **DismissibleNoticeBanner** — Composite (Depth 2). Composes `NoticeBar` (Surface) + `GrowBox` + `TextBody` + `NavLink` + `SmallGhostButton`. Zero CSS. Non-blocking banner shown when the tenant's post-login Action detects another account with the same verified email that is NOT linked to this one (read via `auth.getUnlinkedSiblingHint()`, a custom id_token claim). Detection only — never calls a link API itself; points the user at the app's settings page via `settingsHref`. Dismissal is per-account (keyed by `sub`) and persisted in `localStorage`, since the claim rides every login's id_token and linking clears it at the next login anyway. Key props: `auth` (`AuthApi`), `settingsHref` (string — the app's login-methods settings route), `class?`, `style?`. Exported type: `DismissibleNoticeBannerProps`. Use for: a top-of-app or top-of-settings notice nudging users toward linking a detected sibling account.
- **DI note (both):** each takes the auth API as the `auth` prop — pass `authApi` from `@primestageprime/auth0-stdb-client` (or any structural match); SUI has no dependency on it. The shared shape (`AuthApi`, `AuthIdentity`, `ConnectionEntry`) lives in `Auth/types.ts` as a structural mirror of that package's `authApi` export — dependency injection keeps the library pure and the flows testable/showcasable with fakes.
- Example:
  ```tsx
  import { ManagedListSection, DismissibleNoticeBanner } from "solid-ui-components";
  import { authApi } from "@primestageprime/auth0-stdb-client";

  <DismissibleNoticeBanner auth={authApi} settingsHref="/settings#login-methods" />
  <ManagedListSection auth={authApi} mergeBeforeLink={mergeSecondaryIntoAccount} />
  ```
