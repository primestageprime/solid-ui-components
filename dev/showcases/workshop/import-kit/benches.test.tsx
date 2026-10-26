// Smoke test: each import bench renders every step from its fixture.
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import InitialImportBench from "../initial-import";
import IncrementalImportBench from "../incremental-import";

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

describe("Incremental Import bench", () => {
  it("walks every step, and the advanced switch shows the score column", () => {
    render(() => <IncrementalImportBench />);
    expect(screen.getAllByText("Cascade Plumbing Supply").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sure")).toBeNull();
    fireEvent.click(screen.getByLabelText("Advanced"));
    expect(screen.getAllByText("Sure").length).toBeGreaterThan(0);
    next();
    expect(screen.getAllByText("ACH RENT 4471").length).toBeGreaterThan(0);
    next();
    next();
    expect(screen.getAllByText("Started again at a new amount? Resume at $210").length).toBe(1);
    next();
    expect(screen.getAllByText("Toyota Financial").length).toBeGreaterThan(0);
    next();
    expect(screen.getByText("Manual projection — placeholder (Peter's bench)")).toBeTruthy();
    next();
    expect(screen.getByText("Added to existing groups")).toBeTruthy();
  });

  it("the quiet month has nothing to look at", () => {
    render(() => <IncrementalImportBench />);
    fireEvent.click(screen.getByText("Quiet month (every payment fits)"));
    expect(screen.queryByText("Cascade Plumbing Supply")).toBeNull();
    expect(screen.getAllByText("Every payment is in a group.").length).toBe(1);
  });
});
