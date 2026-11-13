export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function num(value, decimals = 0) {
  if (value == null || Number.isNaN(value)) return "–";
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
/** Compact USD million figure, e.g. 8,046 -> "USD 8.0 billion". */
export function usdMillion(value) {
  if (value >= 1000) return `USD ${num(value / 1000, 1)} billion`;
  return `USD ${num(value, 0)} million`;
}
export function pct(value, decimals = 1, signed = false) {
  if (value == null || Number.isNaN(value)) return "–";
  const s = (value * 100).toFixed(decimals);
  return `${signed && value > 0 ? "+" : ""}${s}%`;
}
