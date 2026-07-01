// dev/theme-switcher.tsx
import { type Component, createSignal, createEffect, For } from "solid-js";
import {
  getPersistedTheme,
  loadTheme,
  persistTheme,
  THEMES,
  type ThemeId,
} from "./load-theme";

export const ThemeSwitcher: Component = () => {
  const [theme, setTheme] = createSignal<ThemeId>(getPersistedTheme());

  createEffect(() => {
    const current = theme();
    loadTheme(current);
    persistTheme(current);
  });

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
