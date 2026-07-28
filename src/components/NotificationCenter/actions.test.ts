import { describe, it, expect, vi } from "vitest";
import {
  acceptAction,
  closesPanel,
  declineAction,
  deleteAction,
  dismissAction,
  markReadAction,
  viewAction,
} from "./actions";

describe("prefab action builders", () => {
  it("viewAction navigates, is accent, and closes the panel", () => {
    const a = viewAction("/vault");
    expect(a).toMatchObject({ label: "View", href: "/vault", tone: "accent" });
    expect(closesPanel(a)).toBe(true);
  });

  it("the in-place builders carry their tone and glyph and leave the panel open", () => {
    const fn = () => {};
    const cases = [
      [dismissAction(fn), "Dismiss", "muted", "close"],
      [markReadAction(fn), "Mark read", "muted", "check"],
      [acceptAction(fn), "Accept", "accent", "check"],
      [declineAction(fn), "Decline", "danger", "close"],
      [deleteAction(fn), "Delete", "danger", "trash"],
    ] as const;
    for (const [action, label, tone, icon] of cases) {
      expect(action).toMatchObject({ label, tone, icon });
      expect(closesPanel(action)).toBe(false);
    }
  });

  it("every builder takes a label override", () => {
    expect(viewAction("/x", "Open the Vault").label).toBe("Open the Vault");
    expect(dismissAction(() => {}, "Clear").label).toBe("Clear");
    expect(markReadAction(() => {}, "Seen").label).toBe("Seen");
    expect(acceptAction(() => {}, "Approve").label).toBe("Approve");
    expect(declineAction(() => {}, "Reject").label).toBe("Reject");
    expect(deleteAction(() => {}, "Destroy").label).toBe("Destroy");
  });

  it("wires the supplied handler", () => {
    const fn = vi.fn();
    dismissAction(fn).onClick?.();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
