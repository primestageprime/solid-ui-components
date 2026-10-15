import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BucketQueue } from "./BucketQueue";
import { CompactBucketQueue } from "./variants";
import type { Bucket } from "./types";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "BucketQueue.css"),
  "utf8",
);

interface Item { id: string; bucket: string }
const BUCKETS: Bucket[] = [{ key: "todo", label: "To do", tone: "accent" }];
const ITEMS: Item[] = [{ id: "a", bucket: "todo" }];
const common = {
  buckets: BUCKETS,
  items: ITEMS,
  bucketOf: (i: Item) => i.bucket,
  keyOf: (i: Item) => i.id,
  renderItem: (i: Item) => <span>{i.id}</span>,
};

describe("BucketQueue density", () => {
  it("is comfortable by default", () => {
    const { container } = render(() => <BucketQueue<Item> {...common} />);
    expect(container.querySelector(".bucket-queue--compact")).toBeNull();
  });

  it("CompactBucketQueue marks the root compact", () => {
    const { container } = render(() => <CompactBucketQueue<Item> {...common} />);
    expect(container.querySelector(".bucket-queue")?.classList.contains("bucket-queue--compact")).toBe(true);
  });

  it("tightens the gap, the header, the rows and the empty strip", () => {
    expect(css).toMatch(/\.bucket-queue--compact\s*\{[^}]*gap: 4px;[^}]*font-size: 12px;/);
    expect(css).toMatch(/\.bucket-queue--compact \.bucket-queue__header\s*\{[^}]*padding: 3px 8px;/);
    expect(css).toMatch(/\.bucket-queue--compact \.bucket-queue__row\s*\{[^}]*padding: 2px 8px;[^}]*line-height: 16px;/);
    expect(css).toMatch(/\.bucket-queue--compact \.bucket-queue__empty\s*\{[^}]*padding: 2px 8px;/);
  });
});
