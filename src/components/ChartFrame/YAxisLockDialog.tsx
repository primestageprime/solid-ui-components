// ============================================
// YAxisLockDialog — Composite (Depth 2, zero CSS)
// Composes PrimaryConfirmationModal + CurrencyInput × 2 + TightStack.
//
// ChartFrame's lock editor: the dialog the Y-axis strategy's `fixed` mode
// opens (`createYAxisStrategy` → `dialogOpen` / `lock` / `setLock` /
// `closeDialog`). Two money fields, Max over Min, validated by the pure
// `checkLock` (both numbers, min < max) with the error on the field at fault.
// Errors show only after a Confirm, so an opening dialog is never red.
//
// THE DRAFT IS SEEDED BEFORE THE FIELDS MOUNT. A CurrencyInput reads its
// value when it mounts and does not pick up a value written just after, so
// the draft is DERIVED — "the reader's edit, else the lock" — rather than
// copied in on open. At mount it already reads the lock; edits are dropped
// every time the dialog closes, so the next open starts from the lock again.
// ============================================
import {
  type Component,
  createEffect,
  createSignal,
  mergeProps,
  on,
} from "solid-js";
import {
  type YAxisDomain,
  type YAxisLockError,
  checkLock,
} from "../../hooks/createYAxisStrategy";
import { CurrencyInput } from "../CurrencyInput";
import { TightStack } from "../Layout";
import { PrimaryConfirmationModal } from "../Modal";

/** Every word the dialog says. Presentational — curried, never inline. */
export interface YAxisLockDialogLabels {
  readonly title: string;
  readonly description: string;
  readonly confirm: string;
  readonly max: string;
  readonly min: string;
  /** A field is empty or not a number. */
  readonly notANumber: string;
  /** Max is not above Min (shown on Max). */
  readonly notAboveMin: string;
}

export interface YAxisLockDialogProps {
  /** Controlled: `axis.dialogOpen()`. */
  open: boolean;
  /** The lock to seed the fields with: `axis.lock()` (seeded on entry). */
  lock: YAxisDomain | null;
  /** A valid lock was confirmed: `axis.setLock` (which also closes). */
  onLock: (lock: YAxisDomain) => void;
  /** Cancel, Escape or the overlay: `axis.closeDialog`. */
  onClose: () => void;
  /** The words. */
  labels: YAxisLockDialogLabels;
}

/** One field's draft: `null` = untouched (read the lock), else the edit. */
type Edit = { readonly value: number | undefined } | null;

const YAxisLockDialogBase: Component<YAxisLockDialogProps> = (props) => {
  const [minEdit, setMinEdit] = createSignal<Edit>(null);
  const [maxEdit, setMaxEdit] = createSignal<Edit>(null);
  const [tried, setTried] = createSignal(false);
  const draft = (edit: Edit, seeded: number | undefined) =>
    edit === null ? seeded : edit.value;
  const min = () => draft(minEdit(), props.lock?.[0]);
  const max = () => draft(maxEdit(), props.lock?.[1]);
  const check = () => checkLock(min(), max());
  const errorOf = (field: "minError" | "maxError"): string | undefined => {
    const result = check();
    if (!tried() || result.ok) return undefined;
    const code: YAxisLockError | undefined = result[field];
    return code === undefined ? undefined : props.labels[code];
  };

  // Closing drops the edits, so the next open reads the lock afresh.
  createEffect(
    on(
      () => props.open,
      (open) => {
        if (open) return;
        setMinEdit(null);
        setMaxEdit(null);
        setTried(false);
      },
    ),
  );

  const confirm = (): void => {
    setTried(true);
    const result = check();
    if (result.ok) props.onLock(result.lock);
  };

  return (
    <PrimaryConfirmationModal
      open={props.open}
      onClose={props.onClose}
      onConfirm={confirm}
      title={props.labels.title}
      description={props.labels.description}
      confirmLabel={props.labels.confirm}
    >
      <TightStack>
        <CurrencyInput
          name="y-max"
          label={props.labels.max}
          value={max}
          onChange={(value) => setMaxEdit({ value })}
          errorMessage={errorOf("maxError")}
        />
        <CurrencyInput
          name="y-min"
          label={props.labels.min}
          value={min}
          onChange={(value) => setMinEdit({ value })}
          errorMessage={errorOf("minError")}
        />
      </TightStack>
    </PrimaryConfirmationModal>
  );
};

/** Props that are presentational overrides — locked at variant-definition time. */
export type YAxisLockDialogOverrides = Pick<YAxisLockDialogProps, "labels">;

/** Props that remain available to consumers of a curried variant. */
export type YAxisLockDialogDataProps = Omit<
  YAxisLockDialogProps,
  keyof YAxisLockDialogOverrides
>;

export function createYAxisLockDialog(
  defaults: YAxisLockDialogOverrides,
): Component<YAxisLockDialogDataProps> {
  return (props) => <YAxisLockDialogBase {...mergeProps(defaults, props)} />;
}
