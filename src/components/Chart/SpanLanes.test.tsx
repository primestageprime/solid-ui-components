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

  // Regression (2026-09-30, contract-scheduler bench): the Chart's <svg> also
  // handles pointerdown (for DragRangeSelect) and captures the pointer. It ran
  // AFTER the span's handler, stole the capture, and every pointermove/up went
  // to the svg — a consumer dragging from `onSpanPointerDown` never saw one.
  it("keeps a drag started from onSpanPointerDown: the Chart does not steal the capture", () => {
    // jsdom has no pointer capture: emulate it — the last element to capture
    // is where the browser routes the gesture's move and up.
    let captor: Element | null = null;
    const proto = Element.prototype as unknown as Record<string, unknown>;
    const saved = {
      set: proto.setPointerCapture,
      has: proto.hasPointerCapture,
      release: proto.releasePointerCapture,
    };
    proto.setPointerCapture = function (this: Element) {
      captor = this;
    };
    proto.hasPointerCapture = function (this: Element) {
      return captor === this;
    };
    proto.releasePointerCapture = () => {
      captor = null;
    };
    try {
      const moves: number[] = [];
      const ups: number[] = [];
      const onDown = (j: Job, e: PointerEvent) => {
        const el = e.currentTarget as Element;
        el.setPointerCapture(e.pointerId);
        el.addEventListener("pointermove", () => moves.push(j.id));
        el.addEventListener("pointerup", () => ups.push(j.id));
      };
      const { container } = inChart(() => (
        <SpanLanes data={jobs} paint={paint} onSpanPointerDown={onDown} />
      ));
      const g = container.querySelector('[data-span-id="3"]') as SVGGElement;
      fireEvent.pointerDown(g, { pointerId: 1, clientX: 100, button: 0 });
      expect(captor).toBe(g);
      const target = captor as unknown as Element;
      fireEvent.pointerMove(target, { pointerId: 1, clientX: 140 });
      fireEvent.pointerUp(target, { pointerId: 1, clientX: 140 });
      expect(moves).toEqual([3]);
      expect(ups).toEqual([3]);
    } finally {
      proto.setPointerCapture = saved.set;
      proto.hasPointerCapture = saved.has;
      proto.releasePointerCapture = saved.release;
    }
  });
});
