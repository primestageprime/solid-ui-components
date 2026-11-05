// ============================================
// PopoverField — Atomic (Depth 1)
// Tags: shows:field, does:click, does:dismiss, does:pick, role:overlay
// Owns PopoverField.css; imports only Kobalte Popover.
// A compact field that reads as its value ("5th") and opens a picker in a
// popover anchored under it. It opens on click or Enter only (never on hover,
// unlike PopoverTooltip), closes on Escape, on an outside click, and when the
// picker calls `close` after a pick. Focus returns to the field.
//   <PopoverField label="Day of month" value="5th">
//     {(close) => <Picker onPick={(v) => { save(v); close(); }} />}
//   </PopoverField>
// ============================================
import { Popover as KobaltePopover } from "@kobalte/core/popover";
import { type Component, type JSX, createSignal } from "solid-js";
import "./PopoverField.css";

export interface PopoverFieldProps {
  /** The accessible name of the field ("Day of month"). */
  label: string;
  /** What the field shows while closed ("5th"). */
  value: string;
  /** The picker. A function receives `close`, to call after a pick. */
  children: JSX.Element | ((close: () => void) => JSX.Element);
  /** Whether the field takes input. Default true. */
  disabled?: boolean;
}

export const PopoverField: Component<PopoverFieldProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const close = () => setOpen(false);
  return (
    <KobaltePopover
      open={open()}
      onOpenChange={setOpen}
      placement="bottom-start"
      gutter={4}
    >
      <KobaltePopover.Trigger
        class="sui-popover-field"
        aria-label={`${props.label}: ${props.value}`}
        disabled={props.disabled}
      >
        <span class="sui-popover-field__value">{props.value}</span>
        <svg
          class="sui-popover-field__caret"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </KobaltePopover.Trigger>
      <KobaltePopover.Portal>
        <KobaltePopover.Content class="sui-popover-field__content">
          {typeof props.children === "function"
            ? (props.children as (c: () => void) => JSX.Element)(close)
            : props.children}
        </KobaltePopover.Content>
      </KobaltePopover.Portal>
    </KobaltePopover>
  );
};
