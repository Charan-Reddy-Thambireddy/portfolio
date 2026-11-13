import { LAST_ACTUAL, ALL_COMPANIES } from "../data.js?v=7f674494";
import { companyProfile } from "../content.js?v=7f674494";
import { canSee } from "../entitlements.js?v=7f674494";
import { escapeHtml, pct, num } from "../format.js?v=7f674494";

const root = document.getElementById("company-root");
const name = new URLSearchParams(location.search).get("name") ?? "";
const crumbs = (t) => `<nav class="mi-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><a href="search.html">Search</a></li><li aria-current="page">${escapeHtml(t)}</li></ol></nav>`;

if (!ALL_COMPANIES.includes(name)) {
  root.innerHTML = `${crumbs("Company not found")}<h1>Company not found</h1><p><a href="search.html">Search for a company</a>.</p>`;
} else {
  document.title = `${name} – Meridian Market Intelligence (demo)`;
  const rows = companyProfile(name);
  const visible = rows.filter((r) => canSee(r.category.id, r.country.id)).sort((a, b) => b.value - a.value);
  const hidden = rows.length - visible.length;
  const total = visible.reduce((s, r) => s + r.value, 0);
  root.innerHTML = `${crumbs(name)}
    <div class="mi-page-band" style="--ind:${rows[0]?.category.industry.color ?? "#1e3a8a"}">
      <p><span class="mi-tag">Company</span> Fictional company · ${escapeHtml(rows[0]?.category.industry.name ?? "")}</p>
      <h1>${escapeHtml(name)}</h1>
      <p>Present in ${new Set(rows.map((r) => r.category.name)).size} categories across ${new Set(rows.map((r) => r.country.name)).size} countries.${visible.length ? ` In the markets your subscription covers, its estimated ${LAST_ACTUAL} retail sales were USD ${num(total)} million.` : ""}</p>
    </div>
    ${hidden ? `<div class="mi-alert mi-alert--warn"><p>${hidden} of ${rows.length} market positions are outside your subscription and are not shown.</p></div>` : ""}
    ${visible.length ? `<div class="mi-table-wrap" role="region" aria-labelledby="pos-caption" tabindex="0"><table>
      <caption id="pos-caption">Market positions, ${LAST_ACTUAL}</caption>
      <thead><tr><th scope="col">Category</th><th scope="col">Country</th><th scope="col" class="mi-num">Rank</th><th scope="col" class="mi-num">Value share</th><th scope="col" class="mi-num">Change since 2020</th><th scope="col" class="mi-num">Est. sales, USD million</th></tr></thead>
      <tbody>${visible.map((r) => `<tr><th scope="row"><a href="explore.html?cat=${r.category.id}&geo=${r.country.id}&metric=value">${escapeHtml(r.category.name)}</a></th><td>${escapeHtml(r.country.name)}</td><td class="mi-num">${r.rank}</td><td class="mi-num">${pct(r.share2025)}</td><td class="mi-num">${((r.share2025 - r.share2020) * 100 >= 0 ? "+" : "") + ((r.share2025 - r.share2020) * 100).toFixed(1)} pts</td><td class="mi-num">${num(r.value)}</td></tr>`).join("")}</tbody>
    </table></div>` : `<p>None of this company's markets are in your subscription.</p>`}`;
}
