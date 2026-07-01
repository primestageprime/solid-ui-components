import defaultCss from "./default.css?raw";
import hudCss from "./hud.css?raw";
import bronzeCss from "./bronze.css?raw";
import bronzeDarkCss from "./bronze-dark.css?raw";
import colorblindCss from "./colorblind.css?raw";

export interface ThemeEntry {
  readonly id: string;
  readonly displayName: string;
  readonly mode: "light" | "dark";
  readonly css: string;
}

export const THEMES = {
  default: {
    id: "default",
    displayName: "Default",
    mode: "dark",
    css: defaultCss,
  },
  hud: { id: "hud", displayName: "HUD", mode: "dark", css: hudCss },
  bronze: {
    id: "bronze",
    displayName: "Bronze",
    mode: "light",
    css: bronzeCss,
  },
  "bronze-dark": {
    id: "bronze-dark",
    displayName: "Bronze (dark)",
    mode: "dark",
    css: bronzeDarkCss,
  },
  colorblind: {
    id: "colorblind",
    displayName: "Colorblind-safe",
    mode: "dark",
    css: colorblindCss,
  },
} as const satisfies Record<string, ThemeEntry>;

export type ThemeId = keyof typeof THEMES;
