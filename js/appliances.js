/*
 * ==========================================================
 *  appliances.js — the app's "reference shelf"
 * ----------------------------------------------------------
 *  Plain data only (no logic, no HTML):
 *
 *   1. CATEGORIES   – every appliance the user can add, with a
 *                     typical wattage, typical use, and common
 *                     SIZES ("1.5 ton AC", "32 inch TV"…) so a
 *                     user can pick the right watts with one tap.
 *   2. SIZE_RULES   – turn a size typed in words ("1.5 ton",
 *                     "1 HP", "43 inch") into watts.
 *   3. SAMPLE_TARIFF – example price steps that are filled in at
 *                     the start. NOT official rates — the user
 *                     should match them to their own bill.
 *   4. QUICK_BUDGETS – ৳ buttons on the budget step.
 *
 *  About the watts: these are AVERAGE running watts for common
 *  Bangladeshi household models, which is what matters for a
 *  monthly bill — not the maximum number printed on the box.
 *  Change any number below and refresh the page.
 * ==========================================================
 */

/*
 * Each category:
 *  - id    : internal name (its label is "cat_<id>" in i18n.js)
 *  - icon  : icon name from icons.js
 *  - watts : default watts (matches one of the sizes)
 *  - hours / days : a starting guess for daily hours / monthly days
 *  - duty  : only fridge & AC — % of time the motor (compressor) actually runs
 *  - sizes : quick-pick chips. `key` → label "size_<key>" in i18n.js.
 *            Sizes without a key are labelled with their watts ("12 W").
 */
export const CATEGORIES = [
  { id: 'fan', icon: 'fan', watts: 75, hours: 10, days: 30,
    sizes: [{ key: 'fan_ceiling', watts: 75 }, { key: 'fan_table', watts: 45 }, { key: 'fan_exhaust', watts: 30 }] },
  { id: 'led', icon: 'led', watts: 12, hours: 6, days: 30,
    sizes: [{ watts: 5 }, { watts: 9 }, { watts: 12 }, { watts: 18 }] },
  { id: 'tube', icon: 'tube', watts: 48, hours: 6, days: 30,
    sizes: [{ key: 'tube_2ft', watts: 25 }, { key: 'tube_4ft', watts: 48 }, { key: 'tube_led', watts: 20 }] },
  { id: 'ac', icon: 'ac', watts: 1600, hours: 6, days: 30, duty: 70,
    sizes: [{ key: 'ac_1', watts: 1100 }, { key: 'ac_15', watts: 1600 }, { key: 'ac_2', watts: 2100 }] },
  { id: 'fridge', icon: 'fridge', watts: 140, hours: 24, days: 30, duty: 50,
    sizes: [{ key: 'fridge_s', watts: 100 }, { key: 'fridge_m', watts: 140 }, { key: 'fridge_l', watts: 180 }] },
  { id: 'tv', icon: 'tv', watts: 50, hours: 5, days: 30,
    sizes: [{ key: 'tv_24', watts: 30 }, { key: 'tv_32', watts: 50 }, { key: 'tv_43', watts: 80 }, { key: 'tv_55', watts: 115 }, { key: 'tv_crt', watts: 85 }] },
  { id: 'iron', icon: 'iron', watts: 1000, hours: 0.5, days: 15,
    sizes: [{ key: 'iron_dry', watts: 1000 }, { key: 'iron_steam', watts: 1600 }] },
  { id: 'pump', icon: 'pump', watts: 750, hours: 1, days: 30,
    sizes: [{ key: 'pump_05', watts: 400 }, { key: 'pump_1', watts: 750 }, { key: 'pump_15', watts: 1100 }] },
  { id: 'ricecooker', icon: 'ricecooker', watts: 700, hours: 1, days: 30,
    sizes: [{ key: 'rc_s', watts: 500 }, { key: 'rc_m', watts: 700 }, { key: 'rc_l', watts: 900 }] },
  { id: 'washer', icon: 'washer', watts: 450, hours: 1, days: 12,
    sizes: [{ key: 'wm_semi', watts: 350 }, { key: 'wm_top', watts: 450 }, { key: 'wm_front', watts: 600 }] },
  { id: 'desktop', icon: 'desktop', watts: 120, hours: 5, days: 30,
    sizes: [{ key: 'pc_office', watts: 120 }, { key: 'pc_game', watts: 350 }] },
  { id: 'laptop', icon: 'laptop', watts: 65, hours: 5, days: 30,
    sizes: [{ watts: 45 }, { watts: 65 }, { watts: 90 }] },
  { id: 'router', icon: 'router', watts: 15, hours: 24, days: 30,
    sizes: [{ key: 'router_only', watts: 8 }, { key: 'router_onu', watts: 15 }] },
  { id: 'geyser', icon: 'geyser', watts: 2000, hours: 1, days: 30,
    sizes: [{ key: 'geyser_s', watts: 1500 }, { key: 'geyser_l', watts: 2000 }] },
  { id: 'microwave', icon: 'microwave', watts: 1200, hours: 0.3, days: 30,
    sizes: [{ key: 'mw_s', watts: 800 }, { key: 'mw_l', watts: 1200 }] },
  { id: 'other', icon: 'other', watts: 100, hours: 2, days: 30, sizes: [] },
];

