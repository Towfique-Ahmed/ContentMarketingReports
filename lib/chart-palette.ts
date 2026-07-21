/*
 * Validated categorical palette from the dataviz skill. Dark is the same hues
 * stepped for the dark surface (selected, not auto-flipped). Recharts needs
 * concrete colors, so we resolve by theme rather than via CSS vars.
 */
export const CHART_PALETTE = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"],
} as const;

export const AXIS_COLOR = { light: "#898781", dark: "#898781" };
export const GRID_COLOR = { light: "#e1e0d9", dark: "#2c2c2a" };
