# Component Manifest

SolidJS UI component library. All components accept standard HTML attributes via spread props. Factory functions (`createX`) produce curried variants with baked-in defaults.

**Always prefer a curried variant over configuring a base component.** If no curried variant exists for your use case, propose one upstream rather than repeatedly passing the same props.

## Theming

Components use `--sui-*` CSS custom properties for all colors, spacing, and visual tokens. The library ships two built-in themes:

- **`themes/default.css`** — Clean, neutral theme suitable for standard business applications.
- **`themes/hud.css`** — Sci-fi / heads-up-display theme with glow effects, scan lines, and angular decorations.

Import one theme in your app entry point:

```ts
import "solid-ui-components/themes/hud.css";
```

To create a custom theme, define `--sui-*` variables in a CSS file and import it instead. See the built-in themes for the full list of available tokens.

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

## Badge
- **StatusBadge** — Colored status pill with 5 compliance-themed variants. Key props: `variant` (`compliant`|`violation`|`warning`|`pending`|`info`), `size` (`sm`|`md`), `label`, `href`. Use for: inline status indicators, compliance badges, optionally as links.
- **StatusLight** — Atomic. Small colored indicator dot (LED-style) with optional keepalive pulse animation. Key props: `variant` (`success`|`warning`|`danger`|`info`|`idle`), `size` (`sm`|`md`|`lg`), `pulse` (animates a slow expanding halo — use when the source is actively reporting), `label` (optional inline text rendered to the right). Honors `prefers-reduced-motion`. Uses `--sui-success`, `--sui-warning`, `--sui-danger`, `--sui-info`, `--sui-text-muted`. Use for: dispatcher liveness, connection state, daemon keepalive, sensor health.

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
    import { ConnectionStatus } from "solid-ui-components";
    import { Row } from "solid-ui-components";
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

    <Row gap="xl" align="start" wrap>
      <ConnectionStatus name="worker-bee" lastHeartbeatAt={healthy()} timeoutMs={5000} />
      <ConnectionStatus name="idle"       lastHeartbeatAt={idle()}    timeoutMs={4000} />
      <ConnectionStatus name="problem"    lastHeartbeatAt={problemBeat()} errorAt={problemErr()} timeoutMs={5000} />
      <ConnectionStatus name="off"        lastHeartbeatAt={null}      timeoutMs={5000} />
    </Row>
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
- **ParticipantAvatar** — Atomic Primitive (Depth 1). Owns `ParticipantAvatar.css`. Circular avatar — image when `imageSrc` is set, otherwise the supplied `initials` on a tinted disc (background paints from the `color` prop, which the Primitive applies inline). Key data props: `initials?`, `imageSrc?`, `color?`, `alt?` (image branch only; defaults to decorative `""`). Override prop: `size` (`sm`/20px | `md`/24px | `lg`/36px, default `md`). Factory: `createParticipantAvatar`. Curried Variants: `SmAvatar`, `MdAvatar`, `LgAvatar`. Uses `--sui-surface-sunken`, `--sui-space-*`. Use for: per-participant identity affordances in conversation rows, member lists, mention chips.
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
- **PrimaryButton / SecondaryButton / DangerButton / WarningButton / GhostButton / OutlinedButton / TextButton / IconOnlyButton / SmallPrimaryButton / SmallDangerButton / SmallGhostButton / LargePrimaryButton** — Pre-configured curried variants via `createButton()`. Use for: avoiding repetitive variant/size props. Note: these exports carry explicit `Component<ButtonDataProps>` annotations in `variants.ts` for pnpm/github-dep portability — without the annotation, `vite-plugin-dts` can inline solid-js paths through pnpm's ephemeral build-store temp dir (TS2742), stripping the declarations from the shipped `.d.ts` and producing TS2305 downstream. Same pattern should be applied to Cell and Layout curried variants when they're first consumed downstream (see TODO.md).

