import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils";
import { Button } from "../Button/Button";
import { Combobox, type ComboboxOption } from "../Combobox/Combobox";
import { CurrencyInput } from "../CurrencyInput/CurrencyInput";
import { DatePicker } from "../DatePicker/DatePicker";
import { ThemedInput } from "../Inputs/ThemedInput";
import { ThemedTextarea } from "../Inputs/ThemedTextarea";
import { Select } from "../Select/Select";
import { ThemedNumberInput } from "../ThemedNumberInput/ThemedNumberInput";
import { ConfirmationModal } from "./ConfirmationModal";
import { Modal } from "./Modal";

// Owner rule (thorcasting, 2026-10-21): Enter in every form submits that
// form, and SUI does it. These tests drive real SUI fields inside a Modal
// with `onSubmit`, in the shape of the thorcasting "Add a service" dialog:
// Cancel (`type="button"` by default) first, then the primary action as `type="submit"`.

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());
afterEach(cleanup);

const tick = () => new Promise((r) => queueMicrotask(() => r(null)));
const q = <T extends Element>(sel: string) => document.querySelector(sel) as T;
const submitButton = () => q<HTMLButtonElement>('button[type="submit"]');

function mountDialog(opts: { canAdd?: () => boolean } = {}) {
  const [name, setName] = createSignal("");
  const [hours, setHours] = createSignal<number | undefined>(20);
  const [rate, setRate] = createSignal<number | undefined>(100);
  const [notes, setNotes] = createSignal("");
  const submitted: Array<{ name: string; hours?: number; rate?: number }> = [];
  const onSubmit = vi.fn(() => {
    submitted.push({ name: name(), hours: hours(), rate: rate() });
  });
  const onClose = vi.fn();
  render(() => (
    <Modal
      open={true}
      onClose={onClose}
      title="Add a service"
      onSubmit={onSubmit}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!(opts.canAdd?.() ?? true)}
          >
            Add
          </Button>
        </>
      }
    >
      <ThemedInput
        label="Name"
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
      />
      <ThemedNumberInput
        name="hours"
        label="Hours a week"
        value={hours}
        onChange={setHours}
        min={1}
        max={80}
      />
      <CurrencyInput name="rate" label="Rate" value={rate} onChange={setRate} />
      <ThemedTextarea
        label="Notes"
        value={notes()}
        onInput={(e) => setNotes(e.currentTarget.value)}
      />
    </Modal>
  ));
  const nameInput = q<HTMLInputElement>(".sui-modal input:not([type])");
  const [hoursInput, rateInput] = [
    ...document.querySelectorAll<HTMLInputElement>(".sui-number-input__input"),
  ];
  return { onSubmit, onClose, submitted, nameInput, hoursInput, rateInput };
}

