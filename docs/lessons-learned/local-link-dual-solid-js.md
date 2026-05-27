# Lessons learned — dual `solid-js` when SUI is consumed via a local link

Hit while iterating on SUI and a consumer app (`thorcasting-ui`) at the same
time, with SUI linked into the app's `node_modules` via `file:../solid-ui-components`
(equivalently `npm link` / `link:`). Layout components rendered fine; the
**Chart** crashed at runtime with:

```
Cannot read properties of undefined (reading 'yScale')
```

The notes below are what we'd want to remember the next time someone local-links
SUI and a context-using component blows up.

## Symptom vs. root cause

The crash is `ChartContext`'s `useContext()` returning `undefined`, so the child
reads `f().yScale(0)` off nothing. The context **is** provided by `<ChartProvider>`
higher up — but the provider and the consumer end up running against **two
different `solid-js` module instances**, and Solid's context registry, `Owner`,
and `Listener` are module-level state. Write context on instance A, read it on
instance B → `undefined`.

### Why two instances exist

`solid-js` is declared **both** ways in SUI's `package.json`:

- `peerDependencies: { "solid-js": "^1.9.0" }` — correct; the consumer supplies it.
- `devDependencies: { "solid-js": "^1.9.10" }` — needed to build/test SUI in isolation.

The devDependency means SUI's own checkout has a real `node_modules/solid-js`.
When the consumer links SUI by symlink, the bundler follows the symlink to SUI's
*real* path and resolves SUI's bare `import "solid-js"` against that **nested**
copy, while the app's own code uses the app's copy. Published-from-registry
consumption doesn't hit this (npm dedupes a single hoisted copy); the symlinked
realpath is what splits them.

### Why only the Chart breaks

Only components that cross a **context** boundary are affected. `Chart/context.ts`
does `createContext<ChartContextValue>()` with **no default value** (~line 118),
read via `useContext` (~line 121) — so a cross-instance read is `undefined` and
the deref throws. Presentational/layout components carry no shared context across
the boundary and render fine even with two instances: confirmed `Panel`,
`Text`, `Tabs`, `Dot`, `ThreePanelLayout`, `ProportionalStack/Item`,
`SidebarPanel`, `HeartbeatSparkline`, and `useMediaQuery` (its reactivity even
updates correctly across the boundary).

## What did and didn't fix it

- **`resolve.dedupe: ["solid-js"]` + `resolve.alias` pinning `solid-js`,
  `solid-js/web`, `solid-js/store` to the consumer's single copy** (in the
  consumer's Vite/`app.config.ts`): did **not** reliably fix the Chart under
  SolidStart/vinxi — the multi-router build didn't honour the alias for the
  symlinked package's imports. Layout components were already fine, so this
  bought nothing for the Chart.
- **Reliable options** (in rough order of preference):
  1. Consume SUI's **built `dist`** (the normal package entry) rather than its
     source through the symlink, so there's one resolved `solid-js`.
  2. Remove SUI's nested `node_modules/solid-js` after install (fragile — a
     reinstall restores it).
  3. Have the consumer's bundler resolve SUI's `solid-js` to the app's copy and
     verify it actually applies to the client bundle (don't assume).

## Library-side defense to consider

`createContext` without a default is the sharp edge. Giving Chart's context a
**safe default** (or having `useChartContext()` throw a *named* error instead of
letting `undefined.yScale` blow up) wouldn't fix the dual-instance root cause,
but it would turn a cryptic `yScale` crash into an actionable message — and any
component that legitimately renders without a provider would degrade instead of
throwing. Worth weighing against the cost of a meaningless default.

**Bottom line:** local-linking SUI is safe for layout/presentational work;
anything using `createContext` (today: the Chart) needs a single `solid-js`
instance, which means consuming the built package, not the symlinked source.
Seen from the consumer side in `thorcasting-ui` (`/dev` rebuilt from SUI layout
components with no crash; the linked Chart is what reproduced it).
