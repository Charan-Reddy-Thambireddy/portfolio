/**
 * Meridian reference data and the market-size model.
 *
 * Everything here is fictional sample data generated from fixed seeds, so the same
 * selection always returns the same numbers. Countries are real; values, companies and
 * reports are invented for the demo.
 */

export const FIRST_YEAR = 2019;
export const LAST_ACTUAL = 2025;
export const LAST_YEAR = 2030;
export const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

// ---- Taxonomy: industry > category group > category -------------------------------
export const TAXONOMY = [
  { id: "drinks", name: "Drinks", groups: [
    { id: "soft-drinks", name: "Soft Drinks", categories: [
      { id: "carbonates", name: "Carbonates", unit: "million litres", price: 1.1, perCap: 60, growth: -0.01, def: "Sweetened and unsweetened sparkling drinks, including colas and flavoured sodas." },
      { id: "juice", name: "Juice", unit: "million litres", price: 2.2, perCap: 25, growth: 0.0, def: "100% juice, nectars and juice drinks." },
      { id: "bottled-water", name: "Bottled Water", unit: "million litres", price: 0.7, perCap: 45, growth: 0.02, def: "Still, carbonated, flavoured and functional bottled water." },
      { id: "energy-drinks", name: "Energy Drinks", unit: "million litres", price: 4.5, perCap: 30, growth: 0.05, def: "Drinks marketed for an energy boost, typically containing caffeine or taurine." },
    ]},
    { id: "hot-drinks", name: "Hot Drinks", categories: [
      { id: "coffee", name: "Coffee", unit: "'000 tonnes", price: 18000, perCap: 40, growth: 0.02, def: "Fresh ground, bean and instant coffee sold through retail." },
      { id: "tea", name: "Tea", unit: "'000 tonnes", price: 9000, perCap: 12, growth: 0.0, def: "Black, green, fruit and herbal tea, loose and in bags." },
    ]},
    { id: "alcoholic-drinks", name: "Alcoholic Drinks", categories: [
      { id: "beer", name: "Beer", unit: "million litres", price: 3.0, perCap: 110, growth: -0.005, def: "Lager, ale, stout and non/low-alcohol beer." },
      { id: "wine", name: "Wine", unit: "million litres", price: 9.0, perCap: 90, growth: -0.01, def: "Still, sparkling and fortified wine." },
    ]},
  ]},
  { id: "food", name: "Food and Nutrition", groups: [
    { id: "snacks", name: "Snacks", categories: [
      { id: "savoury-snacks", name: "Savoury Snacks", unit: "'000 tonnes", price: 9000, perCap: 70, growth: 0.01, def: "Crisps, extruded snacks, nuts, seeds and popcorn." },
      { id: "confectionery", name: "Confectionery", unit: "'000 tonnes", price: 11000, perCap: 65, growth: 0.005, def: "Chocolate, sugar confectionery and gum." },
    ]},
    { id: "dairy", name: "Dairy Products", categories: [
      { id: "milk", name: "Milk", unit: "million litres", price: 1.0, perCap: 50, growth: 0.0, def: "Fresh, shelf-stable and flavoured milk." },
      { id: "yoghurt", name: "Yoghurt", unit: "'000 tonnes", price: 4000, perCap: 25, growth: 0.015, def: "Plain, flavoured and drinking yoghurt." },
    ]},
  ]},
  { id: "beauty", name: "Beauty and Personal Care", groups: [
    { id: "personal-care", name: "Skin and Hair Care", categories: [
      { id: "skin-care", name: "Skin Care", unit: "million units", price: 14, perCap: 55, growth: 0.02, def: "Facial, body and hand care, including sun care." },
      { id: "hair-care", name: "Hair Care", unit: "million units", price: 8, perCap: 35, growth: 0.005, def: "Shampoo, conditioner, styling and colourants." },
    ]},
  ]},
  { id: "electronics", name: "Consumer Electronics", groups: [
    { id: "mobile-devices", name: "Mobile Devices", categories: [
      { id: "smartphones", name: "Smartphones", unit: "'000 units", price: 0.33, perCap: 230, growth: 0.0, def: "Smartphones sold through retail and direct channels." },
      { id: "wearables", name: "Wearables", unit: "'000 units", price: 0.12, perCap: 40, growth: 0.06, def: "Smartwatches, fitness bands and smart rings." },
    ]},
  ]},
];

