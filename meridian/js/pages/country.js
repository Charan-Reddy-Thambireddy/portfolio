import { COUNTRIES, GROUPS, LAST_ACTUAL, LAST_YEAR, REGION_COLORS, cagr, icon } from "../data.js?v=7f674494";
import { groupValue, groupCompanies } from "../content.js?v=7f674494";
import { canSee, canSeeCountry, currentPlan } from "../entitlements.js?v=7f674494";
import { escapeHtml, usdMillion, pct } from "../format.js?v=7f674494";

const root = document.getElementById("country-root");
const id = new URLSearchParams(location.search).get("id");
const ctry = COUNTRIES.find((c) => c.id === id);
const crumbs = (t) => `<nav class="mi-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li>Countries</li><li aria-current="page">${escapeHtml(t)}</li></ol></nav>`;

if (!ctry) {
  root.innerHTML = `${crumbs("Country not found")}<h1>Country not found</h1><p>Choose a country from the Countries menu.</p>`;
} else {
  document.title = `${ctry.name} – Meridian Market Intelligence (demo)`;
  const groups = GROUPS.map((g) => ({ g, ok: canSee(g.id, ctry.id) }));
  const visible = groups.filter((x) => x.ok).map((x) => ({ ...x, v: groupValue(x.g.id, ctry.id) }));
  const total = visible.reduce((s, x) => s + x.v[LAST_ACTUAL], 0);
  root.innerHTML = `${crumbs(ctry.name)}
    <div class="mi-page-band" style="--ind:${REGION_COLORS[ctry.region]}">
      <p><span class="mi-tag">${escapeHtml(ctry.region)}</span> Population ${ctry.pop.toLocaleString("en-US")} million</p>
      <h1>${escapeHtml(ctry.name)}</h1>
      <p>${canSeeCountry(ctry.id) ? (visible.length ? `${usdMillion(total)} retail value in ${LAST_ACTUAL} across the ${visible.length} category groups in your subscription.` : "Your subscription covers this country, but none of its industries.") : `${escapeHtml(ctry.name)} is not in your subscription (${escapeHtml(currentPlan().name)}).`}</p>
    </div>
    <h2>Category groups</h2>
    <ul class="mi-country-grid">${groups.map(({ g, ok }) => {
      if (!ok) return `<li class="mi-country-card" style="--ind:${g.industry.color}"><h3><span class="mi-ind-icon" style="--ind:${g.industry.color}">${icon(g.industry.icon, 16)}</span>${escapeHtml(g.name)}</h3><span class="mi-lock" style="margin:0;justify-self:start">Not in subscription</span></li>`;
      const v = groupValue(g.id, ctry.id);
      const lead = groupCompanies(g.id, ctry.id)[0];
      return `<li class="mi-country-card" style="--ind:${g.industry.color}">
        <h3><span class="mi-ind-icon" style="--ind:${g.industry.color}">${icon(g.industry.icon, 16)}</span><a href="report.html?id=${g.id}--${ctry.id}">${escapeHtml(g.name)}</a></h3>
        <b>${usdMillion(v[LAST_ACTUAL])}</b>
        <span class="mi-hint">Forecast ${pct(cagr(v, LAST_ACTUAL, LAST_YEAR))} a year to ${LAST_YEAR}</span>
        <span class="mi-hint">Leader: ${escapeHtml(lead.company)} (${pct(lead.share)})</span>
        <a href="explore.html?cat=${g.categories.map((c) => c.id).join(",")}&geo=${ctry.id}&metric=value">Explore the data</a>
      </li>`;
    }).join("")}</ul>`;
}
