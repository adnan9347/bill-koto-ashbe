/*
 * ==========================================================
 *  calculator.js — all of the bill math (and nothing else)
 * ----------------------------------------------------------
 *  "Pure functions" live here: you give them data, they give
 *  back an answer. They never touch the page (no DOM), never
 *  save anything, and never change the data you pass in.
 *  That makes them easy to test — add ?test to the URL and
 *  open the browser console to see the self-tests run.
 *
 *  The big one is calculateBill(state). Everything else
 *  (validation, savings tips) is built on top of it.
 * ==========================================================
 */

/* ---------- tiny helpers ---------- */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Use the number if it's a real number, otherwise the fallback (empty fields count as 0). */
const toNum = (v, fallback = 0) => (isNum(v) ? v : fallback);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Round money to 2 decimals — for DISPLAY only. Internally we keep full precision. */
export const roundMoney = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Billing days (1–31). Defaults to 30 if empty or invalid. */
export function billingDaysOf(tariff) {
  const days = toNum(tariff && tariff.days, 30);
  return days >= 1 ? clamp(days, 1, 31) : 30;
}

/**
 * Monthly kWh for ONE appliance card.
 *
 *   kWh = watts × quantity × hours/day × days/month × (duty% / 100) ÷ 1000
 *
 * Why ÷1000? Watts × hours = watt-hours; 1000 watt-hours = 1 kWh = 1 "unit" on your bill.
 * Why duty? A fridge's compressor isn't running 24/7 — duty 50% means "half the time".
 * Days are capped at the billing period (you can't run a fan 31 days in a 30-day bill).
 */
export function applianceKwh(appliance, billingDays = 30) {
  const watts = Math.max(0, toNum(appliance.watts));
  const qty = Math.max(0, toNum(appliance.qty));
  const hours = clamp(toNum(appliance.hours), 0, 24);
  const days = clamp(toNum(appliance.days), 0, billingDays);
  const duty = clamp(toNum(appliance.duty, 100), 0, 100); // null/empty → 100%
  return (watts * qty * hours * days * (duty / 100)) / 1000;
}

/**
 * Put the slabs in order and work out where each one really starts and ends.
 *
 * Bills write slabs like "0–75, 76–200, 201–300…". We treat each slab's "To"
 * as a cumulative ceiling: slab 2 covers the units ABOVE 75 up to 200. That
 * way both "76–200" and "75–200" styles work the same.
 *
 * The LAST slab always runs to infinity — if someone leaves a "To" on the
 * last row, any extra units are still charged at that last rate instead of
 * silently disappearing.
 */
function prepareSlabs(slabs) {
  const sorted = (slabs || [])
    .map((s) => ({ from: toNum(s.from), to: isNum(s.to) ? s.to : null, rate: Math.max(0, toNum(s.rate)) }))
    .sort((a, b) => a.from - b.from);

  return sorted.map((s, i) => ({
    ...s,
    index: i + 1, // 1-based number shown to the user ("Slab 2")
    start: i === 0 ? 0 : (sorted[i - 1].to ?? Infinity),
    end: i === sorted.length - 1 ? Infinity : (s.to ?? Infinity),
  }));
}

/** Progressive billing: each slab's slice of the units is charged at that slab's own rate. */
function progressiveCharge(totalKwh, slabs) {
  const rows = [];
  let energy = 0;
  for (const slab of slabs) {
    if (totalKwh <= slab.start) break; // we never reached this slab
    const units = Math.min(totalKwh, slab.end) - slab.start;
    if (units <= 0) continue;
    const amount = units * slab.rate;
    energy += amount;
    rows.push({ index: slab.index, from: slab.from, to: slab.to, units, rate: slab.rate, amount });
  }
  return { energy, rows };
}

/** Index (0-based) of the highest slab the total reaches. 0 kWh counts as "in slab 1". */
function reachedSlabIndex(totalKwh, slabs) {
  let idx = 0;
  slabs.forEach((slab, i) => { if (totalKwh > slab.start) idx = i; });
  return idx;
}

/** Whole-bill billing: ALL units are charged at the rate of the highest slab reached. */
function wholeBillCharge(totalKwh, slabs) {
  const slab = slabs[reachedSlabIndex(totalKwh, slabs)];
  const energy = totalKwh * slab.rate;
  const rows = totalKwh > 0
    ? [{ index: slab.index, from: slab.from, to: slab.to, units: totalKwh, rate: slab.rate, amount: energy }]
    : [];
  return { energy, rows };
}

