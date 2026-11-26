# MutationDial

One entity's dial in a role card: its name, the marked slider with the old value, the new value and the allowed range, the readouts under it, and the reset and remove buttons.

SUI keeps this private to `MutationSliders` (`dial.tsx`); the mirror names it so a canvas can draw one. It draws a state and does not drag.

- `entity`: `{ id, label, old, value, range }`. `old: null` is a new entity; `value: null` is a removed one.
- `domain`: the shared scale every dial on the card uses.
- `format`: how a value reads, such as `$63K`.
- `selected`, `onSelect`: the name as a pressable label.
- `onReset`, `onRemove`, `onRestore`, `onType`, `onLink`/`linked`: which buttons and fields show.

Two things differ from SUI: the name is never shortened to fit (the CSS ellipsis still applies), and the link button shows only while linked (SUI also reveals it on hover and focus).
