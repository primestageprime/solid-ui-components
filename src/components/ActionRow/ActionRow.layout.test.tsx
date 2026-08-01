import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ActionRow } from "./ActionRow";

afterEach(cleanup);

// Layout-purity regression guard. The column + rows are composed from Layout
// (NarrowStack / ClusterRow / NoShrinkClusterRow / GrowBox / EndWrapRow) with
// BEM hook classes retained. Gaps snapped to xs/sm. Hover-reveal + button
// rendering must not regress.
describe("ActionRow layout purity", () => {
  const props = {
    leading: <span class="lead">L</span>,
    trailing: <span class="trail">T</span>,
    actions: [{ label: "Do", onClick: () => {} }],
  };

  it("composes the outer column + main row from Layout, keeping BEM hooks", () => {
    const { container } = render(() => <ActionRow {...props}>body</ActionRow>);
    const root = container.querySelector(".sui-action-row")!;
    expect(root.classList.contains("stack")).toBe(true);
    expect(root.classList.contains("stack--gap-sm")).toBe(true);

    const main = container.querySelector(".sui-action-row__main")!;
    expect(main.classList.contains("row")).toBe(true);
    expect(main.classList.contains("row--align-center")).toBe(true);

    const body = container.querySelector(".sui-action-row__body")!;
    expect(body.classList.contains("box")).toBe(true);
    expect(body.classList.contains("box--grow")).toBe(true);
  });

  it("leading/trailing are no-shrink clusters; actions is an end-wrap row", () => {
    const { container } = render(() => <ActionRow {...props}>body</ActionRow>);
    for (const hook of [".sui-action-row__leading", ".sui-action-row__trailing"]) {
      const el = container.querySelector(hook)!;
      expect(el.classList.contains("row"), hook).toBe(true);
    }
    const actions = container.querySelector(".sui-action-row__actions")!;
    expect(actions.classList.contains("row--justify-end")).toBe(true);
    expect(actions.classList.contains("row--wrap")).toBe(true);
    expect(actions.querySelector("button.sui-action-row__btn")).toBeTruthy();
  });

  it("renders the body and action label content", () => {
    const { getByText } = render(() => <ActionRow {...props}>body</ActionRow>);
    expect(getByText("body")).toBeTruthy();
    expect(getByText("Do")).toBeTruthy();
  });
});
