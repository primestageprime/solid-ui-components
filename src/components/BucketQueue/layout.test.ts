import { describe, it, expect } from "vitest";
import { allocateHeights, naturalHeights, retainRowHeights } from "./layout";

// natural[i] models header(34) + count*row(54) + border(2); empty = 36.
const natural = (counts: number[]) => counts.map((c) => (c === 0 ? 36 : 34 + c * 54 + 2));
const weights = [1, 1, 2];

describe("allocateHeights — the progression water-fill", () => {
  it("collapses empty buckets to their summary line and populated ones shrink-wrap when they fit", () => {
    const counts = [4, 0, 0]; // one populated, two empty
    const out = allocateHeights({ natural: natural(counts), counts, weights, available: 900, gap: 8 });
    expect(out[0]).toBe(252); // 34 + 4*54 + 2 — shrink-wrapped to content
    expect(out[1]).toBe(36); // empty → summary line
    expect(out[2]).toBe(36);
  });

  it("all populated + fitting → each shrink-wraps (no stretch, leftover falls outside)", () => {
    const counts = [4, 3, 5];
    const out = allocateHeights({ natural: natural(counts), counts, weights, available: 900, gap: 8 });
    expect(out).toEqual([252, 198, 306]);
  });

  it("overflow → the populated buckets share the space 1:1:2", () => {
    const counts = [8, 8, 24]; // each overflows its share
    const available = 917;
    const out = allocateHeights({ natural: natural(counts), counts, weights, available, gap: 8 });
    // pool = 917 − 16 gap = 901; shares 1:1:2 → 225.25 / 225.25 / 450.5, all
    // under their content, so distributed as-is.
    expect(out[0]).toBeCloseTo(225.25, 1);
    expect(out[1]).toBeCloseTo(225.25, 1);
    expect(out[2]).toBeCloseTo(450.5, 1);
    expect(out[0] + out[1] + out[2]).toBeCloseTo(available - 16, 1);
  });

  it("a bucket that shrinks under its share hands the surplus to the others", () => {
    // transient has only 4 rows (content 252) — well under its 2-weight share;
    // the two heavy terminals (20 rows each) absorb the surplus 1:1.
    const counts = [20, 20, 4];
    const available = 1075;
    const out = allocateHeights({ natural: natural(counts), counts, weights, available, gap: 8 });
    expect(out[2]).toBe(252); // transient capped at its content
    expect(out[0]).toBeCloseTo(out[1], 0); // the two terminals split the rest evenly
    expect(out[0]).toBeGreaterThan(252);
  });
});

// `fill` — the opt-in that lets ONE bucket take the height nobody else wanted,
// instead of the queue shrink-wrapping and leaving a dead band above whatever
// is pinned under it. Purely additive: every test above declares no `fill` and
// must keep its exact result.
describe("allocateHeights — fill absorbs the leftover", () => {
  it("without fill, populated buckets that fit still leave the slack unallocated", () => {
    // Pinned deliberately: this is the documented shrink-wrap, and the fill
    // branch below must not quietly change it for consumers who never opt in.
    const counts = [4, 3];
    const available = 900;
    const out = allocateHeights({ natural: natural(counts), counts, weights, available, gap: 8 });
    expect(out).toEqual([252, 198]);
    expect(out[0] + out[1] + 8).toBeLessThan(available);
  });

  it("a fill bucket takes the remainder, to the pixel", () => {
    const counts = [4, 3];
    const available = 900;
    const out = allocateHeights({
      natural: natural(counts), counts, weights, available, gap: 8,
      fills: [false, true],
    });
    expect(out[0]).toBe(252); // unchanged — it does not fill
    expect(out[0] + out[1] + 8).toBeCloseTo(available, 6);
  });

  it("two fill buckets split the remainder by weight, not evenly", () => {
    const counts = [4, 3, 5];
    const available = 900;
    const out = allocateHeights({
      natural: natural(counts), counts, weights, available, gap: 8, // weights 1,1,2
      fills: [false, true, true],
    });
    const gained = [out[1] - 198, out[2] - 306];
    expect(gained[1]).toBeCloseTo(gained[0] * 2, 6);
    expect(out[0] + out[1] + out[2] + 16).toBeCloseTo(available, 6);
  });

  it("a filling bucket grows past its capRows — the cap refuses CONTENT, not slack", () => {
    // capRows is applied upstream (naturalHeights), so at this layer the cap
    // shows up as a natural smaller than the content. Filling must exceed it.
    const counts = [4, 20];
    const capped = [252, 34 + 3 * 54 + 2]; // second bucket held at capRows: 3
    const available = 900;
    const out = allocateHeights({
      natural: capped, counts, weights, available, gap: 8, fills: [false, true],
    });
    expect(out[1]).toBeGreaterThan(capped[1]);
    expect(out[0] + out[1] + 8).toBeCloseTo(available, 6);
  });

  it("an EMPTY fill bucket stays on its summary line and its populated sibling takes the slack", () => {
    // A filling-but-empty bucket would stretch a "nothing here" strip over half
    // the pane. Empty stays pinned; the space goes to a bucket with content.
    const counts = [0, 4];
    const available = 900;
    const out = allocateHeights({
      natural: natural(counts), counts, weights, available, gap: 8,
      fills: [true, true],
    });
    expect(out[0]).toBe(36);
    expect(out[0] + out[1] + 8).toBeCloseTo(available, 6);
  });

  it("leaves the slack unallocated when every fill bucket is empty", () => {
    const counts = [0, 4];
    const out = allocateHeights({
      natural: natural(counts), counts, weights, available: 900, gap: 8,
      fills: [true, false],
    });
    expect(out).toEqual([36, 252]);
  });

  it("changes nothing while the content overflows — there is no pool to hand out", () => {
    const counts = [8, 8, 24];
    const available = 917;
    const args = { natural: natural(counts), counts, weights, available, gap: 8 };
    expect(allocateHeights({ ...args, fills: [true, true, true] })).toEqual(
      allocateHeights(args),
    );
  });
});

