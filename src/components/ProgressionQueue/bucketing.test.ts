import { describe, it, expect } from "vitest";
import { bucketItems } from "./bucketing";

interface Item {
  id: string;
  bucket: string;
}

const keyOf = (i: Item) => i.id;
const bucketOf = (i: Item) => i.bucket;
const SECTIONS = ["a", "b", "c"];

describe("bucketItems", () => {
  it("returns an entry for every section, including empty ones", () => {
    const { bySection } = bucketItems([{ id: "1", bucket: "a" }], SECTIONS, bucketOf, keyOf);
    expect([...bySection.keys()]).toEqual(["a", "b", "c"]);
    expect(bySection.get("b")).toEqual([]);
  });

  it("preserves `items` order within a section", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "2", bucket: "b" },
      { id: "3", bucket: "a" },
    ];
    const { bySection } = bucketItems(items, SECTIONS, bucketOf, keyOf);
    expect(bySection.get("a")?.map(keyOf)).toEqual(["1", "3"]);
  });

  it("maps each item key to the section it landed in", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "2", bucket: "c" },
    ];
    const { sectionOf } = bucketItems(items, SECTIONS, bucketOf, keyOf);
    expect(sectionOf.get("1")).toBe("a");
    expect(sectionOf.get("2")).toBe("c");
  });

  it("drops an item whose bucket matches no section, and omits it from sectionOf", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "ghost", bucket: "nope" },
    ];
    const { bySection, sectionOf } = bucketItems(items, SECTIONS, bucketOf, keyOf);
    expect([...bySection.values()].flat().map(keyOf)).toEqual(["1"]);
    expect(sectionOf.has("ghost")).toBe(false);
  });

  it("returns empty structures for empty input", () => {
    const { bySection, sectionOf } = bucketItems([], SECTIONS, bucketOf, keyOf);
    expect([...bySection.values()].flat()).toEqual([]);
    expect(sectionOf.size).toBe(0);
  });
});
