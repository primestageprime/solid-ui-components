// The `sui:Icon/paths` module: SUI's own ICON_PATHS table, lifted out of
// Icon.tsx so the React Icon draws exactly SUI's glyphs.
import { sliceInitializer } from "./source.ts";

export const iconModule = (iconSource: string): string =>
  `export const ICON_PATHS = ${sliceInitializer(iconSource, "ICON_PATHS")};\n`;

export const iconNames = (iconSource: string): readonly string[] =>
  Object.keys(
    new Function(
      `return (${sliceInitializer(iconSource, "ICON_PATHS")});`,
    )() as object,
  );
