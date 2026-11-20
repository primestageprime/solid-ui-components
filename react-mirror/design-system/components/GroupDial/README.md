# GroupDial

A role's units grouped into one dial: the group's average on the track, the spread and the new count under the name, and a disclosure button that shows each unit.

SUI keeps this private to `MutationSliders` (`groupDial.tsx`); the mirror names it so a canvas can draw one role card. It draws a state. Every callback (`onToggle`, `onReset`, `onType`) only reports a press.

- `entity`: the group as one entity (label such as "Roofer × 3", the average old and new values, the allowed range).
- `members`: the units in the group. Their spread and how many are new become the note.
- `open`: whether the disclosure shows each unit.
- `domain`, `height`, `format`, `dragStep`, `keyStep`: as `MutationDial`.

Same markup as SUI's, checked by the drift test in `react-mirror/test/drift.test.tsx`.
