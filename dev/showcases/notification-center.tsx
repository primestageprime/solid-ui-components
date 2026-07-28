import { type Component, createSignal } from "solid-js";
import {
  NotificationCenter,
  type NotificationItem,
} from "../../src/components/NotificationCenter";
import { Row } from "../../src/components/Layout/Row";

// Foundation (Asimov) universe — a Trantor mission-control notification feed.
// Titles are scale-tested: short ("Seldon Crisis"), moderate ("Trantor sector
// relay drift"), and long (Olivaw's directive) to exercise wrapping. Tones are
// spread across all three so the glyph wells are visible side by side, and the
// last row is `read` to show the unread gutter doing its job.
const seldonItems: NotificationItem[] = [
  {
    id: "crisis",
    title: "Seldon Crisis",
    detail: "The Vault opened three months ahead of the projected date.",
    action: { label: "Open the Vault", href: "#/vault" },
    tone: "warning",
    when: "2m",
  },
  {
    id: "relay",
    title: "Trantor sector relay drift",
    detail: "Sector 7 hyperwave relay is 0.4 parsecs off its plotted node.",
    // No href → renders as an accent TextButton instead of a NavLink.
    action: { label: "Recalibrate relay" },
    tone: "info",
    when: "8m",
  },
  {
    id: "directive",
    title:
      "R. Daneel Olivaw's Third Amended Directive Regarding Human Safety in the Outer Spiral Territories",
    detail:
      "Awaiting ratification by the Second Foundation before psychohistory can fold it into the model.",
    action: { label: "Review directive", href: "#/directives/olivaw-3" },
    tone: "task",
    when: "1d",
    read: true,
  },
];

// Same feed, led by a transient "syncing" row: it shows a spinner, carries no
// action, and is excluded from the badge count.
const withSyncing: NotificationItem[] = [
  { id: "sync", title: "Syncing psychohistory model…", transient: true },
  ...seldonItems,
];