/**
 * How far is the user from the next (more expensive) slab?
 * Returns { unitsAway, rate, threshold } or null when there is no next slab.
 * The app decides whether it's close enough to warn about (within 15%).
 */
function nextSlabInfo(totalKwh, slabs) {
  if (slabs.length < 2) return null;
  const i = reachedSlabIndex(totalKwh, slabs);
  if (i >= slabs.length - 1) return null;
  const threshold = slabs[i].end;
  if (!isNum(threshold)) return null;
  return { unitsAway: threshold - totalKwh, rate: slabs[i + 1].rate, threshold };
}

/**
 * THE main function.
 *
 * @param state  { tariff: {...}, appliances: [...] } — the same shape app.js keeps.
 * @returns {
 *   totalKwh, perAppliance: [{id, kwh, cost}], slabBreakdown: [{index, from, to, units, rate, amount}],
 *   energy, demand, meterRent, vat, vatPct, total, nextSlab: {unitsAway, rate, threshold} | null,
 *   mode: 'slab' | 'simple', method: 'progressive' | 'whole'
 * }
 */
export function calculateBill(state) {
  const tariff = (state && state.tariff) || {};
  const appliances = (state && state.appliances) || [];
  const days = billingDaysOf(tariff);
  const mode = tariff.mode === 'simple' ? 'simple' : 'slab';
  const method = tariff.method === 'whole' ? 'whole' : 'progressive';

  // 1) Units per appliance and in total.
  const perAppliance = appliances.map((a) => ({ id: a.id, kwh: applianceKwh(a, days), cost: 0 }));
  const totalKwh = perAppliance.reduce((sum, p) => sum + p.kwh, 0);

  // 2) Energy charge depending on the tariff style.
  let energy = 0;
  let slabBreakdown = [];
  let nextSlab = null;

  if (mode === 'simple') {
    const rate = Math.max(0, toNum(tariff.simpleRate));
    energy = totalKwh * rate;
    if (totalKwh > 0) slabBreakdown = [{ index: 1, from: 0, to: null, units: totalKwh, rate, amount: energy }];
  } else {
    const slabs = prepareSlabs(tariff.slabs);
    if (slabs.length) {
      const result = method === 'whole' ? wholeBillCharge(totalKwh, slabs) : progressiveCharge(totalKwh, slabs);
      energy = result.energy;
      slabBreakdown = result.rows;
      nextSlab = nextSlabInfo(totalKwh, slabs);
    }
  }

  // 3) Share the energy charge between appliances in proportion to their kWh.
  perAppliance.forEach((p) => { p.cost = totalKwh > 0 ? (p.kwh / totalKwh) * energy : 0; });

  // 4) Fixed charges and VAT. VAT is charged on energy + demand (not on meter rent).
  const demand = Math.max(0, toNum(tariff.demand));
  const meterRent = Math.max(0, toNum(tariff.meterRent));
  const vatPct = Math.max(0, toNum(tariff.vat));
  const vat = ((energy + demand) * vatPct) / 100;
  const total = energy + demand + meterRent + vat;

  return { totalKwh, perAppliance, slabBreakdown, energy, demand, meterRent, vat, vatPct, total, nextSlab, mode, method };
}

/**
 * Check the tariff the user typed. Returns { valid, errors }.
 * Each error is { key, vars, fields } — `key` is an i18n key, `fields` tells
 * the app which inputs to highlight ({ slabId, field } or { field }).
 */
