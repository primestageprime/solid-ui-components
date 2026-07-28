import { describe, it, expect } from "vitest";
import { bucketItems } from "./bucketing";

interface Item {
  id: string;
  bucket: string;
}

const keyOf = (i: Item) => i.id;
const bucketOf = (i: Item) => i.bucket;
const BUCKETS = ["a", "b", "c"];

describe("bucketItems", () => {
  it("returns an entry for every bucket, including empty ones", () => {
    const { byBucket } = bucketItems([{ id: "1", bucket: "a" }], BUCKETS, bucketOf, keyOf);
    expect([...byBucket.keys()]).toEqual(["a", "b", "c"]);
    expect(byBucket.get("b")).toEqual([]);
  });

  it("preserves `items` order within a bucket", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "2", bucket: "b" },
      { id: "3", bucket: "a" },
    ];
    const { byBucket } = bucketItems(items, BUCKETS, bucketOf, keyOf);
    expect(byBucket.get("a")?.map(keyOf)).toEqual(["1", "3"]);
  });

  it("maps each item key to the bucket it landed in", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "2", bucket: "c" },
    ];
    const { bucketByKey } = bucketItems(items, BUCKETS, bucketOf, keyOf);
    expect(bucketByKey.get("1")).toBe("a");
    expect(bucketByKey.get("2")).toBe("c");
  });

  it("drops an item whose bucket matches no bucket, and omits it from bucketByKey", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "ghost", bucket: "nope" },
    ];
    const { byBucket, bucketByKey } = bucketItems(items, BUCKETS, bucketOf, keyOf);
    expect([...byBucket.values()].flat().map(keyOf)).toEqual(["1"]);
    expect(bucketByKey.has("ghost")).toBe(false);
  });

  it("returns empty structures for empty input", () => {
    const { byBucket, bucketByKey } = bucketItems([], BUCKETS, bucketOf, keyOf);
    expect([...byBucket.values()].flat()).toEqual([]);
    expect(bucketByKey.size).toBe(0);
  });
});