export const COUNTRIES = [
  { id: "IN", name: "India", region: "Asia Pacific", pop: 1450, spend: 0.12, growth: 0.09 },
  { id: "CN", name: "China", region: "Asia Pacific", pop: 1410, spend: 0.35, growth: 0.06 },
  { id: "ID", name: "Indonesia", region: "Asia Pacific", pop: 283, spend: 0.18, growth: 0.08 },
  { id: "JP", name: "Japan", region: "Asia Pacific", pop: 123, spend: 0.75, growth: 0.01 },
  { id: "US", name: "United States", region: "Americas", pop: 340, spend: 1.0, growth: 0.03 },
  { id: "BR", name: "Brazil", region: "Americas", pop: 212, spend: 0.3, growth: 0.05 },
  { id: "GB", name: "United Kingdom", region: "Europe", pop: 69, spend: 0.85, growth: 0.025 },
  { id: "DE", name: "Germany", region: "Europe", pop: 84, spend: 0.85, growth: 0.02 },
];
export const REGIONS = ["Asia Pacific", "Americas", "Europe"];

// Local tastes: multiplies per-capita spend for a category in a country.
const TASTE = {
  "tea:IN": 4, "tea:CN": 5, "tea:JP": 4, "tea:GB": 3, "tea:ID": 2,
  "coffee:IN": 0.3, "coffee:CN": 0.4, "coffee:DE": 1.4, "coffee:BR": 1.6, "coffee:JP": 1.2,
  "beer:IN": 0.3, "beer:ID": 0.15, "beer:DE": 1.5, "beer:BR": 1.3, "wine:IN": 0.05, "wine:ID": 0.03, "wine:CN": 0.4,
  "milk:IN": 2.5, "yoghurt:DE": 1.5, "bottled-water:ID": 1.8, "carbonates:BR": 1.3, "carbonates:JP": 0.6,
  "skin-care:JP": 2, "skin-care:CN": 1.6, "smartphones:CN": 1.2, "energy-drinks:ID": 0.6,
};

export const METRICS = [
  { id: "value", name: "Retail value", unitLabel: () => "USD million", decimals: 0 },
  { id: "volume", name: "Retail volume", unitLabel: (cat) => cat.unit, decimals: 0 },
  { id: "percap", name: "Per capita spend", unitLabel: () => "USD per person", decimals: 2 },
];

// ---- Subscriptions (entitlements) ---------------------------------------------------
export const PLANS = [
  { id: "drinks-apac", user: "Asha Rao", org: "Brightwell Beverages · Strategy", name: "Drinks · Asia Pacific",
    industries: ["drinks"], countries: ["IN", "CN", "ID", "JP"] },
  { id: "food-beauty-west", user: "Daniel Okafor", org: "Harbourline Retail · Category team", name: "Food and Beauty · Americas and Europe",
    industries: ["food", "beauty"], countries: ["US", "BR", "GB", "DE"] },
  { id: "global", user: "Mei Lin", org: "Larkspur Consulting · Insights", name: "Global · All industries",
    industries: TAXONOMY.map((i) => i.id), countries: COUNTRIES.map((c) => c.id) },
];

// ---- Fictional companies, by category group ------------------------------------------
export const COMPANIES = {
  "soft-drinks": ["Brightwell Beverages", "Coastline Drinks Co.", "Aurora Springs", "Kestrel Bottling", "Sundara Foods & Drinks", "Bluefin Beverages"],
  "hot-drinks": ["Verdant Leaf Tea", "Copperkettle Coffee", "Highland Roasters", "Sundara Foods & Drinks", "Morrow Tea Estates", "Brightwell Beverages"],
  "alcoholic-drinks": ["Northpeak Brewing Group", "Stonebridge Vintners", "Redfern Brewery", "Silvergate Wines", "Coastline Drinks Co.", "Kestrel Brewing"],
  "snacks": ["Goldcrest Snacks", "Pinewood Confectioners", "Harvest Lane Foods", "Saffron Table", "Oakmont Brands", "Crispin & Co."],
  "dairy": ["Meadowvale Dairy", "Riverbend Nutrition", "Clover Hill Dairies", "Harvest Lane Foods", "Alpenrose Farms", "Oakmont Brands"],
  "personal-care": ["Lumiere Labs", "Celandine Beauty", "Tidewater Personal Care", "Orchid & Ash", "Nimbus Cosmetics", "Fernhill Botanicals"],
  "mobile-devices": ["Vantara Mobile", "Quillon Devices", "Halcyon Tech", "Zephyr Wearables", "Corvid Electronics", "Ostara Digital"],
};
export const ALL_COMPANIES = [...new Set(Object.values(COMPANIES).flat())].sort();