## ButtonGroup
- **ButtonGroup** — Button arrangement container. Key props: `orientation` (`horizontal`|`vertical`), `gap` (`none`|`sm`|`md`|`lg`), `bordered`. Use for: grouping related buttons, toggle-style button groups (use Button's `active` prop for selection state).

## Card
- **VesselCard** — Composite (Depth 2). Composes `InteractiveCard` (Surface curried variant) + `SpreadRow` (Layout curried variant) + `FlexLabel` (Text curried variant) + `Button` (Atomic Primitive). Interactive card displaying a named item with title, remove button, and details slot. Key props: `title`, `active`, `onRemove`, `details`. Use for: selectable list items. Name is domain-bound — flagged for rename in a future library-wide naming pass.

## DagChart
- **DagChart** — SVG directed acyclic graph with dagre-computed layout. Key props: `nodes` (array of `DagNode` with `id`, `label`, `status` (`ColorVariant`), optional `metadata`, optional `sublabel`, optional `avatar`), `edges` (array of `DagEdge` with `source`/`target`), `onNodeClick`, `direction` (`TB`|`LR`), `height`. Nodes render as rounded rects colored by status. When `avatar` is provided, a circular 20px image renders left-aligned inside the node and the label shifts right. When `sublabel` is provided, muted smaller text renders below the label. Edges are directed paths with arrowheads. SVG auto-sizes viewBox to fit all content. Uses `--sui-*` CSS variables. Exported types: `DagNode`, `DagEdge`, `DagChartProps`. Use for: task dependency graphs, workflow DAGs, pipeline visualization.

## SwimlaneChart
- **SwimlaneChart** — Atomic Primitive (Depth 1). Owns `SwimlaneChart.css`; consumes shared SVG render helpers (`DagArrowMarker`, `DagSvgNode`, `DagSvgEdge`, `bezierThroughChannelPath`) from `src/internal/dag-svg/` plus type/data imports from `../DagChart` (`createPanZoom`, `DAGNode`, `DAGEdge`, `NodeRenderState`) — utility-module/data imports, not component imports, per the Primitive rule. SVG horizontal swimlane chart that places nodes on signed-integer columns (negative = left of center, 0 = center, positive = right). Key props: `nodes` (`DAGNode<T>[]`), `edges` (`DAGEdge[]`), `swimlaneFor` (returns the column for each node), `renderNode` (receives `node` and `NodeRenderState`; `{ kind: "collapsed", collapsedCount }` for nodes that overflowed the depth window), `maxDepth` (rings on each side of center; default 2), `responsiveCollapse` (default true — shrinks depth to fit `containerWidth`), `centerCol` (default 0), `nodeSize`, `columnGap`, `rowGap`, `interactive`, `arrows`, `onNodeClick`. Nodes outside the visible depth window collapse into boundary badges (circle + count) at the outer edge of the outermost visible anchor. Width budgeting is purely symmetric — chart reserves `depth` columns on each side of center, so DOING-anchored layouts never push content off-screen. Leaving nodes play a 360ms mirrored compress-into-badge animation (rect → circle, shrinks toward the badge side); entering nodes mirror the leave in reverse (emerge from the badge as a circle, expand to rect). Use for: current-step-in-workflow displays, DOING-centered Kanban, dependency chain visualizations with overflow summarization.
- **LinearFlowSwimlaneChart** — Curried variant of SwimlaneChart pre-configured for "current step in a sequential workflow" displays. Locks `maxDepth=3`, `responsiveCollapse=true`, `centerCol=0`, `nodeSize=[160, 56]`, `interactive=false`. Consumer passes only `nodes`, `edges`, `swimlaneFor` (signed distance from DOING), and `renderNode`. Use for: linear flow / pipeline animations where the chart drives itself off data updates rather than user pan/zoom.

## StatusFlowChart
- **StatusFlowChart** — Status-driven flow chart built on top of SwimlaneChart. Caller passes nodes with `status` (no positional hints in the data); the chart computes columns by mapping each node's status to a configured column, computes the visible column count from container width via breakpoints, and lays out symmetric around `centerStatus`. Key props: `nodes` (`StatusFlowNode[]` with `id`, `title`, `subtitle?`, `status`, `parentId?`, `dependsOn?`), `columns` (`StatusFlowColumn[]` — each column is `{ label, statuses[] }`, ordered left→right), `centerStatus` (anchors col 0; also drives parent effective-status), `terminalStatus` (when a parent's effective status equals terminal, its children collapse into a `+N` badge on the parent), `nodeWidth`, `nodeHeight`, `minArrowWidth`, `breakpoints` (`{ minWidth, visibleCols }[]` — `visibleCols` should be odd so the chart stays symmetric around center), `renderNode?`, `onNodeClick?`. Parent effective-status rules (in priority order): (1) ANY child in `centerStatus` → parent is `centerStatus`; (2) ALL children share the same status → parent takes that status; (3) mixed without any `centerStatus` → parent keeps its own input status. When any parent has visible (non-collapsed) children, the chart container outlines a dashed "lane" border. Pure layout logic is exposed for testing: `pickVisibleCols(width, breakpoints)`, `assignColumns(nodes, columns, centerStatus, visibleCols)` → `Map<id, {col, visible, side}>`, `resolveParentStatuses(nodes, centerStatus)`. Use for: kanban-style status flow where the data model is status-based rather than position-based, and where parent tasks should auto-summarize once all their children complete.

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
- **formatDateTimeRange(start, end?, mode?)** — Pure-function string helper exported alongside `DateTimeRange`. Same formatting rules; suitable for use inside Primitives that need the formatted string but cannot compose the `DateTimeRange` Composite (e.g. `VesselCallHeader`).
- **formatCompactDuration(ms)** / **formatCompactRange(start, end)** / **formatStartTimestamp(date)** — Pure-function string helpers exported from `solid-ui-components/Duration`. Vanilla `Date` + `Intl.DateTimeFormat` (no Luxon, matching the DateRangePicker convention). `formatCompactDuration(ms)` renders deterministic compact durations (`Ns` / `Nm` / `Nh Mm` / `Nd Mh` / `Nd Mm`); no wall-clock fallback, keeps a smaller unit when the next-larger is zero (`24h30m → "1d 30m"`). `formatCompactRange(start, end)` keeps both timestamps but strips redundant date fields from the end side (same-day: `May 13 11:35 → 12:05 · 30m`; same-month: `May 13 11:35 → 14 12:05 · 1d 30m`; different month: full both sides), appends the duration via `formatCompactDuration`, and renders `end === null` as `"… → ongoing · <duration>"` (duration vs. `Date.now()`). `formatStartTimestamp(date)` exposes the `"MMM dd HH:mm"` shape for callers that mix custom JSX with `formatCompactRange` output. Use for: alarm-period labels, history lists, "zoomed to" indicators.
- **DigitRoller** — Atomic Primitive (Depth 1). Owns `DigitRoller.css`. Animated digit-by-digit value transition (slot-machine effect). Key props: `value`, `previousValue`, `animate`, `duration`, `stagger`, `onAnimationEnd`. Use for: animated number reveals in dashboards.
- **MetricCard** — Atomic Primitive (Depth 1). Owns `MetricCard.css`; no library-component imports. Labeled value card with optional units and color-tinted value text (`default` | `success` | `warning` | `danger`). When `units` is supplied the value uses the same monospace face as the sibling `NumberWithUnits` Primitive so numeric readouts line up. Key props: `label`, `value`, `units`, `color`. Use for: KPI/metric display tiles.
- **NumberWithUnits** — Atomic Primitive (Depth 1). Owns `NumberWithUnits.css`; no library-component imports. Monospace value paired with a faded units label, baseline-aligned on a single line. Data-driven `color` flows as inline style on the value span (allowed inside a Primitive per CONTEXT.md). Key props: `value`, `units`, `precision`, `color`. Use for: any numeric display that needs units.
- **ResultDisplay** — Atomic Primitive (Depth 1). Owns `ResultDisplay.css`; no library-component imports. Header (label + sublabel) over a value+units row with optional badge slot and trailing children area. Data-driven `valueColor` flows as inline style on the value span. Key props: `value`, `units`, `label`, `sublabel`, `badge`, `valueColor`. Use for: primary calculation results.
- **ResultPanel** — Wraps ResultDisplay in a FormulaProvider + NarrowStack. Key props: `label`, `value`, `units`, `sublabel`, `valueColor`, `badge`, `formulaProvider`. Use for: result sections that include formula/variable breakdowns.
- **StatsTable** — Simple typed data table with column definitions. Key props: `columns` (array of `StatsColumn`), `rows`, `getRowClass`, `caption`. Use for: quick statistical summary tables.
- **FormulaDecomposition** — Factory functions for compliance formula panels. Exports: `createFormulaResult`, `createGivens`, `createFormula`, `createFormulaPanel`. Key config: `FormulaConfig` with `vars`, `threshold`, `compute`, `latex`. Use for: interactive formula display with result, givens table, and LaTeX rendering.
- **EngineDataSection** — Composite (Depth 3). Composes `AlertBox` (Depth 2) + Layout/Text curried variants + `NumberWithUnits` (Atomic Primitive). Heading + warning alert + content slot for engine power data. Key props: `heading`, `showWarning`, `defaultKw`, `auxEngineHref`. Use for: engine power compensation sections. Name is domain-bound — flagged for rename in a future library-wide naming pass.

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

