import { Component, createSignal, createEffect } from "solid-js";
import { loadTheme, ThemeName } from "./load-theme";

export const ThemeSwitcher: Component = () => {
  const [theme, setTheme] = createSignal<ThemeName>("hud");
  createEffect(() => loadTheme(theme()));
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
