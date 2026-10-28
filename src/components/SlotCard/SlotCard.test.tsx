import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  TitleStatus,
  TitleDotsMeta,
  TitleAssetMarks,
  DenseStatusRow,
  DenseStatusNote,
  TitleAssetProgress,
  PickCard,
  type SlotValues,
} from "./index";

describe("SlotCard", () => {
  it("renders a shell with a max-width cap that defaults to the baked 40ch", () => {
    const { container } = render(() => (
      <TitleStatus values={{ name: { text: "Pacific Trader" } }} />
    ));
    const shell = container.querySelector(".sui-slot-card__shell") as HTMLElement;
    expect(shell).toBeTruthy();
    expect(shell.style.maxWidth).toBe("40ch");
  });

  it("coerces a numeric maxWidth override to px", () => {
    const { container } = render(() => (
      <TitleStatus maxWidth={640} values={{ name: { text: "Pacific Trader" } }} />
    ));
    const shell = container.querySelector(".sui-slot-card__shell") as HTMLElement;
    expect(shell.style.maxWidth).toBe("640px");
  });

  it("renders only the slots present in values", () => {
    const { getByText, queryByText } = render(() => (
      <TitleStatus
        values={{
          name: { text: "Aframax Horizon" },
          status: { tone: "success", label: "complete" },
        }}
      />
    ));
    expect(getByText("complete")).toBeTruthy();
    expect(queryByText("xbox5-1")).toBeNull();
  });

  it("paints an accent icon slot by tone via a modifier class, not inline style", () => {
    const { container } = render(() => (
      <DenseStatusRow
        values={
          {
            icon: { name: "check", tone: "success" },
            name: { text: "Pacific Trader" },
          } as SlotValues
        }
      />
    ));
    const icon = container.querySelector(".sui-slot-card__slot-icon--success");
    expect(icon).toBeTruthy();
  });

  it("renders labeled indicator dots for the dots slot", () => {
    const { getByText } = render(() => (
      <TitleDotsMeta
        values={{
          name: { text: "Pacific Trader" },
          dots: [
            { label: "NOx", tone: "danger" },
            { label: "ROG", tone: "success" },
          ],
        }}
      />
    ));
    expect(getByText("NOx")).toBeTruthy();
    expect(getByText("ROG")).toBeTruthy();
  });

  it("shows the corner badge and remove affordance only when configured and wired", () => {
    let removed = false;
    const { container } = render(() => (
      <PickCard
        values={{ text: "job-42" }}
        corner="12"
        onRemove={() => {
          removed = true;
        }}
      />
    ));
    expect(container.querySelector(".sui-slot-card__corner")?.textContent).toBe("12");
    const remove = container.querySelector(".sui-slot-card__remove") as HTMLElement;
    expect(remove).toBeTruthy();
    remove.click();
    expect(removed).toBe(true);
  });

  it("renders the error slot as a danger line only when a failure is present", () => {
    const ok = render(() => (
      <DenseStatusNote
        values={{
          name: { text: "Pacific Trader" },
          status: { tone: "success", label: "completed" },
        }}
      />
    ));
    expect(ok.queryByText(/timeout/)).toBeNull();

    const failed = render(() => (
      <DenseStatusNote
        values={{
          name: { text: "Nordic Star" },
          status: { tone: "danger", label: "failed" },
          error: "Upstream timeout fetching FTIR series",
        }}
      />
    ));
    expect(failed.getByText("Upstream timeout fetching FTIR series")).toBeTruthy();
  });

  it("drops a row entirely when every slot in it is absent", () => {
    const { container } = render(() => (
      <DenseStatusNote values={{ name: { text: "Pacific Trader" } }} />
    ));
    // Header row only — the error row contributes no element (and so no gap).
    expect(container.querySelectorAll(".sui-slot-card__lead").length).toBe(1);
  });

  it("renders the trailing action only when the host wires it, and isolates its click", () => {
    let selected = 0;
    let cancelled = 0;
    const { getByText, queryByText } = render(() => (
      <>
        <TitleAssetProgress
          values={{ name: { text: "Aframax Horizon" }, string: "xbox1-1" }}
          onSelect={() => {
            selected += 1;
          }}
          action={{ label: "Cancel", onClick: () => {
            cancelled += 1;
          } }}
        />
        <TitleAssetProgress values={{ name: { text: "MSC Bellissima" }, string: "xbox3-2" }} />
      </>
    ));
    // Exactly one Cancel — the second card wired no action.
    expect(queryByText("Cancel")).toBeTruthy();
    (getByText("Cancel") as HTMLElement).click();
    expect(cancelled).toBe(1);
    expect(selected).toBe(0);
  });
  describe("TitleAssetMarks", () => {
    const values: SlotValues = {
      name: { text: "Eukor Morning Christina", icon: "⛴" },
      string: "3-1",
      date: "2026-10-01",
      duration: "17.0h",
      marks: [
        { label: "NOx", ok: true },
        { label: "ROG", ok: false },
        { label: "THC", ok: null },
      ],
    };

    it("puts name + asset on row 1 and date · duration + marks on row 2", () => {
      const { container } = render(() => <TitleAssetMarks values={values} />);
      const leads = container.querySelectorAll(".sui-slot-card__lead");
      const trails = container.querySelectorAll(".sui-slot-card__trail");
      expect(leads.length).toBe(2);
      expect(leads[0].textContent).toContain("Eukor Morning Christina");
      expect(trails[0].textContent).toBe("3-1");
      expect(leads[1].textContent).toBe("2026-10-01·17.0h");
      expect(trails[1].textContent).toContain("NOx");
    });

    it("renders each mark as a label over a tri-state glyph that reads without colour", () => {
      const { getByLabelText, getByText } = render(() => <TitleAssetMarks values={values} />);
      expect(getByText("NOx")).toBeTruthy();
      expect(getByLabelText("NOx: pass").classList.contains("sui-truth--true")).toBe(true);
      expect(getByLabelText("ROG: fail").classList.contains("sui-truth--false")).toBe(true);
      expect(getByLabelText("THC: no data").textContent).toBe("–");
    });

    it("treats an undefined ok as no data, never as a fail", () => {
      const { getByLabelText } = render(() => (
        <TitleAssetMarks
          values={{ name: { text: "Themis Leader" }, marks: [{ label: "NOx", ok: undefined as never }] }}
        />
      ));
      expect(getByLabelText("NOx: no data").textContent).toBe("–");
    });

    it("omits the separator when only one of date / duration is present", () => {
      const { container } = render(() => (
        <TitleAssetMarks values={{ name: { text: "Themis Leader" }, duration: "17.0h" }} />
      ));
      const leads = container.querySelectorAll(".sui-slot-card__lead");
      expect(leads[1].textContent).toBe("17.0h");
    });

    it("sheds the asset before row 2 in a narrow rail", () => {
      const { container } = render(() => <TitleAssetMarks values={values} />);
      const asset = container.querySelectorAll(".sui-slot-card__trail [data-prio]")[0];
      expect(asset.getAttribute("data-prio")).toBe("3");
      const row2 = container.querySelectorAll(".sui-slot-card__lead")[1];
      const prios = Array.from(row2.querySelectorAll("[data-prio]"), (el) => el.getAttribute("data-prio"));
      expect(new Set(prios)).toEqual(new Set(["2"]));
    });
  });
});
