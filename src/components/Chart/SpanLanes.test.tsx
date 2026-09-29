import { fireEvent, render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Chart } from "./Chart";
import { SpanLanes } from "./SpanLanes";
import {
  createSpanBadge,
  createSpanEndLabels,
  createSpanRing,
} from "./spanAdornments";

interface Job {
  readonly id: number;
  readonly name: string;
  readonly over: boolean;
  readonly segments: readonly { start: number; end: number; kind: string }[];
}

const jobs: readonly Job[] = [
  {
    id: 1,
    name: "Henderson",
    over: false,
    segments: [
      { start: 0, end: 4, kind: "work" },
      { start: 4, end: 6, kind: "wait" },
      { start: 6, end: 8, kind: "work" },
    ],
  },
  {
    id: 2,
    name: "Johnson",
    over: true,
    segments: [{ start: 8, end: 10, kind: "work" }],
  },
  {
    id: 3,
    name: "Harold",
    over: false,
    segments: [{ start: 2, end: 9, kind: "work" }],
  },
];

const paint = (s: { kind: string }) =>
  s.kind === "wait" ? "url(#hatch)" : "var(--sui-accent)";

const inChart = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={420} height={140} xDomain={[0, 10]} yDomain={[0, 1]}>
      {slot()}
    </Chart>
  ));

describe("SpanLanes", () => {
  it("draws one group per span, packed into the fewest rows", () => {
    const { container } = inChart(() => (
      <SpanLanes data={jobs} paint={paint} />
    ));
    const groups = [
      ...container.querySelectorAll<SVGGElement>(".sui-chart__span"),
    ];
    expect(groups.map((g) => g.dataset.spanId).sort()).toEqual(["1", "2", "3"]);
    // Henderson and Johnson touch (8 → 8) and share row 0; Harold overlaps both → row 1
    const y = (id: string) =>
      container
        .querySelector(`[data-span-id="${id}"] clipPath rect`)
        ?.getAttribute("y");
    expect(y("1")).toBe(y("2"));
    expect(y("3")).not.toBe(y("1"));
  });

  it("paints every segment through `paint`", () => {
    const { container } = inChart(() => (
      <SpanLanes data={jobs.slice(0, 1)} paint={paint} />
    ));
    const fills = [
      ...container.querySelectorAll('[data-span-id="1"] g[clip-path] > rect'),
    ].map((r) => r.getAttribute("fill"));
    expect(fills).toEqual([
      "var(--sui-accent)",
      "url(#hatch)",
      "var(--sui-accent)",
    ]);
  });

  it("outlines the hovered span", () => {
    const { container } = inChart(() => (
      <SpanLanes data={jobs} paint={paint} hoveredId={2} />
    ));
    expect(
      container
        .querySelector('[data-span-id="2"] .sui-segment-bar')
        ?.hasAttribute("data-hovered"),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-span-id="1"] .sui-segment-bar')
        ?.hasAttribute("data-hovered"),
    ).toBe(false);
  });

  it("reports hover, click, Enter and pointer-down with the datum", () => {
    const onHover = vi.fn();
    const onClick = vi.fn();
    const onDown = vi.fn();
    const { container } = inChart(() => (
      <SpanLanes
        data={jobs}
        paint={paint}
        onSpanHover={onHover}
        onSpanClick={onClick}
        onSpanPointerDown={onDown}
        describe={(j) => j.name}
      />
    ));
    const g = container.querySelector('[data-span-id="3"]') as SVGGElement;
    expect(g.getAttribute("aria-label")).toBe("Harold");
    fireEvent.pointerEnter(g);
    fireEvent.pointerDown(g);
    fireEvent.click(g);
    fireEvent.keyDown(g, { key: "Enter" });
    fireEvent.pointerLeave(g);
    expect(onHover.mock.calls.map((c) => c[0]?.id ?? null)).toEqual([3, null]);
    expect(onDown.mock.calls[0][0].id).toBe(3);
    expect(onClick.mock.calls.map((c) => c[0].id)).toEqual([3, 3]);
  });

  it("draws the adornments it is given on each bar, from the datum", () => {
    const Labels = createSpanEndLabels<Job>({
      lead: (j) => `#${j.id}`,
      trail: () => "$1k",
      color: () => "black",
    });
    const Ring = createSpanRing<Job>({
      when: (j) => j.over,
      color: () => "var(--sui-danger)",
    });
    const Bang = createSpanBadge<Job>({
      when: (j) => j.over,
      glyph: () => ({ text: "!" }),
      color: () => "var(--sui-danger)",
      glyphColor: () => "white",
      corner: "top-right",
    });
    const { container } = inChart(() => (
      <SpanLanes data={jobs} paint={paint} adornments={[Labels, Ring, Bang]} />
    ));
    expect(
      container.querySelector('[data-span-id="1"] .sui-end-labels__text')
        ?.textContent,
    ).toBe("#1");
    expect(container.querySelectorAll(".sui-box-ring")).toHaveLength(1);
    expect(
      container.querySelector('[data-span-id="2"] .sui-glyph-badge__text')
        ?.textContent,
    ).toBe("!");
    expect(
      container.querySelector('[data-span-id="1"] .sui-glyph-badge'),
    ).toBeNull();
  });
});
