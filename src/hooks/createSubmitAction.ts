import { type Accessor, createSignal } from "solid-js";

/**
 * A SUBMIT ACTION: a click that sends work and must not send it twice.
 *
 * `run()` sets `pending`, waits one paint so a spinner shows, then calls the
 * work. A `run()` while `pending` does nothing. The work may be synchronous or
 * return a promise; `pending` clears when it settles.
 *
 * With `once`, the action is SPENT after one run that does not return `false`
 * and does not throw. A spent action does nothing until `rearm()`. A run that
 * returns `false` (the work refused) leaves the action armed, so the user can
 * fix the input and send again.
 *
 * Share one action between a button and a keyboard shortcut, so both obey the
 * same guard. `Button`'s `action` prop reads `pending` and `spent`.
 */
export interface SubmitActionOptions {
  /** Stay disabled after one sent run. Default: false. */
  once?: boolean;
}

export interface SubmitAction {
  run: () => Promise<void>;
  pending: Accessor<boolean>;
  /** True after a sent run of a `once` action. */
  spent: Accessor<boolean>;
  rearm: () => void;
}

export type SubmitWork = () => unknown;

/** Resolve after the browser paints the current frame. */
export const nextPaint = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });

export function createSubmitAction(
  work: SubmitWork,
  options: SubmitActionOptions = {},
): SubmitAction {
  const [pending, setPending] = createSignal(false);
  const [sent, setSent] = createSignal(false);
  const spent = () => (options.once ?? false) && sent();
  // A plain flag, not the signal: two clicks in one task both read it at once.
  let busy = false;

  const run = async (): Promise<void> => {
    if (busy || spent()) return;
    busy = true;
    setPending(true);
    try {
      await nextPaint();
      const result = await work();
      if (result !== false) setSent(true);
    } finally {
      busy = false;
      setPending(false);
    }
  };

  return { run, pending, spent, rearm: () => setSent(false) };
}
