// MutationToolbar — mounting tests: the chips-or-sentence slot, the actions
// that render only when they can act, and the curry's words.
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import {
  MutationToolbar,
  createMutationToolbar,
  type MutationToolbarChange,
} from "./MutationToolbar";

const CHANGES: MutationToolbarChange[] = [
  { id: "june", label: "W23 · Jun 2" },
  { id: "september", label: "W36 · Sep 1" },
];

describe("MutationToolbar", () => {
  it("shows the note, not an empty bar, when there are no changes", () => {
    render(() => (
      <MutationToolbar
        title="Changes"
        changes={[]}
        selected={null}
        onSelect={() => {}}
        emptyNote="Click a week to propose a change"
      />
    ));
    expect(screen.getByText("Click a week to propose a change")).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("shows one chip per change and reports the one picked", () => {
    const onSelect = vi.fn();
    render(() => (
      <MutationToolbar
        title="Changes"
        changes={CHANGES}
        selected="june"
        onSelect={onSelect}
        emptyNote="none"
      />
    ));
    expect(screen.getByRole("radiogroup", { name: "Change being edited" })).toBeTruthy();
    fireEvent.click(screen.getByText("W36 · Sep 1"));
    expect(onSelect).toHaveBeenCalledWith("september");
  });

  it("renders only the actions it was given", () => {
    render(() => (
      <MutationToolbar
        title="Changes"
        changes={CHANGES}
        selected="june"
        onSelect={() => {}}
        emptyNote="none"
        onReset={() => {}}
      />
    ));
    expect(screen.getByText("Reset")).toBeTruthy();
    expect(screen.queryByText("Add")).toBeNull();
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("deletes the SELECTED change, and offers Delete only while one is selected", () => {
    const onDelete = vi.fn();
    const { unmount } = render(() => (
      <MutationToolbar
        title="Changes"
        changes={CHANGES}
        selected="september"
        onSelect={() => {}}
        emptyNote="none"
        onDelete={onDelete}
      />
    ));
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("september");
    unmount();
    render(() => (
      <MutationToolbar
        title="Changes"
        changes={CHANGES}
        selected={null}
        onSelect={() => {}}
        emptyNote="none"
        onDelete={onDelete}
      />
    ));
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("wires Add and Save, and disables Save on request", () => {
    const onAdd = vi.fn();
    const onSave = vi.fn();
    render(() => (
      <MutationToolbar
        title="Changes"
        changes={CHANGES}
        selected="june"
        onSelect={() => {}}
        emptyNote="none"
        onAdd={onAdd}
        onSave={onSave}
        saveDisabled
      />
    ));
    fireEvent.click(screen.getByText("Add"));
    expect(onAdd).toHaveBeenCalledOnce();
    const save = screen.getByText("Save").closest("button") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });
});

describe("createMutationToolbar", () => {
  it("bakes the screen's own words in", () => {
    const PayrollToolbar = createMutationToolbar({
      labels: { add: "Hire", chips: "Pay change being edited" },
    });
    render(() => (
      <PayrollToolbar
        title="Changes"
        changes={CHANGES}
        selected="june"
        onSelect={() => {}}
        emptyNote="none"
        onAdd={() => {}}
        onReset={() => {}}
      />
    ));
    expect(screen.getByText("Hire")).toBeTruthy();
    expect(screen.getByText("Reset")).toBeTruthy();
    expect(
      screen.getByRole("radiogroup", { name: "Pay change being edited" }),
    ).toBeTruthy();
  });
});
