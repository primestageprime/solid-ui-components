import { Component, createSignal, createEffect } from "solid-js";
import hudCss from "../src/themes/hud.css?raw";
import defaultCss from "../src/themes/default.css?raw";

type ThemeName = "hud" | "default";

const themes: Record<ThemeName, string> = { hud: hudCss, default: defaultCss };

export const ThemeSwitcher: Component = () => {
  const [theme, setTheme] = createSignal<ThemeName>("hud");

  createEffect(() => {
    let el = document.getElementById("sui-theme") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "sui-theme";
      document.head.appendChild(el);
    }
    el.textContent = themes[theme()];
  });

  const toggle = () => setTheme((t) => (t === "hud" ? "default" : "hud"));

  return (
    <div class="theme-switcher">
      <span class="theme-switcher__label">Theme</span>
      <button class="theme-switcher__btn" onClick={toggle}>
        {theme()}
      </button>
    </div>
  );
};
