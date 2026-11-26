// SUI's theme tokens (the custom properties each theme sheet sets on :root),
// read into the design system's tokens.json, and that file compiled back to
// tokens.css. The theme sheets stay the source: bundle.css carries them as
// they are, so these tokens only describe what the sheets already set.
import postcss from "postcss";

type Declaration = readonly [name: string, value: string];

const fold = (value: string): string => value.replace(/\s+/g, " ").trim();

/** The custom properties set by a sheet's top-level `:root` rules, without the leading `--`. */
export const rootDeclarations = (css: string): readonly Declaration[] =>
  postcss
    .parse(css)
    .nodes.flatMap((node) =>
      node.type === "rule" && node.selector.trim() === ":root"
        ? node.nodes.flatMap((decl) =>
            decl.type === "decl" && decl.prop.startsWith("--")
              ? [[decl.prop.slice(2), fold(decl.value)] as const]
              : [],
          )
        : [],
    );

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const PLAIN_RGB =
  /^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+%?\s*)?\)$/;
const TRIPLET_RGBA = /^rgba\(\s*var\(--([\w-]+)\)\s*,\s*([\d.]+%?)\s*\)$/;
const TRIPLET = /^[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+$/;
const ALIAS = /^var\(--([\w-]+)\)$/;

/** A value the design system can hold as a colour, or null. */
export const colorValue = (
  value: string,
  vars: ReadonlyMap<string, string>,
): string | null => {
  if (HEX.test(value)) return value.toLowerCase();
  if (PLAIN_RGB.test(value)) return value;
  const tripletRgba = TRIPLET_RGBA.exec(value);
  if (tripletRgba) {
    const channels = vars.get(tripletRgba[1] ?? "");
    return channels !== undefined && TRIPLET.test(channels)
      ? `rgba(${channels}, ${tripletRgba[2]})`
      : null;
  }
  const alias = ALIAS.exec(value);
  return alias ? `{${alias[1]}}` : null;
};

export interface TextStyle {
  readonly name: string;
  readonly fontSize: string;
  readonly fontWeight: number;
}

const WEIGHTS: Readonly<Record<string, number>> = { normal: 400, bold: 700 };

/** Each `.text--<name>` rule that sets a size: the Text variants' type scale. */
export const textStyles = (css: string): readonly TextStyle[] =>
  postcss.parse(css).nodes.flatMap((node) => {
    if (node.type !== "rule") return [];
    const match = /^\.text--([\w-]+)$/.exec(node.selector.trim());
    const decls = new Map(
      node.nodes.flatMap((d) => (d.type === "decl" ? [[d.prop, d.value]] : [])),
    );
    const fontSize = decls.get("font-size");
    if (!match?.[1] || fontSize === undefined) return [];
    const weight = decls.get("font-weight") ?? "normal";
    return [
      {
        name: match[1],
        fontSize,
        fontWeight: WEIGHTS[weight] ?? Number(weight),
      },
    ];
  });

export interface ThemeSheet {
  readonly id: string;
  readonly name: string;
  readonly css: string;
}

export interface Token {
  readonly name: string;
  readonly value: string;
  readonly usage?: string;
}
export interface ColorToken {
  readonly name: string;
  readonly value: Readonly<Record<string, string>>;
}
export interface TokensJson {
  readonly color: {
    readonly themes: readonly { readonly id: string; readonly name: string }[];
    readonly tokens: readonly ColorToken[];
  };
  readonly spacing: { readonly tokens: readonly Token[] };
  readonly radius: { readonly tokens: readonly Token[] };
  readonly clip: { readonly note: string; readonly tokens: readonly Token[] };
  readonly type: {
    readonly fonts: readonly never[];
    readonly families: Readonly<Record<string, string>>;
    readonly groups: readonly {
      readonly name: string;
      readonly family: string;
      readonly styles: readonly TextStyle[];
    }[];
  };
}

type Kind = "spacing" | "radius" | "clip" | "font" | "skip" | "color";

const FONT_KEYS: Readonly<Record<string, string>> = {
  "sui-font-family": "sans",
  "sui-font-utility": "utility",
  "sui-font-mono": "mono",
};

const kindOf = (name: string): Kind => {
  if (name.startsWith("sui-space-")) return "spacing";
  if (name.startsWith("sui-radius-")) return "radius";
  if (name.startsWith("sui-clip-")) return "clip";
  if (name in FONT_KEYS) return "font";
  if (name.startsWith("sui-dense-")) return "skip";
  return "color";
};

const uniqueInOrder = (names: readonly string[]): readonly string[] => [
  ...new Set(names),
];

/** Lengths: the first theme's value, and a note naming each theme that sets another. */
const lengthTokens = (
  sheets: readonly (ThemeSheet & {
    readonly vars: ReadonlyMap<string, string>;
  })[],
  names: readonly string[],
): readonly Token[] =>
  names.flatMap((name) => {
    const [first, ...rest] = sheets;
    const value = first?.vars.get(name);
    if (value === undefined) return [];
    const others = rest.flatMap((s) => {
      const v = s.vars.get(name);
      return v !== undefined && v !== value ? [`${s.name}: ${v}`] : [];
    });
    return [
      others.length > 0
        ? { name, value, usage: others.join("; ") }
        : { name, value },
    ];
  });

/** tokens.json for SUI's themes (the first is the default), and the names it could not carry. */
export const tokensJson = (
  themes: readonly ThemeSheet[],
  textCss: string,
): { readonly json: TokensJson; readonly skipped: readonly string[] } => {
  const sheets = themes.map((t) => ({
    ...t,
    vars: new Map(rootDeclarations(t.css)),
  }));
  const names = uniqueInOrder(sheets.flatMap((s) => [...s.vars.keys()])).filter(
    (name) => !name.endsWith("-rgb"),
  );
  const of = (kind: Kind) => names.filter((name) => kindOf(name) === kind);

  const colorEntries = of("color").map((name) => ({
    name,
    value: Object.fromEntries(
      sheets.flatMap((s) => {
        const raw = s.vars.get(name);
        const v = raw === undefined ? null : colorValue(raw, s.vars);
        return v === null ? [] : [[s.id, v]];
      }),
    ),
  }));
  const colors = colorEntries.filter((t) => Object.keys(t.value).length > 0);

  const families = Object.fromEntries(
    sheets.flatMap((s) =>
      of("font").flatMap((name) => {
        const v = s.vars.get(name);
        return v === undefined ? [] : [[`${s.id}-${FONT_KEYS[name]}`, v]];
      }),
    ),
  );

  const skipped = [
    ...of("skip"),
    ...colorEntries
      .filter((t) => Object.keys(t.value).length === 0)
      .map((t) => t.name),
  ].sort();

  return {
    json: {
      color: {
        themes: sheets.map((s) => ({ id: s.id, name: s.name })),
        tokens: colors,
      },
      spacing: { tokens: lengthTokens(sheets, of("spacing")) },
      radius: { tokens: lengthTokens(sheets, of("radius")) },
      clip: {
        note: "Corner cut sizes for SUI's clip-path shapes (HUD's chamfered edges).",
        tokens: lengthTokens(sheets, of("clip")),
      },
      type: {
        fonts: [],
        families,
        groups: [
          {
            name: "Text",
            family: `${sheets[0]?.id ?? ""}-sans`,
            styles: textStyles(textCss),
          },
        ],
      },
    },
    skipped,
  };
};

const cssValue = (value: string): string => {
  const alias = /^\{([\w-]+)\}$/.exec(value);
  return alias ? `var(--${alias[1]})` : value;
};

const block = (selector: string, lines: readonly string[]): string =>
  `${selector} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;

/** tokens.json compiled to tokens.css, in the shape the design system compiles it. */
export const tokensCss = (json: TokensJson): string => {
  const [first, ...rest] = json.color.themes;
  const firstId = first?.id ?? "";
  const colorFor = (token: ColorToken, id: string): string | undefined =>
    token.value[id] ?? token.value[firstId] ?? Object.values(token.value)[0];
  const colors = (id: string) =>
    json.color.tokens.flatMap((t) => {
      const v = colorFor(t, id);
      return v === undefined ? [] : [`--${t.name}: ${cssValue(v)};`];
    });
  const lengths = [
    ...json.spacing.tokens,
    ...json.radius.tokens,
    ...json.clip.tokens,
  ].map((t) => `--${t.name}: ${t.value};`);
  const fonts = Object.entries(json.type.families).map(
    ([key, stack]) => `--font-${key}: ${stack};`,
  );
  const styles = json.type.groups.flatMap((group) =>
    group.styles.map((style) =>
      block(`.${style.name}`, [
        `font-family: var(--font-${group.family});`,
        `font-size: ${style.fontSize};`,
        `font-weight: ${style.fontWeight};`,
      ]),
    ),
  );
  return [
    "/* SUI — generated from tokens.json */",
    block(`:root, [data-theme="${firstId}"]`, colors(firstId)),
    ...rest.map((theme) =>
      block(`[data-theme="${theme.id}"]`, colors(theme.id)),
    ),
    block(":root", [...lengths, ...fonts]),
    ...styles,
    "",
  ].join("\n");
};
