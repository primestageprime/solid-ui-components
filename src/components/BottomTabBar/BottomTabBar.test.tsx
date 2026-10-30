import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { BottomTabBar, createBottomTabBar } from ".";

const items = [
  { href: "/", label: "Home", icon: "M3 11l9-7 9 7" },
  { href: "/books", label: "Books" },
];

describe("BottomTabBar", () => {
  it("renders one link per tab inside a named nav, marking the active one", () => {
    const { getByRole, getAllByRole } = render(() => (
      <BottomTabBar items={items} active="/books" />
    ));
    expect(getByRole("navigation").getAttribute("aria-label")).toBe("Sections");
    const links = getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/", "/books"]);
    expect(links[1].getAttribute("aria-current")).toBe("page");
    expect(links[0].hasAttribute("aria-current")).toBe(false);
    expect(links[0].querySelector("path")?.getAttribute("d")).toBe(
      "M3 11l9-7 9 7",
    );
    expect(links[1].querySelector("svg")).toBeNull();
  });

  it("createBottomTabBar bakes the landmark name", () => {
    const Bar = createBottomTabBar({ label: "Main" });
    const { getByRole } = render(() => <Bar items={items} />);
    expect(getByRole("navigation").getAttribute("aria-label")).toBe("Main");
  });
});