## Divider
- **Divider** — Content separator line (own component directory). Key props: `orientation` (`horizontal`|`vertical`), `variant` (`solid`|`dashed`|`dotted`), `spacing` (`sm`|`md`|`lg`). Use for: visual separation between content blocks.

## Dot
- **Dot** — Atomic (Depth 0). Generic colored indicator dot — caller supplies any CSS color via the `color` prop (hex, rgb, `var(--…)`, named color). Domain-agnostic, no variants. Use when `StatusLight`'s fixed variant set doesn't fit — e.g., severity palettes mapped to arbitrary hex colors from a caller-supplied scheme, chart-series legends rendered alongside other labels, etc. Key props: `color` (required CSS color string), `size` (number → px, or any CSS length; default `8px`). Renders an `aria-hidden` `<span>` with `border-radius: 50%`, `flex-shrink: 0`, `display: inline-block`. Owns `Dot.css`.
  - Example:
    ```tsx
    import { Dot } from "solid-ui-components";

    <Dot color="#f59e0b" />
    <Dot color="var(--sui-danger)" size={10} />
    ```

## Feedback
- **AlertBox** — Status-colored alert with title, description, and action slot. Key props: `variant` (`info`|`warning`|`success`|`danger`), `title`, `description`, `action`. Use for: warnings, errors, success messages, info banners.
- **EmptyState** — Centered placeholder with icon and message. Key props: `variant` (`default`|`muted`|`accent`), `size` (`sm`|`md`|`lg`), `message`, `icon`. Use for: empty lists, no-data states, loading placeholders.
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
- **Icon** — SVG icon component with 27 named icons across 6 groups (status, navigation, data, time, actions, UI/cache). Key props: `name` (e.g., `check`, `warning`, `chevron-down`, `search`, `spinner`), `variant` (`outline`|`solid`), `size` (`xs`|`sm`|`md`|`lg`|`xl`). Use for: all iconography. Spinner icon auto-animates.

