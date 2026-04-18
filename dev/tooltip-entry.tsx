/* @refresh reload */
/** Standalone entry for the Tooltip showcase. Bypasses main.tsx (which currently
 * fails to boot because several pre-existing showcases import symbols that the
 * respective barrels do not re-export — unrelated to Phase 1.2). */
import { render } from "solid-js/web";
import "../src/styles/global.css";
import "../src/themes/default.css";
import "./main.css";
import { TooltipShowcase } from "./showcases/tooltip";

render(
  () => (
    <div class="showcase">
      <main class="showcase__content">
        <TooltipShowcase />
      </main>
    </div>
  ),
  document.getElementById("root")!,
);
