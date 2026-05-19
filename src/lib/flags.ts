/**
 * Converts an ISO 3166-1 alpha-2 country code into its emoji flag.
 * Uses Unicode regional indicator symbols, so no external image
 * assets are required and it works fully offline.
 */
export function flagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  const A = 0x1f1e6;
  const offset = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - offset),
    A + (cc.charCodeAt(1) - offset)
  );
}
