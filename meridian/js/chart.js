/**
 * Small dependency-free SVG line chart: actual years solid, forecast years dashed on a
 * shaded band. Each series also gets a distinct marker shape, so colour is never the
 * only cue (WCAG 1.4.1). The data table next to the chart carries the exact values.
 */
import { YEARS, LAST_ACTUAL } from "./data.js";
import { escapeHtml, num } from "./format.js";

export const PALETTE = ["#2f5fd0", "#c2410c", "#0f766e", "#9333ea", "#b45309", "#be123c"];
const MARKERS = ["circle", "square", "diamond", "triangle", "circle-open", "square-open"];

function marker(shape, x, y, color) {
  const s = 4.5;
  switch (shape) {
    case "square": return `<rect x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}" fill="${color}"/>`;
    case "diamond": return `<path d="M${x} ${y - s - 1}L${x + s + 1} ${y}L${x} ${y + s + 1}L${x - s - 1} ${y}Z" fill="${color}"/>`;
    case "triangle": return `<path d="M${x} ${y - s - 1}L${x + s + 1} ${y + s}L${x - s - 1} ${y + s}Z" fill="${color}"/>`;
    case "circle-open": return `<circle cx="${x}" cy="${y}" r="${s}" fill="#fff" stroke="${color}" stroke-width="2"/>`;
    case "square-open": return `<rect x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}" fill="#fff" stroke="${color}" stroke-width="2"/>`;
    default: return `<circle cx="${x}" cy="${y}" r="${s}" fill="${color}"/>`;
  }
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

/**
 * @param {{label:string, values:Record<number,number>}[]} seriesList
 * @param {{title:string, unit:string, decimals?:number}} opts
 */
export function lineChart(seriesList, opts) {
  const W = 760, H = 340, L = 64, R = 16, T = 20, B = 40;
  const all = seriesList.flatMap((s) => YEARS.map((y) => s.values[y]));
  const max = niceMax(Math.max(...all) * 1.05);
  const x = (y) => L + ((y - YEARS[0]) / (YEARS.length - 1)) * (W - L - R);
  const yv = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  const grid = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${yv(t)}" y2="${yv(t)}" class="mi-chart__grid"/><text x="${L - 8}" y="${yv(t) + 4}" text-anchor="end" class="mi-chart__tick">${num(t, t < 10 && max < 10 ? 1 : 0)}</text>`).join("");
  const xTicks = YEARS.map((y) => `<text x="${x(y)}" y="${H - B + 20}" text-anchor="middle" class="mi-chart__tick">${y}</text>`).join("");
  const band = `<rect x="${x(LAST_ACTUAL)}" y="${T}" width="${x(YEARS.at(-1)) - x(LAST_ACTUAL)}" height="${H - T - B}" class="mi-chart__forecast"/><text x="${x(LAST_ACTUAL) + 8}" y="${T + 16}" class="mi-chart__band-label">Forecast</text>`;

  const lines = seriesList.map((s, i) => {
    const color = PALETTE[i % PALETTE.length];
    const pts = (years) => years.map((y) => `${x(y)},${yv(s.values[y])}`).join(" ");
    const actual = YEARS.filter((y) => y <= LAST_ACTUAL);
    const forecast = YEARS.filter((y) => y >= LAST_ACTUAL);
    const marks = YEARS.map((y) => marker(MARKERS[i % MARKERS.length], x(y), yv(s.values[y]), color)).join("");
    return `<g><polyline points="${pts(actual)}" fill="none" stroke="${color}" stroke-width="2.5"/><polyline points="${pts(forecast)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="6 5"/>${marks}</g>`;
  }).join("");

  const legend = seriesList.map((s, i) => {
    const color = PALETTE[i % PALETTE.length];
    return `<li><svg width="34" height="14" aria-hidden="true" focusable="false"><line x1="1" x2="33" y1="7" y2="7" stroke="${color}" stroke-width="2.5"/>${marker(MARKERS[i % MARKERS.length], 17, 7, color)}</svg>${escapeHtml(s.label)}</li>`;
  }).join("");

  const summary = `${opts.title}, ${opts.unit}, ${YEARS[0]} to ${YEARS.at(-1)}, forecast from ${LAST_ACTUAL + 1}. ${seriesList.length} series. Exact values are in the table that follows.`;
  return `<figure class="mi-chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(summary)}">${band}${grid}${xTicks}${lines}<text x="12" y="${T + (H - T - B) / 2}" transform="rotate(-90 12 ${T + (H - T - B) / 2})" text-anchor="middle" class="mi-chart__tick">${escapeHtml(opts.unit)}</text></svg>
    <figcaption><ul class="mi-legend">${legend}<li><svg width="34" height="14" aria-hidden="true" focusable="false"><line x1="1" x2="33" y1="7" y2="7" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/></svg>Dashed: forecast</li></ul></figcaption>
  </figure>`;
}
