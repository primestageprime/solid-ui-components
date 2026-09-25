// YAxisLockDialog — seeded from the lock at open, per-field errors after a
// Confirm, and only a valid lock is lifted.
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import type { YAxisDomain } from "../../hooks/createYAxisStrategy";
import { YAxisLockDialog } from "./index";

/** The visible inputs, Max first (the dialog's order). */
const field = (name: "y-max" | "y-min") =>
  document.querySelectorAll<HTMLInputElement>(".sui-number-input__input")[
    name === "y-max" ? 0 : 1
  ];

const confirmButton = () => screen.getByRole("button", { name: "Lock" });

const mount = (lock: YAxisDomain | null) => {
  const onLock = vi.fn();
  const [open, setOpen] = createSignal(false);
  render(() => (
    <YAxisLockDialog open={open()} lock={lock} onLock={onLock} onClose={() => setOpen(false)} />
  ));
  return { onLock, setOpen };
};

const type = (input: HTMLInputElement, text: string) => {
  fireEvent.input(input, { target: { value: text } });
  fireEvent.blur(input);
};

describe("YAxisLockDialog", () => {
  it("opens already holding the lock — the draft is seeded before the fields mount", () => {
    const { setOpen } = mount([80_000, 130_000]);
    setOpen(true);
    expect(field("y-max").value).toMatch(/130,000/);
    expect(field("y-min").value).toMatch(/80,000/);
  });

  it("lifts the seeded lock unchanged on Confirm", () => {
    const { onLock, setOpen } = mount([80_000, 130_000]);
    setOpen(true);
    fireEvent.click(confirmButton());
    expect(onLock).toHaveBeenCalledWith([80_000, 130_000]);
  });

  it("puts 'Max must be greater than min' on Max and lifts nothing", () => {
    const { onLock, setOpen } = mount([80_000, 130_000]);
    setOpen(true);
    type(field("y-max"), "50000");
    fireEvent.click(confirmButton());
    expect(onLock).not.toHaveBeenCalled();
    expect(screen.getByText("Max must be greater than min")).toBeTruthy();
    expect(screen.queryByText("Enter a number")).toBeNull();
  });

  it("with no lock, both fields are empty and both say 'Enter a number' after Confirm", () => {
    const { onLock, setOpen } = mount(null);
    setOpen(true);
    expect(screen.queryByText("Enter a number")).toBeNull();
    fireEvent.click(confirmButton());
    expect(onLock).not.toHaveBeenCalled();
    expect(screen.getAllByText("Enter a number")).toHaveLength(2);
  });
});
