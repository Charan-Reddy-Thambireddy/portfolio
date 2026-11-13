/**
 * Ask Meridian: a browser-side walk-through of a retrieval-augmented answer.
 *   1. Understand: pull categories, countries, companies, metric and intent from the question.
 *   2. Retrieve: search the content index and add the datasets/reports for those entities.
 *   3. Entitle: drop sources outside the user's subscription.
 *   4. Answer: write the answer from the remaining sources only, citing each one.
 * Production replaces step 4's template with an LLM call that receives the same sources.
 */
import { CATEGORIES, GROUPS, COUNTRIES, ALL_COMPANIES, LAST_ACTUAL, LAST_YEAR, FIRST_YEAR,
  valueSeries, series, cagr, companyShares, metric } from "../data.js";
import { search, groupValue, groupCompanies, companyProfile } from "../content.js";
import { canSee, currentPlan } from "../entitlements.js";
import { escapeHtml, usdMillion, pct, num } from "../format.js";
import { announce } from "../announcer.js";

const form = document.getElementById("ask-form");
const input = document.getElementById("question");
const out = document.getElementById("answer");
const err = document.getElementById("question-error");

const CAT_WORDS = {
  carbonates: ["carbonates", "carbonated", "soda", "sodas", "cola", "colas", "fizzy drinks"], juice: ["juice", "juices"],
  "bottled-water": ["bottled water", "water"], "energy-drinks": ["energy drinks", "energy drink"], coffee: ["coffee"], tea: ["tea"],
  beer: ["beer", "lager"], wine: ["wine", "wines"], "savoury-snacks": ["savoury snacks", "savory snacks", "crisps", "chips", "snack"],
  confectionery: ["confectionery", "chocolate", "candy", "sweets"], milk: ["milk"], yoghurt: ["yoghurt", "yogurt"],
  "skin-care": ["skin care", "skincare"], "hair-care": ["hair care", "haircare", "shampoo"], smartphones: ["smartphones", "smartphone", "phones", "phone"],
  wearables: ["wearables", "wearable", "smartwatches", "smartwatch"],
};
const GROUP_WORDS = { "soft-drinks": ["soft drinks"], "hot-drinks": ["hot drinks"], "alcoholic-drinks": ["alcoholic drinks", "alcohol"], snacks: ["snacks"], dairy: ["dairy"], "personal-care": ["beauty", "personal care"], "mobile-devices": ["mobile devices", "consumer electronics"] };
const COUNTRY_WORDS = { IN: ["india", "indian"], CN: ["china", "chinese"], ID: ["indonesia", "indonesian"], JP: ["japan", "japanese"], US: ["united states", "usa", "u.s.", "us", "america", "american"], BR: ["brazil", "brazilian"], GB: ["united kingdom", "uk", "britain", "british", "england"], DE: ["germany", "german"] };

function findWords(text, map) {
  const found = [];
  for (const [id, words] of Object.entries(map)) {
    if (words.some((w) => new RegExp(`(^|[^a-z])${w.replace(/[.]/g, "\\.")}($|[^a-z])`).test(text))) found.push(id);
  }
  return found;
}

export function understand(question) {
  const t = ` ${question.toLowerCase()} `;
  let cats = findWords(t, CAT_WORDS);
  if (cats.includes("bottled-water") && /energy/.test(t) && !/water/.test(t.replace("bottled water", ""))) cats = cats.filter((c) => c !== "bottled-water");
  const groups = findWords(t, GROUP_WORDS).filter((g) => !cats.some((c) => CATEGORIES.find((x) => x.id === c).group.id === g));
  const countries = findWords(t, COUNTRY_WORDS);
  const companies = ALL_COMPANIES.filter((c) => t.includes(c.toLowerCase()) || t.includes(` ${c.toLowerCase().split(" ")[0]} `));
  const metricId = /volume|litre|liter|tonne|units sold/.test(t) ? "volume" : /per capita|per person|per head/.test(t) ? "percap" : "value";
  const intent = /lead|leader|biggest compan|top compan|market share|who (sells|dominates|owns)|which compan|competit/.test(t) ? "leaders"
    : /compare|versus|\bvs\b|between/.test(t) || countries.length > 1 || cats.length + groups.length > 1 ? "compare"
    : /grow|growth|fast|forecast|outlook|cagr|trend|future|expect/.test(t) ? "growth" : "size";
  const year = Number((t.match(/\b(20[1-3]\d)\b/) ?? [])[1]) || null;
  return { cats, groups, countries, companies, metricId, intent, year: year && year >= FIRST_YEAR && year <= LAST_YEAR ? year : null };
}