## Inputs
- **ThemedInput** — Styled text input with optional label. Key props: `label`, plus all native `<input>` attributes. Use for: themed form text inputs.
- **ThemedNumberInput** — Themed numeric field built on `@kobalte/core/number-field` with stacked increment/decrement triggers. Key props: `value` (`Accessor<number | undefined>`), `onChange` (`(value: number | undefined) => void`), `name`, `label`, `description`, `errorMessage`, `min`, `max`, `step` (default `1`). Friendly names `min`/`max` map to kobalte's `minValue`/`maxValue`; any other `NumberFieldRootProps` (e.g. `disabled`, `required`, `format`, `formatOptions`, `changeOnWheel`) is forwarded via spread. When `errorMessage` is set, the field renders in invalid state and suppresses the description. Kobalte emits `NaN` on clear — normalized to `undefined` before `onChange`. Uses `--sui-bg-secondary`, `--sui-border`, `--sui-border-focus`, `--sui-accent`, `--sui-accent-rgb`, `--sui-danger`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: numeric form fields (RPM, counts, thresholds, bounded parameters).
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
- **ThemedTextarea** — Styled textarea with optional label. Key props: `label`, plus all native `<textarea>` attributes. Use for: themed form textareas.

## Layout
- **Stack** — Flex-column container. Key props: `gap` (`xs`|`sm`|`md`|`lg`|`xl`), `align`, `justify`. Use for: vertical stacking of elements.
- **Row** — Flex-row container. Key props: `gap`, `align`, `justify`, `wrap`. Use for: horizontal arrangement of elements.
- **Box** — Flex child with grow/shrink control. Key props: `grow`, `shrink`. Use for: controlling flex item sizing.
- **ResizableContainer** — Container with draggable edge handles for manual resize. Key props: `directions` (array of `"top"`|`"right"`|`"bottom"`|`"left"`, default `["right", "bottom"]`), `minWidth`/`maxWidth`/`initialWidth`, `minHeight`/`maxHeight`/`initialHeight`, `onResize` (called with `{ width, height }` during drag), `gridMode` (skip inline width/height when parent grid controls sizing), `externalWidth` (accessor that syncs internal width from an external source). Exports `ResizeDirection` and `ResizeDimensions` types. Use for: side panels, resizable columns, draggable split views. Uses `--sui-accent-rgb` for handle hover color. Note: the `onResize` callback intentionally uses the `{ width, height }` object shape rather than positional `(width, height)` arguments — this is the upstream-canonical signature; downstream callers using the legacy positional form must adapt.
- Curried variants: `TightStack`, `NarrowStack`, `SpacedStack`, `ContentStack`, `CenteredStack`, `ConversationStack` (capped reading-width column tuned for multi-participant chat trees — `max-width: 110ch`, conversation typography), `SmRegion`, `MdRegion`, `LgRegion`, `SpreadRow`, `TightSpreadRow` (4px-gap, baseline-aligned key+count row for compact data displays — pairs with `ChipLabel` + `CountText`), `ClusterRow`, `WrappedClusterRow` (center-aligned cluster that wraps on overflow — for header rows where a name + timestamp pair must collapse onto a second line on narrow widths), `ActionSlot`, `FadedBox`, `ConstrainedBox`. Use for: common layout patterns without manual gap/align configuration.

