import { describe, it, expect } from "vitest";
import { bucketOf, CENSUS_BUCKETS } from "./censusModel";
import type { CensusTable } from "./censusModel";

const base: CensusTable = {
  key: "t", entity: "T", fieldCount: 3, sourceRows: 50,
  localRows: 0, status: "todo",
};

describe("bucketOf", () => {
  it("status buckets win over size buckets", () => {
    expect(bucketOf({ ...base, status: "noaccess" })).toBe("noaccess");
    expect(bucketOf({ ...base, status: "error" })).toBe("noaccess");
    expect(bucketOf({ ...base, status: "empty" })).toBe("empty");
    expect(bucketOf({ ...base, sourceRows: 0 })).toBe("empty");
  });
  it("uncounted/truncated goes to deep", () => {
    expect(bucketOf({ ...base, sourceRows: null })).toBe("deep");
    expect(bucketOf({ ...base, truncated: true })).toBe("deep");
  });
  it("size tiers", () => {
    expect(bucketOf({ ...base, sourceRows: 1 })).toBe("single");
    expect(bucketOf({ ...base, sourceRows: 99 })).toBe("lt100");
    expect(bucketOf({ ...base, sourceRows: 99_999 })).toBe("lt100k");
    expect(bucketOf({ ...base, sourceRows: 999_999 })).toBe("lt1m");
    expect(bucketOf({ ...base, sourceRows: 1_000_000 })).toBe("gte1m");
  });
  it("bucket registry covers every id bucketOf can return", () => {
    const ids = new Set(CENSUS_BUCKETS.map((b) => b.id));
    for (const id of ["single","lt100","lt100k","lt1m","gte1m","deep","empty","noaccess"])
      expect(ids.has(id as never)).toBe(true);
  });
});
