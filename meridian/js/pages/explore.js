/**
 * Explore categories: taxonomy tree + country picker -> market data view.
 * The selection is kept in the URL (?cat=...&geo=...&metric=...) so a view can be shared.
 */
import { TAXONOMY, COUNTRIES, REGIONS, METRICS, YEARS, LAST_ACTUAL, LAST_YEAR,
  category, country, metric, series, cagr, companyShares, icon } from "../data.js?v=7f674494";
import { canSee, canSeeIndustry, canSeeCountry } from "../entitlements.js?v=7f674494";
import { lineChart } from "../chart.js?v=7f674494";
import { escapeHtml, num, pct } from "../format.js?v=7f674494";
import { announce } from "../announcer.js?v=7f674494";

const form = document.getElementById("explore-form");
const tree = document.getElementById("tree");
const results = document.getElementById("results");
const summary = document.getElementById("error-summary");
const baseTitle = document.title;
const LOCK = `<span class="mi-lock"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" fill="currentColor"/></svg>Not in subscription</span>`;
const CHEVRON = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`;

// ---- Build the form ---------------------------------------------------------------------
tree.innerHTML = TAXONOMY.map((ind) => `
  <li>
    <div class="mi-tree__row">
      <button type="button" class="mi-tree__toggle" aria-expanded="false" aria-controls="ind-${ind.id}" id="toggle-${ind.id}">${CHEVRON}<span class="mi-sr-only">${escapeHtml(ind.name)}</span></button>
      <span id="ind-label-${ind.id}" class="mi-tree__industry" style="--ind:${ind.color}"><span class="mi-ind-icon">${icon(ind.icon, 16)}</span><strong>${escapeHtml(ind.name)}</strong>${canSeeIndustry(ind.id) ? "" : LOCK}</span>
    </div>
    <ul id="ind-${ind.id}" hidden aria-labelledby="ind-label-${ind.id}">
      ${ind.groups.map((g) => `
        <li>
          <label class="mi-check"><input type="checkbox" data-group="${g.id}"> <span>${escapeHtml(g.name)} <span class="mi-def">All ${g.categories.length} categories</span></span></label>
          <ul>
            ${g.categories.map((c) => `<li><label class="mi-check"><input type="checkbox" name="cat" value="${c.id}" data-parent="${g.id}"> <span>${escapeHtml(c.name)}<span class="mi-def">${escapeHtml(c.def)}</span></span></label></li>`).join("")}
          </ul>
        </li>`).join("")}
    </ul>
  </li>`).join("");

document.getElementById("countries").innerHTML = REGIONS.map((r) => `
  <fieldset><legend class="mi-hint" style="font-weight:600">${r}</legend>
    ${COUNTRIES.filter((c) => c.region === r).map((c) => `<label class="mi-check"><input type="checkbox" name="geo" value="${c.id}"> <span>${escapeHtml(c.name)}${canSeeCountry(c.id) ? "" : LOCK}</span></label>`).join("")}
  </fieldset>`).join("");

document.getElementById("metric").innerHTML = METRICS.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");

function setExpanded(industryId, open) {
  document.getElementById(`toggle-${industryId}`).setAttribute("aria-expanded", String(open));
  document.getElementById(`ind-${industryId}`).hidden = !open;
}
tree.addEventListener("click", (e) => {
  const btn = e.target.closest(".mi-tree__toggle");
  if (btn) setExpanded(btn.id.replace("toggle-", ""), btn.getAttribute("aria-expanded") !== "true");
});

// Group checkbox <-> category checkboxes, with the mixed (indeterminate) state.
function syncGroup(groupId) {
  const kids = [...form.querySelectorAll(`input[data-parent="${groupId}"]`)];
  const box = form.querySelector(`input[data-group="${groupId}"]`);
  const n = kids.filter((k) => k.checked).length;
  box.checked = n === kids.length;
  box.indeterminate = n > 0 && n < kids.length;
}
form.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.group) {
    form.querySelectorAll(`input[data-parent="${t.dataset.group}"]`).forEach((k) => { k.checked = t.checked; });
  } else if (t.dataset.parent) {
    syncGroup(t.dataset.parent);
  }
});

// ---- Validation -----------------------------------------------------------------------
function clearErrors() {
  summary.hidden = true;
  summary.querySelector("ul").innerHTML = "";
  for (const id of ["categories", "countries"]) {
    document.getElementById(`${id}-error`).hidden = true;
    document.getElementById(`${id}-group`).classList.remove("mi-field--error");
  }
  document.title = baseTitle;
}
function showErrors(errors) {
  summary.querySelector("ul").innerHTML = errors.map((e) => `<li><a href="#${e.id}-group">${e.message}</a></li>`).join("");
  for (const e of errors) {
    const msg = document.getElementById(`${e.id}-error`);
    msg.textContent = e.message;
    msg.hidden = false;
    document.getElementById(`${e.id}-group`).classList.add("mi-field--error");
  }
  document.title = `Error: ${baseTitle}`;
  summary.hidden = false;
  summary.focus();
}
summary.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (!link) return;
  e.preventDefault();
  const group = document.querySelector(link.getAttribute("href"));
  group.scrollIntoView({ block: "start" });
  const first = group.querySelector('input[type="checkbox"]:not([hidden])') ?? group.querySelector("button");
  // Open the first industry so there is a checkbox to focus.
  if (group.id === "categories-group" && group.querySelector("ul[hidden]")) setExpanded(TAXONOMY[0].id, true);
  (group.querySelector('ul:not([hidden]) input[type="checkbox"]') ?? first)?.focus({ preventScroll: true });
});

// ---- Results ----------------------------------------------------------------------------
function selection() {
  const cats = [...form.querySelectorAll('input[name="cat"]:checked')].map((i) => i.value);
  const geos = [...form.querySelectorAll('input[name="geo"]:checked')].map((i) => i.value);
  return { cats, geos, metricId: form.metric.value };
}

function toCsv(rows, m) {
  const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ["Category", "Country", "Metric", "Unit", ...YEARS.map((y) => (y > LAST_ACTUAL ? `${y} (forecast)` : String(y)))];
  const body = rows.map((r) => [r.cat.name, r.ctry.name, m.name, m.unitLabel(r.cat), ...YEARS.map((y) => r.values[y].toFixed(m.decimals || 1))]);
  return [head, ...body].map((row) => row.map((v) => esc(String(v))).join(",")).join("\r\n");
}

function render({ cats, geos, metricId }, { focus = true } = {}) {
  const m = metric(metricId);
  const allowed = [];
  const denied = [];
  for (const c of cats) for (const g of geos) (canSee(c, g) ? allowed : denied).push({ cat: category(c), ctry: country(g) });
  for (const r of allowed) r.values = series(r.cat.id, r.ctry.id, m.id);

  const label = (r) => (cats.length === 1 ? r.ctry.name : geos.length === 1 ? r.cat.name : `${r.cat.name} · ${r.ctry.name}`);
  let html = `<h2 id="results-heading">Results</h2>`;

  if (denied.length) {
    html += `<div class="mi-alert mi-alert--warn"><p><strong>${denied.length} ${denied.length === 1 ? "selection is" : "selections are"} not in your subscription</strong> and ${denied.length === 1 ? "is" : "are"} not shown: ${denied.slice(0, 6).map((d) => escapeHtml(`${d.cat.name} in ${d.ctry.name}`)).join(", ")}${denied.length > 6 ? ` and ${denied.length - 6} more` : ""}.</p><p>To see ${denied.length === 1 ? "it" : "them"}, switch to a demo user whose plan covers ${denied.length === 1 ? "it" : "them"}.</p></div>`;
  }

  if (!allowed.length) {
    results.innerHTML = html;
    announce("None of the selected markets are in your subscription.");
    if (focus) results.focus();
    return;
  }

  const unit0 = m.unitLabel(allowed[0].cat);
  const chartRows = allowed.filter((r) => m.unitLabel(r.cat) === unit0).slice(0, 6);
  const sorted = [...allowed].sort((a, b) => b.values[LAST_ACTUAL] - a.values[LAST_ACTUAL]);
  const fastest = [...allowed].sort((a, b) => cagr(b.values, LAST_ACTUAL, LAST_YEAR) - cagr(a.values, LAST_ACTUAL, LAST_YEAR))[0];
  const one = allowed.length === 1 ? allowed[0] : null;

  html += `<p>${escapeHtml(m.name)}, ${allowed.length} ${allowed.length === 1 ? "market" : "markets"}. Figures for ${LAST_ACTUAL + 1}–${LAST_YEAR} are forecasts.</p>`;
  html += `<ul class="mi-kpis">${one ? `
      <li class="mi-kpi"><span>${LAST_ACTUAL} ${escapeHtml(m.name.toLowerCase())}</span><b>${num(one.values[LAST_ACTUAL], m.decimals)}</b><span>${escapeHtml(unit0)}</span></li>
      <li class="mi-kpi"><span>Growth on ${LAST_ACTUAL - 1}</span><b>${pct(one.values[LAST_ACTUAL] / one.values[LAST_ACTUAL - 1] - 1, 1, true)}</b><span>year on year</span></li>
      <li class="mi-kpi"><span>CAGR 2020–${LAST_ACTUAL}</span><b>${pct(cagr(one.values, 2020, LAST_ACTUAL))}</b><span>historical</span></li>
      <li class="mi-kpi"><span>CAGR ${LAST_ACTUAL}–${LAST_YEAR}</span><b>${pct(cagr(one.values, LAST_ACTUAL, LAST_YEAR))}</b><span>forecast</span></li>` : `
      <li class="mi-kpi"><span>Largest in ${LAST_ACTUAL}</span><b>${escapeHtml(label(sorted[0]))}</b><span>${num(sorted[0].values[LAST_ACTUAL], m.decimals)} ${escapeHtml(m.unitLabel(sorted[0].cat))}</span></li>
      <li class="mi-kpi"><span>Fastest forecast growth</span><b>${escapeHtml(label(fastest))}</b><span>${pct(cagr(fastest.values, LAST_ACTUAL, LAST_YEAR))} CAGR ${LAST_ACTUAL}–${LAST_YEAR}</span></li>
      <li class="mi-kpi"><span>Markets compared</span><b>${allowed.length}</b><span>${new Set(allowed.map((r) => r.cat.id)).size} ${new Set(allowed.map((r) => r.cat.id)).size === 1 ? "category" : "categories"} × ${new Set(allowed.map((r) => r.ctry.id)).size} ${new Set(allowed.map((r) => r.ctry.id)).size === 1 ? "country" : "countries"}</span></li>`}
    </ul>`;

  html += lineChart(chartRows.map((r) => ({ label: label(r), values: r.values })), { title: m.name, unit: unit0 });
  if (chartRows.length < allowed.length) {
    html += `<p class="mi-hint">The chart shows ${chartRows.length} of ${allowed.length} markets${allowed.some((r) => m.unitLabel(r.cat) !== unit0) ? ` measured in ${escapeHtml(unit0)} (volume units differ by category)` : " (up to six lines stay readable)"}. The table lists every market.</p>`;
  }

  html += `<div class="mi-actions"><button type="button" class="mi-button mi-button--secondary" id="export">Export data as CSV</button><span id="export-status" class="mi-hint" role="status"></span></div>`;
  html += `<div class="mi-table-wrap" role="region" aria-labelledby="data-caption" tabindex="0"><table>
    <caption id="data-caption">${escapeHtml(m.name)} by year (forecast from ${LAST_ACTUAL + 1})</caption>
    <thead><tr><th scope="col">Market</th><th scope="col">Unit</th>${YEARS.map((y) => `<th scope="col" class="mi-num${y > LAST_ACTUAL ? " mi-forecast-col" : ""}">${y}${y > LAST_ACTUAL ? '<span class="mi-sr-only"> forecast</span> F' : ""}</th>`).join("")}<th scope="col" class="mi-num">CAGR 2020–${LAST_ACTUAL}</th><th scope="col" class="mi-num">CAGR ${LAST_ACTUAL}–${LAST_YEAR}</th></tr></thead>
    <tbody>${allowed.map((r) => `<tr><th scope="row">${escapeHtml(label(r))}</th><td class="mi-nowrap">${escapeHtml(m.unitLabel(r.cat))}</td>${YEARS.map((y) => `<td class="mi-num${y > LAST_ACTUAL ? " mi-forecast-col" : ""}">${num(r.values[y], m.decimals)}</td>`).join("")}<td class="mi-num">${pct(cagr(r.values, 2020, LAST_ACTUAL))}</td><td class="mi-num">${pct(cagr(r.values, LAST_ACTUAL, LAST_YEAR))}</td></tr>`).join("")}</tbody>
  </table></div>`;

  const first = sorted[0];
  const shares = companyShares(first.cat.id, first.ctry.id);
  html += `<div class="mi-table-wrap" role="region" aria-labelledby="share-caption" tabindex="0"><table>
    <caption id="share-caption">Company shares of retail value: ${escapeHtml(first.cat.name)} in ${escapeHtml(first.ctry.name)}, ${LAST_ACTUAL}</caption>
    <thead><tr><th scope="col">Company</th><th scope="col" class="mi-num">Share ${LAST_ACTUAL}</th><th scope="col" class="mi-num">Change since 2020</th><th scope="col"><span class="mi-sr-only">Share bar</span></th></tr></thead>
    <tbody>${shares.map((s) => `<tr><th scope="row">${s.company === "Others" ? "Others" : `<a href="company.html?name=${encodeURIComponent(s.company)}">${escapeHtml(s.company)}</a>`}</th><td class="mi-num">${pct(s.share2025)}</td><td class="mi-num">${s.share2020 == null ? "–" : `${((s.share2025 - s.share2020) * 100 >= 0 ? "+" : "")}${((s.share2025 - s.share2020) * 100).toFixed(1)} pts`}</td><td class="mi-bar-cell"><span class="mi-bar"></span></td></tr>`).join("")}</tbody>
  </table></div>`;
  html += `<p><a href="report.html?id=${encodeURIComponent(`${first.cat.group.id}--${first.ctry.id}`)}">Read the report: ${escapeHtml(first.cat.group.name)} in ${escapeHtml(first.ctry.name)}</a></p>`;

  results.innerHTML = html;
  // Bars scale to the largest share in the table, so Others (often largest) sets 100%.
  const maxShare = Math.max(...shares.map((s) => s.share2025));
  results.querySelectorAll(".mi-bar").forEach((bar, i) => { bar.style.width = `${(shares[i].share2025 / maxShare) * 100}%`; });

  document.getElementById("export").addEventListener("click", () => {
    const blob = new Blob([toCsv(allowed, m)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meridian-${m.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    document.getElementById("export-status").textContent = `Exported ${allowed.length} rows.`;
  });

  announce(`Showing ${m.name.toLowerCase()} for ${allowed.length} ${allowed.length === 1 ? "market" : "markets"}${denied.length ? `. ${denied.length} not in your subscription` : ""}.`);
  if (focus) results.focus();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();
  const sel = selection();
  const errors = [];
  if (!sel.cats.length) errors.push({ id: "categories", message: "Select at least one category" });
  if (!sel.geos.length) errors.push({ id: "countries", message: "Select at least one country" });
  if (errors.length) { showErrors(errors); return; }
  const params = new URLSearchParams({ cat: sel.cats.join(","), geo: sel.geos.join(","), metric: sel.metricId });
  history.replaceState(null, "", `?${params}`);
  render(sel);
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    clearErrors();
    form.querySelectorAll("input[data-group]").forEach((b) => { b.indeterminate = false; });
    results.innerHTML = `<h2 id="results-heading">Results</h2><p class="mi-hint">Make a selection and choose <strong>View data</strong>.</p>`;
    history.replaceState(null, "", location.pathname);
    announce("Selection cleared.");
  });
});

// ---- Restore a shared view from the URL ---------------------------------------------
const params = new URLSearchParams(location.search);
const initCats = (params.get("cat") ?? "").split(",").filter((c) => category(c));
const initGeos = (params.get("geo") ?? "").split(",").filter((g) => country(g));
if (metric(params.get("metric"))) form.metric.value = params.get("metric");
for (const c of initCats) {
  const box = form.querySelector(`input[name="cat"][value="${c}"]`);
  box.checked = true;
  setExpanded(category(c).industry.id, true);
  syncGroup(category(c).group.id);
}
for (const g of initGeos) form.querySelector(`input[name="geo"][value="${g}"]`).checked = true;
if (initCats.length && initGeos.length) {
  render({ cats: initCats, geos: initGeos, metricId: form.metric.value }, { focus: false });
} else {
  const firstOpen = TAXONOMY.find((i) => canSeeIndustry(i.id)) ?? TAXONOMY[0];
  setExpanded(firstOpen.id, true);
}
