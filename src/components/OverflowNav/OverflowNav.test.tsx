import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { OverflowNav, createOverflowNav } from "./OverflowNav";
import { type FakeSizer, installFakeSizer } from "../../test-utils/fakeSizer";

// jsdom reports offsetWidth=0 / clientWidth=0: every item measures 0, which
// the fold reads as "no layout" and keeps every item rendered inline — no
// kebab. That is exactly what lets us assert on the inline NavLinks here.

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

describe("OverflowNav closable items", () => {
  afterEach(() => cleanup());

  it("renders a close button only on closable items, and reports the id", () => {
    const onClose = vi.fn();
    const onClick = vi.fn();
    const { container } = render(() => (
      <OverflowNav
        onClose={onClose}
        items={[
          { id: "a", label: "Alpha", href: "/a" },
          { id: "b", label: "Beta", href: "/b", closable: true, onClick },
        ]}
      />
    ));
    const closes = container.querySelectorAll("button[aria-label^='Close']");
    expect(closes.length).toBe(1);
    expect(closes[0].getAttribute("aria-label")).toBe("Close Beta");
    fireEvent.click(closes[0]);
    expect(onClose).toHaveBeenCalledWith("b");
    // Closing is not a navigation.
    expect(onClick).not.toHaveBeenCalled();
    // The link itself still renders and stays clickable.
    expect(container.querySelectorAll("a.nav-link").length).toBe(2);
  });

  it("shows no close button when onClose is absent", () => {
    const { container } = render(() => (
      <OverflowNav items={[{ id: "b", label: "Beta", closable: true }]} />
    ));
    expect(container.querySelector("button[aria-label^='Close']")).toBeNull();
  });
});

describe("OverflowNav explicit overflow list", () => {
  afterEach(() => cleanup());

  it("puts overflowItems in the kebab even when every inline item fits", () => {
    const onPick = vi.fn();
    const { container } = render(() => (
      <OverflowNav
        items={[{ id: "a", label: "Alpha", href: "/a" }]}
        overflowItems={[
          { id: "x", label: "Configure", onClick: () => onPick("x") },
          { id: "y", label: "Import", active: true, onClick: () => onPick("y") },
        ]}
      />
    ));
    // Inline strip holds only the real items.
    const inline = Array.from(container.querySelectorAll("a.nav-link"));
    expect(inline.map((a) => a.textContent)).toEqual(["Alpha"]);

    const trigger = container.querySelector(".sui-popover-menu__trigger");
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!);
    const rows = Array.from(
      document.body.querySelectorAll(".sui-popover-menu__item"),
    );
    expect(rows.map((el) => el.textContent)).toEqual(["Configure", "Import"]);
    expect(rows[1].classList.contains("sui-popover-menu__item--active")).toBe(
      true,
    );
    fireEvent.click(rows[1]);
    expect(onPick).toHaveBeenCalledWith("y");
  });

  it("renders no kebab when overflowItems is empty and nothing spills", () => {
    const { container } = render(() => (
      <OverflowNav items={[{ id: "a", label: "Alpha" }]} overflowItems={[]} />
    ));
    expect(container.querySelector(".sui-popover-menu__trigger")).toBeNull();
  });
});

// G16: the fold must follow the container on every resize, with natural
// widths RE-measured (not the ones cached at mount), and a 0px container must
// fold everything instead of bailing.
describe("OverflowNav re-folds on resize (G16)", () => {
  const restore: Array<() => void> = [];
  let sizer: FakeSizer;
  let containerWidth = 0;
  let itemWidth = 0;
  afterEach(() => {
    cleanup();
    sizer.restore();
    restore.splice(0).forEach((undo) => {
      undo();
    });
  });

  const mount = () => {
    sizer = installFakeSizer();
    const live = (target: object, key: string, read: () => number) => {
      const original = Object.getOwnPropertyDescriptor(target, key);
      Object.defineProperty(target, key, { configurable: true, get: read });
      restore.push(() => {
        original
          ? Object.defineProperty(target, key, original)
          : Reflect.deleteProperty(target, key);
      });
    };
    live(Element.prototype, "clientWidth", () => containerWidth);
    live(HTMLElement.prototype, "offsetWidth", () => itemWidth);
    return render(() => (
      <OverflowNav
        items={[
          { id: "a", label: "Alpha", href: "/a" },
          { id: "b", label: "Beta", href: "/b" },
          { id: "c", label: "Gamma", href: "/c" },
        ]}
      />
    ));
  };
  const inline = (container: HTMLElement) =>
    container.querySelectorAll("a.nav-link").length;
  const kebab = (container: HTMLElement) =>
    container.querySelector(".sui-popover-menu__trigger");

  it("re-measures on resize: widths that were 0 at mount no longer read as 'fits'", async () => {
    // Mounted before layout/fonts settled: items measured 0.
    containerWidth = 800;
    itemWidth = 0;
    const { container } = mount();
    await afterFrames(3);
    expect(inline(container)).toBe(3);
    // The real widths arrive, and the nav narrows to 223px (thorcasting at 800).
    itemWidth = 130;
    containerWidth = 223;
    await sizer.resizeAll({ width: 223, height: 30 });
    await afterFrames(3);
    expect(inline(container)).toBe(1);
    expect(kebab(container)).not.toBeNull();
    // Widening back restores every item inline.
    containerWidth = 1440;
    await sizer.resizeAll({ width: 1440, height: 30 });
    await afterFrames(3);
    expect(inline(container)).toBe(3);
    expect(kebab(container)).toBeNull();
  });

  it("a 0px container folds every item into the kebab", async () => {
    containerWidth = 0;
    itemWidth = 130;
    const { container } = mount();
    await afterFrames(3);
    expect(inline(container)).toBe(0);
    expect(kebab(container)).not.toBeNull();
  });
});
