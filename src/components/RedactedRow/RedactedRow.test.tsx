import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { LockedRow, createRedactedRow } from ".";

describe("RedactedRow", () => {
  it("renders its label as a note with a padlock", () => {
    const { container, getByRole } = render(() => (
      <LockedRow label="Hidden until the meeting" />
    ));
    expect(getByRole("note").textContent).toContain("Hidden until the meeting");
    expect(container.querySelector(".sui-redacted-row")).not.toBeNull();
  });

  it("createRedactedRow produces a data-only variant", () => {
    const Row = createRedactedRow();
    const { getByRole } = render(() => <Row label="Unlocks at ch. 9" />);
    expect(getByRole("note").textContent).toContain("Unlocks at ch. 9");
  });
});
