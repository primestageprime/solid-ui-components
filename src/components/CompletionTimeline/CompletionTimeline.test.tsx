import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  CompletionTimeline,
  type CompletionEvent,
} from "./CompletionTimeline";

const now = Date.now();
const EVENTS: CompletionEvent[] = [
  { tableName: "orders", completedAt: now - 10 * 60 * 1000, rowCount: 1200 },
  { tableName: "users", completedAt: now - 40 * 60 * 1000, rowCount: 300 },
  { tableName: "events", completedAt: now - 90 * 60 * 1000, rowCount: 5000 },
];

describe("CompletionTimeline", () => {
  it("renders the header and an SVG chart", () => {
    const { container } = render(() => (
      <CompletionTimeline completions={EVENTS} />
    ));
    expect(container.querySelector(".sui-completion-timeline")).toBeTruthy();
    expect(container.textContent).toContain("Completion Timeline");
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("reports the total completions in the window", () => {
    const { container } = render(() => (
      <CompletionTimeline completions={EVENTS} />
    ));
    // All three events fall inside the default 8h window.
    expect(container.textContent).toContain("3 completions in window");
  });

  it("excludes completions older than the window from the count", () => {
    const stale: CompletionEvent[] = [
      { tableName: "old", completedAt: now - 100 * 60 * 60 * 1000, rowCount: 1 },
    ];
    const { container } = render(() => (
      <CompletionTimeline completions={stale} windowHours={8} />
    ));
    expect(container.textContent).toContain("0 completions in window");
  });

  it("renders bar rects for populated buckets", () => {
    const { container } = render(() => (
      <CompletionTimeline completions={EVENTS} />
    ));
    const svg = container.querySelector("svg")!;
    expect(svg.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("renders with an empty completion list", () => {
    const { container } = render(() => (
      <CompletionTimeline completions={[]} />
    ));
    expect(container.textContent).toContain("0 completions in window");
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
