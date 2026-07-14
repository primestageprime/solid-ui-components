/**
 * MultiSelectFilter — responsive multi-select filter.
 *
 * Wide container: renders a horizontal chip bar (one toggle chip per option).
 * Narrow container: collapses to a dropdown trigger + checkbox menu. Same data
 * model either way. Empty `selected` means "all" (no filter, every chip
 * inactive). The narrow examples wrap the control in a width-constrained box so
 * the collapse-to-menu mode is visible in the gallery.
 */
import { type Component, createSignal } from "solid-js";
import {
  MultiSelectFilter,
  type MultiSelectOption,
} from "../../src/components/MultiSelectFilter";

const statuses: MultiSelectOption[] = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "In progress" },
  { value: "review", label: "In review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

export const MultiSelectFilterShowcase: Component = () => {
  const [bar, setBar] = createSignal<string[]>(["doing", "review"]);
  const [barEmpty, setBarEmpty] = createSignal<string[]>([]);
  const [menu, setMenu] = createSignal<string[]>(["done"]);
  const [menuMulti, setMenuMulti] = createSignal<string[]>(["todo", "done"]);

  return (
    <div class="component-section">
      <h2>MultiSelectFilter — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Responsive multi-select. Wide → chip bar; narrow → dropdown + checkbox
        menu. Empty selection means "all". The bar migrates to Layout variants
        (growing wrap-row); the data-derived menu items stay intrinsic; overlay
        anchoring stays.
      </p>

      <div class="example-group">
        <h3>Bar mode (wide container)</h3>
        <p class="text-meta">Two selected — active chips filled.</p>
        <div style={{ "max-width": "700px" }}>
          <MultiSelectFilter
            label="Status"
            options={statuses}
            selected={bar()}
            onChange={setBar}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Bar mode — empty selection (all active)</h3>
        <p class="text-meta">Nothing selected → every chip inactive, no filter.</p>
        <div style={{ "max-width": "700px" }}>
          <MultiSelectFilter
            label="Status"
            options={statuses}
            selected={barEmpty()}
            onChange={setBarEmpty}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Bar mode — no label</h3>
        <div style={{ "max-width": "700px" }}>
          <MultiSelectFilter
            options={statuses}
            selected={bar()}
            onChange={setBar}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Menu mode (narrow container)</h3>
        <p class="text-meta">
          Container too narrow for the bar → dropdown trigger with a checkbox
          menu. Click to open.
        </p>
        <div style={{ "max-width": "240px" }}>
          <MultiSelectFilter
            label="Status"
            options={statuses}
            selected={menu()}
            onChange={setMenu}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Menu mode — multiple selected</h3>
        <div style={{ "max-width": "240px" }}>
          <MultiSelectFilter
            label="Status"
            options={statuses}
            selected={menuMulti()}
            onChange={setMenuMulti}
          />
        </div>
      </div>
    </div>
  );
};
