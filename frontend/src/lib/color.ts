/**
 * Converts a hex color like "#D4A72C" into a space-separated RGB triplet
 * ("212 167 44") suitable for CSS custom properties consumed via
 * `rgb(var(--accent) / <alpha-value>)` in Tailwind color tokens.
 */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return "212 167 44";
  return `${r} ${g} ${b}`;
}

/** Lightens a hex color by the given amount (0-1) for hover states. */
export function lightenHex(hex: string, amount = 0.15): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  if ([r, g, b].some((v) => Number.isNaN(v))) return "#E3B94A";
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}

export const ACCENT_COLOR_OPTIONS = [
  "#D4A72C", // brass (default)
  "#58A6FF", // blue
  "#2DD4BF", // teal
  "#A78BFA", // violet
  "#F472B6", // pink
  "#FB923C", // orange
  "#3FB950", // green
  "#F85149", // red
];
