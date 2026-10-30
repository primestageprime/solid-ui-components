import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CompactLabelTable, CompactTable } from ".";

const data = [{ id: "1", name: "Ann" }];
const columns = [
  { id: "name", header: "Name", accessor: (r: { name: string }) => r.name },
];

describe("CompactLabelTable", () => {
  it("marks the table so its first column keeps the body font", () => {
    const { container } = render(() => (
      <CompactLabelTable data={data} columns={columns} />
    ));
    expect(container.querySelector(".hud-table--label-first")).not.toBeNull();
    expect(container.textContent).toContain("Ann");
  });
  it("leaves CompactTable on the row-index look", () => {
    const { container } = render(() => (
      <CompactTable data={data} columns={columns} />
    ));
    expect(container.querySelector(".hud-table--label-first")).toBeNull();
  });
});
