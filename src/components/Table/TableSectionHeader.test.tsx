// ============================================
// TableSectionHeader — the count line is the whole component, and every one of
// its decisions is silent when wrong: it renders a plausible sentence either
// way. Three rules interact, so the fixtures below are chosen to tell them
// apart rather than to be convenient:
//
//   1. `refCount = total ?? count` — plural agrees with the LARGER reference
//      number, so "1 of 5 recordS" is plural on a count of one.
//   2. `isFiltered = total != null && total > count` — a total EQUAL to the
//      count is not a filtered view, so it reads "5 records", not "5 of 5".
//   3. `meta` REPLACES the count rather than joining it.
//
// A fixture where count and total agree cannot distinguish (1) from "plural
// agrees with count", and a fixture with no total cannot see (2) at all.
// ============================================
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { TableSectionHeader } from "./TableSectionHeader";

/** The right-hand count line, or null when the component renders none. */
const countText = (container: HTMLElement) =>
  container.querySelector(".text--body")?.textContent?.trim() ?? null;

const titleText = (container: HTMLElement) =>
  container.querySelector(".text--label")?.textContent?.trim() ?? null;

describe("TableSectionHeader title", () => {
  it("renders the title as a CaptionLabel", () => {
    const { container } = render(() => <TableSectionHeader title="Alarms" />);
    expect(titleText(container)).toBe("Alarms");
  });

  it("pairs title and count on one spread row", () => {
    const { container } = render(() => (
      <TableSectionHeader title="Alarms" count={3} />
    ));
    // The point of this component is that both land in a SINGLE row container
    // rather than stacking — if they ever split into two rows, the count no
    // longer aligns with the table's right edge.
    const row = container.querySelector(".row");
    expect(row).not.toBeNull();
    expect(row!.querySelector(".text--label")).not.toBeNull();
    expect(row!.querySelector(".text--body")).not.toBeNull();
  });
});

describe("TableSectionHeader count and pluralization", () => {
  it("pluralizes a plain count", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={3} />
    ));
    expect(countText(container)).toBe("3 records");
  });

  it("uses the singular for exactly one record", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={1} />
    ));
    expect(countText(container)).toBe("1 record");
  });

  it("pluralizes zero", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={0} />
    ));
    expect(countText(container)).toBe("0 records");
  });

  it("renders no count line at all when count is omitted", () => {
    const { container } = render(() => <TableSectionHeader title="T" />);
    expect(countText(container)).toBeNull();
  });

  it("count of zero still renders — 0 is not treated as absent", () => {
    // The guard is `props.count != null`, not falsiness. A table filtered down
    // to nothing must say "0 records", not go silent.
    const { container } = render(() => (
      <TableSectionHeader title="T" count={0} />
    ));
    expect(countText(container)).not.toBeNull();
  });
});

describe("TableSectionHeader filtered counts", () => {
  it("reads 'N of TOTAL' when total exceeds count", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={3} total={24} />
    ));
    expect(countText(container)).toBe("3 of 24 records");
  });

  it("omits 'of TOTAL' when total equals count", () => {
    // `>` not `!=`: an unfiltered view passes total === count and must not
    // read "5 of 5 records".
    const { container } = render(() => (
      <TableSectionHeader title="T" count={5} total={5} />
    ));
    expect(countText(container)).toBe("5 records");
  });

  it("omits 'of TOTAL' when total is BELOW count", () => {
    // Nonsense input, but it pins the direction of the comparison — a flipped
    // `<` would render "7 of 5 records" here and stay silent everywhere else.
    const { container } = render(() => (
      <TableSectionHeader title="T" count={7} total={5} />
    ));
    expect(countText(container)).toBe("7 records");
  });

  it("plural follows the TOTAL, not the count, when filtered", () => {
    // The load-bearing fixture. count=1 alone reads "1 record"; filtered to one
    // of five it must read "1 of 5 recordS", because the reference number the
    // plural agrees with is the total. Any fixture where count and total match
    // cannot see this rule.
    const { container } = render(() => (
      <TableSectionHeader title="T" count={1} total={5} />
    ));
    expect(countText(container)).toBe("1 of 5 records");
  });

  it("singular survives a total of one", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={1} total={1} />
    ));
    expect(countText(container)).toBe("1 record");
  });
});

describe("TableSectionHeader countNoun", () => {
  it("substitutes a custom noun and pluralizes it", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={2} countNoun="alarm" />
    ));
    expect(countText(container)).toBe("2 alarms");
  });

  it("leaves a custom noun singular for one", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={1} countNoun="alarm" />
    ));
    expect(countText(container)).toBe("1 alarm");
  });

  it("applies the custom noun to a filtered count too", () => {
    const { container } = render(() => (
      <TableSectionHeader title="T" count={2} total={9} countNoun="alarm" />
    ));
    expect(countText(container)).toBe("2 of 9 alarms");
  });
});

describe("TableSectionHeader meta", () => {
  it("meta replaces the count rather than joining it", () => {
    const { container, getByText } = render(() => (
      <TableSectionHeader
        title="T"
        count={3}
        meta={<button type="button">Export</button>}
      />
    ));
    expect(getByText("Export")).toBeTruthy();
    // The count is supplied AND suppressed — this is the substitution, not a
    // case of the count simply being absent.
    expect(container.textContent).not.toContain("3 records");
  });

  it("renders meta when no count is given", () => {
    const { getByText } = render(() => (
      <TableSectionHeader title="T" meta={<span>live</span>} />
    ));
    expect(getByText("live")).toBeTruthy();
  });
});
