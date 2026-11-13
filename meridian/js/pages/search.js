/**
 * Search results with facet filters (type, industry, country) and entitlement badges.
 * Locked results stay visible as teasers; opening one shows the access notice.
 */
import { search, highlight } from "../content.js?v=7f674494";
import { escapeHtml } from "../format.js?v=7f674494";
import { TAXONOMY } from "../data.js?v=7f674494";

const colorOf = (industryName) => TAXONOMY.find((i) => i.name === industryName)?.color ?? "#64748b";
import { announce } from "../announcer.js?v=7f674494";

const params = new URLSearchParams(location.search);
const q = (params.get("q") ?? "").trim();
document.getElementById("q").value = q;
const list = document.getElementById("results");
const count = document.getElementById("result-count");
const facetsEl = document.getElementById("facet-groups");
const onlyEntitled = document.getElementById("only-entitled");
const PAGE = 15;
let shown = PAGE;

const hits = q ? search(q) : [];
const FACETS = [
  { key: "type", label: "Content type" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
];
const selected = { type: new Set(), industry: new Set(), country: new Set() };

function facetCounts(key) {
  const m = new Map();
  for (const h of hits) if (h[key]) m.set(h[key], (m.get(h[key]) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

facetsEl.innerHTML = FACETS.map((f) => {
  const counts = facetCounts(f.key);
  if (!counts.length) return "";
  return `<fieldset><legend>${f.label}</legend>${counts.map(([v, n], i) => `<label class="mi-check"><input type="checkbox" name="${f.key}" value="${escapeHtml(v)}" id="f-${f.key}-${i}"> <span>${escapeHtml(v)} <span class="mi-hint" style="display:inline">(${n})</span></span></label>`).join("")}</fieldset>`;
}).join("") || `<p class="mi-hint">Filters appear after you search.</p>`;

function filtered() {
  return hits.filter((h) => FACETS.every((f) => !selected[f.key].size || selected[f.key].has(h[f.key])) && (!onlyEntitled.checked || h.entitled));
}

function render(announceCount) {
  const items = filtered();
  if (!q) {
    count.textContent = "Enter a search term to find reports, statistics and company profiles.";
    list.innerHTML = "";
    return;
  }
  count.textContent = items.length ? `${items.length} ${items.length === 1 ? "result" : "results"} for "${q}"` : `No results for "${q}". Check the spelling or try a broader term, such as a category or country.`;
  list.innerHTML = items.slice(0, shown).map((h) => `
    <li class="mi-result" style="--ind:${colorOf(h.industry)}">
      <p style="margin:0 0 0.3rem"><span class="mi-tag mi-tag--${h.type}">${h.type}</span>${h.entitled ? "" : '<span class="mi-lock" style="margin-left:0">Not in subscription</span>'}${h.date ? ` <span class="mi-meta">${escapeHtml(h.date)}</span>` : ""}</p>
      <h3><a href="${h.url}">${highlight(h.title, q)}</a></h3>
      <p>${highlight(h.snippet, q)}</p>
      ${h.country || h.industry ? `<p class="mi-meta">${[h.industry, h.country].filter(Boolean).map(escapeHtml).join(" · ")}</p>` : ""}
    </li>`).join("") + (items.length > shown ? `<li><button type="button" class="mi-button mi-button--secondary" id="more">Show ${Math.min(PAGE, items.length - shown)} more results</button></li>` : "");
  document.getElementById("more")?.addEventListener("click", () => {
    const firstNew = shown;
    shown += PAGE;
    render(false);
    list.children[firstNew]?.querySelector("a")?.focus();
  });
  if (announceCount) announce(count.textContent);
}

document.getElementById("facets").addEventListener("change", (e) => {
  const t = e.target;
  if (t.name in selected) t.checked ? selected[t.name].add(t.value) : selected[t.name].delete(t.value);
  shown = PAGE;
  render(true);
});
render(false);