/** Quick lookup: category id → category object (falls back to "other"). */
export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/*
 * Size rules — used by "Find wattage" BEFORE asking the internet.
 * If the user types a size such as "1.5 ton", "1 HP", "43 inch",
 * "250 L" or "7 kg", we can work out realistic watts right away.
 * Each rule: category → function(text) returning watts or null.
 */
const num = (match) => (match ? parseFloat(match[1]) : null);

export const SIZE_RULES = {
  // AC: 1 ton ≈ 1100 W. Also understands "12000 BTU".
  ac: (s) => {
    const tons = num(s.match(/(\d+(?:\.\d+)?)\s*(?:ton|টন)/));
    if (tons) return Math.round(tons * 1100);
    const btu = num(s.match(/(\d{4,5})\s*btu/));
    return btu ? Math.round((btu / 12000) * 1100) : null;
  },
  // Water pump: 1 HP = 746 W.
  pump: (s) => {
    if (/(?:half|½|আধা)\s*(?:hp|ঘোড়া)/.test(s)) return 400;
    const hp = num(s.match(/(\d+(?:\.\d+)?)\s*(?:hp|ঘোড়া)/));
    return hp ? Math.round(hp * 746) : null;
  },
  // TV: watts grow with screen size.
  tv: (s) => {
    const inch = num(s.match(/(\d{2})\s*(?:inch|in\b|"|”|ইঞ্চি)/));
    if (!inch) return null;
    const table = [[24, 30], [32, 50], [40, 65], [43, 80], [50, 100], [55, 115], [65, 150], [75, 190]];
    const row = table.find(([size]) => inch <= size) || table[table.length - 1];
    return row[1];
  },
  fan: (s) => {
    const inch = num(s.match(/(\d{2})\s*(?:inch|in\b|"|”|ইঞ্চি)/));
    if (!inch) return null;
    if (inch >= 52) return 75;
    if (inch >= 40) return 60;
    return 45;
  },
  fridge: (s) => {
    const litres = num(s.match(/(\d{2,3})\s*(?:l\b|ltr|liter|litre|লিটার)/));
    return litres ? Math.round(80 + litres * 0.2) : null;
  },
  geyser: (s) => {
    const litres = num(s.match(/(\d{1,3})\s*(?:l\b|ltr|liter|litre|লিটার)/));
    if (!litres) return null;
    return litres <= 15 ? 1500 : 2000;
  },
  washer: (s) => {
    const kg = num(s.match(/(\d+(?:\.\d+)?)\s*(?:kg|কেজি)/));
    return kg ? Math.round(kg * 70) : null;
  },
  ricecooker: (s) => {
    const litres = num(s.match(/(\d+(?:\.\d+)?)\s*(?:l\b|ltr|liter|litre|লিটার)/));
    return litres ? Math.round(400 + litres * 180) : null;
  },
  microwave: (s) => {
    const litres = num(s.match(/(\d{2})\s*(?:l\b|ltr|liter|litre|লিটার)/));
    return litres ? Math.round(800 + litres * 15) : null;
  },
};

/*
 * Last-resort guesses from MODEL CODES, used only when the internet
 * search didn't work. Most AC model numbers hide the size:
 * "…-12C", "AR18…" → 12 / 18 thousand BTU → 1 / 1.5 ton.
 */
export const MODEL_CODE_GUESS = {
  ac: (s) => {
    const code = num(s.match(/(?:^|[^0-9])(09|12|18|24|30)(?=[a-z]|[^0-9a-z]|$)/));
    return code ? Math.round((code / 12) * 1100) : null;
  },
};

/*
 * Sample tariff — filled in when the app starts, so people without
 * their bill at hand can still get an answer.
 * ⚠️ EXAMPLE values only, NOT official rates. Rates change; the app
 * always shows a note asking the user to match their own bill.
 * Each step is [from units, to units (null = "and above"), ৳ per unit].
 */
export const SAMPLE_TARIFF = {
  slabs: [
    [0, 75, 5.26],
    [76, 200, 7.2],
    [201, 300, 7.59],
    [301, 400, 8.02],
    [401, 600, 12.67],
    [601, null, 14.61],
  ],
  demand: 84,   // e.g. 2 kW sanctioned load × ৳42
  meterRent: 40,
  vat: 5,
  days: 30,
};

/** Quick-pick budget buttons (৳ per month). */
export const QUICK_BUDGETS = [500, 1000, 2000, 3000, 5000];
