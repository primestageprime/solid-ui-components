// ============================================
// HotkeyButton Curried Variants — the key-button family.
// The plain Button variants carry no hotkey code (bundle budget); a button
// that a key presses is one of these. Same variant and size as its plain
// twin: HotkeyPrimaryButton looks like PrimaryButton.
//
// Explicit `Component<HotkeyButtonDataProps>` annotations, for the reason
// given in Button/variants.ts (vite-plugin-dts TS2742).
// ============================================
import type { Component } from "solid-js";
import { createHotkeyButton, type HotkeyButtonDataProps } from "./HotkeyButton";

export const HotkeyDefaultButton: Component<HotkeyButtonDataProps> =
  createHotkeyButton({ variant: "default" });

export const HotkeyPrimaryButton: Component<HotkeyButtonDataProps> =
  createHotkeyButton({ variant: "primary" });

export const HotkeySecondaryButton: Component<HotkeyButtonDataProps> =
  createHotkeyButton({ variant: "secondary" });

export const HotkeyDangerButton: Component<HotkeyButtonDataProps> =
  createHotkeyButton({ variant: "danger" });

export const HotkeyGhostButton: Component<HotkeyButtonDataProps> =
  createHotkeyButton({ variant: "ghost" });

export const HotkeySmallPrimaryButton: Component<HotkeyButtonDataProps> =
  createHotkeyButton({ variant: "primary", size: "sm" });

export const HotkeySmallButton: Component<HotkeyButtonDataProps> =
  createHotkeyButton({ size: "sm" });
