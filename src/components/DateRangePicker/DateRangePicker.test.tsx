import { describe, it, expect } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { DateRangePicker } from "./DateRangePicker";
import type { DateRange } from "./types";

const DAY_MS = 86_400_000;

const initialRange: DateRange = {
  start: new Date(2026, 0, 1),
  end: new Date(2026, 0, 7),
};

describe("DateRangePicker maxDate preset clamping", () => {
  it("clamps a preset's end to maxDate when the cap is in the past", async () => {
    // maxDate one year in the past so `now` always exceeds it.
    const maxDate = new Date(Date.now() - 365 * DAY_MS);
    let committed: DateRange | undefined;

    const { getByText } = render(() => (
      <DateRangePicker
        value={() => initialRange}
        onChange={(r) => (committed = r)}
        maxDate={maxDate}
        presets={[{ label: "7d", days: 7 }]}
      />
    ));

    // Open the popover (portal-rendered), then click the preset.
    fireEvent.click(getByText(/–/));
    fireEvent.click(await screen.findByText("7d"));

    expect(committed).toBeDefined();
    // End is the cap, start is 7 days before the cap.
    expect(committed!.end.getTime()).toBe(maxDate.getTime());
    expect(committed!.start.getTime()).toBe(maxDate.getTime() - 7 * DAY_MS);
  });

  it("uses now as the preset end when maxDate is in the future", async () => {
    const maxDate = new Date(Date.now() + 365 * DAY_MS);
    let committed: DateRange | undefined;
    const before = Date.now();

    const { getByText } = render(() => (
      <DateRangePicker
        value={() => initialRange}
        onChange={(r) => (committed = r)}
        maxDate={maxDate}
        presets={[{ label: "7d", days: 7 }]}
      />
    ));

    fireEvent.click(getByText(/–/));
    fireEvent.click(await screen.findByText("7d"));

    expect(committed).toBeDefined();
    // End is ~now (not the future cap).
    expect(committed!.end.getTime()).toBeGreaterThanOrEqual(before);
    expect(committed!.end.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
