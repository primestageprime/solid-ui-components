import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { dateCol, geo } from "./date";

afterEach(cleanup);

interface Row {
  createdAt: string;
}

describe("date field module", () => {
  it("geo is a fixed 14ch column (min === max)", () => {
    expect(geo).toEqual({ minCh: 14, maxCh: 14, css: "14ch" });
  });

  it("dateCol builds a sortable, centered-header column at geo width", () => {
    const col = dateCol<Row>("createdAt");
    expect(col.id).toBe("createdAt");
    expect(col.sortable).toBe(true);
    expect(col.width).toBe(geo.css);
    expect(col.geo).toBe(geo);
  });

  it("cell renders an ISO date", () => {
    const col = dateCol<Row>("createdAt");
    // Local (no "Z") noon so the rendered calendar date is timezone-stable.
    const { container } = render(() => (
      <>{col.accessor({ createdAt: "2026-07-15T12:00:00" })}</>
    ));
    expect(container.querySelector(".cell-date")?.textContent).toBe(
      "2026-07-15",
    );
  });
});
