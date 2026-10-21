import { describe, expect, it } from "vitest";
import { VIEW_WIDTH } from "./geometry";
import { deltaFit, priorFit } from "./labelFit";

const width = (chars: number, size: number): number => chars * size * 0.6;

describe("side label fit", () => {
  it.each([["+$5K", "(4%)"], ["+$10.2K", "(17%)"], ["−$119.6K", "(18%)"]])(
    "keeps %s inside the column",
    (...lines) => {
      const fit = deltaFit(lines);
      const w = width(Math.max(...lines.map((l) => l.length)), fit.size);
      expect(fit.anchor === "start" ? fit.x + w : fit.x).toBeLessThanOrEqual(VIEW_WIDTH);
      expect(fit.anchor === "end" ? fit.x - w : fit.x).toBeGreaterThanOrEqual(0);
    },
  );
  it("keeps the prior label inside the column", () => {
    ["$65K", "$119.6K"].forEach((text) => {
      const fit = priorFit(text);
      const w = width(text.length, fit.size);
      expect(fit.anchor === "end" ? fit.x - w : fit.x).toBeGreaterThanOrEqual(0);
      expect(fit.anchor === "start" ? fit.x + w : fit.x).toBeLessThanOrEqual(VIEW_WIDTH);
    });
  });
});
