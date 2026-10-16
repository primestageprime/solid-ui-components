import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { AppBar, APP_BAR_FOLD_QUERY, appBarNavItems } from "./AppBar";

afterEach(cleanup);

const NAV = {
  items: [
    { id: "tasks", label: "Tasks" },
    { id: "retro", label: "Retrospective" },
  ],
  activeId: "tasks",
};
const USER = {
  user: { name: "Ada Lovelace", email: "ada@example.com" },
  onSignIn: () => {},
  onSignOut: () => {},
};

/** Swap jsdom's always-false matchMedia for one that matches `query` only. */
const withMatchingQuery = (query: string): (() => void) => {
  const original = window.matchMedia;
  window.matchMedia = ((q: string) =>
    ({
      matches: q === query,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
};

describe("appBarNavItems", () => {
  it("marks the active id and routes a click to onSelect", () => {
    const onSelect = vi.fn();
    const items = appBarNavItems({ ...NAV, onSelect });
    expect(items.map((i) => i.active)).toEqual([true, false]);
    items[1].onClick?.();
    expect(onSelect).toHaveBeenCalledWith("retro");
  });
});

describe("AppBar", () => {
  it("renders logo | centred nav | status + user in a 160px-start three-slot row", () => {
    const { container } = render(() => (
      <AppBar
        logo={<span>Taskmaster</span>}
        nav={{ ...NAV, onSelect: () => {} }}
        status={<span data-testid="status">3 open</span>}
        user={USER}
      />
    ));
    const frame = container.querySelector<HTMLElement>("[data-three-slot-row]")!;
    expect(frame.style.gridTemplateColumns).toBe("160px minmax(0, 1fr) auto");
    const slot = (name: string) =>
      container.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
    expect(slot("start").textContent).toBe("Taskmaster");
    expect(slot("center").textContent).toContain("Tasks");
    expect(slot("center").querySelector(".row--justify-center")).not.toBeNull();
    expect(slot("end").querySelector('[data-testid="status"]')).not.toBeNull();
    expect(slot("end").textContent).toContain("AL");
    expect(container.querySelector("header.app-header")).not.toBeNull();
  });

  it("passes a change in user through to the menu after mount (sign out → Sign in)", () => {
    const [user, setUser] = createSignal<typeof USER.user | undefined>(USER.user);
    const { container } = render(() => (
      <AppBar
        logo="Logo"
        nav={{ ...NAV, onSelect: () => {} }}
        user={{ user: user(), onSignIn: () => {}, onSignOut: () => {} }}
      />
    ));
    const menuTrigger = () =>
      container.querySelector<HTMLElement>('[data-slot="end"] .sui-popover-menu__trigger')!;
    expect(menuTrigger().textContent).toContain("AL");
    setUser(undefined);
    expect(menuTrigger().textContent).toContain("?");
    fireEvent.click(menuTrigger());
    expect(document.body.textContent).toContain("Not signed in");
    expect(document.body.textContent).toContain("Sign in");
  });

  it("reports a nav click through nav.onSelect", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <AppBar logo="Logo" nav={{ ...NAV, onSelect }} user={USER} />
    ));
    const link = [...container.querySelectorAll("a")].find(
      (a) => a.textContent === "Retrospective",
    )!;
    fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledWith("retro");
  });

  it(`below 480px the status leaves the bar for the user menu's header`, () => {
    const restore = withMatchingQuery(APP_BAR_FOLD_QUERY);
    try {
      const { container } = render(() => (
        <AppBar
          logo="Logo"
          nav={{ ...NAV, onSelect: () => {} }}
          status={<span data-testid="status">3 open</span>}
          user={USER}
        />
      ));
      expect(container.querySelector('[data-testid="status"]')).toBeNull();
      fireEvent.click(container.querySelector(".sui-popover-menu__trigger")!);
      expect(document.body.querySelector('[data-testid="status"]')?.textContent).toBe(
        "3 open",
      );
    } finally {
      restore();
    }
  });
});
