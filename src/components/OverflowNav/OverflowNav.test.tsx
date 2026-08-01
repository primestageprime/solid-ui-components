import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
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
