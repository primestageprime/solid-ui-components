// ProgressionQueue — fixtures shared across the split test files. Not
// exported from ./index.ts, so it never enters the published bundle (see
// src/index.ts, which only re-exports the component and its types).
import { render } from "@solidjs/testing-library";
import { ProgressionQueue, type ProgressionSection } from "./ProgressionQueue";

export interface Item {
  id: string;
  bucket: string;
}

export const SECTIONS: ProgressionSection[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "danger" },
  { key: "c", label: "Gamma", tone: "accent", weight: 2 },
];

export const renderQueue = (items: Item[], extra: Record<string, unknown> = {}) =>
  render(() => (
    <ProgressionQueue<Item>
      sections={SECTIONS}
      items={items}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));

export const rows = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-pq-key]")] as HTMLElement[];

export const rowFor = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-pq-key="${key}"]`) as HTMLElement;

// Sizing is deterministic in jsdom: measurement returns 0, so the component
// keeps its fallbacks (header 34, row 54, +2 border). With height=600 and
// three sections at gap 8, the two empty sections take 36 each, leaving
// ample pool — so each populated section gets exactly its natural height.
export const FIVE_IN_A: Item[] = [1, 2, 3, 4, 5].map((n) => ({
  id: String(n),
  bucket: "a",
}));

export const sectionHeights = (container: HTMLElement) =>
  [...container.querySelectorAll(".prog-queue__section")].map(
    (s) => (s as HTMLElement).style.height,
  );

export const SELECTABLE: ProgressionSection[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "accent", selectable: true },
];

export const renderSelectable = (extra: Record<string, unknown>) =>
  render(() => (
    <ProgressionQueue<Item>
      sections={SELECTABLE}
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

// A row is interactive iff onSelect is set OR its section is selectable in
// select mode. With no onSelect and only "b" selectable, "a"'s rows are
// inert — they must never take the tab stop or an arrow-key landing, even
// though a non-selectable, non-first-rendered section's row is what the
// ported (unfiltered) allKeys/moveFocus would have fallen through to.
export const MIXED: ProgressionSection[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "accent", selectable: true },
];

export const renderMixed = (extra: Record<string, unknown>) =>
  render(() => (
    <ProgressionQueue<Item>
      sections={MIXED}
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
