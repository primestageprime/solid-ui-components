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

// Three round-ish marks now share the set, so each needs its own silhouette at
// 16px. `refresh` keeps TWO arrowheads and reads as a repeating cycle. `reset`
// draws ONE head on a near-closed ring and reads as a return to the start.
// `undo` draws no ring at all: an open hook with the head at its left end.
describe("Icon undo glyph", () => {
  it("is registered in ICON_PATHS with outline + solid", () => {
    expect(ICON_PATHS.undo).toBeDefined();
    expect(ICON_PATHS.undo.outline).toContain("<path");
    expect(ICON_PATHS.undo.solid).toContain("<path");
  });

  it("renders in both variants, and is reachable from the gallery's actions group", () => {
    expect(ICON_GROUPS.actions).toContain("undo");
    const variants = ["outline", "solid"] as const;
    variants.forEach((variant) => {
      const { container } = render(() => (
        <Icon name="undo" variant={variant} />
      ));
      const el = container.querySelector('[role="img"]');
      expect(el?.getAttribute("aria-label")).toBe("undo");
      expect(el?.querySelector("svg path")?.getAttribute("d")).toBeTruthy();
    });
  });

  // One arc command draws the hook's bend. A second would close the shape into
  // a ring, which is what `refresh` and `reset` already own.
  it("draws an open hook, not a ring", () => {
    const variants = ["outline", "solid"] as const;
    variants.forEach((variant) => {
      expect((ICON_PATHS.undo[variant].match(/A/g) ?? []).length).toBe(1);
      expect(ICON_PATHS.undo[variant]).not.toContain("<circle");
    });
  });
});

describe("Icon reset glyph", () => {
  it("is registered in ICON_PATHS with outline + solid", () => {
    expect(ICON_PATHS.reset).toBeDefined();
    expect(ICON_PATHS.reset.outline).toContain("<path");
    expect(ICON_PATHS.reset.solid).toContain("<path");
  });

  it("renders in both variants, and is reachable from the gallery's actions group", () => {
    expect(ICON_GROUPS.actions).toContain("reset");
    const variants = ["outline", "solid"] as const;
    variants.forEach((variant) => {
      const { container } = render(() => (
        <Icon name="reset" variant={variant} />
      ));
      const el = container.querySelector('[role="img"]');
      expect(el?.getAttribute("aria-label")).toBe("reset");
      expect(el?.querySelector("svg path")?.getAttribute("d")).toBeTruthy();
    });
  });

  // `refresh` splits its ring over two arcs and caps each one with a head, so
  // it carries two of each. `reset` carries one arc and one head. The counts
  // are what hold the two silhouettes apart.
  it("draws one arc and one head, where refresh draws two of each", () => {
    const variants = ["outline", "solid"] as const;
    variants.forEach((variant) => {
      const paths = ICON_PATHS.reset[variant].match(/<path/g) ?? [];
      expect(paths.length).toBe(2);
      expect((ICON_PATHS.reset[variant].match(/A/g) ?? []).length).toBe(1);
      expect((ICON_PATHS.refresh[variant].match(/a5\.5 5\.5/g) ?? []).length).toBe(
        2,
      );
    });
  });
});

// `undo` and `reset` must not redraw `refresh`. This locks the two arcs both
// variants carried before the pair was added.
describe("Icon refresh glyph keeps its drawing", () => {
  const CYCLE =
    "M2.5 8a5.5 5.5 0 0 1 9.5-3.75V2M13.5 8a5.5 5.5 0 0 1-9.5 3.75V14";
  const HEADS = "M12 2v2.5h-2.5M4 14v-2.5h2.5";

  it("still draws two arcs and two heads in both variants", () => {
    const variants = ["outline", "solid"] as const;
    variants.forEach((variant) => {
      expect(ICON_PATHS.refresh[variant]).toContain(CYCLE);
      expect(ICON_PATHS.refresh[variant]).toContain(HEADS);
    });
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

// `zoom-in` and `zoom-out` extend the `search` family: the same lens and the
// same handle, plus a mark inside the lens. The solid variant fills the lens
// and punches the mark out in the page background colour, which is how `search`
// draws its own hole.
describe("Icon zoom glyphs", () => {
  const names = ["zoom-in", "zoom-out"] as const;

  it("registers both names in the actions group", () => {
    const missing = names.filter(
      (name) => !(ICON_GROUPS.actions as readonly string[]).includes(name),
    );
    expect(missing).toEqual([]);
  });

  it("renders an svg in both variants", () => {
    const cases = names.flatMap((name) =>
      (["outline", "solid"] as const).map((variant) => ({ name, variant })),
    );
    cases.forEach(({ name, variant }) => {
      const { container } = render(() => (
        <Icon name={name} variant={variant} />
      ));
      const el = container.querySelector('[role="img"]');
      expect(el?.getAttribute("aria-label")).toBe(name);
      expect(el?.querySelector("svg path")?.getAttribute("d")).toBeTruthy();
    });
  });

  it("repeats the search lens and handle in the outline variant", () => {
    names.forEach((name) => {
      expect(ICON_PATHS[name].outline).toContain(
        `<circle cx="7" cy="7" r="4.5"`,
      );
      expect(ICON_PATHS[name].outline).toContain(`d="M10.5 10.5L14 14"`);
    });
  });

  it("knocks the mark out of a filled lens in the solid variant", () => {
    names.forEach((name) => {
      expect(ICON_PATHS[name].solid).toContain(
        `<circle cx="7" cy="7" r="5" fill="currentColor"/>`,
      );
      expect(ICON_PATHS[name].solid).toContain(`var(--sui-bg-primary)`);
    });
  });

  it("draws a cross for zoom-in and one bar for zoom-out", () => {
    expect(ICON_PATHS["zoom-in"].outline).toContain("M7 4.75V9.25M4.75 7H9.25");
    expect(ICON_PATHS["zoom-out"].outline).toContain(`d="M4.75 7H9.25"`);
    expect(ICON_PATHS["zoom-out"].outline).not.toContain("V9.25");
  });
});
