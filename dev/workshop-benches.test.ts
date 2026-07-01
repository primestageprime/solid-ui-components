import { describe, it, expect } from "vitest";
import {
  slugToTitle,
  buildWorkshopItems,
  type BenchModule,
} from "./workshop-benches";

const stub = (): any => () => null; // stand-in Component

describe("slugToTitle", () => {
  it("title-cases a kebab slug", () => {
    expect(slugToTitle("scrub-chart")).toBe("Scrub Chart");
  });
  it("handles a single word", () => {
    expect(slugToTitle("fisheye")).toBe("Fisheye");
  });
});

describe("buildWorkshopItems", () => {
  it("maps each module to a workshop-tagged item with id workshop:<slug>", () => {
    const modules: Record<string, BenchModule> = {
      "./showcases/workshop/scrub-chart.tsx": { default: stub() },
    };
    const items = buildWorkshopItems(modules);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "workshop:scrub-chart",
      label: "Scrub Chart",
      tags: ["workshop"],
    });
    expect(typeof items[0].component).toBe("function");
  });

  it("prefers meta.label over the slug", () => {
    const modules: Record<string, BenchModule> = {
      "./showcases/workshop/sc.tsx": {
        default: stub(),
        meta: { label: "Scrub Chart" },
      },
    };
    expect(buildWorkshopItems(modules)[0].label).toBe("Scrub Chart");
  });

  it("sorts by meta.order then label", () => {
    const modules: Record<string, BenchModule> = {
      "./showcases/workshop/beta.tsx": { default: stub() },
      "./showcases/workshop/alpha.tsx": { default: stub() },
      "./showcases/workshop/first.tsx": {
        default: stub(),
        meta: { order: -1 },
      },
    };
    expect(buildWorkshopItems(modules).map((i) => i.id)).toEqual([
      "workshop:first",
      "workshop:alpha",
      "workshop:beta",
    ]);
  });
});
