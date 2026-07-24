import { type Component, createSignal } from "solid-js";
import {
  NotificationCenter,
  type NotificationItem,
} from "../../src/components/NotificationCenter";
import { Row } from "../../src/components/Layout/Row";

// Foundation (Asimov) universe — a Trantor mission-control notification feed.
// Titles are scale-tested: short ("Seldon Crisis"), moderate ("Trantor sector
// relay drift"), and long (Olivaw's directive) to exercise wrapping.
const seldonItems: NotificationItem[] = [
  {
    id: "crisis",
    title: "Seldon Crisis",
    detail: "The Vault opened three months ahead of the projected date.",
    action: { label: "Open the Vault", href: "#/vault" },
  },
  {
    id: "relay",
    title: "Trantor sector relay drift",
    detail: "Sector 7 hyperwave relay is 0.4 parsecs off its plotted node.",
    // No href → renders as an accent TextButton instead of a NavLink.
    action: { label: "Recalibrate relay" },
  },
  {
    id: "directive",
    title:
      "R. Daneel Olivaw's Third Amended Directive Regarding Human Safety in the Outer Spiral Territories",
    detail:
      "Awaiting ratification by the Second Foundation before psychohistory can fold it into the model.",
    action: { label: "Review directive", href: "#/directives/olivaw-3" },
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
        A bell trigger with a rolling count badge that opens a dropdown of
        notifications. Router-agnostic: the consumer supplies <code>items</code>{" "}
        and navigates inside <code>onAction</code>. Zero component CSS — it only
        anchors the portaled overlay. Closes on click-outside and Escape.
      </p>

      <h3>Feed with a transient syncing row (uncontrolled)</h3>
      <p class="text-meta">
        Manages its own open state. The leading <code>transient</code> row shows
        a spinner, carries no action, and does not count toward the badge (so
        the badge reads 3, not 4). The middle item has no <code>href</code>, so
        its action renders as an accent button rather than a link.
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
              bell trigger glyph + spinner (busy / transient)
            </div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">CountBadge</div>
            <div class="text-meta">
              rolling numeric badge overlaid on the bell corner
            </div>
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
            <div class="text-meta">elevated dropdown panel chrome</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">CompactSurface</div>
            <div class="text-meta">
              per-item card box (three-line card canon; non-interactive)
            </div>
          </div>
        </div>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Layout (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">ScrollColumn</div>
            <div class="text-meta">scrolling list of notification rows</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TightStack</div>
            <div class="text-meta">title / detail / action stack per card</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">SpreadRow</div>
            <div class="text-meta">
              title left, trailing transient spinner as status
            </div>
          </div>
        </div>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Text (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TextValue</div>
            <div class="text-meta">notification title</div>
          </div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">MutedBody</div>
            <div class="text-meta">detail line + empty-state message</div>
          </div>
        </div>

        <div class="depth2-atom-group">
          <div class="depth2-atom-group__label">Button (Depth 1)</div>
          <div class="depth2-atom">
            <div class="depth2-atom__label">TextButton</div>
            <div class="text-meta">accent action for items without an href</div>
          </div>
        </div>
      </div>
    </div>
  );
};