## List
- **List** — Styled list with status dots, icons, dividers. Key props: `variant` (`default`|`status`|`menu`), `dividers`, `compact`, `scroll` (fills its flex parent and scrolls internally on overflow: `flex: 1; min-height: 0; overflow-y: auto`). Note: `numbered` variant has been removed. Use for: status lists, menus, settings lists. Has `createList` factory for curried variants.
- **ListItem** — List item with status indicators and interactive states. Key props: `status` (`active`|`inactive`|`warning`|`error`|`success`), `icon`, `secondary`, `interactive`, `selected`. Use for: items within List.
- **ScrollList** — Curried `List` with `scroll: true` baked in. Drop into a height-constrained flex column (e.g. a panel with `display: flex; flex-direction: column`) to get a list that fills the remaining height and scrolls internally instead of pushing siblings. Use for: filter-result lists in a sidebar, log-style streams in a fixed-height panel, any vertical list that may overflow its container.

## MathFormula
- **MathFormula** — KaTeX LaTeX renderer with interactive variable highlighting via `\var{id}{content}` syntax. Key props: `latex`, `displayMode`, `class`. Use for: rendering mathematical formulas with hover-linked variables.
- **FormulaProvider** — Context provider enabling hover interactions between MathFormula variables and table rows. Use for: wrapping formula + variable table pairs.
- **FormulaVarRow** — Table `<tr>` that highlights when its corresponding formula variable is hovered. Key props: `varId`. Use for: variable definition rows that link to formula terms.

## Modal
- **Modal** — Portal-based modal with overlay, escape-to-close, and footer slot. Key props: `open`, `onClose`, `title`, `subtitle`, `corners` (`CornerStyle`), `variant` (`ColorVariant`), `size` (`sm`|`md`|`lg`|`xl`), `showClose`, `footer`. Use for: dialog windows.

## ConfirmationModal
- **ConfirmationModal** — Confirmation dialog with Cancel/Confirm footer built on Modal. Key props: `open`, `onClose`, `onConfirm`, `title`, `subtitle`, `description`, `size`, `corners`, `variant`, `confirmLabel`, `loadingLabel`, `cancelLabel`, `loading`, `confirmVariant` (`primary`|`danger`). Use for: destructive action confirmations, submit confirmations.

## Navigation
- **NavLink** — Anchor link with active state, color variants, and optional badge. Key props: `active`, `color` (`accent`|`warning`|`danger`|`success`), `badge`. Use for: navigation menus, sidebar links.
- **Link** — Minimal themed anchor wrapper. Use for: inline text links.
- **NewTabLink** — Link that always opens in a new tab (`target="_blank"`). Use for: external links.

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