// A queue whose buckets have genuinely DIFFERENT row heights — one bucket of
// one-line rows above a bucket of two-line rows. The reported case
// (thorcasting /configure): 2 balance rows at 31px above 19 config rows at
// 50px, header 32. Sampling a single row and applying it to every bucket sized
// Configs at 32 + 19×31 + 2 = 623 instead of 984, and the water-fill then had
// nothing left to hand out — the 138px dead band under the queue.
const MIXED = {
  capRows: [null, null],
  hasEmptyLabel: [false, false],
  headH: 32,
  emptyH: null,
  rowFallback: 54,
};

describe("naturalHeights — one row height per bucket", () => {
  it("sizes each bucket from ITS OWN row height", () => {
    const out = naturalHeights({ ...MIXED, counts: [2, 19], rowHeights: [31, 50] });
    expect(out).toEqual([32 + 2 * 31 + 2, 32 + 19 * 50 + 2]); // [96, 984]
  });

  it("borrows the first measured sibling for a bucket with no sample of its own", () => {
    // The frame after a bucket fills but before its first row is measured. Its
    // own sample is the right answer once it arrives; until then a sibling's
    // real measurement beats the tuned-for-someone-else constant.
    const out = naturalHeights({ ...MIXED, counts: [3, 4], rowHeights: [null, 50] });
    expect(out).toEqual([32 + 3 * 50 + 2, 32 + 4 * 50 + 2]);
  });

  it("falls back to the constant only when nothing at all has been measured", () => {
    const out = naturalHeights({ ...MIXED, counts: [3, 4], rowHeights: [null, null] });
    expect(out).toEqual([32 + 3 * 54 + 2, 32 + 4 * 54 + 2]);
  });

  it("caps at capRows using that bucket's own row height", () => {
    const out = naturalHeights({
      ...MIXED,
      counts: [2, 19],
      rowHeights: [31, 50],
      capRows: [3, 4],
    });
    // Balances has fewer rows than its cap, so the cap does nothing; Configs
    // holds at 4 of its OWN rows and scrolls.
    expect(out).toEqual([32 + 2 * 31 + 2, 32 + 4 * 50 + 2]);
  });

  it("collapses an empty bucket to its summary line, plus the strip when it declares one", () => {
    const out = naturalHeights({
      ...MIXED,
      counts: [0, 0],
      rowHeights: [null, 50],
      hasEmptyLabel: [true, false],
      emptyH: 21,
    });
    expect(out).toEqual([32 + 21 + 2, 32 + 2]);
  });
});