// ---- Lookups ------------------------------------------------------------------------
export const CATEGORIES = TAXONOMY.flatMap((ind) => ind.groups.flatMap((g) => g.categories.map((c) => ({ ...c, industry: ind, group: g }))));
export const GROUPS = TAXONOMY.flatMap((ind) => ind.groups.map((g) => ({ ...g, industry: ind })));
export const category = (id) => CATEGORIES.find((c) => c.id === id);
export const group = (id) => GROUPS.find((g) => g.id === id);
export const country = (id) => COUNTRIES.find((c) => c.id === id);
export const metric = (id) => METRICS.find((m) => m.id === id);

// ---- Seeded random numbers ------------------------------------------------------------
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Market model -------------------------------------------------------------------
const cache = new Map();

/** Retail value (USD million) by year for one category in one country. */
export function valueSeries(categoryId, countryId) {
  const key = `${categoryId}:${countryId}`;
  if (cache.has(key)) return cache.get(key);

  const cat = category(categoryId);
  const ctry = country(countryId);
  const rand = rng(key);
  const taste = TASTE[key] ?? 1;
  const base2025 = ctry.pop * cat.perCap * ctry.spend * taste * (0.85 + rand() * 0.3);
  const trend = ctry.growth + cat.growth;

  const growthFor = (year) => {
    if (year <= LAST_ACTUAL) {
      let g = trend + (rand() - 0.5) * 0.03;
      if (year === 2020) g -= ["beer", "wine", "carbonates"].includes(categoryId) ? 0.09 : 0.03;
      if (year === 2021) g += 0.04;
      if (year === 2022 || year === 2023) g += 0.02; // inflation in current prices
      return g;
    }
    return trend * (1 - 0.06 * (year - LAST_ACTUAL)) + 0.02; // smooth forecast incl. 2% price growth
  };

  const values = {};
  values[LAST_ACTUAL] = base2025;
  for (let y = LAST_ACTUAL; y > FIRST_YEAR; y--) values[y - 1] = values[y] / (1 + growthFor(y));
  for (let y = LAST_ACTUAL + 1; y <= LAST_YEAR; y++) values[y] = values[y - 1] * (1 + growthFor(y));
  cache.set(key, values);
  return values;
}

/** One metric by year for a category in a country. */
export function series(categoryId, countryId, metricId) {
  const value = valueSeries(categoryId, countryId);
  const cat = category(categoryId);
  const ctry = country(countryId);
  const out = {};
  for (const y of YEARS) {
    if (metricId === "value") out[y] = value[y];
    else if (metricId === "percap") out[y] = value[y] / (ctry.pop * Math.pow(1 + 0.008, y - LAST_ACTUAL));
    else out[y] = value[y] / (cat.price * Math.pow(1.03, y - LAST_ACTUAL)); // volume = value / unit price
  }
  return out;
}

export function cagr(values, from, to) {
  return Math.pow(values[to] / values[from], 1 / (to - from)) - 1;
}

/** Company shares of retail value, 2020 and 2025, for a category in a country. */
export function companyShares(categoryId, countryId) {
  const cat = category(categoryId);
  const pool = [...COMPANIES[cat.group.id]];
  const rand = rng(`shares:${categoryId}:${countryId}`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const names = pool.slice(0, 5);
  const weights = names.map((_, i) => (5 - i) + rand() * 2.5);
  const total = weights.reduce((a, b) => a + b, 0);
  const othersShare = 0.25 + rand() * 0.2;
  const rows = names.map((name, i) => {
    const share2025 = (weights[i] / total) * (1 - othersShare);
    const share2020 = Math.max(0.005, share2025 + (rand() - 0.5) * 0.06);
    return { company: name, share2025, share2020 };
  });
  rows.sort((a, b) => b.share2025 - a.share2025);
  rows.push({ company: "Others", share2025: othersShare, share2020: null });
  return rows;
}
