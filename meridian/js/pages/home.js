import { TAXONOMY, COUNTRIES } from "../data.js";
import { currentPlan } from "../entitlements.js";
import { report, REPORT_IDS } from "../content.js";
import { escapeHtml } from "../format.js";

const plan = currentPlan();
const inds = TAXONOMY.filter((i) => plan.industries.includes(i.id)).map((i) => i.name);
const ctrs = COUNTRIES.filter((c) => plan.countries.includes(c.id)).map((c) => c.name);
document.getElementById("subscription").innerHTML = `
  <p><strong>${escapeHtml(plan.user)}</strong>, ${escapeHtml(plan.org)}. Plan: <strong>${escapeHtml(plan.name)}</strong>.</p>
  <p>Industries: ${inds.map(escapeHtml).join(", ")}.<br>Countries: ${ctrs.map(escapeHtml).join(", ")}.</p>
  <p class="mi-hint">Use the bar at the top to switch to another demo user and see how access changes.</p>`;

const latest = REPORT_IDS.map(report)
  .filter((r) => plan.industries.includes(r.group.industry.id) && plan.countries.includes(r.country.id))
  .sort((a, b) => new Date(`1 ${b.published}`) - new Date(`1 ${a.published}`) || a.title.localeCompare(b.title))
  .slice(0, 4);
document.getElementById("latest").innerHTML = latest.map((r) => `
  <li class="mi-result"><h3><a href="report.html?id=${encodeURIComponent(r.id)}">${escapeHtml(r.title)}</a></h3>
  <p><span class="mi-tag">Report</span>${escapeHtml(r.published)}</p><p>${escapeHtml(r.summary)}</p></li>`).join("");