describe("Modal onSubmit — Enter submits the form", () => {
  it("Enter in a text field submits once with the typed value", () => {
    const d = mountDialog();
    fireEvent.input(d.nameInput, { target: { value: "Gutters" } });
    fireEvent.keyDown(d.nameInput, { key: "Enter" });
    expect(d.onSubmit).toHaveBeenCalledTimes(1);
    expect(d.submitted[0]?.name).toBe("Gutters");
    expect(d.onClose).not.toHaveBeenCalled();
  });

  it("Enter in a number field commits (clamps) the value before the submit reads it", () => {
    const d = mountDialog();
    fireEvent.focus(d.hoursInput);
    fireEvent.input(d.hoursInput, { target: { value: "95" } });
    fireEvent.keyDown(d.hoursInput, { key: "Enter" });
    expect(d.onSubmit).toHaveBeenCalledTimes(1);
    expect(d.submitted[0]?.hours).toBe(80);
  });

  it("Enter in a CurrencyInput submits the typed amount", () => {
    const d = mountDialog();
    fireEvent.focus(d.rateInput);
    fireEvent.input(d.rateInput, { target: { value: "125" } });
    fireEvent.keyDown(d.rateInput, { key: "Enter" });
    expect(d.onSubmit).toHaveBeenCalledTimes(1);
    expect(d.submitted[0]?.rate).toBe(125);
  });

  it("a click on the type=submit button submits once", () => {
    const d = mountDialog();
    fireEvent.click(submitButton());
    expect(d.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("a click on Cancel (type=button by default) never submits", () => {
    const d = mountDialog();
    const cancel = q<HTMLButtonElement>(".sui-modal__footer button");
    expect(cancel.getAttribute("type")).toBe("button");
    fireEvent.click(cancel);
    expect(d.onClose).toHaveBeenCalledTimes(1);
    expect(d.onSubmit).not.toHaveBeenCalled();
  });

  it("Enter does nothing while the submit button is disabled", () => {
    const d = mountDialog({ canAdd: () => false });
    const passed = fireEvent.keyDown(d.nameInput, { key: "Enter" });
    expect(d.onSubmit).not.toHaveBeenCalled();
    expect(d.onClose).not.toHaveBeenCalled();
    // The key is still taken, so the browser does not submit on its own.
    expect(passed).toBe(false);
  });

  it("Enter in a textarea is left alone (newline), no submit", () => {
    const d = mountDialog();
    const passed = fireEvent.keyDown(q("textarea"), { key: "Enter" });
    expect(passed).toBe(true);
    expect(d.onSubmit).not.toHaveBeenCalled();
  });

  it("Shift+Enter and an IME composition do not submit", () => {
    const d = mountDialog();
    fireEvent.keyDown(d.nameInput, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(d.nameInput, { key: "Enter", isComposing: true });
    expect(d.onSubmit).not.toHaveBeenCalled();
  });
});

describe("Modal onSubmit — fields where Enter has its own meaning", () => {
  const OPTIONS: ComboboxOption[] = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Bravo" },
  ];

  function mountWith(field: () => import("solid-js").JSX.Element) {
    const onSubmit = vi.fn();
    render(() => (
      <Modal
        open={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        footer={<Button type="submit">Save</Button>}
      >
        {field()}
      </Modal>
    ));
    return onSubmit;
  }

  it("Enter in an OPEN Combobox picks the option and does not submit", async () => {
    const [value, setValue] = createSignal<ComboboxOption | null>(null);
    const onChange = vi.fn((v: ComboboxOption | null) => setValue(v));
    const onSubmit = mountWith(() => (
      <Combobox options={() => OPTIONS} value={value} onChange={onChange} />
    ));
    const input = q<HTMLInputElement>(".sui-combobox__input");
    fireEvent.click(q(".sui-combobox__trigger"));
    fireEvent.input(input, { target: { value: "Bra" } });
    await tick();
    // Open with nothing highlighted: Enter belongs to the list, no submit.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter in a CLOSED Combobox submits", () => {
    const onSubmit = mountWith(() => (
      <Combobox options={() => OPTIONS} value={() => OPTIONS[0] ?? null} />
    ));
    fireEvent.keyDown(q(".sui-combobox__input"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Enter on a Select trigger opens it and does not submit", () => {
    const onSubmit = mountWith(() => (
      <Select
        options={() => [
          { value: "w", label: "Weekly" },
          { value: "m", label: "Monthly" },
        ]}
        placeholder="Cadence"
      />
    ));
    fireEvent.keyDown(q(".sui-modal__body button"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Enter in a DatePicker submits the picked day", () => {
    const [day, setDay] = createSignal("2026-10-21");
    const seen: string[] = [];
    const onSubmit = vi.fn(() => seen.push(day()));
    render(() => (
      <Modal
        open={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        footer={<Button type="submit">Save</Button>}
      >
        <DatePicker value={day()} onChange={setDay} label="Start" />
      </Modal>
    ));
    const date = q<HTMLInputElement>('input[type="date"]');
    fireEvent.input(date, { target: { value: "2026-11-02" } });
    fireEvent.change(date, { target: { value: "2026-11-02" } });
    fireEvent.keyDown(date, { key: "Enter" });
    expect(seen).toEqual(["2026-11-02"]);
  });
});

describe("Modal without onSubmit — unchanged", () => {
  it("renders no form, and Enter does nothing", () => {
    render(() => (
      <Modal open={true} onClose={() => {}} footer={<Button>Ok</Button>}>
        <input class="plain" />
      </Modal>
    ));
    expect(document.querySelector(".sui-modal form")).toBeNull();
    const passed = fireEvent.keyDown(q(".plain"), { key: "Enter" });
    expect(passed).toBe(true);
  });
});

describe("ConfirmationModal — Enter confirms", () => {
  function mountConfirm(
    p: { confirmDisabled?: boolean; loading?: boolean } = {},
  ) {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(() => (
      <ConfirmationModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Lock the axis"
        confirmDisabled={p.confirmDisabled}
        loading={p.loading}
      >
        <input class="field" />
      </ConfirmationModal>
    ));
    return { onConfirm, onClose, field: q<HTMLInputElement>(".field") };
  }

  it("Enter in a body field confirms once", () => {
    const m = mountConfirm();
    fireEvent.keyDown(m.field, { key: "Enter" });
    expect(m.onConfirm).toHaveBeenCalledTimes(1);
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("a click on Confirm confirms once; Cancel only closes", () => {
    const m = mountConfirm();
    const [cancel, confirm] = [
      ...document.querySelectorAll<HTMLButtonElement>(
        ".sui-modal__footer button",
      ),
    ];
    fireEvent.click(confirm as HTMLButtonElement);
    fireEvent.click(cancel as HTMLButtonElement);
    expect(m.onConfirm).toHaveBeenCalledTimes(1);
    expect(m.onClose).toHaveBeenCalledTimes(1);
  });

  it("Enter does nothing while confirm is disabled or loading", () => {
    const a = mountConfirm({ confirmDisabled: true });
    fireEvent.keyDown(a.field, { key: "Enter" });
    expect(a.onConfirm).not.toHaveBeenCalled();
    cleanup();
    const b = mountConfirm({ loading: true });
    fireEvent.keyDown(b.field, { key: "Enter" });
    expect(b.onConfirm).not.toHaveBeenCalled();
  });
});