// A MANUALLY collapsed bucket (Bucket.collapsible, added 2026-07-31) is
// populated but rendering only its header. It gets exactly the treatment an
// empty bucket already gets — pinned to the summary line, out of the
// water-fill, never filling — which is why this is one new disjunct rather
// than a new sizing mode. Purely additive: omitting `collapsed` must
// reproduce every result above.
describe("collapsed — a populated bucket pinned to its header", () => {
  it("naturalHeights pins it to the header, with NO empty strip", () => {
    // It is populated, so `emptyLabel` is not showing even if declared.
    const out = naturalHeights({
      ...MIXED,
      counts: [2, 19],
      rowHeights: [31, 50],
      hasEmptyLabel: [false, true],
      emptyH: 21,
      collapsed: [false, true],
    });
    expect(out).toEqual([32 + 2 * 31 + 2, 32 + 2]);
  });

  it("naturalHeights ignores capRows for a collapsed bucket", () => {
    const out = naturalHeights({
      ...MIXED,
      counts: [2, 19],
      rowHeights: [31, 50],
      capRows: [null, 4],
      collapsed: [false, true],
    });
    expect(out[1]).toBe(32 + 2);
  });

  it("allocateHeights keeps a collapsed bucket out of the water-fill", () => {
    // The height is deliberately too small for both to reach their natural:
    // with the collapsed bucket still IN the share it gets squeezed to 21 and
    // its header is clipped. Pinned, it holds its summary line and the
    // shortfall lands on the bucket that actually has rows to hide.
    const counts = [8, 8];
    const naturals = [34 + 8 * 54 + 2, 36]; // second one already pinned upstream
    const args = { natural: naturals, counts, weights: [1, 1], available: 50, gap: 8 };
    expect(allocateHeights(args)).toEqual([21, 21]); // what NOT pinning does
    const out = allocateHeights({ ...args, collapsed: [false, true] });
    expect(out[1]).toBe(36); // pinned, not squeezed
    expect(out[0]).toBeCloseTo(50 - 8 - 36, 6); // the rest is Alpha's
  });

  it("a collapsed bucket never fills, even when it declares fill", () => {
    // Same rule as an empty one: stretching a header over half the pane is not
    // what filling is for.
    const counts = [4, 4];
    const naturals = [252, 36];
    const out = allocateHeights({
      natural: naturals, counts, weights: [1, 1], available: 900, gap: 8,
      fills: [true, true], collapsed: [false, true],
    });
    expect(out[1]).toBe(36);
    expect(out[0] + out[1] + 8).toBeCloseTo(900, 6);
  });

  it("omitting `collapsed` is identical to an all-false `collapsed`", () => {
    const counts = [4, 3, 5];
    const args = { natural: natural(counts), counts, weights, available: 900, gap: 8 };
    expect(allocateHeights({ ...args, collapsed: [false, false, false] })).toEqual(
      allocateHeights(args),
    );
  });
});

// Rows are re-created whenever `buckets` or `items` gets a new identity, and
// the replacement's height only lands on the ResizeObserver's NEXT delivery
// (never, in a backgrounded tab). Found by measuring the live showcase: a
// one-line Balances bucket above two-line Configs rows was allocated
// 32 + 2×54 + 2 = 142 instead of 96 after a re-render, because it had
// momentarily dropped out of the map and borrowed a CONFIG row's height.
describe("retainRowHeights — a bucket never loses its own measurement", () => {
  const keys = ["balance", "configs"];

  it("keeps the last measured height for a bucket with nothing to measure now", () => {
    const prev = new Map([["balance", 31], ["configs", 54]]);
    const measured = new Map([["configs", 54]]); // balance's row is mid-swap
    expect(retainRowHeights(keys, measured, prev)).toEqual(prev);
  });

  it("lets a fresh measurement win over the retained one", () => {
    const prev = new Map([["balance", 31]]);
    const measured = new Map([["balance", 44]]); // theme change, taller row
    expect(retainRowHeights(keys, measured, prev)).toEqual(new Map([["balance", 44]]));
  });

  it("emits BUCKET order, so naturalHeights' sibling fallback takes the topmost", () => {
    const out = retainRowHeights(keys, new Map([["balance", 31]]), new Map([["configs", 54]]));
    expect([...out.keys()]).toEqual(["balance", "configs"]);
  });

  it("drops a bucket that is no longer declared", () => {
    const out = retainRowHeights(["configs"], new Map(), new Map([["balance", 31], ["configs", 54]]));
    expect(out).toEqual(new Map([["configs", 54]]));
  });
});
