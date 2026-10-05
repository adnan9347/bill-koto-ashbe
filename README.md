# বিল কত আসবে? — Bill Koto Ashbe?

**Find out how much this month's electricity bill will be — in a minute, in Bangla or English.**

🔗 **Live app:** https://bill-koto-ashbe.vercel.app

A simple, bilingual household electricity bill estimator for Bangladesh. The wording is plain enough that anyone can use it, including someone who has never heard the word "slab". There's no login and nothing is saved: refresh the page and everything starts fresh.

---

## What it does

| Step | What you do | What the app does |
|---|---|---|
| **1. Price** | Check the price per unit | Example prices are already filled in. A small drawing of a bill paper shows where to find yours. |
| **2. Your things** | Tap a fan, bulb, AC, fridge… | Pick a size (১ টন, ৩২ ইঞ্চি, ১ ঘোড়া) for the right watts in one tap, or find the watts from a model number. |
| **3. Budget** | Say how much bill is OK | Quick buttons: ৳500, ৳1,000, ৳2,000, ৳3,000, ৳5,000. |
| **4. Bill** | See your result | See below. |

The result screen shows:

- the total bill as a printed-style receipt, with a step-by-step breakdown
- a warning when you're close to the next, costlier price step
- which item costs the most
- 3 real ways to save, each with the exact ৳ saved per month
- Bijli the bulb's reaction to your budget: relieved 😌, worried 😟 or angry 😡
- **Download bill slip (PDF):** an A4 slip with every item's usage and the full bill. Every page carries the *© Bill Koto Ashbe* copyright and a page number.

Other features:

- **বাংলা / English**, switchable anytime without losing what you typed. Bangla digits are typed and shown everywhere.
- **Light mode** (white + green) and **dark mode** (black + white + soft green).
- Works on phones from 320px wide up to large desktops, and can be added to the home screen.

---

## Accurate watts — how "Find watts" works

Watts are the hardest part of a bill estimate, so the app tries these sources in order:

1. **Watts you type**, such as "1200W". This is the most accurate: it's the number on the appliance's sticker, and the app shows a drawing of where to find it.
2. **Size you type or tap**, such as "1.5 ton", "1 HP", "43 inch", "250 L" or "7 kg". It's converted with simple rules.
3. **Internet search (AI).** Google Gemini with Google Search reads real product pages for that exact model.
   - It returns the *average running* watts, not the peak number on the box. A washing machine's sticker says ~2000 W because of its heater, but it averages ~750 W.
   - ACs use their rated watts instead, because the app already applies "the motor runs 70% of the time".
   - A search takes 10–20 seconds.
4. **AC model code.** If the search fails, "…-12C" is read as 12,000 BTU = 1 ton.
5. **Common value** for that appliance type, if nothing else works.

Every result shows where it came from and how sure it is.

---

## How the bill is calculated

```
Units per item   = watts × how many × hours/day × days/month × motor-on% ÷ 1000
                   (motor-on% applies only to fridges 50% and ACs 70%)

Electricity cost = each price step charged at its own price   (most bills)
                   or all units at the highest step's price
                   or one price for every unit

VAT              = (electricity cost + demand charge) × VAT%
Total bill       = electricity cost + demand charge + meter rent + VAT
```

Each item's share of the cost is in proportion to its units. The saving tips work by re-running the same calculation with one change (for example "AC 2 hours less") and showing the real difference.

> ⚠️ The example prices are **not official rates**. Always match them to your own bill paper. The result is an estimate: real bills differ a little because of reading dates, rounding and rate changes.

---

## Tech

