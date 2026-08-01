import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@solidjs/testing-library";
import { NotificationCenter, type NotificationItem } from "./index";

// The dropdown panel portals to document.body (overlay carve-out — an ancestor's
// overflow must not clip it), so panel/item queries go to the body via `screen`,
// not the render container; `cleanup` disposes the portal between tests. This
// mirrors the established PopoverMenu.test.tsx convention. Trigger-anchored bits
// (bell, corner CountBadge, busy spinner) stay inside the container.
afterEach(cleanup);

const task = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "t1",
  title: "Set balance",
  action: { label: "Set balance", href: "/setup" },
  ...over,
});
const syncing = (): NotificationItem => ({
  id: "sync",
  title: "Syncing…",
  transient: true,
});

describe("NotificationCenter badge derivation", () => {
  it("counts non-transient items when badgeCount omitted", () => {
    const { getByLabelText, container } = render(() => (
      <NotificationCenter items={[task(), task({ id: "t2" }), syncing()]} />
    ));
    expect(getByLabelText("Notifications")).toBeTruthy();
    expect(container.querySelector(".sui-count-badge")?.textContent).toMatch(
      /2/,
    );
  });
  it("honors an explicit badgeCount override", () => {
    const { container } = render(() => (
      <NotificationCenter items={[task()]} badgeCount={7} />
    ));
    expect(container.querySelector(".sui-count-badge")?.textContent).toMatch(
      /7/,
    );
  });
  it("renders no badge when the derived count is 0", () => {
    const { container } = render(() => (
      <NotificationCenter items={[syncing()]} />
    ));
    expect(container.querySelector(".sui-count-badge")).toBeNull();
  });
});

