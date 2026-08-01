import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { For } from "solid-js";
import { TableQuickFilter } from "./TableQuickFilter";

afterEach(cleanup);

// TableQuickFilter (ruled 2026-07-18): the client-side filter module composes with
// ANY table — children get the filtered-rows accessor once and render whatever
// they like from it.

interface Row {
  name: string;
  port: string;
}

const ROWS: Row[] = [
  { name: "Coral Dawn", port: "Oakland" },
  { name: "Iron Gull", port: "Long Beach" },
  { name: "Pearl Runner", port: "Oakland" },
];

const setup = () =>
  render(() => (
    <TableQuickFilter data={ROWS} placeholder="Filter vessels…">
      {(filtered) => (
        <ul>
          <For each={filtered()}>{(r) => <li>{r.name}</li>}</For>
        </ul>
      )}
    </TableQuickFilter>
  ));

const itemTexts = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("li")).map((li) => li.textContent);

describe("TableQuickFilter", () => {
  it("passes all rows through when the filter is empty", () => {
    const { container } = setup();
    expect(itemTexts(container)).toEqual([
      "Coral Dawn",
      "Iron Gull",
      "Pearl Runner",
    ]);
    expect(
      container.querySelector(".hud-table-quickfilter__count")?.textContent,
    ).toBe("3");
  });

  it("filters across every row value and shows shown-of-total", () => {
    const { container } = setup();
    const input = container.querySelector(
      ".hud-table-quickfilter__input",
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "oakland" } });
    expect(itemTexts(container)).toEqual(["Coral Dawn", "Pearl Runner"]);
    expect(
      container.querySelector(".hud-table-quickfilter__count")?.textContent,
    ).toBe("2 of 3");
  });

  it("spaces match flexibly across a row's text", () => {
    const { container } = setup();
    const input = container.querySelector(
      ".hud-table-quickfilter__input",
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "iron beach" } });
    expect(itemTexts(container)).toEqual(["Iron Gull"]);
  });
});
