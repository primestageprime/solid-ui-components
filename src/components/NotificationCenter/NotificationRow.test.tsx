import { describe, it, expect, vi, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { render, fireEvent, cleanup, screen } from "@solidjs/testing-library";
import { NotificationCenter } from "./index";
import { resolveActions, closesPanel } from "./actions";
import type { NotificationItem } from "./types";

// The panel portals to document.body, so row queries go to the body via
// `screen`/`document.body`, not the render container — the same convention
// NotificationCenter.test.tsx follows.
afterEach(cleanup);

const item = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "n1",
  title: "Build finished",
  ...over,
});
const buttons = () =>
  Array.from(document.body.querySelectorAll("button.sui-btn"));
const anchors = () => Array.from(document.body.querySelectorAll("a.link"));

describe("action resolution", () => {
  it("prefers `actions` over the deprecated singular `action`", () => {
    const legacy = { label: "Legacy" };
    const a = { label: "A", onClick: () => {} };
    expect(resolveActions(item({ action: legacy }))).toEqual([legacy]);
    expect(resolveActions(item({ actions: [a], action: legacy }))).toEqual([a]);
    expect(resolveActions(item())).toEqual([]);
  });
});

describe("panel-close resolution", () => {
  it("navigating actions close; handler-bearing in-place actions do not", () => {
    expect(closesPanel({ label: "V", href: "/x" })).toBe(true);
    expect(closesPanel({ label: "D", onClick: () => {} })).toBe(false);
  });
  it("a handler-less, href-less action closes — deprecated-shape parity", () => {
    expect(closesPanel({ label: "Legacy" })).toBe(true);
  });
  it("an explicit dismissPanel wins in both directions", () => {
    expect(closesPanel({ label: "V", href: "/x", dismissPanel: false })).toBe(
      false,
    );
    expect(
      closesPanel({ label: "D", onClick: () => {}, dismissPanel: true }),
    ).toBe(true);
  });
});

describe("action rendering", () => {
  it("renders one control per action, in order", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "One", onClick: () => {} },
              { label: "Two", onClick: () => {} },
              { label: "Three", onClick: () => {} },
            ],
          }),
        ]}
        open
      />
    ));
    expect(buttons().map((b) => b.textContent)).toEqual(["One", "Two", "Three"]);
  });

  it("renders href actions as anchors with the → suffix, others without it", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "View", href: "/x" },
              { label: "Dismiss", onClick: () => {} },
            ],
          }),
        ]}
        open
      />
    ));
    expect(anchors()[0]?.textContent).toBe("View →");
    expect(buttons()[0]?.textContent).toBe("Dismiss");
  });

  it("maps each tone onto the Button tone class", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "A", onClick: () => {} },
              { label: "M", onClick: () => {}, tone: "muted" },
              { label: "D", onClick: () => {}, tone: "danger" },
            ],
          }),
        ]}
        open
      />
    ));
    // No explicit tone → accent, so the CTA and the anchor branch agree.
    expect(buttons()[0]?.classList.contains("sui-btn--tone-accent")).toBe(true);
    expect(buttons()[1]?.classList.contains("sui-btn--tone-muted")).toBe(true);
    expect(buttons()[2]?.classList.contains("sui-btn--tone-danger")).toBe(true);
  });

  it("renders a disabled action as a disabled button even when href is set", () => {
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[
          item({ actions: [{ label: "View", href: "/x", disabled: true }] }),
        ]}
        open
        onAction={onAction}
      />
    ));
    expect(anchors().length).toBe(0);
    const btn = buttons()[0] as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders no actions on a transient row", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            transient: true,
            actions: [{ label: "Nope", onClick: () => {} }],
          }),
        ]}
        open
      />
    ));
    expect(buttons().length).toBe(0);
  });
});

describe("action activation", () => {
  it("fires the action's own onClick and NOT the row-level onAction", () => {
    const onClick = vi.fn();
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "Go", onClick }] })]}
        open
        onAction={onAction}
      />
    ));
    fireEvent.click(buttons()[0]);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("falls back to onAction when the action carries no onClick", () => {
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "Legacy" }] })]}
        open
        onAction={onAction}
      />
    ));
    fireEvent.click(buttons()[0]);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("keeps the panel open after an in-place action, closes after a navigating one", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            actions: [
              { label: "Dismiss", onClick: () => {} },
              { label: "View", href: "/x" },
            ],
          }),
        ]}
      />
    ));
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(buttons()[0]);
    expect(document.body.textContent).toContain("Dismiss");
    fireEvent.click(anchors()[0]);
    expect(document.body.textContent).not.toContain("Dismiss");
  });

  it("ignores modifier-clicks on an anchor so new-tab gestures survive", () => {
    const onAction = vi.fn();
    render(() => (
      <NotificationCenter
        items={[item({ actions: [{ label: "View", href: "/x" }] })]}
        open
        onAction={onAction}
      />
    ));
    fireEvent.click(anchors()[0], { metaKey: true });
    expect(onAction).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("View");
  });
});

describe("body slot", () => {
  it("renders arbitrary content between the detail line and the action row", () => {
    render(() => (
      <NotificationCenter
        items={[
          item({
            detail: "Sector 7",
            body: () => <progress data-testid="bar" value={0.8} />,
            actions: [{ label: "View", href: "/x" }],
          }),
        ]}
        open
      />
    ));
    const row = document.body.querySelector(".sui-notification-center__row");
    const bar = document.body.querySelector("[data-testid='bar']");
    expect(bar).toBeTruthy();
    const order = Array.from(row?.querySelectorAll("*") ?? []);
    expect(order.indexOf(bar as Element)).toBeGreaterThan(
      order.indexOf(screen.getByText("Sector 7")),
    );
    expect(order.indexOf(bar as Element)).toBeLessThan(
      order.indexOf(document.body.querySelector("a.link") as Element),
    );
  });

  it("is not invoked for items that do not define it", () => {
    const body = vi.fn(() => <span>never</span>);
    render(() => (
      <NotificationCenter
        items={[item({ id: "a" }), item({ id: "b", body })]}
        open
      />
    ));
    expect(body).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("never");
  });

  it("tracks a signal read inside the thunk", () => {
    // This is the whole justification for a thunk over `string | JSX.Element`:
    // construction is deferred into the row's reactive scope.
    const [pct, setPct] = createSignal(10);
    render(() => (
      <NotificationCenter
        items={[item({ body: () => <span>{pct()}%</span> })]}
        open
      />
    ));
    expect(document.body.textContent).toContain("10%");
    setPct(90);
    expect(document.body.textContent).toContain("90%");
  });
});
