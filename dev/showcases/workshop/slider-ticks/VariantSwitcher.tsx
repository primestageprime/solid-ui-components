// ============================================
// PROTOTYPE — variant switcher.
// Reads the variant from `location.search`, never from `location.hash`. The
// gallery router owns the hash, so a write there navigates the gallery away.
// ============================================
import { type Component, onCleanup, onMount } from "solid-js";
import "./VariantSwitcher.css";

/** The three tick treatments under test. */
export type VariantId = "A" | "B" | "C";

const ORDER: readonly VariantId[] = ["A", "B", "C"];

/** Arrow keys the bar answers to, and the direction each one moves. */
const ARROW_DELTA: Record<string, number | undefined> = {
  ArrowLeft: -1,
  ArrowRight: 1,
};

const TITLES: Record<VariantId, string> = {
  A: "A (Notches)",
  B: "B (Labelled rail)",
  C: "C (Segmented track)",
};

/** Human name of a variant, for the switcher bar. */
export const variantTitle = (variant: VariantId): string => TITLES[variant];

const isVariantId = (raw: string | null): raw is VariantId =>
  raw === "A" || raw === "B" || raw === "C";

/** Current variant from the query string. Falls back to `A`. */
export const readVariant = (): VariantId => {
  const raw = new URLSearchParams(window.location.search).get("variant");
  return isVariantId(raw) ? raw : "A";
};

/** Neighbour of `variant` in `ORDER`, wrapping at both ends. */
export const stepVariant = (variant: VariantId, delta: number): VariantId => {
  const index = ORDER.indexOf(variant);
  return ORDER[(index + delta + ORDER.length) % ORDER.length];
};

/** Writes the variant to the query string and keeps the hash exactly as it is. */
const writeVariant = (variant: VariantId): void => {
  const params = new URLSearchParams(window.location.search);
  params.set("variant", variant);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params.toString()}${window.location.hash}`,
  );
};

/** True when the focused element eats arrow keys. */
const focusTakesArrows = (): boolean => {
  const active = document.activeElement;
  return (
    active instanceof HTMLElement &&
    (active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.isContentEditable)
  );
};

interface VariantSwitcherProps {
  variant: VariantId;
  onSelect: (variant: VariantId) => void;
}

/**
 * Fixed bar at the bottom centre. Arrows wrap. `ArrowLeft` and `ArrowRight`
 * do the same thing, unless a text field or Kobalte's slider input has focus.
 */
export const VariantSwitcher: Component<VariantSwitcherProps> = (props) => {
  const select = (delta: number): void => {
    const next = stepVariant(props.variant, delta);
    writeVariant(next);
    props.onSelect(next);
  };

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const delta = ARROW_DELTA[event.key];
      if (delta === undefined || focusTakesArrows()) return;
      event.preventDefault();
      select(delta);
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <div class="slider-ticks-switcher">
      <button
        type="button"
        class="slider-ticks-switcher__arrow"
        onClick={() => select(-1)}
      >
        ←
      </button>
      <span class="slider-ticks-switcher__label">
        {variantTitle(props.variant)}
      </span>
      <button
        type="button"
        class="slider-ticks-switcher__arrow"
        onClick={() => select(1)}
      >
        →
      </button>
      <span class="slider-ticks-switcher__hint">PROTOTYPE · ?variant=</span>
    </div>
  );
};