## PopoverMenu
- **PopoverMenu** — Atomic Primitive (Depth 1). Trigger button with positioned action dropdown. Key props: `trigger` (JSX content for the trigger button), `items` (array of `PopoverMenuItem` with `id`, `label`, optional `icon`), `onSelect` (callback with item `id`), `align` (`left`|`right`), `size` (`sm`|`md`). Internals: native `<button class="sui-popover-menu__trigger">` with inline chevron SVG (via `ICON_PATHS` data import) and `<ul class="sui-popover-menu__panel">` of `<li role="menuitem">` items — no library component imports. Closes on click-outside and Escape; items support `Enter`/`Space` keyboard activation. Use for: action menus, user menus, context menus.
- **RightPopoverMenu** — Right-aligned, small trigger. Use for: header action menus.

## ProgressCheck
- **ProgressCheck** — Three-state progress indicator: empty checkbox (0%), partial fill (1-99%), green check (100%). Key props: `progress` (0-1 number), `size` (`xs`|`sm`|`md`|`lg`|`xl`, default `sm`). SVG-based, matches Icon sizing. Use for: task completion indicators, goal progress, hierarchical rollup status.

## BurndownChart
- **BurndownChart** — SVG burndown bar chart with dual-axis stacked bars and trendline. Key props: `bars` (array of `BurndownBar` with `planned_complete`, `planned_incomplete`, `unplanned_complete`, `unplanned_incomplete`), `onSegmentClick` (callback with `barIndex` and `BurndownSegmentKind`), `height`. Above zero: green (planned complete) on grey (planned incomplete). Below zero: orange (unplanned complete) on red (unplanned incomplete). Trendline projects remaining planned work to zero with "+Nd" annotation. Uses `--sui-*` CSS variables. Use for: sprint burndown tracking, planned vs actual visualization.

## Progress
- **StackedProgressBar** — Multi-segment progress bar. Key props: `segments` (array of `{percentage, color}`), `direction` (`horizontal`|`vertical`), `label`, `background`. Use for: multi-category progress visualization, stacked bar charts.

## ProgressCard
- **ProgressCard** — Step-based progress indicator with icons and connectors. Key props: `title`, `subtitle`, `steps` (array of `ProgressStep` with `id`, `label`, `status`, `icon`), `message`. Use for: multi-step workflow status display.
- **createWorkflowProgressCard** — Factory that derives step statuses from `currentStep` + `status`. Returns a component with props: `title`, `subtitle`, `currentStep`, `status` (`fetching`|`caching`|`completed`|`error`), `message`. Use for: automated workflow progress tracking.
- **CacheProgressCard** — Pre-built 5-step cache workflow progress card (Minutes, Hours, Stats, Coverage, Calcs). Use for: data caching pipeline status.

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
- **SidebarSelector** — Sidebar card list with selection content area (generic). Key props: `items`, `selectedId`, `onSelect`, `renderCard`, `renderSelection`, `sidebarWidth`, `maxHeight`, `label`. Use for: master-detail selection patterns, sidebar navigation with preview pane.

## Surface
- **Surface** — Themed container primitive with padding, radius, background, and border control. Key props: `padding` (`none`|`sm`|`md`|`lg`), `radius` (`none`|`sm`|`md`|`lg`), `bg`, `borderColor`, `interactive`, `active`. Use for: base container for cards, panels, and interactive areas.
- Curried variants: `CardSurface`, `CompactSurface`, `InteractiveCard`, `InfoSurface`, `WarningSurface`, `SuccessSurface`, `DangerSurface`. Use for: pre-themed containers for specific contexts (alerts, cards, status surfaces).

