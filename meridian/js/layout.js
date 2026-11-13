/**
 * Shared page behaviour: the mobile menu disclosure and the demo subscription switcher.
 * Switching user reloads the page so every view re-applies the new entitlements.
 */
import { PLANS } from "./data.js";
import { currentPlan, setPlan } from "./entitlements.js";

document.documentElement.classList.add("js");

const toggle = document.querySelector("[data-menu-toggle]");
const nav = document.getElementById("primary-nav");
if (toggle && nav) {
  toggle.hidden = false;
  const setOpen = (open) => { toggle.setAttribute("aria-expanded", String(open)); nav.dataset.open = String(open); };
  setOpen(false);
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.focus(); }
  });
}

const select = document.getElementById("plan-select");
const planText = document.getElementById("plan-coverage");
if (select) {
  const plan = currentPlan();
  select.innerHTML = PLANS.map((p) => `<option value="${p.id}"${p.id === plan.id ? " selected" : ""}>${p.user} · ${p.name}</option>`).join("");
  if (planText) planText.textContent = plan.org;
  document.getElementById("plan-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    setPlan(select.value);
    location.reload();
  });
}
