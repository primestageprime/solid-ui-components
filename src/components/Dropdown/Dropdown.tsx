// ============================================
// Dropdown — Atomic (Depth 1)
// Owns CSS (Dropdown.css), no component imports.
// Trigger button with popover menu for selection.
// ============================================
import { Component, For, Show, JSX, createSignal, onCleanup, splitProps, mergeProps } from "solid-js";
import "./Dropdown.css";

export interface DropdownItem {
  id: string;
  label: string;
  /** Optional indicator color (rendered as a dot) */
  color?: string;
}

export interface DropdownProps {
  /** Items to display in the dropdown menu */
  items: DropdownItem[];
  /** Currently selected item id */
  value?: string;
  /** Callback when an item is selected */
  onChange: (id: string) => void;
  /** Placeholder text when no item is selected */
  placeholder?: string;
  /** Optional footer element (e.g. "Add new" action) */
  footer?: JSX.Element;
  /** Size variant */
  size?: "sm" | "md";
  /** Subtle mode: trigger looks like read-only text until hovered */
  subtle?: boolean;
  /** Optional class for the container */
  class?: string;
}

export const Dropdown: Component<DropdownProps> = (props) => {
  const merged = mergeProps({ size: "md" as const, placeholder: "Select..." }, props);
  const [open, setOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const selected = () => merged.items.find((item) => item.id === merged.value);

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };

  // Attach/detach global listeners based on open state
  const setupListeners = () => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
  };

  const teardownListeners = () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  };

  onCleanup(teardownListeners);

  const toggle = () => {
    const next = !open();
    setOpen(next);
    if (next) setupListeners();
    else teardownListeners();
  };

  const select = (id: string) => {
    merged.onChange(id);
    setOpen(false);
    teardownListeners();
  };

  const containerClass = () => {
    const classes = ["sui-dropdown"];
    if (merged.size) classes.push(`sui-dropdown--${merged.size}`);
    if (merged.subtle) classes.push("sui-dropdown--subtle");
    if (open()) classes.push("sui-dropdown--open");
    if (merged.class) classes.push(merged.class);
    return classes.join(" ");
  };

  return (
    <div class={containerClass()} ref={containerRef}>
      <button class="sui-dropdown__trigger" onClick={toggle} type="button">
        <Show when={selected()?.color}>
          <span class="sui-dropdown__dot" style={{ background: selected()!.color }} />
        </Show>
        <span class="sui-dropdown__label">
          {selected()?.label ?? merged.placeholder}
        </span>
        <span class="sui-dropdown__caret">&#9660;</span>
      </button>

      <Show when={open()}>
        <div class="sui-dropdown__menu">
          <For each={merged.items}>
            {(item) => (
              <button
                class={`sui-dropdown__item ${item.id === merged.value ? "sui-dropdown__item--active" : ""}`}
                onClick={() => select(item.id)}
                type="button"
              >
                <Show when={item.color}>
                  <span class="sui-dropdown__dot" style={{ background: item.color }} />
                </Show>
                {item.label}
              </button>
            )}
          </For>
          <Show when={merged.footer}>
            <div class="sui-dropdown__footer">
              {merged.footer}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
