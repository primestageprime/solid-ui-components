// BucketQueue — Bucket.count (display-only header count). Split out by concern.
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent } from "@solidjs/testing-library";
import type { Bucket } from "./types";
import { renderBuckets, toggleButton } from "./testHelpers";

afterEach(cleanup);

const HISTORY: Bucket[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "h", label: "History", tone: "muted", collapsible: true, collapsedByDefault: true, count: 2594 },
];
const counts = (c: HTMLElement) =>
  [...c.querySelectorAll(".bucket-queue__count")].map((e) => e.textContent);

describe("BucketQueue — Bucket.count", () => {
  it("shows the stated count, grouped, with one item loaded and the bucket collapsed", () => {
    const { container } = renderBuckets(HISTORY, [{ id: "1", bucket: "h" }]);
    expect(counts(container)).toEqual(["0", "2,594"]);
    expect(toggleButton(container)!.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the stated count with nothing loaded", () => {
    const { container } = renderBuckets(HISTORY, []);
    expect(counts(container)).toEqual(["0", "2,594"]);
  });

  it("leaves collapse and the body on the loaded items", () => {
    const { container } = renderBuckets(HISTORY, [{ id: "1", bucket: "h" }]);
    expect(container.querySelector('[data-bq-key="1"]')).toBeNull();
    fireEvent.click(toggleButton(container)!);
    expect(container.querySelector('[data-bq-key="1"]')).not.toBeNull();
    expect(counts(container)).toEqual(["0", "2,594"]);
  });

  it("changes nothing when absent: loaded count, ungrouped", () => {
    const plain: Bucket[] = HISTORY.map(({ count: _c, ...b }) => b);
    const { container } = renderBuckets(plain, [{ id: "1", bucket: "h" }]);
    expect(counts(container)).toEqual(["0", "1"]);
  });
});
