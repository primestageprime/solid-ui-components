import { type Component, Show, createSignal } from "solid-js";
import {
  Dropdown,
  InlineSubtleDropdown,
  type DropdownItem,
  type DropdownTriggerState,
} from "../../src/components/Dropdown";
import { ShapeGlyph } from "../../src/components/Chart/shapes";
import { Icon } from "../../src/components/Icon";
import { Stack } from "../../src/components/Layout/Stack";

const SCENARIOS: DropdownItem[] = [
  { id: "baseline", label: "Baseline", color: "#a855f7", shape: "circle" },
  { id: "lean", label: "Lean", color: "#22d3ee", shape: "diamond" },
  { id: "growth", label: "Growth", color: "#f97316", shape: "chevron" },
  { id: "stress", label: "Stress", color: "#f43f5e", shape: "square" },
  // No shape — falls back to the plain dot, as it always has.
  { id: "draft", label: "Draft", color: "#94a3b8" },
];

/** A list with two rows the user cannot choose. `disabled` dims the whole row
 *  — label and indicator together — and the keyboard steps over it. */
const PLANS: DropdownItem[] = [
  { id: "starter", label: "Starter", color: "#22d3ee", shape: "circle" },
  { id: "team", label: "Team", color: "#a855f7", shape: "diamond" },
  { id: "scale", label: "Scale (sold out)", color: "#f97316", disabled: true },
  { id: "custom", label: "Custom (contact us)", disabled: true },
];

/** The same list, with each refused row saying why. `reason` renders as the
 *  row's `title` for a mouse user and as an `aria-describedby` target for a
 *  screen reader. Team carries one while staying available. */
const EXPLAINED_PLANS: DropdownItem[] = [
  { id: "starter", label: "Starter", color: "#22d3ee", shape: "circle" },
  {
    id: "team",
    label: "Team",
    color: "#a855f7",
    shape: "diamond",
    reason: "Billed per seat, minimum five seats",
  },
  {
    id: "scale",
    label: "Scale",
    color: "#f97316",
    disabled: true,
    reason: "Sold out until March",
  },
  {
    id: "custom",
    label: "Custom",
    disabled: true,
    reason: "Talk to sales to unlock this plan",
  },
];

