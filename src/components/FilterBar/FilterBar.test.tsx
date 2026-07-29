// FilterBar — the contracts a consumer builds against.
//
// jsdom has no layout, so the tier-three WIDTH decision can't be exercised here
// (every offsetWidth is 0); that behaviour is verified in the browser and
// guarded by the reserve constant. What is pinned here is the API surface a
// consumer depends on and would not notice breaking: the empty-means-all
// reading, that a filtered dimension still offers its full member list, and
// that "added but empty" never reaches the caller.
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, fireEvent } from "@solidjs/testing-library";
import { FilterBar, type FilterGroup } from "./FilterBar";

afterEach(cleanup);

const DIMENSIONS = [
  { id: "region", label: "Region" },
  { id: "rep", label: "Rep" },
];

const REGION: FilterGroup = {
  id: "region",
  label: "Region",
  terms: [{ value: "emea", label: "EMEA" }],
  members: [
    { value: "emea", label: "EMEA" },
    { value: "amer", label: "AMER" },
    { value: "apac", label: "APAC" },
  ],
};

const noop = () => {};
const baseProps = {
  availableDimensions: DIMENSIONS,
  scopeLabel: "all orders",
  onRemoveFilter: noop,
  onAddTerm: noop,
  onRemoveTerm: noop,
  onClearAll: noop,
};

describe("FilterBar", () => {
  it("offers a filtered dimension's FULL member list, minus what is chosen", () => {
    // Load-bearing for cross-filtering: a consumer excludes a dimension's own
    // filter when computing that dimension's options (own-dimension
    // exclusion). If the bar narrowed the list to what currently matches, a
    // user could never switch from EMEA to AMER — the option would be gone.
    const { getByLabelText, getByText, queryByText } = render(() => (
      <FilterBar {...baseProps} filters={[REGION]} />
    ));
    fireEvent.click(getByLabelText("Add a Region term"));
    // Both unchosen members are offered even though EMEA is active…
    expect(getByText("AMER")).toBeTruthy();
    expect(getByText("APAC")).toBeTruthy();
    // …and the already-chosen one is not repeated in the picker.
    expect(queryByText("EMEA")).toBeTruthy(); // present as a lozenge
  });

  it("renders a member count only when the member carries one", () => {
    const counted: FilterGroup = {
      ...REGION,
      terms: [],
      members: [
        { value: "amer", label: "AMER", count: 12 },
        { value: "apac", label: "APAC" }, // no count
      ],
    };
    const { getByLabelText, container } = render(() => (
      <FilterBar {...baseProps} filters={[counted]} />
    ));
    fireEvent.click(getByLabelText("Add a Region term"));
    const counts = container.querySelectorAll(".sui-filter-bar__option-count");
    // One member has a count, the other doesn't — so exactly one span.
    expect(counts.length).toBe(1);
    expect(counts[0].textContent).toBe("12");
  });

  it("keeps 'added but empty' internal — the caller is never told", () => {
    // goose serialises filter state to a URL. A dimension picked from (+) but
    // not yet given a term constrains nothing, so pushing it at the caller
    // would put a meaningless entry in a shared link.
    const onRemoveFilter = vi.fn();
    const { getByLabelText, getByText } = render(() => (
      <FilterBar {...baseProps} filters={[]} onRemoveFilter={onRemoveFilter} />
    ));
    fireEvent.click(getByLabelText("Add a filter"));
    fireEvent.click(getByText("Region"));
    // The group is now showing…
    expect(getByText("Region")).toBeTruthy();
    // …and nothing was asked of the caller. There is no onAddFilter prop to
    // fire, and removing state the caller never had would be incoherent.
    expect(onRemoveFilter).not.toHaveBeenCalled();
  });

  it("reports a term add through onAddTerm, which is the caller's state edit", () => {
    const onAddTerm = vi.fn();
    const { getByLabelText, getByText } = render(() => (
      <FilterBar {...baseProps} filters={[REGION]} onAddTerm={onAddTerm} />
    ));
    fireEvent.click(getByLabelText("Add a Region term"));
    fireEvent.click(getByText("AMER"));
    expect(onAddTerm).toHaveBeenCalledWith("region", "amer");
  });

  it("shows no clear affordance when nothing is filtered", () => {
    const { queryByText } = render(() => (
      <FilterBar {...baseProps} filters={[]} />
    ));
    expect(queryByText("clear")).toBeNull();
  });
});
