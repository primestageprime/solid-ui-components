// Config-form glyphs: direction, cadence and amount shape, each with its tooltip.
import type { Component } from "solid-js";
import { AmountShapeGlyph, CadenceGlyph, DirectionGlyph } from "../../src/components/Glyphs";
import type { Cadence } from "../../src/components/Glyphs";

const CADENCES: { cadence: Cadence; n?: number }[] = [
  { cadence: "weekly" },
  { cadence: "biweekly" },
  { cadence: "monthly" },
  { cadence: "annual" },
  { cadence: "every-n", n: 3 },
  { cadence: "once" },
];

export const ConfigGlyphsShowcase: Component = () => (
  <div class="component-section">
    <h2>Config glyphs — Composite (Depth 2)</h2>
    <p class="text-meta">
      The three icons after a form's name, in this order: direction, cadence, amount shape. Hover or focus a
      glyph for what it means. Shape carries the meaning; colour only backs it up.
    </p>
    <h3>Direction</h3>
    <div class="example-group config-glyphs-row">
      <DirectionGlyph direction="expense" />
      <DirectionGlyph direction="revenue" />
    </div>
    <h3>Cadence</h3>
    <div class="example-group config-glyphs-row">
      {CADENCES.map((c) => (
        <CadenceGlyph cadence={c.cadence} n={c.n} />
      ))}
    </div>
    <h3>Amount shape</h3>
    <div class="example-group config-glyphs-row">
      <AmountShapeGlyph shape="fixed" />
      <AmountShapeGlyph shape="variable" />
    </div>
    <h3>In a form header</h3>
    <div class="example-group config-glyphs-row config-glyphs-row--header">
      <strong>Senior engineer salary</strong>
      <DirectionGlyph direction="expense" />
      <CadenceGlyph cadence="biweekly" />
      <AmountShapeGlyph shape="fixed" />
    </div>
    <h3>Large (inherits the font size)</h3>
    <div class="example-group config-glyphs-row config-glyphs-row--large">
      <DirectionGlyph direction="revenue" />
      <CadenceGlyph cadence="weekly" />
      <CadenceGlyph cadence="biweekly" />
      <CadenceGlyph cadence="monthly" />
      <AmountShapeGlyph shape="fixed" />
      <AmountShapeGlyph shape="variable" />
    </div>
  </div>
);
