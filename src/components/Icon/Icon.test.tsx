import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Icon, ICON_GROUPS, ICON_PATHS } from "./Icon";

describe("Icon download glyph", () => {
  it("renders an svg path for the download icon", () => {
    const { container } = render(() => <Icon name="download" />);
    const path = container.querySelector("svg path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")).toBeTruthy();
  });
});

describe("Icon bell glyph", () => {
  it("is registered in ICON_PATHS with outline + solid", () => {
    expect(ICON_PATHS.bell).toBeDefined();
    expect(ICON_PATHS.bell.outline).toContain("<path");
    expect(ICON_PATHS.bell.solid).toContain("<path");
  });
  it("renders a bell icon with the name as aria-label", () => {
    const { container } = render(() => <Icon name="bell" />);
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("bell");
    expect(el?.querySelector("svg")).toBeTruthy();
  });
});

// The gallery renders ICON_GROUPS, not ICON_PATHS, so an icon absent from every
// group exists in the API but is invisible on the teaching surface — nobody can
// discover it, and a reviewer comparing a new glyph against it cannot see it
// either. `edit` and `trash` shipped that way until 2026-07-27.
describe("ICON_GROUPS covers every icon", () => {
  const grouped = Object.values(ICON_GROUPS).flat() as string[];

  it("shows every ICON_PATHS entry in some group", () => {
    const ungrouped = Object.keys(ICON_PATHS).filter(
      (name) => !grouped.includes(name),
    );
    expect(ungrouped).toEqual([]);
  });

  it("lists no icon in two groups, and none twice", () => {
    expect(grouped.length).toBe(new Set(grouped).size);
  });

  it("lists no group entry that has no path", () => {
    const orphans = grouped.filter((name) => !(name in ICON_PATHS));
    expect(orphans).toEqual([]);
  });
});

describe("Icon edit glyph", () => {
  it("renders, and is reachable from the gallery's actions group", () => {
    expect(ICON_GROUPS.actions).toContain("edit");
    const { container } = render(() => <Icon name="edit" />);
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("edit");
    expect(el?.querySelector("svg path")?.getAttribute("d")).toBeTruthy();
  });
});
