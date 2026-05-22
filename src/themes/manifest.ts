import defaultCss from "./default.css?raw";
import hudCss from "./hud.css?raw";

export interface ThemeEntry {
  readonly id: string;
  readonly displayName: string;
  readonly mode: "light" | "dark";
  readonly css: string;
}

export const THEMES = {
  default: { id: "default", displayName: "Default", mode: "dark", css: defaultCss },
  hud:     { id: "hud",     displayName: "HUD",     mode: "dark", css: hudCss },
} as const satisfies Record<string, ThemeEntry>;

export type ThemeId = keyof typeof THEMES;
