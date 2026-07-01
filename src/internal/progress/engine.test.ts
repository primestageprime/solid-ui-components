import { describe, it, expect } from "vitest";
import { createProgressEngine } from "./engine";
import { P_KNEE, SNAP_MS } from "./estimator";

describe("progress engine", () => {
  it("records a real (rows, duration) sample on running → done", () => {
    const e = createProgressEngine();
    const before = e.model.n;
    e.observe([{ id: "b", rows: 5000, state: "running" }], 1000);
    e.observe([{ id: "b", rows: 5000, state: "done" }], 4000);
    // Exactly one sample folded; the durMs it learned is ~3000.
    expect(e.model.n).toBe(before + 1);
  });

  it("does NOT fold a sample for a batch never seen running", () => {
    const e = createProgressEngine();
    const before = e.model.n;
    // pending → done with no running observation: no measurable duration.
    e.observe([{ id: "b", rows: 5000, state: "pending" }], 0);
    e.observe([{ id: "b", rows: 5000, state: "done" }], 100);
    expect(e.model.n).toBe(before);
  });

  it("eases a running batch toward the estimate, never reaching 1.0", () => {
    const e = createProgressEngine();
    e.observe([{ id: "b", rows: 4000, state: "running" }], 0);
    // Long after any plausible estimate, the running fill is high but < 1.
    e.frame(60_000);
    const p = e.fractionOf("b");
    expect(p).toBeGreaterThan(P_KNEE);
    expect(p).toBeLessThan(1);
  });

  it("snaps a running batch to 1.0 only on a real done event", () => {
    const e = createProgressEngine();
    e.observe([{ id: "b", rows: 4000, state: "running" }], 0);
    e.frame(2000);
    const mid = e.fractionOf("b");
    expect(mid).toBeLessThan(1);
    // Real completion → snap fully resolves within SNAP_MS.
    e.observe([{ id: "b", rows: 4000, state: "done" }], 3000);
    e.frame(3000 + SNAP_MS);
    expect(e.fractionOf("b")).toBe(1);
  });

  it("reports animating=true while running and false once everything settles", () => {
    const e = createProgressEngine();
    e.observe([{ id: "b", rows: 1000, state: "running" }], 0);
    expect(e.frame(500)).toBe(true);
    e.observe([{ id: "b", rows: 1000, state: "done" }], 1000);
    // During the snap it is still animating…
    expect(e.frame(1000 + SNAP_MS / 2)).toBe(true);
    // …and after the snap completes, nothing needs to move.
    expect(e.frame(1000 + SNAP_MS + 1)).toBe(false);
  });

  it("idle (all pending) does not animate", () => {
    const e = createProgressEngine();
    e.observe([{ id: "b", rows: 1000, state: "pending" }], 0);
    expect(e.frame(100)).toBe(false);
    expect(e.fractionOf("b")).toBe(0);
  });

  it("drops batches the caller no longer presents", () => {
    const e = createProgressEngine();
    e.observe([{ id: "b", rows: 1000, state: "running" }], 0);
    e.frame(500);
    expect(e.fractionOf("b")).toBeGreaterThan(0);
    e.observe([], 600); // gone
    expect(e.fractionOf("b")).toBe(0);
  });

  it("sharpens: later estimates track a consistent truth law", () => {
    const e = createProgressEngine();
    // Truth: 2000 + 0.3·rows. Resolve a run of batches.
    let t = 0;
    for (let i = 0; i < 30; i++) {
      const rows = 4000;
      const dur = 2000 + 0.3 * rows;
      e.observe([{ id: `b${i}`, rows, state: "running" }], t);
      t += dur;
      e.observe([{ id: `b${i}`, rows, state: "done" }], t);
    }
    // The model's perRow has been pulled toward 0.3 (away from the 0.25 prior).
    const denom = e.model.n * e.model.sxx - e.model.sx * e.model.sx;
    const perRow = (e.model.n * e.model.sxy - e.model.sx * e.model.sy) / denom;
    expect(perRow).toBeGreaterThan(0.25);
  });
});
