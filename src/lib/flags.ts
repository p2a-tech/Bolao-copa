/**
 * Returns the flag-icons CSS class for an ISO 3166-1 alpha-2 country code.
 * Renders a real SVG flag (bundled, works offline) consistently across
 * browsers — unlike emoji flags, which Windows does not render.
 */
export function flagClass(code: string): string {
  const cc = (code ?? "").trim().toLowerCase();
  // alpha-2 (e.g. "br") or flag-icons subdivisions (e.g. "gb-sct", "gb-eng")
  return /^[a-z]{2}(-[a-z]{2,3})?$/.test(cc) ? `fi fi-${cc}` : "fi";
}
