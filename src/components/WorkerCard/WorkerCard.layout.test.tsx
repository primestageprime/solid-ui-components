import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { WorkerCard } from "./WorkerCard";

afterEach(cleanup);

// Layout-purity regression guard. The identity / history / plan-inner rows are
// now composed from SpreadRow, and the name+badge cluster from ClusterRow (were
// hand-rolled flex rows / an inline flex style). The BEM hook classes are
// retained ON the Layout wrappers; the content and prop behavior must not
// regress.
const baseProps = {
  slotId: 2,
  status: "claimed" as const,
  now: 10_000,
  startedAt: 5_000,
  extractStartedAt: 0,
  jobsCompleted: 3,
  avgRatePerSec: 120,
  estimatedS: 60,
  pkStart: "1",
  pkEnd: "500",
  batchSize: 500,
  columnCount: 8,
};

describe("WorkerCard layout purity", () => {
  it("composes the identity row as a SpreadRow carrying the BEM hook", () => {
    const { container } = render(() => <WorkerCard {...baseProps} />);
    const identity = container.querySelector(".worker-card__identity");
    expect(identity).toBeTruthy();
    // SpreadRow → .row.row--justify-between (arrangement now from Layout).
    expect(identity!.classList.contains("row")).toBe(true);
    expect(identity!.classList.contains("row--justify-between")).toBe(true);
    // name + badge wrapped in a ClusterRow (.row) inside the spread row.
    const cluster = identity!.querySelector(".row");
    expect(cluster).toBeTruthy();
    expect(cluster!.querySelector(".worker-card__name")).toBeTruthy();
    expect(cluster!.querySelector(".worker-card__badge")).toBeTruthy();
  });

  it("composes history + plan-inner rows as SpreadRows", () => {
    const { container } = render(() => <WorkerCard {...baseProps} />);
    for (const hook of [".worker-card__history", ".worker-card__plan-inner"]) {
      const el = container.querySelector(hook);
      expect(el, hook).toBeTruthy();
      expect(el!.classList.contains("row"), hook).toBe(true);
      expect(el!.classList.contains("row--justify-between"), hook).toBe(true);
    }
  });

  it("still renders the label, badge text, and timer content", () => {
    const { getByText } = render(() => <WorkerCard {...baseProps} />);
    expect(getByText("W2")).toBeTruthy();
    expect(getByText("CLAIMED")).toBeTruthy();
    expect(getByText("3 jobs done")).toBeTruthy();
  });
});
