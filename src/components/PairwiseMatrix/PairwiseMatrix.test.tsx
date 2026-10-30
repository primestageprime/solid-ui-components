import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { PairwiseMatrix, createPairwiseMatrix } from ".";

const pairwise = {
  x: { x: 0, y: 3, z: 2 },
  y: { x: 1, y: 0, z: 2 },
  z: { x: 2, y: 2, z: 0 },
};

describe("PairwiseMatrix", () => {
  it("prints for–against per pair, tones wins and losses, leaves the diagonal blank", () => {
    const { container } = render(() => (
      <PairwiseMatrix
        candidates={["x", "y", "z"]}
        pairwise={pairwise}
        label={(id) => id.toUpperCase()}
      />
    ));
    const cells = [...container.querySelectorAll(".sui-value-matrix__cell")];
    expect(cells.map((c) => c.textContent)).toEqual([
      "",
      "3–1",
      "2–2",
      "1–3",
      "",
      "2–2",
      "2–2",
      "2–2",
      "",
    ]);
    const win = cells.find((c) => c.textContent === "3–1");
    const loss = cells.find((c) => c.textContent === "1–3");
    expect(win?.className).toContain("sui-value-matrix__cell--success");
    expect(loss?.className).toContain("sui-value-matrix__cell--muted");
    expect(container.textContent).toContain("vs");
  });

  it("createPairwiseMatrix bakes the corner label", () => {
    const M = createPairwiseMatrix({ cornerLabel: "row beats col" });
    const { container } = render(() => (
      <M candidates={["x", "y"]} pairwise={pairwise} />
    ));
    expect(container.textContent).toContain("row beats col");
  });
  it("heads columns with a number key and rows with 'n · name', inside its own horizontal scroll box", () => {
    const { container } = render(() => (
      <PairwiseMatrix
        candidates={["x", "y", "z"]}
        pairwise={pairwise}
        label={(id) => `Book ${id}`}
      />
    ));
    const abbrs = [...container.querySelectorAll("abbr")];
    expect(abbrs.map((a) => a.textContent)).toEqual(["1", "2", "3"]);
    expect(abbrs[1].getAttribute("title")).toBe("Book y");
    expect(container.textContent).toContain("2 Book y");
    const { container: long } = render(() => (
      <PairwiseMatrix
        candidates={["x"]}
        pairwise={pairwise}
        label={() => "Klara and the Sun"}
      />
    ));
    expect(long.querySelector('span[title="Klara and the Sun"]')?.textContent).toBe(
      "1 Klara…",
    );
    expect((container.firstElementChild as HTMLElement).style.overflowX).toBe(
      "auto",
    );
  });
});
