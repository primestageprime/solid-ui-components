import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { QuickFilter } from "./index";

describe("QuickFilter (atomic)", () => {
  const items = [
    { id: 1, name: "alpha bravo" },
    { id: 2, name: "alpha charlie" },
    { id: 3, name: "delta" },
  ];

  it("renders all items with empty query", () => {
    const { container } = render(() => (
      <QuickFilter items={items} extract={(i) => i.name}>
        {(filtered) => (
          <ul>
            {filtered.map((i) => (
              <li>{i.name}</li>
            ))}
          </ul>
        )}
      </QuickFilter>
    ));
    expect(container.querySelectorAll("li").length).toBe(3);
  });

  it("filters by single token (substring, case-insensitive)", () => {
    const { container } = render(() => (
      <QuickFilter items={items} extract={(i) => i.name}>
        {(filtered) => (
          <ul>
            {filtered.map((i) => (
              <li>{i.name}</li>
            ))}
          </ul>
        )}
      </QuickFilter>
    ));
    const input = container.querySelector("input")!;
    fireEvent.input(input, { target: { value: "ALPHA" } });
    expect(container.querySelectorAll("li").length).toBe(2);
  });

  it("requires every whitespace-split token to match", () => {
    const { container } = render(() => (
      <QuickFilter items={items} extract={(i) => i.name}>
        {(filtered) => (
          <ul>
            {filtered.map((i) => (
              <li>{i.name}</li>
            ))}
          </ul>
        )}
      </QuickFilter>
    ));
    const input = container.querySelector("input")!;
    fireEvent.input(input, { target: { value: "alpha char" } });
    const matched = Array.from(container.querySelectorAll("li")).map(
      (li) => li.textContent,
    );
    expect(matched).toEqual(["alpha charlie"]);
  });
});
