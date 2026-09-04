import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { OverflowNav, createOverflowNav } from "./OverflowNav";

// jsdom reports offsetWidth=0 / clientWidth=0, so the overflow math bails out
// (containerWidth <= 0) and every item stays rendered inline — no kebab. That
// is exactly what lets us assert on the inline NavLinks here.

describe("OverflowNav", () => {
  it("renders every item inline as a nav-link", () => {
    const { container } = render(() => (
      <OverflowNav
        items={[
          { id: "a", label: "Alpha", href: "/a" },
          { id: "b", label: "Beta", href: "/b" },
        ]}
      />
    ));
    const links = container.querySelectorAll("a.nav-link");
    expect(links.length).toBe(2);
    expect(links[0].textContent).toContain("Alpha");
    expect(links[1].textContent).toContain("Beta");
  });

  it("forwards active/color/badge onto the inline NavLink", () => {
    const { container } = render(() => (
      <OverflowNav
        items={[
          { id: "a", label: "Alpha", active: true, color: "success", badge: 3 },
        ]}
      />
    ));
    const a = container.querySelector("a.nav-link")!;
    expect(a.classList.contains("nav-link--active")).toBe(true);
    expect(a.classList.contains("nav-link--success")).toBe(true);
    expect(container.querySelector(".nav-link__badge")!.textContent).toBe("3");
  });

  it("fires an item's onClick when its inline link is clicked", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <OverflowNav items={[{ id: "a", label: "Alpha", onClick }]} />
    ));
    fireEvent.click(container.querySelector("a.nav-link")!);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("createOverflowNav produces a curried variant that renders items", () => {
    const Nav = createOverflowNav({ gap: "xs" });
    const { container } = render(() => (
      <Nav items={[{ id: "a", label: "Solo" }]} />
    ));
    expect(container.querySelector("a.nav-link")!.textContent).toContain(
      "Solo",
    );
  });
});

// The overflow path needs real geometry. jsdom reports every layout box as 0,
// so these tests stub the two getters the measurement reads and restore them
// afterwards.
const stubGetter = (
  target: object,
  key: string,
  value: number,
): (() => void) => {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, get: () => value });
  return () => {
    original
      ? Object.defineProperty(target, key, original)
      : Reflect.deleteProperty(target, key);
  };
};

/** Resolves after `count` animation frames — the measure pass runs on rAF. */
const afterFrames = (count: number): Promise<void> =>
  new Promise((resolve) => {
    const step = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
  });

describe("OverflowNav spill", () => {
  // Container 100px, each item 80px → nothing fits beside the kebab reserve.
  const restore: Array<() => void> = [];
  afterEach(() => {
    cleanup();
    restore.splice(0).forEach((undo) => {
      undo();
    });
  });

  const renderNarrow = () => {
    restore.push(stubGetter(Element.prototype, "clientWidth", 100));
    restore.push(stubGetter(HTMLElement.prototype, "offsetWidth", 80));
    return render(() => (
      <OverflowNav
        items={[
          { id: "a", label: "Alpha", href: "/a" },
          { id: "b", label: "Beta", href: "/b", active: true },
        ]}
      />
    ));
  };

  it("carries an active spilled item into the popover as active", async () => {
    const { container } = renderNarrow();
    await afterFrames(3);

    const trigger = container.querySelector(".sui-popover-menu__trigger");
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!);

    const items = Array.from(
      document.body.querySelectorAll(".sui-popover-menu__item"),
    );
    expect(items.map((el) => el.textContent)).toEqual(["Alpha", "Beta"]);

    const beta = items[1];
    expect(beta.classList.contains("sui-popover-menu__item--active")).toBe(
      true,
    );
    expect(beta.getAttribute("aria-current")).toBe("true");
    expect(items[0].hasAttribute("aria-current")).toBe(false);
  });
});
