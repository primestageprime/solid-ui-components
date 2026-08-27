/** Color variant for semantic theming */
export type ColorVariant =
  | "default"
  | "primary"
  | "danger"
  | "warning"
  | "success";

/** Corner decoration style — theme CSS determines visual treatment */
export type CornerStyle = "clip" | "bracket" | "notch" | "round" | "none";

/** Semantic treatment for a data-driven value (ruled 2026-07-17): consumers
 *  configure a function (value, …) → Tone; the theme owns the color. Shared by
 *  the Table fields system, ValueMatrix, and Text.
 *  "highlight" (added 2026-08-26): flag a value as notable/worth-a-look —
 *  distinct from "accent" (brand color, already heavily used for links/focus)
 *  and from "warning"/"danger" (severity). Themed via --sui-highlight. */
export type Tone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "muted"
  | "highlight";
