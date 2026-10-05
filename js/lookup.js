/*
 * ==========================================================
 *  lookup.js — "Find wattage" from a model number or size
 * ----------------------------------------------------------
 *  Tried in this order. The app NEVER breaks here — the worst
 *  case is a sensible typical value.
 *
 *   1. Watts typed directly ("1200W", "1200 watt")   → 'label'
 *   2. A size typed in words ("1.5 ton", "1 HP",
 *      "43 inch", "250 L", "7 kg", or AC codes like
 *      "-12C") — worked out with SIZE_RULES          → 'size'
 *   3. Ask our server function /api/lookup, which
 *      searches the web with Google Gemini            → 'ai'
 *      (needs GEMINI_API_KEY; takes 10–20 seconds)
 *   4. Size hidden in an AC model code ("…-12C" = 1 ton) → 'size'
 *   5. The category's typical watts                   → 'typical'
 *
 *  lookupWattage() always resolves to:
 *    { watts, source, capacity?, confidence? }
 * ==========================================================
 */

import { SIZE_RULES, MODEL_CODE_GUESS, getCategory } from './appliances.js';
import { toAsciiDigits } from './i18n.js';

const API_URL = '/api/lookup';
// Web-search answers take 10–20 s, so we wait up to 25 s before giving up.
const TIMEOUT_MS = 25000;

/** Keep only letters, digits, spaces, dashes, slashes and dots (max 60 chars) — same rule as the server. */
export const sanitizeModel = (text) => toAsciiDigits(String(text ?? '')).replace(/[^A-Za-z0-9 \-/.]/g, '').trim().slice(0, 60);

/** Layer 1: "1200W", "1200 w", "1200 watt", "১২০০ ওয়াট". */
function wattsWritten(text) {
  const m = text.match(/(\d{1,5}(?:\.\d+)?)\s*(?:w\b|watt|watts|ওয়াট)/);
  const watts = m ? parseFloat(m[1]) : NaN;
  return watts >= 1 && watts <= 10000 ? Math.round(watts) : null;
}

/** Layer 2: a size such as "1.5 ton" → watts, using the rules in appliances.js. */
function wattsFromSize(text, category) {
  const rule = SIZE_RULES[category];
  return rule ? rule(text) : null;
}

/** Layer 3: our serverless function (Gemini + Google Search). Returns data or null. */
async function askServer(model, category) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, category }),
      signal: controller.signal,
    });
    if (!response.ok) return null; // 503 (no key), 502 (search failed), 404 (plain static server)…
    const data = await response.json();
    const watts = Number(data && data.watts);
    if (!Number.isFinite(watts) || watts < 1 || watts > 10000) return null;
    return {
      watts: Math.round(watts),
      capacity: typeof data.capacity === 'string' ? data.capacity.slice(0, 40) : '',
      confidence: ['low', 'medium', 'high'].includes(data.confidence) ? data.confidence : 'low',
    };
  } catch {
    return null; // timeout, offline, bad JSON — fall through to the typical value
  } finally {
    clearTimeout(timer);
  }
}

/** The one function the app calls. */
export async function lookupWattage(rawText, category) {
  const cat = getCategory(category);
  const typical = { watts: cat.watts, source: 'typical' };
  const lower = toAsciiDigits(String(rawText ?? '')).toLowerCase().trim();
  if (!lower) return typical;

  const written = wattsWritten(lower);
  if (written) return { watts: written, source: 'label' };

  const sized = wattsFromSize(lower, cat.id);
  if (sized) return { watts: sized, source: 'size' };

  const clean = sanitizeModel(rawText);
  if (clean.length >= 3) {
    const ai = await askServer(clean, cat.id);
    if (ai) return { ...ai, source: 'ai' };
  }

  const guess = MODEL_CODE_GUESS[cat.id] && MODEL_CODE_GUESS[cat.id](lower);
  if (guess) return { watts: guess, source: 'size' };
  return typical;
}
