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
    // where NavLink renders the label directly in an <a>).
    const label = screen.getByText("Review →");
    expect(label.closest("button")).toBeTruthy();
    expect(label.closest("a")).toBeNull();
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
  it("wraps each item in its own card surface (three-line card canon)", () => {
    render(() => (
      <NotificationCenter
        items={[task(), task({ id: "t2", title: "Second" })]}
        open
      />
    ));
    // Each item is a CompactSurface card; the shadowed .surface is the panel
    // (PopoverSurface), so the item cards are the non-shadow surfaces.
    const cards = document.body.querySelectorAll(
      ".surface:not(.surface--shadow)",
    );
    expect(cards.length).toBe(2);
    expect(screen.getByText("Set balance").closest(".surface")).toBe(cards[0]);
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
