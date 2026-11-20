/** A class list from its parts, the falsy ones left out. */
export const classNames = (
  ...parts: readonly (string | false | null | undefined)[]
): string => parts.filter((part): part is string => !!part).join(" ");