export const DropdownShowcase: Component = () => {
  const [v, setV] = createSignal<string>("us-east-1");
  const [scenario, setScenario] = createSignal<string>("lean");
  const [named, setNamed] = createSignal<string>("baseline");
  const [plan, setPlan] = createSignal<string>("starter");
  const [explainedPlan, setExplainedPlan] = createSignal<string>("starter");
  // What the last refused pick was, so the refusal reaches the user instead of
  // disappearing. A real app shows a toast here.
  const [refused, setRefused] = createSignal<string>("");
  const [draftName, setDraftName] = createSignal<string>("Baseline");
  // Rename example — the items are local, because Enter writes a new label back.
  const [scenarios, setScenarios] = createSignal<DropdownItem[]>([
    { id: "baseline", label: "Baseline", color: "#a855f7", shape: "circle" },
    { id: "lean", label: "Lean", color: "#22d3ee", shape: "diamond" },
    { id: "growth", label: "Growth", color: "#f97316", shape: "chevron" },
  ]);
  const [picked, setPicked] = createSignal<string>("baseline");
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  let renameRef: HTMLInputElement | undefined;
  const selectedLabel = () =>
    scenarios().find((item) => item.id === picked())?.label ?? "";
  /** Enter commits: write the draft back as the item's label, then leave edit
   *  mode. The menu row shows the new name at once. */
  const commitRename = () => {
    const name = draft().trim();
    if (name.length > 0)
      setScenarios((items) =>
        items.map((item) =>
          item.id === picked() ? { ...item, label: name } : item,
        ),
      );
    setEditing(false);
  };
  return (
    <div class="component-section">
      <h2>Dropdown — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Selectable list with optional footer, label, and color accent. Uses
        controlled <code>value</code> + <code>onChange</code>.
      </p>
      <div class="example-group">
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
            value={v()}
            onChange={(id) => setV(id)}
            items={[
              { id: "us-east-1", label: "us-east-1" },
              { id: "us-west-2", label: "us-west-2" },
              { id: "eu-west-1", label: "eu-west-1" },
              { id: "eu-north-1", label: "eu-north-1" },
              { id: "ap-south-1", label: "ap-south-1" },
            ]}
          />
          <span class="text-meta">selected: {v()}</span>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Shape indicators — double-coded identity</h3>
        <p class="text-meta">
          An item with <code>color</code> alone keeps the plain dot; adding{" "}
          <code>shape</code> renders that shape as the indicator instead, in the
          trigger and the menu alike. Colour plus shape stays legible at small
          sizes, under colour-blindness, and in greyscale.
        </p>
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
            value={scenario()}
            onChange={setScenario}
            items={SCENARIOS}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>disabled — a row the user cannot choose</h3>
        <p class="text-meta">
          An item with <code>disabled</code> dims the whole row — label and
          indicator together — and reports <code>aria-disabled</code>. A click
          on it fires no <code>onChange</code> and keeps the menu open. The
          arrow keys, Home and End step over it, so it never takes the tab stop.
          Open the menu and press End: the focus lands on Team, not on the two
          rows below it.
        </p>
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown value={plan()} onChange={setPlan} items={PLANS} />
          <span class="text-meta">selected: {plan()}</span>
        </Stack>
      </div>

      <div class="example-group">
        <h3>reason — say why a row is refused</h3>
        <p class="text-meta">
          An item with <code>reason</code> carries it as the row's{" "}
          <code>title</code>, so hovering Scale or Custom reads the refusal, and
          as an <code>aria-describedby</code> target, so a screen reader
          announces it as well. Team shows that a reason does not need{" "}
          <code>disabled</code>. Click a refused row and{" "}
          <code>onDisabledSelect</code> reports the pick — no{" "}
          <code>onChange</code> fires and the menu stays open, so a consumer can
          answer with a toast instead of losing the click.
        </p>
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
            value={explainedPlan()}
            onChange={(id) => {
              setRefused("");
              setExplainedPlan(id);
            }}
            onDisabledSelect={(item) => setRefused(item.reason ?? item.label)}
            items={EXPLAINED_PLANS}
          />
          <span class="text-meta">selected: {explainedPlan()}</span>
          <Show when={refused()}>
            {(message) => <span class="text-meta">refused: {message()}</span>}
          </Show>
        </Stack>
      </div>

      <div class="example-group">
        <h3>trigger — render your own trigger</h3>
        <p class="text-meta">
          The <code>trigger</code> render prop replaces the whole trigger
          content — indicator, label and caret — with your own element. The
          wrapper is a <code>div[role="combobox"]</code> that keeps the ARIA
          wiring and the arrow keys, and binds <em>no</em> click, so a click
          reaches the input below and places the caret where the user aims. Call{" "}
          <code>toggle</code> from the state to open the menu. Enter is
          unclaimed, so an input in an ancestor <code>&lt;form&gt;</code> still
          submits. Dropdown restores the focus itself — after a pick or an
          Escape it gives the focus back to the element that held it when the
          menu opened, so do <em>not</em> refocus in your own{" "}
          <code>onChange</code>. Type a name, open the menu, pick another
          scenario: the caret comes back to the field.
        </p>
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
            items={SCENARIOS}
            value={named()}
            onChange={(id) => {
              setNamed(id);
              setDraftName(
                SCENARIOS.find((item) => item.id === id)?.label ?? "",
              );
            }}
            trigger={(state: DropdownTriggerState) => (
              <>
                <input
                  class="name-trigger__input"
                  aria-label="Scenario name"
                  value={draftName()}
                  onInput={(e) => setDraftName(e.currentTarget.value)}
                />
                <Icon
                  name="edit"
                  size="xs"
                  class="name-trigger__pencil"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  class="name-trigger__caret"
                  aria-label={state.open ? "Close scenarios" : "Open scenarios"}
                  onClick={state.toggle}
                >
                  &#9660;
                </button>
              </>
            )}
          />
          <span class="text-meta">
            selected: {named()} — typed: {draftName()}
          </span>
        </Stack>
      </div>

      <div class="example-group">
        <h3>trigger — rename in place</h3>
        <p class="text-meta">
          The pill is the name field. Click the pencil to edit the selected
          name. Press Enter to commit the new name. The menu row shows it
          immediately. Press Escape to revert. Click the field to place the
          caret — the menu stays shut, because the wrapper binds no click. Click
          the caret button to open the menu. Dropdown restores the focus itself
          after a pick, so this example does not refocus in{" "}
          <code>onChange</code>.
        </p>
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
            items={scenarios()}
            value={picked()}
            onChange={(id) => {
              setPicked(id);
              setEditing(false);
            }}
            trigger={(state: DropdownTriggerState) => (
              <>
                <Show when={state.selected} fallback={null}>
                  {(item) => (
                    <svg
                      class="name-trigger__mark"
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      aria-hidden="true"
                    >
                      <ShapeGlyph
                        descriptor={{
                          color: item().color ?? "#94a3b8",
                          shape: item().shape ?? "circle",
                        }}
                        cx={4}
                        cy={4}
                        size={8}
                      />
                    </svg>
                  )}
                </Show>
                <Show
                  when={editing()}
                  fallback={
                    <>
                      <span class="name-trigger__name">
                        {state.selected?.label ?? "Select..."}
                      </span>
                      <button
                        type="button"
                        class="name-trigger__edit"
                        aria-label="Rename this scenario"
                        onClick={() => {
                          setDraft(state.selected?.label ?? "");
                          setEditing(true);
                          queueMicrotask(() => renameRef?.focus());
                        }}
                      >
                        <Icon name="edit" size="xs" />
                      </button>
                    </>
                  }
                >
                  <input
                    ref={renameRef}
                    class="name-trigger__input"
                    aria-label="Scenario name"
                    value={draft()}
                    onInput={(e) => setDraft(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape" && !state.open) {
                        setEditing(false);
                      }
                    }}
                  />
                </Show>
                <button
                  type="button"
                  class="name-trigger__caret"
                  aria-label={state.open ? "Close scenarios" : "Open scenarios"}
                  onClick={state.toggle}
                >
                  &#9660;
                </button>
              </>
            )}
          />
          <span class="text-meta">
            selected: {picked()} — name: {selectedLabel()} — editing:{" "}
            {String(editing())} — draft: {draft()}
          </span>
        </Stack>
      </div>

      <div class="example-group">
        <h3>InlineSubtleDropdown — curried (size "sm", subtle)</h3>
        <p class="text-meta">
          Compact inline picker that reads as plain text until hovered — for
          values embedded in dense editors and panes.
        </p>
        <InlineSubtleDropdown
          value={v()}
          onChange={(id) => setV(id)}
          items={[
            { id: "us-east-1", label: "us-east-1" },
            { id: "us-west-2", label: "us-west-2" },
            { id: "eu-west-1", label: "eu-west-1" },
          ]}
        />
      </div>
    </div>
  );
};
