// Escape inside the chart's range editor closes the EDITOR, not the
// FullscreenBox around the chart. The editor stops propagation and prevents
// default; the box listens on `document` and ignores a handled Escape. This
// pins the pair end to end.
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { FullscreenBox } from "./index";
import { ScrubChart } from "../ScrubChart";
import { dailyCells } from "../DateAxis";

describe("FullscreenBox + ScrubChart range editor", () => {
  it("an Escape in the editor closes the editor and leaves the box fullscreen", () => {
    const cells = dailyCells(new Date("2026-05-01T00:00:00Z"), new Date("2026-05-10T00:00:00Z"));
    const { container } = render(() => (
      <FullscreenBox fullscreen onFullscreenChange={() => {
        throw new Error("the box must not hear the editor's Escape");
      }}>
        <ScrubChart
          cells={cells}
          yDomain={[0, 100]}
          yAxisMode="fixed"
          onYRangeChange={() => {}}
          renderChart={() => <svg />}
          renderCell={() => <div />}
        />
      </FullscreenBox>
    ));
    container.querySelector<HTMLButtonElement>(".sui-scrub-chart__y-axis-hit")!.click();
    const input = container.querySelector<HTMLInputElement>(
      ".sui-scrub-chart__y-range-editor input:not([name])",
    )!;
    fireEvent.keyDown(input, { key: "Escape" });
    expect(container.querySelector(".sui-scrub-chart__y-range-editor")).toBeNull();
    expect(container.querySelector<HTMLElement>(".sui-fullscreen-box")!.dataset.fullscreen).toBe("true");
  });
});
