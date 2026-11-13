/**
 * Generated research content (reports, dataset entries, company profiles) and a small
 * TF-IDF search index over it. Report text is written from the same numbers the
 * statistics pages show, so a report never disagrees with its data.
 */
import { GROUPS, CATEGORIES, COUNTRIES, COMPANIES, ALL_COMPANIES, LAST_ACTUAL, LAST_YEAR,
  group, country, category, valueSeries, companyShares, cagr, rng, YEARS } from "./data.js";
import { usdMillion, pct } from "./format.js";
import { canSee } from "./entitlements.js";

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

/** Sum of retail value across a group's categories. */
export function groupValue(groupId, countryId) {
  const g = group(groupId);
  const out = {};
  for (const y of YEARS) out[y] = g.categories.reduce((sum, c) => sum + valueSeries(c.id, countryId)[y], 0);
  return out;
}

/** Leading companies across a group, weighting each category share by its value. */
export function groupCompanies(groupId, countryId) {
  const g = group(groupId);
  const totals = new Map();
  let market = 0;
  for (const c of g.categories) {
    const v = valueSeries(c.id, countryId)[LAST_ACTUAL];
    market += v;
    for (const row of companyShares(c.id, countryId)) {
      if (row.company === "Others") continue;
      totals.set(row.company, (totals.get(row.company) ?? 0) + row.share2025 * v);
    }
  }
  return [...totals.entries()].map(([company, v]) => ({ company, share: v / market })).sort((a, b) => b.share - a.share);
}

export function report(id) {
  const [groupId, countryId] = id.split("--");
  const g = group(groupId);
  const ctry = country(countryId);
  if (!g || !ctry) return null;
  const rand = rng(`report:${id}`);
  const v = groupValue(groupId, countryId);
  const g1 = v[LAST_ACTUAL] / v[LAST_ACTUAL - 1] - 1;
  const hist = cagr(v, 2020, LAST_ACTUAL);
  const fc = cagr(v, LAST_ACTUAL, LAST_YEAR);
  const cats = g.categories.map((c) => ({ c, h: cagr(valueSeries(c.id, countryId), 2020, LAST_ACTUAL), f: cagr(valueSeries(c.id, countryId), LAST_ACTUAL, LAST_YEAR) }))
    .sort((a, b) => b.h - a.h);
  const leaders = groupCompanies(groupId, countryId);
  const lower = g.name.toLowerCase();

  const pace = fc > 0.07 ? "strong" : fc > 0.035 ? "steady" : fc > 0.01 ? "modest" : "flat";
  const drivers = {
    strong: "rising disposable incomes, a growing urban middle class and wider modern retail coverage",
    steady: "premiumisation and continued gains in e-commerce",
    modest: "price increases rather than volume, as household budgets stay under pressure",
    flat: "an ageing population and mature consumption, with growth mostly coming from premium niches",
  }[pace];

  return {
    id,
    group: g,
    country: ctry,
    title: `${g.name} in ${ctry.name}`,
    published: `${MONTHS[Math.floor(rand() * MONTHS.length)]} 2026`,
    summary: `Retail value sales of ${lower} in ${ctry.name} reached ${usdMillion(v[LAST_ACTUAL])} in ${LAST_ACTUAL}, ${g1 >= 0 ? "up" : "down"} ${pct(Math.abs(g1))} on ${LAST_ACTUAL - 1}. Meridian forecasts ${pace} growth, a CAGR of ${pct(fc)} over ${LAST_ACTUAL}–${LAST_YEAR}, taking the market to ${usdMillion(v[LAST_YEAR])}.`,
    findings: [
      `The market grew at a CAGR of ${pct(hist)} in current value terms over 2020–${LAST_ACTUAL}.`,
      `${cats[0].c.name} was the most dynamic category, with a ${pct(cats[0].h)} CAGR; ${cats.at(-1).c.name} was the slowest at ${pct(cats.at(-1).h)}.`,
      `${leaders[0].company} led with a ${pct(leaders[0].share)} value share in ${LAST_ACTUAL}, ahead of ${leaders[1].company} (${pct(leaders[1].share)}).`,
      `Growth over the forecast period is expected to rest on ${drivers}.`,
    ],
    outlook: `We expect ${lower} in ${ctry.name} to grow at ${pct(fc)} a year to ${LAST_YEAR}. ${cats.sort((a, b) => b.f - a.f)[0].c.name} should remain the fastest-growing category (${pct(cats[0].f)} CAGR). The main risk to this forecast is ${rand() > 0.5 ? "renewed input-cost inflation squeezing volumes" : "slower-than-expected recovery in consumer confidence"}.`,
    values: v,
    categories: g.categories,
    leaders,
  };
}

export const REPORT_IDS = GROUPS.flatMap((g) => COUNTRIES.map((c) => `${g.id}--${c.id}`));

