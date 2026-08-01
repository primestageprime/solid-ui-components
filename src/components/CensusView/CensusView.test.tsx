import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { CensusView } from "./CensusView";
import type { CensusTable } from "./censusModel";

const tables: CensusTable[] = [
  { key: "a", entity: "Account",  fieldCount: 10, sourceRows: 50,      localRows: 50, status: "done" },
  { key: "b", entity: "Bill",     fieldCount: 40, sourceRows: 500_000, localRows: 0,  status: "todo" },
  { key: "c", entity: "Contact",  fieldCount: 8,  sourceRows: null,    localRows: 0,  status: "todo", truncated: true },
];

describe("CensusView", () => {
  it("groups tables into labeled buckets", () => {
    const { container } = render(() => <CensusView tables={tables} />);
    const text = container.textContent!;
    expect(text).toContain("< 100 rows");
    expect(text).toContain("< 1M rows");
    expect(text).toContain("Uncounted");
    expect(text).toContain("Account");
    expect(text).toContain("Bill");
  });

  it("row click opens the detail panel and fires onSelect", () => {
    let selected: CensusTable | null = null;
    const { container, getAllByText } = render(() => (
      <CensusView tables={tables} onSelect={(t) => (selected = t)} />
    ));
    fireEvent.click(getAllByText("Bill")[0]);
    expect(selected!.key).toBe("b");
    expect(container.querySelector(".sui-census-view__detail")!.textContent).toContain("Bill");
  });

  it("quick filter narrows every bucket", async () => {
    const { container } = render(() => <CensusView tables={tables} />);
    const input = container.querySelector("input")!;
    fireEvent.input(input, { target: { value: "Acc" } });
    expect(container.textContent).toContain("Account");
    expect(container.textContent).not.toContain("Bill");
  });
});
