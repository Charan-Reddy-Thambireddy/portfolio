/**
 * Subscription entitlements. Authentication says who the user is; this module answers
 * what they may see. In the API this check runs server-side on every request; the demo
 * mirrors it in the browser so the access-denied paths can be tried.
 */
import { PLANS, category, group } from "./data.js?v=7f674494";

const KEY = "meridian.plan";

export function currentPlan() {
  let id = null;
  try { id = localStorage.getItem(KEY); } catch { /* storage unavailable: use default */ }
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function setPlan(id) {
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
}

export function canSeeIndustry(industryId, plan = currentPlan()) {
  return plan.industries.includes(industryId);
}
export function canSeeCountry(countryId, plan = currentPlan()) {
  return plan.countries.includes(countryId);
}
/** True when the plan covers both the category's industry and the country. */
export function canSee(categoryOrGroupId, countryId, plan = currentPlan()) {
  const node = category(categoryOrGroupId) ?? group(categoryOrGroupId);
  return Boolean(node) && canSeeIndustry(node.industry.id, plan) && canSeeCountry(countryId, plan);
}
