import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { dailyCells, type Cell } from "../DateAxis";
import { ScrubChart } from "./ScrubChart";
import { ScrubChartLabels } from "./ScrubChartLabels";

type ValueCell = Cell & { v: number };

const cells: ValueCell[] = dailyCells(
  new Date("2026-05-01"),
  new Date("2026-05-05"),
).map((c, i) => ({ ...c, v: [10, 20, 30, 40, 50][i] }));

describe("ScrubChartLabels — the ScrubChart adapter", () => {
  it("draws one <text> per placed label, frame-absolute, via the shared core", () => {
    const { container } = render(() => (
      <ScrubChart<ValueCell>
        cells={cells}
        selected={0}
        onScrub={() => {}}
        yDomain={[0, 50]}
        renderCell={() => <span />}
        renderChart={() => null}
        renderChartOverlay={(ctx) => (
          <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}>
            <ScrubChartLabels
              ctx={ctx}
              labels={[
                {
                  id: "first",
                  text: "First",
                  width: 30,
                  height: 11,
                  placement: "below",
                  x: ctx.cellToX(0),
                  y: ctx.plotTop,
                  endY: ctx.plotTop,
                },
              ]}
              polylines={[]}
              reservedSpace={{ rightGutter: 0, belowRows: 1 }}
              classPrefix="sui-scrub-chart-labels-demo"
            />
          </svg>
        )}
      />
    ));
    const texts = container.querySelectorAll(
      ".sui-scrub-chart-labels-demo__label",
    );
    expect(texts.length).toBe(1);
    expect(texts[0].textContent).toBe("First");
  });
});