export function validateTariff(tariff) {
  const errors = [];
  const add = (key, vars = {}, fields = []) => errors.push({ key, vars, fields });

  if (tariff.mode === 'simple') {
    if (!isNum(tariff.simpleRate) || tariff.simpleRate < 0) add('errSimpleRate', {}, [{ field: 'simpleRate' }]);
  } else {
    const slabs = tariff.slabs || [];
    if (!slabs.length) add('errNoSlab');

    slabs.forEach((s, i) => {
      const n = i + 1;
      const isLast = i === slabs.length - 1;
      const bad = [];
      if (!isNum(s.from) || s.from < 0) bad.push({ slabId: s.id, field: 'from' });
      if (s.to !== null && !isNum(s.to)) bad.push({ slabId: s.id, field: 'to' });
      if (!isNum(s.rate)) bad.push({ slabId: s.id, field: 'rate' });
      if (bad.length) { add('errNumber', { n }, bad); return; }

      if (s.rate < 0) add('errRate', { n }, [{ slabId: s.id, field: 'rate' }]);
      if (s.to === null && !isLast) add('errOpenMiddle', { n }, [{ slabId: s.id, field: 'to' }]);
      if (isNum(s.to) && s.to <= s.from) add('errToFrom', { n }, [{ slabId: s.id, field: 'to' }]);
    });

    const first = slabs[0];
    if (first && isNum(first.from) && first.from !== 0 && first.from !== 1) {
      add('errFirst', {}, [{ slabId: first.id, field: 'from' }]);
    }

    // Neighbouring slabs must touch: next "From" = previous "To" or previous "To" + 1.
    for (let i = 1; i < slabs.length; i++) {
      const prev = slabs[i - 1];
      const cur = slabs[i];
      if (!isNum(prev.to) || !isNum(cur.from)) continue;
      const vars = { a: i, b: i + 1, x: prev.to + 1 };
      if (cur.from > prev.to + 1) add('errGap', vars, [{ slabId: cur.id, field: 'from' }]);
      else if (cur.from < prev.to) add('errOverlap', vars, [{ slabId: cur.id, field: 'from' }]);
    }
  }

  // Empty charges are fine (counted as 0); anything typed must be a number ≥ 0.
  const badCharges = ['demand', 'meterRent', 'vat']
    .filter((key) => tariff[key] !== null && (!isNum(tariff[key]) || tariff[key] < 0))
    .map((field) => ({ field }));
  if (badCharges.length) add('errCharges', {}, badCharges);

  if (!isNum(tariff.days) || tariff.days < 1 || tariff.days > 31) add('errDays', {}, [{ field: 'days' }]);

  return { valid: errors.length === 0, errors };
}

/**
 * Smart savings tips.
 * Each idea is tested for REAL: we copy the state, change one thing
 * (e.g. "AC duty −10%"), run calculateBill() again and measure the ৳ saved.
 * The 3 ideas that save the most win.
 *
 * Returns [{ key, saved, applianceId? }] — `key` is an i18n key.
 */
export function computeSavingsTips(state, limit = 3) {
  const apps = (state && state.appliances) || [];
  if (!apps.length) return [];

  const base = calculateBill(state);
  const candidates = [];
  const clone = () => JSON.parse(JSON.stringify(state));
  const ofCategory = (s, cat) => s.appliances.filter((a) => a.category === cat);

  /** mutate() edits the copy; return false from it to skip the idea (e.g. no tube lights). */
  const tryTip = (key, meta, mutate) => {
    const copy = clone();
    if (mutate(copy) === false) return;
    const saved = base.total - calculateBill(copy).total;
    if (saved >= 1) candidates.push({ key, saved, ...meta });
  };

  const forCategory = (cat, change) => (s) => {
    const list = ofCategory(s, cat);
    if (!list.length) return false;
    list.forEach(change);
    return true;
  };

  // 1) The single most expensive appliance runs 2 hours less per day.
  const top = [...base.perAppliance].sort((a, b) => b.cost - a.cost)[0];
  const topApp = top && apps.find((a) => a.id === top.id);
  if (topApp && toNum(topApp.hours) > 0) {
    tryTip('tipHours', { applianceId: topApp.id }, (s) => {
      const a = s.appliances.find((x) => x.id === topApp.id);
      a.hours = Math.max(0, toNum(a.hours) - 2);
    });
  }

  // 2) Tube lights → LED (LED ≈ 45% of the tube's watts).
  tryTip('tipLed', {}, forCategory('tube', (a) => { a.watts = toNum(a.watts) * 0.45; }));
  // 3) AC duty factor −10 percentage points (warmer thermostat).
  tryTip('tipAcDuty', {}, forCategory('ac', (a) => { a.duty = Math.max(0, toNum(a.duty, 100) - 10); }));
  // 4) Fridge duty factor −10 percentage points.
  tryTip('tipFridge', {}, forCategory('fridge', (a) => { a.duty = Math.max(0, toNum(a.duty, 100) - 10); }));
  // 5) Iron in batches: half the days.
  tryTip('tipIron', {}, forCategory('iron', (a) => { a.days = Math.ceil(toNum(a.days) / 2); }));
  // 6) Water pump: 5 fewer days.
  tryTip('tipPump', {}, forCategory('pump', (a) => { a.days = Math.max(0, toNum(a.days) - 5); }));
  // 7) Geyser: half the hours.
  tryTip('tipGeyser', {}, forCategory('geyser', (a) => { a.hours = toNum(a.hours) / 2; }));
  // 8) All fans 2 hours less (skipped when tip 1 is already about a fan).
  if (!topApp || topApp.category !== 'fan') {
    tryTip('tipFans', {}, forCategory('fan', (a) => { a.hours = Math.max(0, toNum(a.hours) - 2); }));
  }

  return candidates.sort((a, b) => b.saved - a.saved).slice(0, limit);
}

