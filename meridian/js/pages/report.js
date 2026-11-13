import { LAST_ACTUAL, LAST_YEAR, YEARS, valueSeries, cagr } from "../data.js";
import { report } from "../content.js";
import { canSee } from "../entitlements.js";
import { lineChart } from "../chart.js";
import { escapeHtml, num, pct, usdMillion } from "../format.js";

const root = document.getElementById("report-root");
const id = new URLSearchParams(location.search).get("id") ?? "";
const r = report(id);

const crumbs = (title) => `<nav class="mi-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><a href="search.html">Search</a></li><li aria-current="page">${escapeHtml(title)}</li></ol></nav>`;

if (!r) {
  document.title = `Report not found – Meridian Market Intelligence (demo)`;
  root.innerHTML = `${crumbs("Report not found")}<h1>Report not found</h1><p>Check the link, or <a href="search.html">search for a report</a>.</p>`;
} else {
  document.title = `${r.title} – Meridian Market Intelligence (demo)`;
  const head = `${crumbs(r.title)}<p class="mi-meta"><span class="mi-tag">Report</span>${escapeHtml(r.group.industry.name)} · Published ${escapeHtml(r.published)}</p><h1>${escapeHtml(r.title)}</h1>`;

  if (!canSee(r.group.id, r.country.id)) {
    root.innerHTML = `${head}<p class="mi-lead">${escapeHtml(r.summary.split(".")[0])}.</p>
      <div class="mi-alert mi-alert--warn"><h2 style="font-size:1.1rem">This report is not in your subscription</h2><p>Your plan does not cover ${escapeHtml(r.group.industry.name)} in ${escapeHtml(r.country.name)}. The API returns a 403 for the full text and data; only the title and first sentence are shown as a preview.</p><p>Switch demo user in the bar at the top to see the full report.</p></div>`;
  } else {
    const rows = r.categories.map((c) => ({ c, v: valueSeries(c.id, r.country.id) }));
    root.innerHTML = `${head}
      <div class="mi-report">
        <nav class="mi-toc mi-card" aria-label="In this report"><h2 style="font-size:1rem">In this report</h2><ol>
          <li><a href="#summary">Executive summary</a></li><li><a href="#findings">Key findings</a></li><li><a href="#size">Market size</a></li>
          <li><a href="#competition">Competitive landscape</a></li><li><a href="#outlook">Outlook</a></li><li><a href="#related">Related research</a></li></ol></nav>
        <article class="mi-stack">
          <section id="summary" aria-labelledby="summary-h"><h2 id="summary-h">Executive summary</h2><p class="mi-lead">${escapeHtml(r.summary)}</p></section>
          <section id="findings" aria-labelledby="findings-h"><h2 id="findings-h">Key findings</h2><ul>${r.findings.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></section>
          <section id="size" aria-labelledby="size-h" class="mi-stack"><h2 id="size-h">Market size</h2>
            ${lineChart(rows.map((x) => ({ label: x.c.name, values: x.v })), { title: `Retail value, ${r.title}`, unit: "USD million" })}
            <div class="mi-table-wrap" role="region" aria-labelledby="size-caption" tabindex="0"><table>
              <caption id="size-caption">Retail value by category, USD million</caption>
              <thead><tr><th scope="col">Category</th>${[2020, LAST_ACTUAL - 1, LAST_ACTUAL, LAST_YEAR].map((y) => `<th scope="col" class="mi-num${y > LAST_ACTUAL ? " mi-forecast-col" : ""}">${y}${y > LAST_ACTUAL ? " F" : ""}</th>`).join("")}<th scope="col" class="mi-num">CAGR 2020–${LAST_ACTUAL}</th><th scope="col" class="mi-num">CAGR ${LAST_ACTUAL}–${LAST_YEAR}</th></tr></thead>
              <tbody>${rows.map((x) => `<tr><th scope="row"><a href="explore.html?cat=${x.c.id}&geo=${r.country.id}&metric=value">${escapeHtml(x.c.name)}</a></th>${[2020, LAST_ACTUAL - 1, LAST_ACTUAL, LAST_YEAR].map((y) => `<td class="mi-num${y > LAST_ACTUAL ? " mi-forecast-col" : ""}">${num(x.v[y])}</td>`).join("")}<td class="mi-num">${pct(cagr(x.v, 2020, LAST_ACTUAL))}</td><td class="mi-num">${pct(cagr(x.v, LAST_ACTUAL, LAST_YEAR))}</td></tr>`).join("")}
                <tr><th scope="row">Total ${escapeHtml(r.group.name.toLowerCase())}</th>${[2020, LAST_ACTUAL - 1, LAST_ACTUAL, LAST_YEAR].map((y) => `<td class="mi-num${y > LAST_ACTUAL ? " mi-forecast-col" : ""}"><strong>${num(r.values[y])}</strong></td>`).join("")}<td class="mi-num"><strong>${pct(cagr(r.values, 2020, LAST_ACTUAL))}</strong></td><td class="mi-num"><strong>${pct(cagr(r.values, LAST_ACTUAL, LAST_YEAR))}</strong></td></tr></tbody>
            </table></div></section>
          <section id="competition" aria-labelledby="comp-h"><h2 id="comp-h">Competitive landscape</h2>
            <p>${escapeHtml(r.leaders[0].company)} led ${escapeHtml(r.group.name.toLowerCase())} in ${escapeHtml(r.country.name)} in ${LAST_ACTUAL}, with ${pct(r.leaders[0].share)} of a ${usdMillion(r.values[LAST_ACTUAL])} market.</p>
            <div class="mi-table-wrap" role="region" aria-labelledby="comp-caption" tabindex="0"><table><caption id="comp-caption">Leading companies, share of retail value ${LAST_ACTUAL}</caption>
              <thead><tr><th scope="col">Rank</th><th scope="col">Company</th><th scope="col" class="mi-num">Share</th></tr></thead>
              <tbody>${r.leaders.slice(0, 5).map((l, i) => `<tr><td>${i + 1}</td><th scope="row"><a href="company.html?name=${encodeURIComponent(l.company)}">${escapeHtml(l.company)}</a></th><td class="mi-num">${pct(l.share)}</td></tr>`).join("")}</tbody></table></div></section>
          <section id="outlook" aria-labelledby="outlook-h"><h2 id="outlook-h">Outlook</h2><p>${escapeHtml(r.outlook)}</p></section>
          <section id="related" aria-labelledby="related-h"><h2 id="related-h">Related research</h2><ul>
            ${rows.map((x) => `<li><a href="explore.html?cat=${x.c.id}&geo=${r.country.id}&metric=value">${escapeHtml(x.c.name)} in ${escapeHtml(r.country.name)}: market sizes and forecasts</a></li>`).join("")}
            <li><a href="ask.html?q=${encodeURIComponent(`How fast is ${r.group.name.toLowerCase()} growing in ${r.country.name}?`)}">Ask Meridian about ${escapeHtml(r.group.name.toLowerCase())} in ${escapeHtml(r.country.name)}</a></li></ul></section>
        </article>
      </div>`;
  }
}
