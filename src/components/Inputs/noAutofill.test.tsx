// The no-autofill default, read off the rendered DOM: every text-like field
// carries the attributes that tell browsers and password managers to leave
// it alone, and a field that opts in (`autofill`, or a stated `autocomplete`)
// carries none of them. The inline editors that only mount after a click
// (EditableTitle, StatusChip, MutableList, FilterBar) are held by the static
// guard in noAutofill.guard.test.ts.
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { For, type JSX } from "solid-js";
import {
  NO_AUTOFILL_ATTRS,
  NO_AUTOFILL_TEXT_ATTRS,
  noAutofillAttrs,
  noAutofillTextAttrs,
  wantsAutofill,
} from "./noAutofill";
import { ThemedInput } from "./ThemedInput";
import { ThemedTextarea } from "./ThemedTextarea";
import { FillTextArea } from "./FillTextArea";
import { NameInput } from "./NameInput";
import { SearchField } from "../SearchInput/SearchField";
import { BigNumberInput } from "../BigNumberInput/BigNumberInput";
import { DatePicker } from "../DatePicker/DatePicker";
import { ThemedNumberInput } from "../ThemedNumberInput/ThemedNumberInput";
import { Combobox } from "../Combobox";
import { MarkdownEditor } from "../Markdown/MarkdownEditor";
import { TableQuickFilter } from "../Table/TableQuickFilter";
import { TimeInputs } from "../DateRangePicker/TimeInputs";
import { SliderField } from "../Slider/SliderField";

const NAMES = Object.keys(NO_AUTOFILL_ATTRS) as (keyof typeof NO_AUTOFILL_ATTRS)[];

/** The no-autofill attributes a field carries, as rendered. */
const carried = (el: Element): Record<string, string | null> =>
  Object.fromEntries(NAMES.map((name) => [name, el.getAttribute(name)]));

const field = (view: { container: HTMLElement }, selector: string): Element => {
  const el = view.container.querySelector(selector);
  if (!el) throw new Error(`no ${selector} rendered`);
  return el;
};

describe("noAutofillAttrs", () => {
  it("is the whole set by default", () => {
    expect(noAutofillAttrs()).toEqual({
      autocomplete: "off",
      "data-1p-ignore": "true",
      "data-op-ignore": "true",
      "data-lpignore": "true",
      "data-bwignore": "true",
      "data-form-type": "other",
      "data-protonpass-ignore": "true",
    });
    expect(noAutofillAttrs({ autocomplete: "off" })).toBe(NO_AUTOFILL_ATTRS);
  });

  it("is nothing when the caller opts in", () => {
    expect(noAutofillAttrs({ autofill: true })).toEqual({});
    expect(noAutofillAttrs({ autocomplete: "email" })).toEqual({});
    expect(wantsAutofill({ autofill: false, autocomplete: "" })).toBe(false);
  });
});

const DEFAULTS: [string, () => JSX.Element, string][] = [
  ["ThemedInput", () => <ThemedInput label="Vendor" />, "input"],
  ["ThemedTextarea", () => <ThemedTextarea label="Notes" />, "textarea"],
  ["FillTextArea", () => <FillTextArea label="Notes" />, "textarea"],
  ["NameInput", () => <NameInput label="Name" />, "input"],
  ["SearchField", () => <SearchField value="" />, "input"],
  [
    "BigNumberInput",
    () => <BigNumberInput value={12} onChange={() => {}} />,
    "input",
  ],
  [
    "DatePicker",
    () => <DatePicker value="2026-11-16" onChange={() => {}} />,
    "input",
  ],
  [
    "ThemedNumberInput",
    () => <ThemedNumberInput name="v" value={() => 1} onChange={() => {}} />,
    ".sui-number-input__input",
  ],
  [
    "Combobox (single)",
    () => (
      <Combobox
        options={() => [{ value: "a", label: "A" }]}
        value={() => null}
        placeholder="Pick one"
      />
    ),
    ".sui-combobox__input",
  ],
  [
    "Combobox (multiple)",
    () => (
      <Combobox
        multiple
        options={() => [{ value: "a", label: "A" }]}
        value={() => []}
        placeholder="Pick some"
      />
    ),
    ".sui-combobox__input",
  ],
  [
    "MarkdownEditor",
    () => <MarkdownEditor value="" onChange={() => {}} />,
    "textarea",
  ],
  [
    "TableQuickFilter",
    () => (
      <TableQuickFilter data={[{ name: "a" }]}>
        {(rows) => <For each={rows()}>{(row) => <span>{row.name}</span>}</For>}
      </TableQuickFilter>
    ),
    "input",
  ],
  [
    "TimeInputs",
    () => (
      <TimeInputs
        startTime={() => "09:00"}
        endTime={() => "17:00"}
        onStartTimeChange={() => {}}
        onEndTimeChange={() => {}}
      />
    ),
    "input",
  ],
  [
    "SliderField",
    () => <SliderField label="Rate" value="12" onCommit={() => {}} />,
    "input",
  ],
];

