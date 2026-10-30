import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { fireEvent, render } from "@solidjs/testing-library";
import { TieableRankList, createTieableRankList } from ".";

const Harness = (p: { onChange?: (o: string[], t: boolean[]) => void }) => {
  const [order, setOrder] = createSignal(["a", "b", "c"]);
  const [ties, setTies] = createSignal([true, false]);
  return (
    <TieableRankList
      items={order()}
      getId={(id) => id}
      ties={ties()}
      itemLabel={(id) => id.toUpperCase()}
      onChange={(o, t) => {
        setOrder(o);
        setTies(t);
        p.onChange?.(o, t);
      }}
      renderItem={(id) => <span data-testid="row">{id}</span>}
      renderAction={(id) => (
        <button type="button" aria-label={`Veto ${id}`}>
          ⊘
        </button>
      )}
    />
  );
};

describe("TieableRankList", () => {
  it("shows shared ranks for tied rows, a tie toggle per gap, and the action slot", () => {
    const { getByLabelText, getAllByRole } = render(() => <Harness />);
    expect(getByLabelText(/^Rank 1: A/).textContent).toBe("1");
    expect(getByLabelText(/^Rank 1: B/).textContent).toBe("1");
    expect(getByLabelText(/^Rank 2: C/).textContent).toBe("2");
    const toggles = getAllByRole("button").filter((b) =>
      b.hasAttribute("aria-pressed"),
    );
    expect(toggles.map((t) => t.getAttribute("aria-label"))).toEqual([
      "Untie A from B",
      "Tie B with C",
    ]);
    expect(getByLabelText("Veto c")).toBeTruthy();
  });

  it("a tie toggle reports the flipped gap", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(() => <Harness onChange={onChange} />);
    fireEvent.click(getByLabelText("Tie B with C"));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"], [true, true]);
  });

  it("Alt+ArrowDown on a rank moves the row and re-ties", () => {
    const onChange = vi.fn();
    const { getByLabelText, getAllByTestId } = render(() => (
      <Harness onChange={onChange} />
    ));
    fireEvent.keyDown(getByLabelText(/^Rank 1: B/), {
      key: "ArrowDown",
      altKey: true,
    });
    expect(onChange).toHaveBeenLastCalledWith(["a", "c", "b"], [false, false]);
    expect(getAllByTestId("row").map((r) => r.textContent)).toEqual([
      "a",
      "c",
      "b",
    ]);
    fireEvent.keyDown(getByLabelText(/: A\./), { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("createTieableRankList yields a generic data-only variant", () => {
    const List = createTieableRankList();
    const { getAllByTestId } = render(() => (
      <List
        items={[{ k: "x" }]}
        getId={(i) => i.k}
        ties={[]}
        onChange={() => {}}
        renderItem={(i) => <span data-testid="r">{i.k}</span>}
      />
    ));
    expect(getAllByTestId("r")).toHaveLength(1);
  });
});
