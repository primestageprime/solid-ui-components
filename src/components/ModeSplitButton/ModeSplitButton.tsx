// ============================================
// ModeSplitButton — Composite (Depth 2, zero CSS)
// Composes IconOnlyButton + Icon + RightPopoverMenu + Text (sr-only label).
//
// A SPLIT BUTTON OVER A MODE. The face shows the current mode's icon and does
// that mode's action; the ▾ picks the mode. ChartFrame's y-axis strategy was
// the first (auto-grow / full auto / locked); the contract scheduler's
// placement (full auto / manual, with "flow once" on the manual face) is the
// second. A mode whose face has nothing to do is DISABLED and says why in its
// `action`, never a silent no-op.
//
// It renders the two buttons as a FRAGMENT so the caller decides how they sit
// — inside a `ButtonGroup` to read as one control, or loose in a row.
//
// The ▾ gets its accessible name from `menuLabel`: PopoverMenu has no label
// prop, so the trigger's content is a screen-reader-only span beside
// PopoverMenu's own aria-hidden caret.
// ============================================
import type { JSX } from "solid-js";
import { find, map } from "../../fn";
import { IconOnlyButton } from "../Button";
import { type IconName, createIcon } from "../Icon";
import { type PopoverMenuItem, RightPopoverMenu } from "../PopoverMenu";
import { createText } from "../Text";

/** One mode: its menu row, its face icon, and what the face does in it. */
export interface ModeInfo<M extends string> {
  readonly mode: M;
  /** The menu row's words. */
  readonly label: string;
  readonly icon: IconName;
  /** The face's accessible name and tooltip in this mode. */
  readonly action: string;
  /** The face has no action in this mode. */
  readonly disabled: boolean;
}

/** The row for `mode`, else the first (the default). */
export const modeInfo = <M extends string>(
  modes: readonly ModeInfo<M>[],
  mode: M,
): ModeInfo<M> =>
  find((info: ModeInfo<M>) => info.mode === mode, modes) ?? modes[0];

export interface ModeSplitButtonProps<M extends string> {
  /** Every mode, in menu order — the default first. */
  modes: readonly ModeInfo<M>[];
  /** Controlled: the current mode. */
  mode: M;
  /** The ▾ menu picked a mode. */
  onModeChange?: (mode: M) => void;
  /** The face was pressed (never fires in a `disabled` mode). */
  onPress?: () => void;
  /** The ▾'s accessible name ("Y-axis mode", "Schedule mode"). */
  menuLabel: string;
}

const ButtonIcon = createIcon({ variant: "outline", size: "sm" });

/** Visually hidden, still announced: the ▾ trigger's accessible name. */
const ScreenReaderLabel = createText({ as: "span", class: "sui-sr-only" });

const menuItems = <M extends string>(
  modes: readonly ModeInfo<M>[],
  current: M,
): [PopoverMenuItem<M>, ...PopoverMenuItem<M>[]] =>
  map(
    (info: ModeInfo<M>): PopoverMenuItem<M> => ({
      id: info.mode,
      label: info.label,
      icon: info.icon,
      active: info.mode === current,
    }),
    [...modes],
  ) as [PopoverMenuItem<M>, ...PopoverMenuItem<M>[]];

export function ModeSplitButton<M extends string>(
  props: ModeSplitButtonProps<M>,
): JSX.Element {
  const info = () => modeInfo(props.modes, props.mode);
  return (
    <>
      <IconOnlyButton
        onClick={() => props.onPress?.()}
        disabled={info().disabled}
        aria-label={info().action}
        title={info().action}
      >
        <ButtonIcon name={info().icon} />
      </IconOnlyButton>
      <RightPopoverMenu<M>
        trigger={<ScreenReaderLabel>{props.menuLabel}</ScreenReaderLabel>}
        items={menuItems(props.modes, props.mode)}
        onSelect={(next) => props.onModeChange?.(next)}
      />
    </>
  );
}