## Table
- **BaseTable** — Sortable data table with sticky header, striped rows, column groups (colspan). Key props: `data`, `columns` (array of `TableColumn`), `maxHeight`, `fill`, `stickyHeader`, `striped`, `hoverable`, `compact`, `getRowClass`, `onRowClick`, `emptyMessage`. Use for: standard sortable data tables.
- **GroupedTable** — Table with rowspan grouping for merged cells. Key props: `rows` (array of `GroupedRow`), `columns` (array of `RowspanColumn` with `rowspan` flag), `maxHeight`, `compact`. Use for: tables where rows share common group fields (e.g., vessel calls with multiple trains).
- **SelectableTable** — Table with checkbox selection and action bar. Key props: `data`, `columns`, `getRowId`, `selectionStore`, `selectionActions`. Use for: batch operations on table rows.
- **QuickFilter** — Filter input + BaseTable passthrough. Key props: all BaseTable props + `filterPlaceholder`. Use for: adding text search to any BaseTable.
- **DataTableContainer** — Scrollable container wrapper. Key props: `maxHeight`, `fill`. Use for: constraining table height with scroll.
- **createSelectionStore / fromSignal** — Utilities to create or wrap selection state (`SelectionStore<Id>`). Use for: managing checkbox selection state, optionally backed by persistent storage.
- **PivotGrid<RowKey, ColKey, Cell>** — Dense pivot of runtime-derived rows × runtime-derived columns, with two-axis sticky positioning (top header AND left column), optional clickable cells, and optional continuous heat coloring. Caller passes flat `readonly RowKey[]` + `readonly ColKey[]` arrays (caller sorts), label functions, a `cell(row, col) → Cell | null` lookup, and a `renderCell(cell, row, col) → JSX` formatter. Three optional hooks layer on top: `cellHref` (wraps cells in `<a>` for cross-route navigation), `onCellClick` (button-wrapped fallback for in-page selection), and `getCellHeat → number | null` (the grid does the 0..1 → alpha math). Heat ramp defaults to `Math.sqrt` (perceptual); pass `heatRamp={(v) => v}` for linear. Curried variants `HeatPivotGrid` (type-enforces `getCellHeat`) and `LinkPivotGrid` (type-enforces `cellHref`) ship alongside. Use for: alarm-period grids, ops metrics pivots, flag matrices — anywhere the same row × col × cell shape recurs with dynamic axes.
- **Column helpers**: `floatCol`, `intCol`, `dateTimeCol`, `dateCol`, `textCol` + curried factories (`floatColWith`, `intColWith`, etc.). Use for: declarative column definitions with built-in cell renderers.
- **Cell renderers**: `IdCell`, `StringCell`, `TagCell`, `MoneyCell`, `DateCell`, `DateTimeCell`, `MinuteDateTimeCell`, `DurationCell`, `StatusCell`, `CheckboxCell`, `FloatCell`, `IntCell`, `MetricValueCell`, `LongTextCell`. Use for: typed cell formatting in tables. Compose with `withCellStyle` or `withValueColor` for styled/conditional-color variants.
  - **LongTextCell** props:
    - `maxLength?: number` (default `50`) — char-count truncation threshold; ignored when `clampLines` is set.
    - `expandable?: boolean` (default `true`) — enables the inline "more..."/"less" toggle in `reveal="inline"` mode.
    - `clampLines?: number` — CSS `-webkit-line-clamp` truncation. Full value is rendered; overflow is measured at runtime (`scrollHeight`/`scrollWidth` vs. client). Use when cell width is dynamic and char-count is too coarse.
    - `reveal?: "inline" | "tooltip"` (default `"inline"`) — how the full value is revealed. `"inline"` shows "more..."/"less" buttons (existing behavior). `"tooltip"` composes the library's `Tooltip` (viewport-aware, auto-flips) and shows the full value on hover.
    - `tooltipPlacement?: "top" | "bottom" | "left" | "right"` (default `"top"`) — preferred placement when `reveal="tooltip"`; Kobalte flips if the placement would overflow.
  - `DateTimeCell` extras (additive, optional): `timeZone` (IANA, e.g. `"America/Los_Angeles"` — formats in that zone instead of host-local), `showZoneAbbreviation` (boolean — appends `(PDT)`-style suffix via `Intl.DateTimeFormat({ timeZoneName: "short" })`), `emptyVariant` (`"default"` italic em-dash, `"plain"` non-italic em-dash). CSS hook `--cell-empty-font-style` also lets ancestors globally restyle the empty italic default.

## Tabs
- **Tabs** — Tab bar with multiple style variants. Key props: `tabs` (array of `Tab`), `activeTab`, `onTabChange`, `variant` (`default`|`underline`|`boxed`|`pill`), `color` (`ColorVariant`). `Tab` interface supports optional `hint` (muted text after label, e.g., keyboard shortcut hints). Exports `TabStatus` type (`"warning" | "error"`). Use for: switching between views/panels.

