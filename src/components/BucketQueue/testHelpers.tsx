// BucketQueue — fixtures shared across the split test files. Not
// exported from ./index.ts, so it never enters the published bundle (see
// src/index.ts, which only re-exports the component and its types).
import { render } from "@solidjs/testing-library";
import { BucketQueue, type Bucket } from "./BucketQueue";

export interface Item {
  id: string;
  bucket: string;
}

export const BUCKETS: Bucket[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "danger" },
  { key: "c", label: "Gamma", tone: "accent", weight: 2 },
];

export const renderQueue = (items: Item[], extra: Record<string, unknown> = {}) =>
  render(() => (
    <BucketQueue<Item>
      buckets={BUCKETS}
      items={items}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));

export const rows = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-bq-key]")] as HTMLElement[];

export const rowFor = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-bq-key="${key}"]`) as HTMLElement;

// Sizing is deterministic in jsdom: measurement returns 0, so the component
// keeps its fallbacks (header 34, row 54, +2 border). With height=600 and
// three buckets at gap 8, the two empty buckets take 36 each, leaving
// ample pool — so each populated bucket gets exactly its natural height.
export const FIVE_IN_A: Item[] = [1, 2, 3, 4, 5].map((n) => ({
  id: String(n),
  bucket: "a",
}));

export const bucketHeights = (container: HTMLElement) =>
  [...container.querySelectorAll(".bucket-queue__bucket")].map(
    (s) => (s as HTMLElement).style.height,
  );

export const SELECTABLE: Bucket[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "accent", selectable: true },
];

export const renderSelectable = (extra: Record<string, unknown>) =>
  render(() => (
    <BucketQueue<Item>
      buckets={SELECTABLE}
      items={[
        { id: "plain", bucket: "a" },
        { id: "check", bucket: "b" },
      ]}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));

// A row is interactive iff onSelect is set OR its bucket is selectable in
// select mode. With no onSelect and only "b" selectable, "a"'s rows are
// inert — they must never take the tab stop or an arrow-key landing, even
// though a non-selectable, non-first-rendered bucket's row is what the
// ported (unfiltered) allKeys/moveFocus would have fallen through to.
export const MIXED: Bucket[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "accent", selectable: true },
];

export const renderMixed = (extra: Record<string, unknown>) =>
  render(() => (
    <BucketQueue<Item>
      buckets={MIXED}
      items={[
        { id: "inert-1", bucket: "a" },
        { id: "inert-2", bucket: "a" },
        { id: "live-1", bucket: "b" },
      ]}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));
