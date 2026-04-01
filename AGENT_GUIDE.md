# Agent Guide — solid-ui-components

This document is for Claude Code agents and AI assistants working on PrimeStage apps that use this component library.

## The #1 Rule

**Never pass visual/layout props inline. Always use or create curried variants.**

```tsx
// ❌ WRONG — inline styling via component props
<Surface padding="lg" radius="md" bg="#1a1a1a" borderColor="#333">
  <Text size="lg" weight="bold" color="#f59e0b">{score}</Text>
</Surface>

// ✅ RIGHT — use existing curried variants
<ScoreCard>
  <ScoreValue>{score}</ScoreValue>
</ScoreCard>

// If ScoreCard doesn't exist, CREATE it in the library, don't inline the styles
```

## Why?

1. **Consistency:** Every app looks the same because visual decisions live in one place
2. **Maintainability:** Changing a design means updating one variant, not grep-replacing across apps
3. **Type safety:** Curried variants only expose data + callback props — TypeScript prevents inline styling
4. **Readability:** `<InteractiveCard>` communicates intent; `<Surface padding="sm" radius="sm" interactive bg="rgba(0,168,204,0.05)">` is noise

## How It Works

### Component Types: Overrides vs Data

Every component has two kinds of props:

| Category | Examples | When Set | Who Sets |
|----------|----------|----------|----------|
| **Overrides** | `variant`, `size`, `padding`, `bg`, `gap` | Definition time | Library author (in `variants.ts`) |
| **Data** | `children`, `onClick`, `active`, `disabled`, `value` | Render time | App developer |

The factory functions (`createSurface`, `createButton`, `createText`, etc.) accept overrides and return a component that only accepts data props.

### Using Existing Variants

Check `COMPONENTS.md` or the source for available variants. Common ones:

```tsx
// Layout
<Stack>        // vertical, md gap
<Row>          // horizontal, md gap
<SpreadRow>    // horizontal, space-between
<NarrowStack>  // vertical, sm gap

// Surfaces
<InteractiveCard>  // hoverable card
<CompactCard>      // small padding card
<InfoSurface>      // info-colored background

// Text
<TextTitle>    // large, bold
<TextLabel>    // small, uppercase, muted
<TextBody>     // standard body text
<TextValue>    // bold, for data values
<MonoValue>    // monospace, for numbers/code

// Buttons
<PrimaryButton>
<DangerButton>
<GhostButton>
<SmallPrimaryButton>

// Panels
<InfoPanel>
<AccentPanel>
<DangerPanel>
```

### When a Variant Doesn't Exist

**Do NOT** work around it with inline styles or override props. Instead:

1. **Create the variant** in the library:
   ```tsx
   // In solid-ui-components/src/components/Surface/variants.ts
   export const HabitCard = createSurface({
     padding: "md", radius: "md", interactive: true,
     bg: "rgba(245,158,11,0.05)",
     borderColor: "rgba(245,158,11,0.2)",
   });
   ```

2. **Export it** from `src/index.ts`

3. **Use it** in the app:
   ```tsx
   <HabitCard active={isSelected()}>
     <TextLabel>{habit.name}</TextLabel>
   </HabitCard>
   ```

If the variant is project-specific and unlikely to be reused, you can create it locally in the app using the factory function — but the visual config still lives in one place, not scattered across JSX.

### Local Curried Variants (in app code)

If a variant is truly app-specific:

```tsx
// In your app's src/components/variants.ts
import { createSurface, createText } from "solid-ui-components";

export const ScoreCard = createSurface({
  padding: "lg", radius: "lg",
  bg: "#111", direction: "column", align: "center",
});

export const ScoreValue = createText({
  size: "3xl", weight: "bold", color: "var(--sui-color-accent)",
});
```

This is acceptable — the key is that override props are set once, not repeated at every call site.

## What NOT To Do

### Don't use raw HTML/CSS for things the library handles

```tsx
// ❌ WRONG
<div style={{ display: "flex", gap: "8px", padding: "16px", "border-radius": "8px", background: "#1a1a1a" }}>
  <span style={{ "font-size": "24px", "font-weight": "bold" }}>{value}</span>
</div>

// ✅ RIGHT
<CompactCard>
  <TextValue>{value}</TextValue>
</CompactCard>
```

### Don't override curried variants at render time

```tsx
// ❌ WRONG — defeats the purpose of currying
<PrimaryButton size="lg" variant="danger">Delete</PrimaryButton>

// ✅ RIGHT — use the correct variant
<LargeDangerButton>Delete</LargeDangerButton>
// Or if it doesn't exist, create it:
// export const LargeDangerButton = createButton({ variant: "danger", size: "lg" });
```

### Don't use `style` prop for layout

```tsx
// ❌ WRONG
<Stack style={{ gap: "4px", "max-width": "400px" }}>

// ✅ RIGHT — create a variant
const NarrowTightStack = createStack({ gap: "xs", maxWidth: "400px" });
<NarrowTightStack>
```

## Theming

Apps import ONE theme CSS file:

```tsx
import "solid-ui-components/themes/default.css";  // clean neutral
import "solid-ui-components/themes/hud.css";       // sci-fi HUD style
```

All `--sui-*` CSS custom properties come from the theme. Components reference these variables internally. Never hardcode colors — use theme variables or create a new variant with the appropriate semantic color.

## Summary

| Situation | Action |
|-----------|--------|
| Need a specific visual config | Check if a curried variant exists → use it |
| No variant exists, need is common | Create variant in solid-ui-components library |
| No variant exists, need is app-specific | Create local variant using factory function |
| Need to pass data/callbacks | Pass them as props to the curried variant |
| Need to pass visual overrides | **STOP** — create a variant instead |
