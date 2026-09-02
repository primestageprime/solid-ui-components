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

// `settings` draws eight rays from a hub, which reads as a sun. `gear` draws
// teeth on a rim, which is how a reader finds a gear. The two glyphs stay
// separate: `gear` is a new name, so every existing `settings` call site keeps
// the drawing it already has.
describe("Icon gear glyph", () => {
  it("is registered in ICON_PATHS with outline + solid", () => {
    expect(ICON_PATHS.gear).toBeDefined();
    expect(ICON_PATHS.gear.outline).toContain("<path");
    expect(ICON_PATHS.gear.solid).toContain("<path");
  });

  it("renders in both variants, and is reachable from the gallery's ui group", () => {
    expect(ICON_GROUPS.ui).toContain("gear");
    const variants = ["outline", "solid"] as const;
    variants.forEach((variant) => {
      const { container } = render(() => (
        <Icon name="gear" variant={variant} />
      ));
      const el = container.querySelector('[role="img"]');
      expect(el?.getAttribute("aria-label")).toBe("gear");
      expect(el?.querySelector("svg path")?.getAttribute("d")).toBeTruthy();
    });
  });

  // The rim path repeats one tooth six times at 60° steps. Each repeat draws
  // two tip arcs' worth of commands, so the arc count is what proves the teeth
  // are on the rim and not rays leaving a hub.
  it("draws a toothed rim and a hub hole, not rays", () => {
    const countArcs = (svg: string) => (svg.match(/A/g) ?? []).length;
    expect(countArcs(ICON_PATHS.gear.outline)).toBe(12);
    expect(countArcs(ICON_PATHS.gear.solid)).toBe(12);
    expect(ICON_PATHS.gear.outline).toContain("<circle");
    expect(ICON_PATHS.gear.solid).toContain("<circle");
  });
});

// `gear` must not redraw `settings`. This locks the ray path both variants
// carried before `gear` was added.
describe("Icon settings glyph keeps its drawing", () => {
  const RAYS =
    "M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5l1.5 1.5M3 13l1.5-1.5M11.5 4.5l1.5-1.5";

  it("still draws a 2.5-radius hub with eight rays in outline", () => {
    expect(ICON_PATHS.settings.outline).toContain(
      `<circle cx="8" cy="8" r="2.5"`,
    );
    expect(ICON_PATHS.settings.outline).toContain(RAYS);
  });

  it("still draws a 3-radius hub with eight rays in solid", () => {
    expect(ICON_PATHS.settings.solid).toContain(`<circle cx="8" cy="8" r="3"`);
    expect(ICON_PATHS.settings.solid).toContain(RAYS);
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
