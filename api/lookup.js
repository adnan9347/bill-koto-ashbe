/*
 * ==========================================================
 *  api/lookup.js — OPTIONAL serverless function (Vercel)
 * ----------------------------------------------------------
 *  "Find wattage" calls POST /api/lookup with { model, category }.
 *  We ask Google Gemini to SEARCH THE WEB for that exact model
 *  (Google Search grounding) and return realistic watts:
 *     { watts, rated_watts, running_watts, capacity, confidence, note }
 *
 *  Why two numbers? The sticker shows the MAXIMUM ("rated") power.
 *  A washing machine's heater, for example, only runs for a few
 *  minutes, so its average is far lower. For the bill we use:
 *    • AC      → rated watts (the app applies its own "runs 70%
 *                of the time" factor, so we don't reduce twice)
 *    • others  → average running watts
 *
 *  • Runs on Vercel, or locally with `node server.js`.
 *  • Needs GEMINI_API_KEY. Without it we return 503 and the app
 *    quietly falls back — nothing breaks.
 *  • The key stays on the server; the browser never sees it.
 *  • We never log or store what the user typed.
 * ==========================================================
 */

// Check Google AI Studio (https://aistudio.google.com) for the current model name
// and update this if Google renames or retires it.
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
// Web search takes 10–20 s. The browser waits 25 s, so we stop a bit earlier.
const TIMEOUT_MS = 22000;

// Keep in sync with CATEGORIES in js/appliances.js.
const CATEGORY_NAMES = {
  fan: 'electric fan', led: 'LED bulb or LED tube light', tube: 'fluorescent tube light', ac: 'split air conditioner',
  fridge: 'refrigerator', tv: 'television', iron: 'clothes iron', pump: 'electric water pump',
  ricecooker: 'electric rice cooker', washer: 'washing machine', desktop: 'desktop computer with monitor', laptop: 'laptop',
  router: 'Wi-Fi router', geyser: 'electric water heater (geyser)', microwave: 'microwave oven', other: 'household electrical appliance',
};

/** Letters, digits, spaces, dashes, slashes and dots only — max 60 characters. */
function sanitizeModel(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Za-z0-9 \-/.]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Vercel usually parses JSON for us; be safe if the body arrives as a string. */
function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

/** Gemini may wrap JSON in ```json fences or add text around it — find the {...} and parse. */
function parseModelJson(text) {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

/** "2000-2400", "1,200 W", 750 → a single number (ranges use the middle). */
function toWatts(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const nums = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
  if (!nums) return NaN;
  const list = nums.slice(0, 2).map(Number);
  return list.reduce((a, b) => a + b, 0) / list.length;
}

const valid = (w) => Number.isFinite(w) && w >= 1 && w <= 10000;

function buildPrompt(model, category) {
  return [
    'You help people in Bangladesh estimate their monthly electricity bill (230V, 50Hz).',
    `Appliance type: ${CATEGORY_NAMES[category]}.`,
    `Model number or description typed by the user: "${model}".`,
    'Search the web for this exact model (manufacturer pages, Bangladeshi shops such as Walton, Vision, Singer, Samsung, LG, Gree, General, Minister, Jamuna, Marcel, and spec sheets).',
    'Find:',
    '1. rated_watts — the rated input power printed on the label / spec sheet.',
    '2. running_watts — the AVERAGE power it draws while switched on in normal home use. Examples: a washing machine heater runs only briefly, so the average is far below the peak; an inverter AC averages below its rated power; for a fridge give the compressor running watts (on/off cycling is handled separately).',
    '3. capacity — e.g. "1.5 ton", "250 L", "43 inch", "1 HP", "7 kg".',
    'If you cannot find the exact model, use a very similar model of the same brand and size, and set confidence to "low".',
    'Reply with ONLY one JSON object, no other text:',
    '{"rated_watts": number, "running_watts": number, "capacity": string, "confidence": "low" | "medium" | "high", "note": string}',
    'Each watts value must be ONE number, not a range. Keep "note" under 120 characters.',
  ].join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'lookup_unavailable' });

  const body = readBody(req);
  const model = sanitizeModel(body.model);
  const category = Object.prototype.hasOwnProperty.call(CATEGORY_NAMES, body.category) ? body.category : null;
  if (!model || !category) return res.status(400).json({ error: 'invalid_input' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(model, category) }] }],
        // Google Search grounding = Gemini reads real web pages instead of guessing from memory.
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return res.status(502).json({ error: 'lookup_failed' });

    const data = await response.json();
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    const parsed = parseModelJson(text);
    if (!parsed) return res.status(502).json({ error: 'lookup_failed' });

    const rated = toWatts(parsed.rated_watts);
    let running = toWatts(parsed.running_watts);
    if (valid(rated) && valid(running) && running > rated) running = rated;

    // AC: use rated watts — the app's duty factor already accounts for the compressor cycling.
    const watts = category === 'ac' ? (valid(rated) ? rated : running) : (valid(running) ? running : rated);
    if (!valid(watts)) return res.status(502).json({ error: 'lookup_failed' });

    return res.status(200).json({
      watts: Math.round(watts),
      rated_watts: valid(rated) ? Math.round(rated) : null,
      running_watts: valid(running) ? Math.round(running) : null,
      capacity: typeof parsed.capacity === 'string' ? parsed.capacity.slice(0, 40) : '',
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'low',
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 160) : '',
    });
  } catch {
    return res.status(502).json({ error: 'lookup_failed' });
  } finally {
    clearTimeout(timer);
  }
}