- **Plain HTML, CSS and JavaScript** (ES modules). No framework, no build step, no `npm install`.
- **[Motion](https://motion.dev)** for gentle animations, with an automatic fallback if the CDN fails.
- **Fonts:** [Anek Bangla](https://fonts.google.com/specimen/Anek+Bangla) for Bangla and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) for English.
- **Icons:** [Iconify](https://icon-sets.iconify.design/material-symbols-light/) Material Symbols Light, stored offline in `js/icons.js`.
- **PDF:** [html2canvas](https://html2canvas.hertzen.com) + [jsPDF](https://github.com/parallax/jsPDF), loaded only when you tap Download. Bangla letters render correctly because the slip is drawn by the browser first.
- **AI lookup:** one Vercel serverless function (`api/lookup.js`) calls Google Gemini with Google Search grounding. The API key stays on the server.
- **No database, no cookies, no localStorage.** All state lives in memory.
- **Accessibility:**
  - every input is labelled
  - totals are announced to screen readers
  - visible focus rings and 44px touch targets
  - WCAG AA contrast in both themes
  - respects "reduce motion"

---

## Project structure

```
index.html          page skeleton
manifest.json       "Add to Home Screen" settings
icons/              icon.svg, icon-192.png, icon-512.png
css/styles.css      all styling + both themes + PDF slip styles
js/app.js           state, screens, events
js/calculator.js    pure bill math (+ self-tests: open the app with ?test)
js/i18n.js          every sentence in Bangla & English + number formatting
js/appliances.js    appliance types, sizes → watts, example prices
js/lookup.js        "Find watts" (typed watts → size → AI search → typical)
js/pdf.js           bill slip → PDF download
js/icons.js         Iconify icons (offline)
js/animations.js    motion + drawings (meter disc, Bijli)
js/theme.js         light / dark switch
api/lookup.js       Vercel function: Gemini + Google Search
server.js           run everything locally, including the AI lookup
vercel.json         static site + one function (30 s time limit)
```

---

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer.

1. Create a file named `.env.local` in the project folder with this line:
   ```
   GEMINI_API_KEY=your-key-here
   ```
   Get a free key at https://aistudio.google.com. Without a key the app still works; only the internet watt search is skipped.

2. Start the local server:
   ```bash
   npm run dev
   ```
   (`npm run dev` just runs `node server.js`.) Then open http://localhost:3000.

> Opening `index.html` by double-clicking won't work: browsers block ES modules on `file://` addresses.

**Calculator self-tests:** open http://localhost:3000/?test, press F12 and open the Console.

---

## Deploy to Vercel

This repo is already set up for Vercel (`vercel.json`). It's served as a static site with no build step.

1. Import the repo on https://vercel.com (**Add New… → Project**).
2. Add the environment variable `GEMINI_API_KEY` under **Settings → Environment Variables**.
3. Deploy.

After that, every push to `main` redeploys automatically.

With the Vercel command-line tool instead:

```bash
npx vercel env add GEMINI_API_KEY production
```
```bash
npx vercel deploy --prod
```

> 🔒 **Never commit `.env.local`.** It's already in `.gitignore`. The key belongs only in Vercel's environment variables.

If Google retires the AI model, update this line at the top of `api/lookup.js` with the current name from AI Studio:

```js
const GEMINI_MODEL = 'gemini-2.5-flash';
```

---

## Customising

| What | Where |
|---|---|
| Example prices (steps, demand charge, meter rent, VAT) | `SAMPLE_TARIFF` in `js/appliances.js` |
| Appliance types, sizes and default watts | `CATEGORIES` in `js/appliances.js` |
| Size rules ("1.5 ton" → watts) | `SIZE_RULES` in `js/appliances.js` |
| Any text, in both languages | `js/i18n.js` |
| Colours (light and dark) | CSS variables at the top of `css/styles.css` |
| Icons | `js/icons.js`: paste a new `<path>` from Iconify |
| App icon | `icons/icon.svg`: re-export it as 192 px and 512 px PNGs |

**Writing rule for text:** use the words people already know from their bill paper and daily life. If a technical word is printed on the bill (like "ডিমান্ড চার্জ"), keep it, but explain it in plain words next to it.

---

## License

[MIT](LICENSE) © 2026 Bill Koto Ashbe (adnan9347): free to use, change and share. Please keep the copyright notice.
