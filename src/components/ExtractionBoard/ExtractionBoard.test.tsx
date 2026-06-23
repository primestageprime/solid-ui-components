import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  ExtractionBoard,
  createExtractionBoard,
} from "./ExtractionBoard";
import type { ExtractionBoardConfig, BoardTable } from "./types";

// A minimal two-category, two-data-type config reused across the cases. The
// board derives the whole Summary / Done / Doing / Todo / +N view from the
// `tables` array alone, so each test just varies the table store.
const config: ExtractionBoardConfig = {
  categories: [
    { id: "lookup", label: "Lookup" },
    { id: "fact", label: "Fact" },
  ],
  dataTypes: [
    { id: "int", label: "Integer", icon: "chart-bar" },
    { id: "text", label: "Text", icon: "menu" },
  ],
  multiBatchAbove: 10_000,
};

const mk = (over: Partial<BoardTable> & Pick<BoardTable, "name" | "category">): BoardTable => ({
  status: "todo",
  totalRows: 100,
  transferredRows: 0,
  colsByType: { int: 1 },
  ...over,
});

const textOf = (el: Element | null) => el?.textContent ?? "";

describe("ExtractionBoard", () => {
  it("renders one swimlane row per configured category (plus the header row)", () => {
    const tables: BoardTable[] = [
      mk({ name: "DIM_A", category: "lookup" }),
      mk({ name: "FACT_A", category: "fact" }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    // 1 header row + 2 category rows.
    expect(container.querySelectorAll(".sui-xb__row").length).toBe(3);
  });

  it("ignores tables whose category is not in the config", () => {
    const tables: BoardTable[] = [
      mk({ name: "ORPHAN", category: "nope", status: "doing" }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    // No Doing card should render for the unknown category.
    expect(textOf(container)).not.toContain("ORPHAN");
  });

  it("derives a complete Summary status when every table in a category is done", () => {
    const tables: BoardTable[] = [
      mk({ name: "DIM_A", category: "lookup", status: "done", transferredRows: 100 }),
      mk({ name: "DIM_B", category: "lookup", status: "done", transferredRows: 100 }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    // The lookup lane's summary badge reads "Done".
    expect(textOf(container)).toContain("Done");
  });

  it("shows the latest done table (last resolved in array order) in the Done column", () => {
    const tables: BoardTable[] = [
      mk({ name: "DIM_OLD", category: "lookup", status: "done", transferredRows: 100 }),
      mk({ name: "DIM_NEW", category: "lookup", status: "done", transferredRows: 100 }),
      mk({ name: "DIM_TODO", category: "lookup", status: "todo" }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    // The board keeps the LAST done table per category — DIM_NEW, not DIM_OLD.
    expect(textOf(container)).toContain("DIM_NEW");
  });

  it("renders a SKIPPED badge for an empty (skipped) source", () => {
    const tables: BoardTable[] = [
      mk({ name: "DIM_EMPTY", category: "lookup", status: "skipped", totalRows: 0 }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    expect(textOf(container)).toContain("Skipped");
  });

  it("renders an eased BatchBar for a small doing table (whole table as one batch)", () => {
    const tables: BoardTable[] = [
      mk({
        name: "DIM_SMALL",
        category: "lookup",
        status: "doing",
        totalRows: 200,
        transferredRows: 100,
      }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    // Small tables now drive the same self-easing BatchBar (one synthetic
    // batch of the whole table) rather than a static SlotFillBar.
    const bar = container.querySelector(".sui-batch-bar");
    expect(bar).not.toBeNull();
    expect(bar!.querySelector(".sui-batch-bar__fill")).not.toBeNull();
    expect(textOf(container)).toContain("DIM_SMALL");
  });

  it("renders a multi-batch BatchBar for a large doing table with batches", () => {
    const tables: BoardTable[] = [
      mk({
        name: "FACT_BIG",
        category: "fact",
        status: "doing",
        totalRows: 50_000,
        transferredRows: 20_000,
        batches: [
          { rows: 10_000, state: "done" },
          { rows: 10_000, state: "done" },
          { rows: 10_000, state: "running" },
          { rows: 10_000, state: "running" },
          { rows: 10_000, state: "pending" },
        ],
      }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    expect(container.querySelector(".sui-batch-bar")).not.toBeNull();
  });

  it("counts the REST of the queued tables in the +N lozenge (next todo is its own card)", () => {
    const tables: BoardTable[] = [
      mk({ name: "DIM_1", category: "lookup", status: "todo" }),
      mk({ name: "DIM_2", category: "lookup", status: "todo" }),
      mk({ name: "DIM_3", category: "lookup", status: "todo" }),
      mk({ name: "DIM_4", category: "lookup", status: "todo" }),
    ];
    const { container } = render(() => (
      <ExtractionBoard config={config} tables={tables} />
    ));
    const lozenge = container.querySelector(".sui-xb__lozenge:last-child");
    // 4 todo: 1 shown as the Todo card, the lozenge counts the other 3.
    expect(textOf(container)).toContain("3");
    expect(lozenge).not.toBeNull();
  });

  it("createExtractionBoard bakes the config and takes data props only", () => {
    const Board = createExtractionBoard(config);
    const tables: BoardTable[] = [
      mk({ name: "DIM_A", category: "lookup", status: "doing", transferredRows: 50 }),
    ];
    const { container } = render(() => <Board tables={tables} />);
    expect(container.querySelector(".sui-xb")).not.toBeNull();
    expect(textOf(container)).toContain("DIM_A");
  });
});
