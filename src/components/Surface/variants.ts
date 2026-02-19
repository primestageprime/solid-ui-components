// ============================================
// Surface Curried Variants — Depth 1 (zero CSS)
// Pre-configured Surface via createSurface() factory.
// ============================================
import { createSurface } from "./Surface";

// Shape variants
export const CardSurface = createSurface({ padding: "md", radius: "md" });
export const CompactSurface = createSurface({ padding: "sm", radius: "sm" });

// Interactive card surfaces (clickable with hover glow)
export const InteractiveCard = createSurface({ padding: "sm", radius: "sm", interactive: true, bg: "rgba(0,168,204,0.05)", borderColor: "rgba(0,168,204,0.3)" });

// Status-colored surfaces (card shape + status colors)
export const InfoSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(0,212,255,0.05)", borderColor: "rgba(0,212,255,0.3)" });
export const WarningSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(255,204,0,0.1)", borderColor: "rgba(255,204,0,0.3)" });
export const SuccessSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(0,255,136,0.1)", borderColor: "rgba(0,255,136,0.3)" });
export const DangerSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(255,0,64,0.1)", borderColor: "rgba(255,0,64,0.3)" });