export const NotificationCenterShowcase: Component = () => {
  const [last, setLast] = createSignal<string>("");

  // Mark-all-read example: the consumer owns read state, the component just
  // reports the intent — same contract as `open`/`onOpenChange`.
  const [marked, setMarked] = createSignal<NotificationItem[]>(seldonItems);

  // Controlled example: the consumer owns `open` via a signal and can auto-open
  // the panel when new activity arrives — here, when a fresh crisis lands.
  const [open, setOpen] = createSignal(false);
  const [feed, setFeed] = createSignal<NotificationItem[]>(seldonItems);
  const triggerCrisis = () => {
    setFeed((items) => [
      {
        id: `crisis-${items.length}`,
        title: "Anacreon fleet detected at the Periphery",
        detail: "A new Seldon Crisis is converging — the model demands a plan.",
        action: { label: "Convene the Encyclopedists", href: "#/council" },
      },
      ...items,
    ]);
    setOpen(true);
  };

  return (
    <div class="component-section">
      <h2>NotificationCenter — Composed (Depth 3)</h2>
      <p class="text-meta">
        A bell trigger with a rolling count badge that opens an inbox panel:
        pinned header (label + count lozenge), scrolling rows, optional pinned
        footer action. Router-agnostic: the consumer supplies <code>items</code>{" "}
        and navigates inside <code>onAction</code>. The bell tints and its glyph
        fills while open. Closes on click-outside and Escape.
      </p>

      <h3>Feed with a transient syncing row (uncontrolled)</h3>
      <p class="text-meta">
        Manages its own open state. The leading <code>transient</code> row shows
        a spinner in its well, carries no action, and does not count toward the
        badge. The middle item has no <code>href</code>, so its action renders
        as an accent button rather than a link. Each row's <code>tone</code>{" "}
        colours its glyph well (<code>warning</code> / <code>info</code> /{" "}
        <code>task</code>); the last row is <code>read</code>, so its unread dot
        is empty and it leaves the badge count — the badge reads 2, not 4.
      </p>
      <div class="example-group">
        <Row gap="sm" align="center">
          <NotificationCenter
            items={withSyncing}
            onAction={(item) => setLast(item.title)}
          />
          <span class="text-meta">last action: {last() || "—"}</span>
        </Row>
      </div>

      <h3>With the mark-all-read footer</h3>
      <p class="text-meta">
        Passing <code>onMarkAllRead</code> mounts the pinned footer action; omit
        it and neither the footer nor its divider render, so the panel never
        shows a dead affordance. <code>markAllReadLabel</code> overrides the
        wording.
      </p>
      <div class="example-group">
        <Row gap="sm" align="center">
          <NotificationCenter
            items={marked()}
            onMarkAllRead={() =>
              setMarked((items) => items.map((i) => ({ ...i, read: true })))
            }
            onAction={(item) => setLast(item.title)}
          />
          <span class="text-meta">
            unread: {marked().filter((i) => !i.read).length}
          </span>
        </Row>
      </div>

      <h3>Busy</h3>
      <p class="text-meta">
        <code>busy</code> overlays a spinner on the bell and announces
        "Working…" to screen readers via the live region — use it while a
        background fetch or model run is in flight.
      </p>
      <div class="example-group">
        <NotificationCenter items={seldonItems} busy />
      </div>

      <h3>Empty state</h3>
      <p class="text-meta">
        With no items the badge disappears and the panel shows{" "}
        <code>emptyLabel</code> (default "You're all caught up.").
      </p>
      <div class="example-group">
        <NotificationCenter items={[]} />
      </div>

      <h3>Explicit badge count</h3>
      <p class="text-meta">
        Pass <code>badgeCount</code> to override the derived total — handy when
        the true unread count lives on the server and outruns the items loaded
        into the panel.
      </p>
      <div class="example-group">
        <NotificationCenter items={seldonItems} badgeCount={128} />
      </div>

      <h3>Controlled (consumer-driven auto-open)</h3>
      <p class="text-meta">
        Here the parent owns <code>open</code> via a signal. "Trigger a crisis"
        prepends an item and opens the panel — the auto-open pattern a consumer
        uses to surface new activity. The component never fights the consumer's
        state.
      </p>
      <div class="example-group">
        <Row gap="sm" align="center">
          <NotificationCenter
            items={feed()}
            open={open()}
            onOpenChange={setOpen}
            onAction={(item) => setLast(item.title)}
          />
          <button type="button" onClick={triggerCrisis}>
            Trigger a crisis
          </button>
          <span class="text-meta">open: {String(open())}</span>
        </Row>
      </div>

      <div class="depth2-atoms">
        <h3>Composed from</h3>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Atomic (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">Icon</div>
            <div class="text-meta">
              bell trigger glyph (outline → solid while open), per-tone well
              glyph, spinner (busy / transient)
            </div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">CountBadge</div>
            <div class="text-meta">
              rolling numeric badge overlaid on the bell corner
            </div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TagPill</div>
            <div class="text-meta">
              de-emphasized count lozenge in the panel header
            </div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">Divider</div>
            <div class="text-meta">header and footer rules</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">NavLink</div>
            <div class="text-meta">
              action link for items with an href (SPA-navigates)
            </div>
          </div>
        </div>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Surface (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">PopoverSurface</div>
            <div class="text-meta">
              elevated panel chrome — the only box in the panel; rows are
              unboxed until hover
            </div>
          </div>
        </div>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Layout (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">FillColumn</div>
            <div class="text-meta">
              inbox shell — pins the header and footer around the scrolling body
            </div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">ScrollColumn</div>
            <div class="text-meta">scrolling list of notification rows</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TopClusterRow</div>
            <div class="text-meta">
              per-row media object: unread gutter · tone well · text column
            </div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">GrowTightStack</div>
            <div class="text-meta">
              title / detail / action column beside the well (added for this
              component — no existing variant grew AND kept a tight gap)
            </div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">SpreadRow</div>
            <div class="text-meta">
              header label + count; per row, title left and timestamp right
            </div>
          </div>
        </div>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Text (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TextTitle</div>
            <div class="text-meta">panel header + notification title</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TextSublabel</div>
            <div class="text-meta">detail line + timestamp</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">MutedBody</div>
            <div class="text-meta">empty-state message</div>
          </div>
        </div>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Button (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TextButton</div>
            <div class="text-meta">
              accent action for items without an href + the mark-all-read footer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
