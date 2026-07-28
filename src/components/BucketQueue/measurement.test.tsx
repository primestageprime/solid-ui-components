// BucketQueue — WHAT gets measured, and what keeps it current.
//
// `renderItem` and `emptyLabel` are the consumer's, so the sizing model cannot
// assume a row height; it measures one. These tests pin the two things that
// makes correct: the measured elements are ones that actually EXIST, and the
// observer watches those elements rather than only the root — otherwise
// anything that changes row height without resizing the root (a theme switch, a
// late web font, a swapped renderItem) leaves every bucket sized from stale
// metrics. jsdom reports every offsetHeight as 0, so the honest gate is which
// elements are observed, not the numbers that come back.
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { cleanup, render } from "@solidjs/testing-library";
import { BucketQueue, type Bucket } from "./BucketQueue";
import type { Item } from "./testHelpers";

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  boxes: (string | undefined)[] = [];
  constructor(public cb: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element, opts?: { box?: string }) {
    this.observed.push(el);
    this.boxes.push(opts?.box);
  }
  unobserve(el: Element) {
    const i = this.observed.indexOf(el);
    if (i >= 0) {
      this.observed.splice(i, 1);
      this.boxes.splice(i, 1);
    }
  }
  disconnect() {
    this.observed = [];
  }
}

const original = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
beforeEach(() => {
  FakeResizeObserver.instances = [];
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
});
afterEach(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = original;
  cleanup();
});

// Bucket "a" is EMPTY and carries an emptyLabel; "b" holds the rows. That
// ordering is the point: the naive implementation measured bucket 0's first
// row, which here does not exist.
const BUCKETS: Bucket[] = [
  { key: "a", label: "Alpha", tone: "success", emptyLabel: "nothing here" },
  { key: "b", label: "Beta", tone: "danger" },
  { key: "c", label: "Gamma", tone: "accent" },
];

const renderQ = (items: Item[]) => {
  const [rows, setRows] = createSignal<Item[]>(items);
  const r = render(() => (
    <BucketQueue<Item>
      buckets={BUCKETS}
      items={rows()}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
    />
  ));
  return { ...r, setRows };
};

const observer = () => {
  expect(FakeResizeObserver.instances).toHaveLength(1);
  return FakeResizeObserver.instances[0];
};
const bucketOfEl = (el: Element) =>
  (el.closest("[data-bq-bucket]") as HTMLElement | null)?.dataset.bqBucket;

describe("BucketQueue measurement", () => {
  it("measures a row from the first POPULATED bucket, not bucket 0", () => {
    renderQ([
      { id: "b1", bucket: "b" },
      { id: "b2", bucket: "b" },
    ]);
    const rows = observer().observed.filter((el) =>
      el.classList.contains("bucket-queue__row"),
    );
    expect(rows).toHaveLength(1);
    // Bucket "a" is empty, so measuring "the first bucket's first row" would
    // have measured nothing and left every bucket on ROW_FALLBACK.
    expect(bucketOfEl(rows[0])).toBe("b");
  });

  it("measures a row in EVERY populated bucket, not one row for the whole queue", () => {
    // Rows are the consumer's JSX, and a queue can pair one-line rows in one
    // bucket with two-line rows in the next. One sample applied to both sized
    // the taller bucket from the shorter bucket's row and left the difference
    // as dead space at the bottom of the queue.
    renderQ([
      { id: "b1", bucket: "b" },
      { id: "c1", bucket: "c" },
    ]);
    const rows = observer().observed.filter((el) =>
      el.classList.contains("bucket-queue__row"),
    );
    expect(rows.map(bucketOfEl).sort()).toEqual(["b", "c"]);
  });

  it("observes the row, the header and the empty strip — not just the root", () => {
    const { container } = renderQ([{ id: "b1", bucket: "b" }]);
    const observed = observer().observed;
    expect(observed).toContain(container.querySelector(".bucket-queue"));
    expect(observed).toContain(container.querySelector(".bucket-queue__header"));
    expect(observed).toContain(container.querySelector(".bucket-queue__empty"));
    expect(
      observed.some((el) => el.classList.contains("bucket-queue__row")),
    ).toBe(true);
  });

  it("re-points at a live row when the measured one is emptied out", () => {
    // The staleness fix: the element being watched must follow the render. A
    // measurement pinned to a row that has since unmounted is exactly how the
    // bar ends up sized for content that is no longer on screen.
    const { setRows } = renderQ([{ id: "b1", bucket: "b" }]);
    const before = observer().observed.find((el) =>
      el.classList.contains("bucket-queue__row"),
    );
    expect(bucketOfEl(before as Element)).toBe("b");

    setRows([{ id: "b1", bucket: "c" }]); // bucket "b" drains, "c" fills

    const after = observer().observed.filter((el) =>
      el.classList.contains("bucket-queue__row"),
    );
    expect(after).toHaveLength(1); // the stale one was unobserved, not stacked
    expect(bucketOfEl(after[0])).toBe("c");
    expect(after[0]).not.toBe(before);
  });

  it("watches the BORDER box — the same box measure() reads", () => {
    // `measure()` reads offsetHeight, which is the border box. ResizeObserver
    // defaults to the CONTENT box, which does not change when only padding or a
    // border does — so a themed row-padding change, or a renderItem that swaps
    // its own padding, would resize the row and never notify us.
    renderQ([{ id: "b1", bucket: "b" }]);
    expect(observer().boxes).not.toHaveLength(0);
    expect(new Set(observer().boxes)).toEqual(new Set(["border-box"]));
  });

  it("keeps exactly one observed element per measured role as rows churn", () => {
    const { setRows } = renderQ([{ id: "b1", bucket: "b" }]);
    for (const target of ["c", "b", "c", "b"]) {
      setRows([{ id: "b1", bucket: target }]);
    }
    const observed = observer().observed;
    const count = (cls: string) =>
      observed.filter((el) => el.classList.contains(cls)).length;
    expect(count("bucket-queue__row")).toBe(1);
    expect(count("bucket-queue__header")).toBe(1);
    expect(count("bucket-queue")).toBe(1);
  });
});
