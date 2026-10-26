// Smoke test: each import bench renders every step from its fixture.
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import InitialImportBench from "../initial-import";

const next = () => fireEvent.keyDown(window, { key: "ArrowRight" });

describe("Initial Import bench", () => {
  it("walks from Auto group to Summary", () => {
    render(() => <InitialImportBench />);
    expect(screen.getAllByText("Github").length).toBeGreaterThan(0);
    next();
    expect(screen.getAllByText("Evergreen Hall").length).toBeGreaterThan(0);
    next();
    expect(screen.getAllByText("EXPENSES").length).toBeGreaterThan(0);
    next();
    expect(screen.getByText("Manual projection — placeholder (Peter's bench)")).toBeTruthy();
    next();
    expect(screen.getByText("One-off configs")).toBeTruthy();
  });

  it("assigns the current payment with a quick-pick key and undoes it", () => {
    render(() => <InitialImportBench />);
    next();
    expect(screen.getAllByText("Payment 1 of 6").length).toBe(1);
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.queryByText("Payment 1 of 6")).toBeNull();
    expect(screen.getAllByText("Payment 2 of 6").length).toBe(1);
    fireEvent.keyDown(window, { key: "u" });
    expect(screen.getAllByText("Payment 1 of 6").length).toBe(1);
  });
});