describe("every text-like field carries the no-autofill attributes", () => {
  it.each(DEFAULTS)("%s", (_name, view, selector) => {
    expect(carried(field(render(view), selector))).toEqual({
      ...NO_AUTOFILL_ATTRS,
    });
  });
});

/** The keyboard hint a free-text field carries, as rendered. */
const hint = (el: Element): (string | null)[] => [
  el.getAttribute("inputmode"),
  el.getAttribute("enterkeyhint"),
];

describe("noAutofillTextAttrs", () => {
  it("adds the keyboard hint for a text input only", () => {
    expect(noAutofillTextAttrs()).toBe(NO_AUTOFILL_TEXT_ATTRS);
    expect(noAutofillTextAttrs({ type: "text" })).toBe(NO_AUTOFILL_TEXT_ATTRS);
    expect(NO_AUTOFILL_TEXT_ATTRS).toEqual({
      ...NO_AUTOFILL_ATTRS,
      inputmode: "search",
      enterkeyhint: "done",
    });
    expect(noAutofillTextAttrs({ type: "email" })).toBe(NO_AUTOFILL_ATTRS);
    expect(noAutofillTextAttrs({ autofill: true })).toEqual({});
    expect(noAutofillTextAttrs({ autocomplete: "name" })).toEqual({});
  });
});

describe("a free-text single-line field carries the keyboard hint", () => {
  it.each<[string, () => JSX.Element, string]>([
    ["ThemedInput", () => <ThemedInput label="Name" />, "input"],
    ["ThemedInput type=text", () => <ThemedInput type="text" />, "input"],
    ["NameInput", () => <NameInput type="text" />, "input"],
    [
      "TableQuickFilter",
      () => (
        <TableQuickFilter data={[{ name: "a" }]}>
          {(rows) => <For each={rows()}>{(row) => <span>{row.name}</span>}</For>}
        </TableQuickFilter>
      ),
      "input",
    ],
  ])("%s", (_name, view, selector) => {
    expect(hint(field(render(view), selector))).toEqual(["search", "done"]);
  });

  it("a field of another kind keeps its own keyboard", () => {
    const email = field(render(() => <ThemedInput type="email" />), "input");
    expect(hint(email)).toEqual([null, null]);
    expect(carried(email)).toEqual({ ...NO_AUTOFILL_ATTRS });
    expect(
      hint(field(render(() => <ThemedTextarea />), "textarea")),
    ).toEqual([null, null]);
    expect(
      hint(
        field(
          render(() => <BigNumberInput value={1} onChange={() => {}} />),
          "input",
        ),
      ),
    ).toEqual(["decimal", null]);
  });

  it("the caller's own inputmode and enterkeyhint win", () => {
    const el = field(
      render(() => <ThemedInput inputmode="numeric" enterkeyhint="next" />),
      "input",
    );
    expect(hint(el)).toEqual(["numeric", "next"]);
  });

  it("an opted-in field carries no hint", () => {
    expect(
      hint(field(render(() => <ThemedInput autofill />), "input")),
    ).toEqual([null, null]);
  });
});

const NONE = Object.fromEntries(NAMES.map((name) => [name, null]));

const OPTED_IN: [string, () => JSX.Element, string][] = [
  ["ThemedInput", () => <ThemedInput autofill />, "input"],
  ["ThemedTextarea", () => <ThemedTextarea autofill />, "textarea"],
  ["FillTextArea", () => <FillTextArea autofill />, "textarea"],
  ["SearchField", () => <SearchField autofill value="" />, "input"],
  [
    "BigNumberInput",
    () => <BigNumberInput autofill value={12} onChange={() => {}} />,
    "input",
  ],
  [
    "DatePicker",
    () => <DatePicker autofill value="2026-11-16" onChange={() => {}} />,
    "input",
  ],
];

describe("a field that opts in carries none of them", () => {
  it.each(OPTED_IN)("%s with autofill", (_name, view, selector) => {
    const el = field(render(view), selector);
    expect(carried(el)).toEqual(NONE);
    // The opt-in is a prop, never an attribute on the element.
    expect(el.hasAttribute("autofill")).toBe(false);
  });

  it("a stated autocomplete is the opt-in, and is what renders", () => {
    const el = field(
      render(() => <ThemedInput type="email" autocomplete="email" />),
      "input",
    );
    expect(carried(el)).toEqual({ ...NONE, autocomplete: "email" });
  });

  it('autocomplete="off" stated by the caller keeps the whole set', () => {
    const el = field(render(() => <ThemedInput autocomplete="off" />), "input");
    expect(carried(el)).toEqual({ ...NO_AUTOFILL_ATTRS });
  });
});
