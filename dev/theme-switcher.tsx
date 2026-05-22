// dev/theme-switcher.tsx
import { Component, createSignal, createEffect, For } from "solid-js";
import { loadTheme, THEMES, type ThemeId } from "./load-theme";

// Pick a sensible initial theme that matches existing default behavior.
const INITIAL: ThemeId = "hud";

export const ThemeSwitcher: Component = () => {
  const [theme, setTheme] = createSignal<ThemeId>(INITIAL);
  createEffect(() => loadTheme(theme()));

  return (
    <div class="theme-switcher">
      <span class="theme-switcher__label">Theme</span>
      <select
        class="theme-switcher__select"
        value={theme()}
        onChange={(e) => setTheme(e.currentTarget.value as ThemeId)}
      >
        <For each={Object.values(THEMES)}>
          {(entry) => <option value={entry.id}>{entry.displayName}</option>}
        </For>
      </select>
    </div>
  );
};