function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

function answer(question) {
  const q = understand(question);
  const sources = [];
  const addSource = (src) => {
    const existing = sources.find((s) => s.key === src.key);
    if (existing) return existing;
    sources.push(src);
    return src;
  };

  // Retrieval: entity sources first, then free-text hits.
  const nodes = [...q.cats.map((id) => ({ kind: "cat", id })), ...q.groups.map((id) => ({ kind: "group", id }))];
  const targetCountries = q.countries.length ? q.countries : q.companies.length ? [] : currentPlan().countries.slice(0, 2);
  for (const n of nodes) for (const c of targetCountries) {
    const ctry = COUNTRIES.find((x) => x.id === c);
    if (n.kind === "cat") {
      const cat = CATEGORIES.find((x) => x.id === n.id);
      addSource({ key: `s:${n.id}:${c}`, type: "Statistics", title: `${cat.name} in ${ctry.name}: market sizes and forecasts`, url: `explore.html?cat=${n.id}&geo=${c}&metric=${q.metricId}`, node: n, ctry, entitled: canSee(n.id, c), why: "Matches category and country" });
    } else {
      const g = GROUPS.find((x) => x.id === n.id);
      addSource({ key: `r:${n.id}--${c}`, type: "Report", title: `${g.name} in ${ctry.name}`, url: `report.html?id=${n.id}--${c}`, node: n, ctry, entitled: canSee(n.id, c), why: "Matches category group and country" });
    }
  }
  for (const name of q.companies) addSource({ key: `c:${name}`, type: "Company", title: name, url: `company.html?name=${encodeURIComponent(name)}`, company: name, entitled: true, why: "Matches company name" });
  const hits = search(question).slice(0, 5);
  for (const h of hits) addSource({ key: h.id, type: h.type, title: h.title, url: h.url, entitled: h.entitled, why: `Search relevance ${h.score.toFixed(1)}`, hit: h });

  const kept = sources.filter((s) => s.entitled);
  const removed = sources.filter((s) => !s.entitled);
  // Numbers are assigned in the order sources are first cited, so the list matches the text.
  let next = 1;
  const cite = (s) => {
    s.n ??= next++;
    return `<a class="mi-cite" href="#src-${s.n}" aria-label="Source ${s.n}">[${s.n}]</a>`;
  };

  // Composition from kept sources only.
  const paras = [];
  const m = metric(q.metricId);
  const facts = kept.filter((s) => s.node && s.ctry);
  const year = q.year ?? LAST_ACTUAL;
  const yearLabel = year > LAST_ACTUAL ? `${year} (forecast)` : String(year);

  for (const s of facts) {
    const isCat = s.node.kind === "cat";
    const name = isCat ? CATEGORIES.find((x) => x.id === s.node.id).name : GROUPS.find((x) => x.id === s.node.id).name;
    const v = isCat ? valueSeries(s.node.id, s.ctry.id) : groupValue(s.node.id, s.ctry.id);
    const ms = isCat ? series(s.node.id, s.ctry.id, q.metricId) : v;
    const unit = isCat ? m.unitLabel(CATEGORIES.find((x) => x.id === s.node.id)) : "USD million";
    let text;
    if (q.intent === "leaders") {
      const leaders = isCat ? companyShares(s.node.id, s.ctry.id).filter((r) => r.company !== "Others").map((r) => ({ company: r.company, share: r.share2025 })) : groupCompanies(s.node.id, s.ctry.id);
      text = `In ${s.ctry.name}, <strong>${escapeHtml(leaders[0].company)}</strong> leads ${escapeHtml(name.toLowerCase())} with ${pct(leaders[0].share)} of retail value in ${LAST_ACTUAL}, followed by ${escapeHtml(leaders[1].company)} (${pct(leaders[1].share)}) and ${escapeHtml(leaders[2].company)} (${pct(leaders[2].share)}). ${cite(s)}`;
    } else if (q.metricId !== "value" && isCat) {
      text = `${escapeHtml(name)} in ${s.ctry.name}: ${escapeHtml(m.name.toLowerCase())} of ${num(ms[year], m.decimals)} ${escapeHtml(unit)} in ${yearLabel}, with a forecast CAGR of ${pct(cagr(ms, LAST_ACTUAL, LAST_YEAR))} to ${LAST_YEAR}. ${cite(s)}`;
    } else {
      const yoy = v[LAST_ACTUAL] / v[LAST_ACTUAL - 1] - 1;
      text = `${escapeHtml(name)} in ${s.ctry.name} reached <strong>${usdMillion(v[year])}</strong> in retail value in ${yearLabel}${year === LAST_ACTUAL ? `, ${yoy >= 0 ? "up" : "down"} ${pct(Math.abs(yoy))} on ${LAST_ACTUAL - 1}` : ""}. It grew at ${pct(cagr(v, 2020, LAST_ACTUAL))} a year over 2020–${LAST_ACTUAL}, and Meridian forecasts ${pct(cagr(v, LAST_ACTUAL, LAST_YEAR))} a year to ${LAST_YEAR}. ${cite(s)}`;
    }
    paras.push({ text, v, name, ctry: s.ctry, s });
  }

  if (facts.length > 1 && q.intent !== "leaders") {
    const largest = [...paras].sort((a, b) => b.v[LAST_ACTUAL] - a.v[LAST_ACTUAL])[0];
    const fastest = [...paras].sort((a, b) => cagr(b.v, LAST_ACTUAL, LAST_YEAR) - cagr(a.v, LAST_ACTUAL, LAST_YEAR))[0];
    const fastText = `${pct(cagr(fastest.v, LAST_ACTUAL, LAST_YEAR))} a year`;
    paras.unshift({ text: largest === fastest
      ? `Of the ${facts.length} markets, <strong>${escapeHtml(largest.name)} in ${largest.ctry.name}</strong> is both the largest and the fastest-growing, forecast at ${fastText}. ${cite(largest.s)}`
      : `Of the ${facts.length} markets, <strong>${escapeHtml(largest.name)} in ${largest.ctry.name}</strong> is the largest, and <strong>${escapeHtml(fastest.name)} in ${fastest.ctry.name}</strong> is forecast to grow fastest (${fastText}). ${cite(largest.s)} ${cite(fastest.s)}` });
  }

  for (const s of kept.filter((x) => x.company)) {
    const rows = companyProfile(s.company).filter((r) => canSee(r.category.id, r.country.id)).sort((a, b) => b.value - a.value);
    paras.push({ text: rows.length
      ? `<strong>${escapeHtml(s.company)}</strong> appears in ${plural(rows.length, "market", "markets")} in your subscription. Its largest is ${escapeHtml(rows[0].category.name.toLowerCase())} in ${rows[0].country.name}, where it ranks #${rows[0].rank} with ${pct(rows[0].share2025)} of value${rows[1] ? `; next is ${escapeHtml(rows[1].category.name.toLowerCase())} in ${rows[1].country.name} (#${rows[1].rank}, ${pct(rows[1].share2025)})` : ""}. ${cite(s)}`
      : `${escapeHtml(s.company)} has no market positions inside your subscription. ${cite(s)}` });
  }

  if (!paras.length) {
    const blocked = removed.filter((x) => x.node);
    if (blocked.length) {
      const others = kept.slice(0, 3);
      paras.push({ text: `Meridian has research on ${blocked.map((b) => escapeHtml(b.title.split(":")[0])).join(", ")}, but it is outside your subscription (${escapeHtml(currentPlan().name)}), so I can't answer from it. Switch demo user to see how the answer changes.${others.length ? ` Related sources you can open: ${others.map((o) => `${escapeHtml(o.title)} ${cite(o)}`).join("; ")}.` : ""}` });
    } else if (removed.length && !kept.length) {
      paras.push({ text: `Meridian has research on this, but none of it is in your subscription, so I can't answer from it. Switch demo user to see how the answer changes.` });
    } else if (kept.length) {
      paras.push({ text: `I couldn't find a specific category, country or company in your question, so here are the most relevant sources: ${kept.slice(0, 4).map((s) => `${escapeHtml(s.title)} ${cite(s)}`).join("; ")}. Try naming a category and a country, for example "tea in China".` });
    } else {
      paras.push({ text: `I couldn't match your question to any Meridian research. Try naming a category (such as coffee or smartphones) and a country.` });
    }
  } else if (removed.length) {
    paras.push({ text: `<em>${plural(removed.length, "source was", "sources were")} left out because ${removed.length === 1 ? "it is" : "they are"} outside your subscription.</em>` });
  }

  return { q, sources, kept, removed, paras };
}

function chips(items) { return items.length ? `<ul class="mi-chips">${items.map((i) => `<li class="mi-chip">${escapeHtml(i)}</li>`).join("")}</ul>` : `<p class="mi-hint">None found</p>`; }

function run(question) {
  const a = answer(question);
  const q = a.q;
  const intentLabel = { leaders: "Who leads the market", compare: "Compare markets", growth: "Growth and forecast", size: "Market size" }[q.intent];
  out.hidden = false;
  out.innerHTML = `
    <h2 id="answer-heading">Answer</h2>
    <div class="mi-answer">${a.paras.map((p) => `<p>${p.text}</p>`).join("")}</div>
    <h3 style="margin-top:1.25rem">Sources</h3>
    ${a.kept.some((s) => s.n) ? `<ol class="mi-results">${a.kept.filter((s) => s.n).sort((x, y) => x.n - y.n).map((s) => `<li class="mi-result" id="src-${s.n}" tabindex="-1"><span class="mi-tag">[${s.n}] ${s.type}</span> <a href="${s.url}">${escapeHtml(s.title)}</a></li>`).join("")}</ol>` : `<p>No sources were cited.</p>`}
    <h3 style="margin-top:1.5rem">How this answer was built</h3>
    <ol class="mi-pipeline">
      <li class="mi-step"><h3>Understand the question</h3>
        <p>Intent: <strong>${intentLabel}</strong>. Metric: ${escapeHtml(metric(q.metricId).name.toLowerCase())}${q.year ? `. Year: ${q.year}` : ""}.</p>
        <p class="mi-hint">Categories and groups</p>${chips([...q.cats.map((c) => CATEGORIES.find((x) => x.id === c).name), ...q.groups.map((g) => GROUPS.find((x) => x.id === g).name)])}
        <p class="mi-hint" style="margin-top:0.5rem">Countries</p>${chips(q.countries.map((c) => COUNTRIES.find((x) => x.id === c).name))}
        ${q.companies.length ? `<p class="mi-hint" style="margin-top:0.5rem">Companies</p>${chips(q.companies)}` : ""}</li>
      <li class="mi-step"><h3>Retrieve sources</h3><p>${plural(a.sources.length, "candidate source", "candidate sources")} from entity lookups and full-text search.</p>
        <ul>${a.sources.map((s) => `<li>${escapeHtml(s.title)} <span class="mi-hint" style="display:inline">(${s.type}; ${escapeHtml(s.why)})</span></li>`).join("")}</ul></li>
      <li class="mi-step"><h3>Check the subscription</h3><p>${plural(a.kept.length, "source", "sources")} kept, ${a.removed.length} removed for ${escapeHtml(currentPlan().user)} (${escapeHtml(currentPlan().name)}).</p>
        ${a.removed.length ? `<ul>${a.removed.map((s) => `<li>Removed: ${escapeHtml(s.title)}</li>`).join("")}</ul>` : ""}</li>
      <li class="mi-step"><h3>Write the answer from the kept sources</h3><p>Every figure above comes from a numbered source. Nothing outside the kept sources is used.</p></li>
    </ol>`;
  history.replaceState(null, "", `?q=${encodeURIComponent(question)}`);
  announce("Answer ready.");
  out.focus();
}

// Suggested questions tailored to the current plan, plus one outside it.
const plan = currentPlan();
const SUGGEST = {
  "drinks-apac": ["How fast is tea growing in China?", "Which company leads energy drinks in Indonesia?", "Compare bottled water in India and Japan", "What is the beer market size in Germany?"],
  "food-beauty-west": ["How big is confectionery in the United States?", "Who leads skin care in Brazil?", "Compare yoghurt in Germany and the UK", "How fast is tea growing in China?"],
  global: ["Compare smartphones in India, China and the US", "Which company leads carbonates in Brazil?", "What is the outlook for coffee in Japan?", "Tell me about Goldcrest Snacks"],
}[plan.id];
document.getElementById("suggestions").innerHTML = SUGGEST.map((s) => `<li><button type="button">${escapeHtml(s)}</button></li>`).join("");
document.getElementById("suggestions").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  input.value = b.textContent;
  form.requestSubmit();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const question = input.value.trim();
  const field = document.getElementById("question-field");
  if (question.length < 3) {
    err.textContent = "Enter a question, for example: How fast is tea growing in China?";
    err.hidden = false;
    field.classList.add("mi-field--error");
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", "question-error question-hint");
    input.focus();
    return;
  }
  err.hidden = true;
  field.classList.remove("mi-field--error");
  input.removeAttribute("aria-invalid");
  input.setAttribute("aria-describedby", "question-hint");
  run(question);
});

const initial = new URLSearchParams(location.search).get("q");
if (initial) { input.value = initial; run(initial); }
