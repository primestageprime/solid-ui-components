# MarkedSlider

SUI's vertical slider with marks: the shaded allowed range, the old value's arrow, the change line toned as a raise or a cut, and the thumb at the new value.

Use the `ContinuousMarkedSlider` variant. It draws a state: Kobalte's markup without its pointer and key handling, so nothing drags in a canvas.

- `domain`: the shared scale; `range`: the allowed band.
- `prior`: the old value, or `null` for new; `value`: the new value, or `null` for removed.
- `valueText`, `deltaLabel`, `priorLabel`: the readouts drawn on the marks.