## Text
- **Text** — Polymorphic text element with variant and color. Key props: `variant` (`value`|`label`|`title`|`body`|`units`|`sublabel`), `color`, `as` (`span`|`p`|`h1`..`h4`|`div`). Use for: all themed text rendering.
- Curried variants (always prefer these over configuring `Text` directly):
  - **TextValue** — `variant="value"`. Use for: data values, readouts.
  - **TextLabel** — `variant="label"`. Use for: field labels, captions.
  - **TextTitle** — `variant="title"`. Use for: section/panel titles (renders `<span>`).
  - **PageTitle** — `variant="title"`, `as="h1"`. Use for: top-level page headings.
  - **TextBody** — `variant="body"`. Use for: paragraph text, descriptions.
  - **TextUnits** — `variant="units"`. Use for: unit labels next to values.
  - **TextSublabel** — `variant="sublabel"`. Use for: secondary labels, footnotes.
  - **MonoValue** — Monospace value text. Use for: numeric readouts alongside units.
  - **NowrapBody** — Body text that never wraps. Use for: inline formatted values.
  - **MutedBody** — Dim body text. Use for: secondary descriptions, hints.
  - **AccentBody** — Cyan-accented body text. Use for: highlighted descriptions.
  - **FlexLabel** — Label that grows to fill available space. Use for: label + value rows.
  - **InlineUnits** — Inherits parent font-size, muted. Use for: appending units inline.
  - **InfoTitle / WarningTitle / SuccessTitle / DangerTitle** — Status-colored titles. Use for: section headings with semantic color.
  - **ChipLabel** — Small bold key text (11px / 600, `<span>`). Use for: pivot cell keys, legend swatch labels, chip titles. Pairs with **CountText** inside **TightSpreadRow**.
  - **EllipsizedChipLabel** — Single-line truncating `ChipLabel` (11px / 600 + nowrap + ellipsis + min-width:0). Use for: chip keys inside flex parents that may overflow.
  - **CountText** — Small muted count/meta text (10px, muted color, `<span>`). Use for: trailing counts beside a `ChipLabel`, compact metadata.

## ThreePanelLayout
- **ThreePanelLayout** — Atomic (Depth 1). Top-bar + three-column (left / center / right) page scaffold, intended for alarm-lab / analysis-style routes where a primary work area is flanked by a narrow asset picker on the left and a narrow context pane on the right. Owns `ThreePanelLayout.css`; imports zero other library components. Key props: `centerPanel` (required), `topBar?`, `leftPanel?`, `rightPanel?`, `height?` (default `"100%"` — any valid CSS length, e.g. `"100vh"` or `"calc(100vh - var(--app-header-height, 64px))"`; upstream intentionally stays decoupled from app-chrome tokens), `fullHeight?` (backwards-compatible alias mapping to `height="100%"` — `height` wins if both are passed), `leftPanelWidth?` (default `"220px"`), `rightPanelWidth?` (default `"240px"`), `class?`. Omitted side-panel slots collapse their grid column to `0` so the center expands fully. Mobile collapse: the content grid switches to a single column at `max-width: 900px`, side panels drop their border and cap at `200px` max-height (matches the downstream `$mobile-width`). Uses `--sui-bg-primary`, `--sui-text-primary`, `--sui-border` theme tokens; spacing is hardcoded (8 / 12 / 16 px) because the library does not yet define `--sui-space-*` tokens. Use for: multi-pane investigation pages, tuning pages, anywhere the four-slot shape applies.
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
- **Toggle** — Checkbox toggle switch with label positioning and accent color. Key props: `size` (`sm`|`md`|`lg`), `label`, `labelPosition` (`left`|`right`), `variant` (`default`|`minimal`), `color` (`ColorVariant`), plus all native checkbox attributes. Note: `power` and `circuit` variants have been removed. Use for: boolean on/off controls.

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

## VesselCallHeader
- **VesselCallHeader** — Atomic Primitive (Depth 1). Owns `VesselCallHeader.css`; no library-component imports — the date formatting comes from the pure `formatDateTimeRange` helper. Title + optional badge + ISO date range + duration + optional asset chip + optional action slot, optionally wrapped in a link. Key props: `vesselName`, `connectedAt`, `disconnectedAt`, `assetId`, `badge`, `action`, `href`. Use for: detail page headers, list item titles for named time-ranged items. Name is domain-bound — flagged for rename in a future library-wide naming pass.
