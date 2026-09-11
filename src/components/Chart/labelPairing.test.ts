import { describe, expect, it } from "vitest";
import { drawnLabels, type ChartLabel } from "./labelPairing";
import type { LabelCandidate, LabelPlacementResult } from "./labelPlacement";

/** A minimal drawable label: the fields `drawnLabels` reads, plus its text. */
const chartLabel = (
  id: string,
  text: string,
  over: Partial<LabelCandidate> = {},
): ChartLabel => ({
  id,
  width: 14,
  height: 11,
  placement: "auto",
  x: 50,
  y: 50,
  endY: 50,
  ...over,
  text,
});

describe("drawnLabels", () => {
  it("pairs a placed label with its text and drops what the ladder refused", () => {
    const labels = [chartLabel("kept", "Kept"), chartLabel("gone", "Gone")];
    const results: readonly LabelPlacementResult[] = [
      {
        kind: "placed",
        id: "kept",
        zone: "body",
        x: 10,
        y: 20,
        anchor: "start",
        lane: 1,
      },
      { kind: "dropped", id: "gone" },
    ];
    const drawn = drawnLabels(labels, results);
    expect(drawn).toHaveLength(1);
    expect(drawn[0].text).toBe("Kept");
    expect(drawn[0].width).toBe(labels[0].width);
    expect(drawn[0].height).toBe(labels[0].height);
    expect(drawn[0].placed).toEqual(results[0]);
  });

  it("returns nothing when every label was dropped", () => {
    const labels = [chartLabel("a", "A")];
    const results: readonly LabelPlacementResult[] = [
      { kind: "dropped", id: "a" },
    ];
    expect(drawnLabels(labels, results)).toEqual([]);
  });
});