export function companyProfile(name) {
  const rows = [];
  for (const c of CATEGORIES) {
    if (!COMPANIES[c.group.id].includes(name)) continue;
    for (const ctry of COUNTRIES) {
      const shares = companyShares(c.id, ctry.id);
      const idx = shares.findIndex((r) => r.company === name);
      if (idx >= 0) rows.push({ category: c, country: ctry, rank: idx + 1, ...shares[idx], value: valueSeries(c.id, ctry.id)[LAST_ACTUAL] * shares[idx].share2025 });
    }
  }
  return rows;
}

// ---- Search ----------------------------------------------------------------------------
const STOP = new Set("a an and are as at be by for from how in into is it of on or show me the to what which with about tell give".split(" "));
// Query words mapped to the terms the index uses.
export const ALIASES = {
  soda: "carbonates", sodas: "carbonates", cola: "carbonates", colas: "carbonates", fizzy: "carbonates", "soft-drink": "soft",
  water: "water", juices: "juice", phone: "smartphones", phones: "smartphones", mobile: "smartphones", smartwatch: "wearables", watches: "wearables",
  crisps: "savoury", chips: "savoury", chocolate: "confectionery", candy: "confectionery", sweets: "confectionery",
  skincare: "skin", haircare: "hair", shampoo: "hair", alcohol: "alcoholic", beverages: "drinks", beverage: "drinks",
  usa: "united states", us: "united states", america: "united states", american: "united states", uk: "united kingdom", britain: "united kingdom", british: "united kingdom",
  indian: "india", chinese: "china", japanese: "japan", german: "germany", brazilian: "brazil", indonesian: "indonesia",
  sales: "value", revenue: "value", size: "value",
};

export function tokenize(text) {
  return text.toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9-]+/).flatMap((w) => (ALIASES[w] ?? w).split(" "))
    .filter((w) => w && !STOP.has(w)).map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

function buildDocs() {
  const docs = [];
  for (const id of REPORT_IDS) {
    const r = report(id);
    docs.push({ id: `r:${id}`, type: "Report", title: r.title, snippet: r.summary, text: [r.summary, ...r.findings, r.categories.map((c) => c.name).join(" ")].join(" "),
      industry: r.group.industry.name, country: r.country.name, url: `report.html?id=${encodeURIComponent(id)}`, groupId: r.group.id, countryId: r.country.id, date: r.published });
  }
  for (const c of CATEGORIES) {
    for (const ctry of COUNTRIES) {
      docs.push({ id: `s:${c.id}:${ctry.id}`, type: "Statistics", title: `${c.name} in ${ctry.name}: market sizes and forecasts`,
        snippet: `Retail value, volume (${c.unit}) and per capita spend, ${YEARS[0]}–${LAST_YEAR}. ${c.def}`,
        text: `${c.name} ${c.group.name} ${ctry.name} market size value volume per capita forecast ${c.def}`,
        industry: c.industry.name, country: ctry.name, url: `explore.html?cat=${c.id}&geo=${ctry.id}&metric=value`, groupId: c.id, countryId: ctry.id });
    }
  }
  for (const name of ALL_COMPANIES) {
    const rows = companyProfile(name);
    const cats = [...new Set(rows.map((r) => r.category.name))];
    const ctrs = [...new Set(rows.map((r) => r.country.name))];
    const inds = [...new Set(rows.map((r) => r.category.industry.name))];
    docs.push({ id: `c:${name}`, type: "Company", title: name, snippet: `Company profile: brand shares in ${cats.join(", ")} across ${ctrs.length} markets.`,
      text: `${name} company profile ${cats.join(" ")} ${ctrs.join(" ")}`, industry: inds[0], country: null, url: `company.html?name=${encodeURIComponent(name)}` });
  }
  return docs;
}

let index = null;
function getIndex() {
  if (index) return index;
  const docs = buildDocs();
  const df = new Map();
  const tfs = docs.map((d) => {
    const tf = new Map();
    for (const t of tokenize(d.text)) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tokenize(d.title)) tf.set(t, (tf.get(t) ?? 0) + 3); // title boost
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return tf;
  });
  index = { docs, tfs, df };
  return index;
}

/** Ranked search. Each hit carries `entitled` so the UI can show locked results. */
export function search(query) {
  const { docs, tfs, df } = getIndex();
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const N = docs.length;
  const hits = [];
  docs.forEach((d, i) => {
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      const tf = tfs[i].get(t);
      if (!tf) continue;
      matched++;
      score += (1 + Math.log(tf)) * Math.log(1 + N / df.get(t));
    }
    if (!matched) return;
    score *= matched / terms.length; // favour documents that match more of the query
    const entitled = d.type === "Company" ? true : canSee(d.groupId, d.countryId);
    hits.push({ ...d, score, entitled });
  });
  return hits.sort((a, b) => b.score - a.score);
}

export function highlight(text, query) {
  const words = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))];
  let out = text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  for (const w of words) out = out.replace(new RegExp(`\\b(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "gi"), "<mark>$1</mark>");
  return out;
}
