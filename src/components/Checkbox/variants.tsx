// Curried Checkbox variants — presentation locked at definition time so the
// call site stays zero-config (passes only checked + handler).
import type { Component } from "solid-js";
import { createCheckbox, type CheckboxDataProps } from "./Checkbox";

/** Small primary checkbox — compact lists and dense rows. */
export const SmallCheckbox: Component<CheckboxDataProps> = createCheckbox({ size: "sm" });

/** Success-colored checkbox — "done"/completion semantics. */
export const DoneCheckbox: Component<CheckboxDataProps> = createCheckbox({ color: "success" });