/* ==========================================================
 *  Self-tests — run only when the page URL contains ?test
 *  (e.g. http://localhost:3000/?test). Results print in the console.
 * ========================================================== */
function runSelfTests() {
  const appliance = (watts, qty, hours, days, duty = null) => ({ id: 't', category: 'other', watts, qty, hours, days, duty });
  const slabs = [{ from: 0, to: 75, rate: 5 }, { from: 76, to: 200, rate: 7 }, { from: 201, to: null, rate: 10 }];
  const tariff = (extra = {}) => ({ mode: 'slab', method: 'progressive', slabs, simpleRate: null, demand: 0, meterRent: 0, vat: 0, days: 30, ...extra });
  const kwh250 = [appliance(1000, 10, 1, 25)]; // 1000 W × 10 × 1 h × 25 d = 250 kWh

  const cases = [
    // 75×5 + 125×7 + 50×10 = 375 + 875 + 500
    ['progressive, 250 kWh', { tariff: tariff(), appliances: kwh250 }, (b) => b.energy, 1750],
    ['whole-bill, 250 kWh (all at ৳10)', { tariff: tariff({ method: 'whole' }), appliances: kwh250 }, (b) => b.energy, 2500],
    ['simple mode, 250 kWh × ৳8', { tariff: tariff({ mode: 'simple', simpleRate: 8 }), appliances: kwh250 }, (b) => b.energy, 2000],
    // energy 1750 + demand 50 + meter 40 + VAT 5% of (1750+50)=90
    ['demand + meter rent + VAT', { tariff: tariff({ demand: 50, meterRent: 40, vat: 5 }), appliances: kwh250 }, (b) => b.total, 1930],
    // only fixed charges: 50 + 40 + 5% of 50
    ['zero appliances', { tariff: tariff({ demand: 50, meterRent: 40, vat: 5 }), appliances: [] }, (b) => b.total, 92.5],
    // 375 + 875 + 800×10
    ['open-ended last slab, 1000 kWh', { tariff: tariff(), appliances: [appliance(1000, 40, 1, 25)] }, (b) => b.energy, 9250],
    ['next-slab distance at 70 kWh', { tariff: tariff(), appliances: [appliance(2800, 1, 1, 25)] }, (b) => b.nextSlab && b.nextSlab.unitsAway, 5],
    ['next-slab rate at 70 kWh', { tariff: tariff(), appliances: [appliance(2800, 1, 1, 25)] }, (b) => b.nextSlab && b.nextSlab.rate, 7],
    // 150 W × 24 h × 30 d × 50% = 54 kWh
    ['duty factor 50%', { tariff: tariff(), appliances: [appliance(150, 1, 24, 30, 50)] }, (b) => b.totalKwh, 54],
    ['days capped at billing days', { tariff: tariff({ days: 28 }), appliances: [appliance(1000, 1, 1, 31)] }, (b) => b.totalKwh, 28],
  ];

  let passed = 0;
  console.group('%c⚡ calculator.js self-tests', 'color:#FF7A00;font-weight:bold');
  cases.forEach(([name, state, pick, expected]) => {
    const got = pick(calculateBill(state));
    const ok = isNum(got) && Math.abs(got - expected) < 1e-6;
    if (ok) passed += 1;
    console.log(`${ok ? '✅' : '❌'} ${name} → got ${got}, expected ${expected}`);
  });
  console.log(`${passed}/${cases.length} passed`);
  console.groupEnd();
}

if (typeof window !== 'undefined' && /[?&]test\b/.test(window.location.search)) {
  runSelfTests();
}
