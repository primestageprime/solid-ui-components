import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { initialFocusTarget } from "../../hooks/initialFocus";
import { type FakeSizer, installFakeSizer } from "../../test-utils";
import { BottomSheet } from "../BottomSheet/BottomSheet";
import { Button } from "../Button/Button";
import { Combobox } from "../Combobox/Combobox";
import { CurrencyInput } from "../CurrencyInput/CurrencyInput";
import { ThemedInput } from "../Inputs/ThemedInput";
import { ThemedNumberInput } from "../ThemedNumberInput/ThemedNumberInput";
import { ConfirmationModal } from "./ConfirmationModal";
import { Modal } from "./Modal";

// Owner rule (thorcasting, 2026-10-21): "opening a form composed of sui
// components should always put focus in the right place so I don't have to
// click or hit tab to be in the first input" (hooks/initialFocus).

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());
afterEach(cleanup);

const active = () => document.activeElement;

/** A page with an opener button and a Modal it opens around `body`. */
function mountOpener(body: () => JSX.Element, footer?: () => JSX.Element) {
  const [open, setOpen] = createSignal(false);
  render(() => (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal
        open={open()}
        onClose={() => setOpen(false)}
        title="Add a service"
        showClose={true}
        footer={footer?.()}
      >
        {body()}
      </Modal>
    </>
  ));
  const opener = document.querySelector("button") as HTMLButtonElement;
  opener.focus();
  fireEvent.click(opener);
  return { opener, close: () => setOpen(false) };
}

describe("Modal — focus on open", () => {
  it("opens with focus in the first field, not the close button", async () => {
    mountOpener(() => (
      <>
        <ThemedInput label="Name" />
        <ThemedInput label="Code" />
      </>
    ));
    const first = document.querySelector(".sui-modal input");
    await waitFor(() => expect(active()).toBe(first));
  });

  it("a data-autofocus field wins over the first field", async () => {
    mountOpener(() => (
      <>
        <ThemedInput label="Name" />
        <ThemedInput label="Code" data-autofocus />
      </>
    ));
    await waitFor(() =>
      expect(active()?.hasAttribute("data-autofocus")).toBe(true),
    );
  });

  it("skips a disabled first field", async () => {
    mountOpener(() => (
      <>
        <ThemedInput label="Locked" disabled />
        <ThemedInput label="Name" />
      </>
    ));
    const inputs = document.querySelectorAll(".sui-modal input");
    await waitFor(() => expect(active()).toBe(inputs[1]));
  });

  it("with no field, focuses the submit button", async () => {
    mountOpener(
      () => <p>Delete the row?</p>,
      () => (
        <>
          <Button>Cancel</Button>
          <Button type="submit">Delete</Button>
        </>
      ),
    );
    await waitFor(() => expect(active()?.getAttribute("type")).toBe("submit"));
  });

  it("with nothing to focus, focuses the dialog itself", async () => {
    render(() => (
      <Modal open={true} onClose={() => {}} showClose={false}>
        <p>Read only.</p>
      </Modal>
    ));
    const dialog = document.querySelector('[role="dialog"]');
    await waitFor(() => expect(active()).toBe(dialog));
  });

  it("gives focus back to the opener on close", async () => {
    const { opener, close } = mountOpener(() => <ThemedInput label="Name" />);
    await waitFor(() => expect(active()?.tagName).toBe("INPUT"));
    close();
    expect(active()).toBe(opener);
  });

  it("lands on the real <input> of a number, currency and combobox field", () => {
    const one = (field: () => JSX.Element) => {
      const { unmount } = render(() => (
        <Modal open={true} onClose={() => {}} showClose={false}>
          {field()}
        </Modal>
      ));
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      const target = initialFocusTarget(dialog);
      unmount();
      return target.tagName;
    };
    expect(
      one(() => (
        <ThemedNumberInput
          name="f"
          label="Hours"
          value={() => 1}
          onChange={() => {}}
        />
      )),
    ).toBe("INPUT");
    expect(
      one(() => (
        <CurrencyInput
          name="f"
          label="Rate"
          value={() => 1}
          onChange={() => {}}
        />
      )),
    ).toBe("INPUT");
    expect(
      one(() => (
        <Combobox
          label="Kind"
          options={() => [{ value: "a", label: "Alpha" }]}
          onChange={() => {}}
        />
      )),
    ).toBe("INPUT");
  });
});

describe("ConfirmationModal and BottomSheet — focus on open", () => {
  it("ConfirmationModal focuses its body field", async () => {
    render(() => (
      <ConfirmationModal
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Rename"
      >
        <ThemedInput label="New name" />
      </ConfirmationModal>
    ));
    await waitFor(() => expect(active()?.tagName).toBe("INPUT"));
  });

  it("BottomSheet focuses its first field", async () => {
    render(() => (
      <BottomSheet open={true} onClose={() => {}}>
        <ThemedInput label="Search" />
      </BottomSheet>
    ));
    const field = document.querySelector(".sui-bottom-sheet__body input");
    await waitFor(() => expect(active()).toBe(field));
  });
});
