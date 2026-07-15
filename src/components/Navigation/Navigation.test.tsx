import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { NavLink } from "./NavLink";
import { Link, NewTabLink } from "./Link";

describe("NavLink", () => {
  it("renders a base nav-link anchor with its label", () => {
    const { container } = render(() => <NavLink href="/x">Home</NavLink>);
    const a = container.querySelector("a.nav-link")!;
    expect(a.getAttribute("href")).toBe("/x");
    expect(a.textContent).toContain("Home");
    expect(a.classList.contains("nav-link--active")).toBe(false);
  });

  it("flips active and color modifier classes", () => {
    const { container } = render(() => (
      <NavLink active color="danger">
        Alerts
      </NavLink>
    ));
    const a = container.querySelector("a.nav-link")!;
    expect(a.classList.contains("nav-link--active")).toBe(true);
    expect(a.classList.contains("nav-link--danger")).toBe(true);
  });

  it("renders a badge span when badge is provided", () => {
    const { container } = render(() => <NavLink badge={5}>Inbox</NavLink>);
    expect(container.querySelector(".nav-link__badge")!.textContent).toBe("5");
  });

  it("fires onClick", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <NavLink onClick={onClick}>Go</NavLink>
    ));
    fireEvent.click(container.querySelector("a.nav-link")!);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("Link", () => {
  it("renders a plain link with appended class", () => {
    const { container } = render(() => (
      <Link href="/a" class="extra">
        A
      </Link>
    ));
    const a = container.querySelector("a.link")!;
    expect(a.classList.contains("extra")).toBe(true);
    expect(a.getAttribute("href")).toBe("/a");
  });

  it("NewTabLink opens in a new tab safely", () => {
    const { container } = render(() => <NewTabLink href="/a">A</NewTabLink>);
    const a = container.querySelector("a.link")!;
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
