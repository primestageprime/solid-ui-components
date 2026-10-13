import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { PointCaptions } from "./PointCaptions";

const pts = [
  { x: 25, y: 0, word: "early" },
  { x: 75, y: 0, word: "under" },
];

describe("PointCaptions", () => {
  it("pins one word to each point, above or below as stated", () => {
    const { container } = render(() => (
      <Chart width={236} height={100} xDomain={[0, 100]} yDomain={[-1, 1]} margin={{ top: 0, right: 0, bottom: 0, left: 36 }}>
        <PointCaptions
          data={pts}
          x={(p) => p.x}
          y={(p) => p.y}
          text={(p) => p.word}
          side={(p) => (p.word === "early" ? "above" : "below")}
          offset={9}
          tone="warning"
        />
      </Chart>
    ));
    const texts = [...container.querySelectorAll<SVGTextElement>(".sui-chart__point-caption")];
    expect(texts.map((t) => t.textContent)).toEqual(["early", "under"]);
    expect(Number(texts[0]!.getAttribute("y"))).toBe(50 - 9);
    expect(Number(texts[1]!.getAttribute("y"))).toBe(50 + 9);
    expect(texts[0]!.dataset.side).toBe("above");
    expect(texts[1]!.getAttribute("dominant-baseline")).toBe("hanging");
    expect(texts[0]!.dataset.tone).toBe("warning");
  });
});
