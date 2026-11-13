import { TAXONOMY, COUNTRIES, CATEGORIES, YEARS, LAST_ACTUAL, LAST_YEAR, valueSeries, cagr, icon } from "../data.js?v=7f674494";
import { currentPlan, canSee, canSeeIndustry } from "../entitlements.js?v=7f674494";
import { report, REPORT_IDS } from "../content.js?v=7f674494";
import { escapeHtml, usdMillion, pct } from "../format.js?v=7f674494";

const plan = currentPlan();
const geo = plan.countries.join(",");

// ---- Industry tiles ---------------------------------------------------------------
document.getElementById("industries").innerHTML = TAXONOMY.map((ind) => {
  const cats = ind.groups.flatMap((g) => g.categories);
  const entitled = canSeeIndustry(ind.id);
  const total = entitled ? cats.reduce((sum, c) => sum + plan.countries.reduce((s, g) => s + valueSeries(c.id, g)[LAST_ACTUAL], 0), 0) : 0;
  return `<li class="mi-ind-tile" style="--ind:${ind.color};--tint:${ind.tint}">
    <div class="mi-ind-tile__top"><span class="mi-ind-icon">${icon(ind.icon, 22)}</span>
      <h3><a href="explore.html?cat=${cats.map((c) => c.id).join(",")}&geo=${geo}&metric=value">${escapeHtml(ind.name)}</a></h3></div>
    <div class="mi-ind-tile__body">
      ${entitled ? `<div><b>${usdMillion(total)}</b><p class="mi-hint">${LAST_ACTUAL} retail value in your ${plan.countries.length} countries</p></div>`
        : `<span class="mi-lock">Not in subscription</span><p class="mi-hint">${cats.length} categories; switch user to unlock.</p>`}
      <ul class="mi-pill-row" aria-label="Category groups">${ind.groups.map((g) => `<li>${escapeHtml(g.name)}</li>`).join("")}</ul>
    </div>
  </li>`;
}).join("");

// ---- Fastest-growing entitled markets, with sparklines --------------------------------
function sparkline(values, color) {
  const W = 220, H = 42, P = 3;
  const v = YEARS.map((y) => values[y]);
  const min = Math.min(...v), max = Math.max(...v);
  const x = (i) => P + (i / (v.length - 1)) * (W - 2 * P);
  const y = (n) => H - P - ((n - min) / (max - min || 1)) * (H - 2 * P);
  const cut = YEARS.indexOf(LAST_ACTUAL);
  const pts = (from, to) => v.slice(from, to + 1).map((n, i) => `${x(from + i)},${y(n)}`).join(" ");
  const area = `${P},${H} ${pts(0, v.length - 1)} ${W - P},${H}`;
  return `<svg class="mi-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <polygon points="${area}" fill="${color}" opacity="0.12"/>
    <polyline points="${pts(0, cut)}" fill="none" stroke="${color}" stroke-width="2.2"/>
    <polyline points="${pts(cut, v.length - 1)}" fill="none" stroke="${color}" stroke-width="2.2" stroke-dasharray="4 3"/></svg>`;
}

const markets = [];
for (const c of CATEGORIES) for (const g of plan.countries) {
  if (!canSee(c.id, g)) continue;
  const v = valueSeries(c.id, g);
  markets.push({ c, ctry: COUNTRIES.find((x) => x.id === g), v, growth: cagr(v, LAST_ACTUAL, LAST_YEAR) });
}
markets.sort((a, b) => b.growth - a.growth);
document.getElementById("trending").innerHTML = markets.slice(0, 4).map((m) => `
  <li class="mi-trend" style="--ind:${m.c.industry.color}">
    <a href="explore.html?cat=${m.c.id}&geo=${m.ctry.id}&metric=value">${escapeHtml(m.c.name)} in ${escapeHtml(m.ctry.name)}</a>
    <span class="mi-growth">${pct(m.growth, 1, true)}</span>
    <small>a year to ${LAST_YEAR}, from ${usdMillion(m.v[LAST_ACTUAL])} in ${LAST_ACTUAL}</small>
    ${sparkline(m.v, m.c.industry.color)}
  </li>`).join("");

// ---- Subscription and latest reports -----------------------------------------------------
const inds = TAXONOMY.filter((i) => plan.industries.includes(i.id));
const ctrs = COUNTRIES.filter((c) => plan.countries.includes(c.id));
document.getElementById("subscription").innerHTML = `
  <p><strong>${escapeHtml(plan.user)}</strong>, ${escapeHtml(plan.org)}.<br>Plan: <strong>${escapeHtml(plan.name)}</strong></p>
  <ul class="mi-pill-row" aria-label="Industries" style="--ind:#6d28d9">${inds.map((i) => `<li style="border-color:${i.color};color:${i.color};font-weight:600">${escapeHtml(i.name)}</li>`).join("")}</ul>
  <p style="margin-top:0.6rem">${ctrs.map((c) => escapeHtml(c.name)).join(", ")}</p>
  <p class="mi-hint">Switch demo user in the bar at the top to see how access changes.</p>`;

const latest = REPORT_IDS.map(report)
  .filter((r) => plan.industries.includes(r.group.industry.id) && plan.countries.includes(r.country.id))
  .sort((a, b) => new Date(`1 ${b.published}`) - new Date(`1 ${a.published}`) || a.title.localeCompare(b.title))
  .slice(0, 4);
document.getElementById("latest").innerHTML = latest.map((r) => `
  <li class="mi-result" style="--ind:${r.group.industry.color}"><p style="margin:0 0 0.3rem"><span class="mi-tag mi-tag--Report">Report</span><span class="mi-meta">${escapeHtml(r.group.industry.name)} · ${escapeHtml(r.published)}</span></p>
  <h3><a href="report.html?id=${encodeURIComponent(r.id)}">${escapeHtml(r.title)}</a></h3><p>${escapeHtml(r.summary)}</p></li>`).join("");
