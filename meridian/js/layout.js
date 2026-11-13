/**
 * Shared page behaviour: the top menu bar with Industries / Countries / Companies
 * dropdown panels, the mobile menu, and the demo subscription switcher.
 *
 * The menu uses the disclosure pattern (buttons with aria-expanded that show a panel of
 * ordinary links), which works with screen readers without menu-role key handling.
 */
import { PLANS, TAXONOMY, COUNTRIES, REGIONS, REGION_COLORS, COMPANIES, GROUPS, icon } from "./data.js";
import { currentPlan, setPlan, canSeeIndustry, canSeeCountry } from "./entitlements.js";
import { escapeHtml } from "./format.js";

document.documentElement.classList.add("js");
const plan = currentPlan();
const geo = plan.countries.join(",");
const LOCK = `<svg class="mi-mega__lock" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" fill="currentColor"/></svg><span class="mi-sr-only"> (not in your subscription)</span>`;

// ---- Panel content -----------------------------------------------------------------
const industriesPanel = `
  <div class="mi-container mi-mega__inner">
    <div class="mi-mega__grid mi-mega__grid--4">
      ${TAXONOMY.map((ind) => `
        <section class="mi-mega__col" style="--ind:${ind.color};--tint:${ind.tint}" aria-labelledby="mega-ind-${ind.id}">
          <h2 class="mi-mega__head" id="mega-ind-${ind.id}"><span class="mi-ind-icon">${icon(ind.icon, 20)}</span>${escapeHtml(ind.name)}${canSeeIndustry(ind.id, plan) ? "" : LOCK}</h2>
          ${ind.groups.map((g) => `
            <h3 class="mi-mega__sub"><a href="explore.html?cat=${g.categories.map((c) => c.id).join(",")}&geo=${geo}&metric=value">${escapeHtml(g.name)}</a></h3>
            <ul>${g.categories.map((c) => `<li><a href="explore.html?cat=${c.id}&geo=${geo}&metric=value">${escapeHtml(c.name)}</a></li>`).join("")}</ul>`).join("")}
        </section>`).join("")}
    </div>
    <p class="mi-mega__foot"><a href="explore.html">Open Explore data to combine categories and countries</a></p>
  </div>`;

const countriesPanel = `
  <div class="mi-container mi-mega__inner">
    <div class="mi-mega__grid mi-mega__grid--3">
      ${REGIONS.map((r) => `
        <section class="mi-mega__col" style="--ind:${REGION_COLORS[r]};--tint:#f1f5ff" aria-labelledby="mega-reg-${r.replace(/\W/g, "")}">
          <h2 class="mi-mega__head" id="mega-reg-${r.replace(/\W/g, "")}"><span class="mi-ind-icon">${icon("globe", 20)}</span>${r}</h2>
          <ul class="mi-mega__countries">${COUNTRIES.filter((c) => c.region === r).map((c) => `<li><a href="country.html?id=${c.id}"><span class="mi-code">${c.id}</span>${escapeHtml(c.name)}${canSeeCountry(c.id, plan) ? "" : LOCK}</a></li>`).join("")}</ul>
        </section>`).join("")}
    </div>
  </div>`;

const companiesPanel = `
  <div class="mi-container mi-mega__inner">
    <div class="mi-mega__grid mi-mega__grid--auto">
      ${GROUPS.map((g) => `
        <section class="mi-mega__col" style="--ind:${g.industry.color};--tint:${g.industry.tint}" aria-labelledby="mega-co-${g.id}">
          <h2 class="mi-mega__head mi-mega__head--small" id="mega-co-${g.id}">${escapeHtml(g.name)}</h2>
          <ul>${COMPANIES[g.id].map((n) => `<li><a href="company.html?name=${encodeURIComponent(n)}">${escapeHtml(n)}</a></li>`).join("")}</ul>
        </section>`).join("")}
    </div>
    <p class="mi-mega__foot">All companies are fictional.</p>
  </div>`;

const panels = { "mega-industries": industriesPanel, "mega-countries": countriesPanel, "mega-companies": companiesPanel };
for (const [id, html] of Object.entries(panels)) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Mark the menu section for the current page.
const page = location.pathname.split("/").pop() || "index.html";
const sectionFor = { "country.html": "mega-countries", "company.html": "mega-companies", "report.html": "mega-industries" };
document.querySelector(`[aria-controls="${sectionFor[page]}"]`)?.classList.add("is-current");

// ---- Disclosure behaviour ----------------------------------------------------------
const nav = document.getElementById("primary-nav");
const triggers = [...document.querySelectorAll(".mi-menubar__trigger")];
const desktop = window.matchMedia("(min-width: 60.01rem)");
let hoverTimer;
let openedByHoverAt = 0;

function setOpen(trigger, open) {
  trigger.setAttribute("aria-expanded", String(open));
  document.getElementById(trigger.getAttribute("aria-controls")).hidden = !open;
  trigger.closest(".mi-menubar__item").classList.toggle("is-open", open);
}
function closeAll(except) {
  for (const t of triggers) if (t !== except && t.getAttribute("aria-expanded") === "true") setOpen(t, false);
}

for (const trigger of triggers) {
  const item = trigger.closest(".mi-menubar__item");
  trigger.addEventListener("click", () => {
    // A click right after hover-open should not immediately close the panel.
    if (Date.now() - openedByHoverAt < 400) return;
    const open = trigger.getAttribute("aria-expanded") !== "true";
    closeAll(trigger);
    setOpen(trigger, open);
  });
  item.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse" || !desktop.matches) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (trigger.getAttribute("aria-expanded") !== "true") {
        closeAll(trigger);
        setOpen(trigger, true);
        openedByHoverAt = Date.now();
      }
    }, 140);
  });
  item.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse" || !desktop.matches) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => setOpen(trigger, false), 220);
  });
  // Close when keyboard focus leaves this item entirely.
  item.addEventListener("focusout", (e) => {
    if (desktop.matches && !item.contains(e.relatedTarget)) setOpen(trigger, false);
  });
}

nav?.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = triggers.find((t) => t.getAttribute("aria-expanded") === "true");
  if (open) {
    setOpen(open, false);
    open.focus();
    e.stopPropagation();
  }
});
document.addEventListener("click", (e) => {
  if (!nav?.contains(e.target)) closeAll();
});

// ---- Mobile menu ---------------------------------------------------------------------
const toggle = document.querySelector("[data-menu-toggle]");
if (toggle && nav) {
  toggle.hidden = false;
  const setMenu = (open) => { toggle.setAttribute("aria-expanded", String(open)); nav.dataset.open = String(open); };
  setMenu(false);
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true" && !triggers.some((t) => t.getAttribute("aria-expanded") === "true")) {
      setMenu(false);
      toggle.focus();
    }
  });
}

// ---- Subscription switcher ------------------------------------------------------------
const select = document.getElementById("plan-select");
const planText = document.getElementById("plan-coverage");
if (select) {
  select.innerHTML = PLANS.map((p) => `<option value="${p.id}"${p.id === plan.id ? " selected" : ""}>${p.user} · ${p.name}</option>`).join("");
  if (planText) planText.textContent = plan.org;
  document.getElementById("plan-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    setPlan(select.value);
    location.reload();
  });
}