describe("NotificationCenter open/close", () => {
  it("uncontrolled: toggles the panel on trigger click", () => {
    const { getByLabelText } = render(() => (
      <NotificationCenter items={[task()]} />
    ));
    const trigger = getByLabelText("Notifications");
    expect(document.body.textContent).not.toContain("Set balance →");
    fireEvent.click(trigger);
    expect(document.body.textContent).toContain("Set balance →");
    fireEvent.click(trigger);
    expect(document.body.textContent).not.toContain("Set balance →");
  });
  it("controlled: renders per `open` and never self-mutates; emits onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { getByLabelText } = render(() => (
      <NotificationCenter
        items={[task()]}
        open={false}
        onOpenChange={onOpenChange}
      />
    ));
    fireEvent.click(getByLabelText("Notifications"));
    // stays closed (consumer owns `open`), but intent was emitted
    expect(document.body.textContent).not.toContain("Set balance →");
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
  it("Escape requests close", () => {
    const onOpenChange = vi.fn();
    const { getByLabelText } = render(() => (
      <NotificationCenter items={[task()]} open onOpenChange={onOpenChange} />
    ));
    getByLabelText("Notifications"); // panel open via prop
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("NotificationCenter items", () => {
  it("action with href renders an anchor and fires onAction + close on plain click", () => {
    const onAction = vi.fn();
    const onOpenChange = vi.fn();
    render(() => (
      <NotificationCenter
        items={[task()]}
        open
        onAction={onAction}
        onOpenChange={onOpenChange}
      />
    ));
    const link = screen.getByText("Set balance →") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/setup");
    fireEvent.click(link);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1" }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it("action without href renders a button", () => {
    render(() => (
      <NotificationCenter
        items={[task({ action: { label: "Review" } })]}
        open
      />
    ));
    // SUI Button wraps its content in <span class="sui-btn__content">, so the
    // label's nearest interactive ancestor is the <button> (vs the anchor branch,
    // where Link renders the label directly in an <a>).
    // No → suffix: the arrow is the NAVIGATION signal and rides the href branch
    // only — on every action of a multi-action row it would read as noise.
    const label = screen.getByText("Review");
    expect(label.closest("button")).toBeTruthy();
    expect(label.closest("a")).toBeNull();
  });
  it("uses Link (not NavLink) for the href branch so both CTAs share a scale", () => {
    // Pins the ATOM, which is what keeps the two action branches visually
    // identical. NavLink is a nav-RAIL item: it bakes padding-left:16px, and
    // `.link` carries .sui-btn's 13px/500 while `.nav-link` does not — so
    // regressing to NavLink silently makes the anchor branch both indented and
    // larger than its TextButton sibling. jsdom loads no CSS, so the class is
    // the only part of that contract a unit test can hold.
    render(() => <NotificationCenter items={[task()]} open />);
    const link = screen.getByText("Set balance →");
    expect(link.classList.contains("link")).toBe(true);
    expect(link.classList.contains("nav-link")).toBe(false);
  });
  it("transient item shows a spinner and no action", () => {
    render(() => <NotificationCenter items={[syncing()]} open />);
    expect(document.body.querySelector(".jtf-icon--spinning")).toBeTruthy();
    expect(screen.queryByText(/→/)).toBeNull();
  });
  it("empty items shows the empty label", () => {
    render(() => (
      <NotificationCenter items={[]} open emptyLabel="All caught up." />
    ));
    expect(screen.getByText("All caught up.")).toBeTruthy();
  });
  it("renders one unboxed inbox row per item (no per-item Surface)", () => {
    render(() => (
      <NotificationCenter
        items={[task(), task({ id: "t2", title: "Second" })]}
        open
      />
    ));
    const rows = document.body.querySelectorAll(
      ".sui-notification-center__row",
    );
    expect(rows.length).toBe(2);
    // Supersedes the CompactSurface card canon: the ONLY surface in the panel
    // is the PopoverSurface itself, so rows carry no nested box at rest.
    const surfaces = document.body.querySelectorAll(
      ".surface:not(.surface--shadow)",
    );
    expect(surfaces.length).toBe(0);
    expect(
      screen.getByText("Set balance").closest(".sui-notification-center__row"),
    ).toBe(rows[0]);
  });
  it("renders the pre-formatted `when` string when supplied", () => {
    render(() => <NotificationCenter items={[task({ when: "2m" })]} open />);
    expect(screen.getByText("2m")).toBeTruthy();
  });
  it("maps tone onto the row so the well picks up its colour", () => {
    render(() => (
      <NotificationCenter
        items={[
          task({ id: "w", tone: "warning" }),
          task({ id: "k", tone: "task" }),
          task({ id: "d" }), // no tone → info
        ]}
        open
      />
    ));
    const cls = ".sui-notification-center__row";
    expect(document.body.querySelector(`${cls}--warning`)).toBeTruthy();
    expect(document.body.querySelector(`${cls}--task`)).toBeTruthy();
    expect(document.body.querySelectorAll(`${cls}--info`).length).toBe(1);
  });
});

describe("NotificationCenter inbox shell", () => {
  it("pins a header carrying the label and the count lozenge", () => {
    render(() => (
      <NotificationCenter items={[task(), task({ id: "t2" })]} open />
    ));
    // The panel's region label and its header title are the same string, so
    // scope the lookup to the header lozenge rather than the text.
    expect(document.body.querySelector(".sui-tag-pill")?.textContent).toMatch(
      /2/,
    );
  });
  it("omits the footer entirely when onMarkAllRead is not supplied", () => {
    render(() => <NotificationCenter items={[task()]} open />);
    expect(screen.queryByText("Mark all as read")).toBeNull();
  });
  it("renders the footer and fires onMarkAllRead when supplied", () => {
    const onMarkAllRead = vi.fn();
    render(() => (
      <NotificationCenter items={[task()]} open onMarkAllRead={onMarkAllRead} />
    ));
    fireEvent.click(screen.getByText("Mark all as read"));
    expect(onMarkAllRead).toHaveBeenCalled();
  });
  it("honors a custom markAllReadLabel", () => {
    render(() => (
      <NotificationCenter
        items={[task()]}
        open
        onMarkAllRead={() => {}}
        markAllReadLabel="Clear all"
      />
    ));
    expect(screen.getByText("Clear all")).toBeTruthy();
  });
  it("keeps the header (not just the empty text) when there are no items", () => {
    render(() => <NotificationCenter items={[]} open emptyLabel="Nothing." />);
    expect(screen.getByText("Nothing.")).toBeTruthy();
    // Panel identity survives the empty state — the region landmark is present.
    expect(
      document.body.querySelector('[aria-label="Notifications"]'),
    ).toBeTruthy();
  });
});

describe("NotificationCenter read state", () => {
  it("excludes read items from the derived badge count", () => {
    const { container } = render(() => (
      <NotificationCenter items={[task(), task({ id: "t2", read: true })]} />
    ));
    expect(container.querySelector(".sui-count-badge")?.textContent).toMatch(
      /1/,
    );
  });
  it("marks the unread dot on unread rows only", () => {
    render(() => (
      <NotificationCenter
        items={[task(), task({ id: "t2", read: true })]}
        open
      />
    ));
    const dots = document.body.querySelectorAll(
      ".sui-notification-center__unread",
    );
    // Both rows render a dot slot so the text origin never shifts; only the
    // unread one is filled.
    expect(dots.length).toBe(2);
    expect(
      document.body.querySelectorAll(".sui-notification-center__unread--on")
        .length,
    ).toBe(1);
  });
});

describe("NotificationCenter trigger open state", () => {
  it("flags the trigger open and fills the bell glyph", () => {
    const { container } = render(() => (
      <NotificationCenter items={[task()]} open />
    ));
    const trigger = container.querySelector(
      ".sui-notification-center__trigger",
    );
    expect(
      trigger?.classList.contains("sui-notification-center__trigger--open"),
    ).toBe(true);
    // Outline bell strokes its body; the solid variant fills it. Asserting the
    // rendered SVG is what proves the second, colour-independent signal.
    expect(trigger?.querySelector("svg")?.innerHTML).toContain(
      'fill="currentColor"',
    );
  });
  it("leaves the trigger unflagged and the glyph outlined when closed", () => {
    const { container } = render(() => <NotificationCenter items={[task()]} />);
    const trigger = container.querySelector(
      ".sui-notification-center__trigger",
    );
    expect(
      trigger?.classList.contains("sui-notification-center__trigger--open"),
    ).toBe(false);
    expect(trigger?.querySelector("svg")?.innerHTML).not.toContain(
      'fill="currentColor"',
    );
  });
});

describe("NotificationCenter busy a11y", () => {
  it("marks the trigger busy and announces politely", () => {
    const { getByLabelText, container } = render(() => (
      <NotificationCenter items={[]} busy />
    ));
    expect(getByLabelText("Notifications").getAttribute("aria-busy")).toBe(
      "true",
    );
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(container.querySelector(".jtf-icon--spinning")).toBeTruthy();
  });
});
