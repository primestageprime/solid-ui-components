// Props plumbing between SUI's Solid-shaped props and React's.
import { reactStyle, type SolidStyle } from "./style.ts";

type Bag = Readonly<Record<string, unknown>>;

/** Solid's `mergeProps(defaults, props)`: the caller wins wherever it is defined. */
export const mergeDefined = <D extends object, P extends object>(
  defaults: D,
  props: P,
): D & P => {
  const d = defaults as Bag;
  const p = props as Bag;
  return Object.fromEntries(
    [...new Set([...Object.keys(d), ...Object.keys(p)])].map((key) => [
      key,
      p[key] !== undefined ? p[key] : d[key],
    ]),
  ) as D & P;
};

export const omit = <T extends Bag, K extends string>(
  bag: T,
  keys: readonly K[],
): Omit<T, K> =>
  Object.fromEntries(
    Object.entries(bag).filter(
      ([key]) => !(keys as readonly string[]).includes(key),
    ),
  ) as Omit<T, K>;

/** Solid / HTML attribute names that React spells differently. */
const REACT_NAMES: Readonly<Record<string, string>> = {
  class: "className",
  tabindex: "tabIndex",
  for: "htmlFor",
  inputmode: "inputMode",
  autocomplete: "autoComplete",
  autocorrect: "autoCorrect",
  autocapitalize: "autoCapitalize",
  readonly: "readOnly",
  spellcheck: "spellCheck",
  maxlength: "maxLength",
  enterkeyhint: "enterKeyHint",
};

/** Pass-through attributes, renamed for React, style converted, undefineds dropped. */
export const domProps = (bag: Bag): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(bag)
      .map(([key, value]): [string, unknown] =>
        key === "style"
          ? [key, reactStyle(value as SolidStyle | undefined)]
          : [REACT_NAMES[key] ?? key, value],
      )
      .filter(([, value]) => value !== undefined),
  );
