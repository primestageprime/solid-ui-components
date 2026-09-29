import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { DoingBadge, PendingBadge, TodoBadge } from "./index";

// Workflow words over the StatusBadge tones (contract-scheduler, 2026-09-29):
// a row's status names what it IS, not which compliance tone it borrows.
describe("workflow status badges", () => {
  it.each([
    [DoingBadge, "info"],
    [TodoBadge, "compliant"],
    [PendingBadge, "pending"],
  ] as const)("%# bakes its tone and shows its label", (Badge, tone) => {
    const { container } = render(() => <Badge label="STATE" />);
    expect(container.querySelector(`.status-badge--${tone}`)).not.toBeNull();
    expect(container.textContent).toContain("STATE");
  });
});
