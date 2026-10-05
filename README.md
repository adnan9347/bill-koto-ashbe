# বিল কত আসবে? — Bill Koto Ashbe?

A simple, bilingual (বাংলা / English) household electricity bill estimator for Bangladesh. It's written so anyone, including someone in a village who has never heard the word "slab", can use it.

1. **Price** — prices per unit are already filled in, so you only change them if your bill paper shows different numbers. A small drawing shows where to look on the bill.
2. **Your things** — tap a fan, bulb, AC… then pick its size ("1.5 ton", "32 inch", "1 HP") to get the right watts in one tap.
3. **Budget** — how much bill is OK for you.
4. **Bill** — the total, shown like a printed receipt, plus:
   - which item costs the most
   - 3 real ways to save, each with the ৳ saved
   - Bijli the bulb's reaction to your budget
   - **a downloadable bill slip (PDF)** showing each item's usage and the full bill

**Privacy:** there's no login and no database, and nothing is saved. Refresh the page and everything starts fresh.

---

## Project structure

```
index.html          page skeleton
manifest.json       "Add to Home Screen" settings
icons/              icon.svg + icon-192.png + icon-512.png
css/styles.css      all styling (light: white + green, dark: black + white + soft green)
js/app.js           state, screens, event wiring
js/calculator.js    pure bill math (+ self-tests with ?test)
js/i18n.js          every sentence in Bangla & English + number formatting
js/appliances.js    appliance types, sizes → watts, example prices
js/lookup.js        "Find watts" (typed watts → size → internet search → typical)
js/icons.js         icons from Iconify (Material Symbols Light), stored offline
js/animations.js    motion + drawings (meter disc, Bijli)
js/pdf.js           turns the bill slip into a PDF download
js/theme.js         light / dark switch
api/lookup.js       serverless function: Gemini + Google Search
server.js           run everything on your own computer (no npm install)
vercel.json         gives the lookup function enough time (30 s)
```

There's no build step and no dependencies.

---

## Run it on your computer

The JavaScript uses ES modules, so you need a small local server. Double-clicking `index.html` won't work.

**Recommended: everything, including the AI watt search.** You need Node.js 18 or newer.

```bash
node server.js
```

Then open http://localhost:3000.

- The server reads `GEMINI_API_KEY` from the `.env.local` file in this folder.
- It refuses to serve hidden files, so your key can't be downloaded from the browser.

**Without the AI search:** `npx serve .`, or VS Code's "Live Server" extension, or `python -m http.server 8000`. With these, "Find watts" still works from typed watts and sizes, then falls back to a common value.

### Calculator self-tests

Open http://localhost:3000/?test, then press F12 and open the Console.

---

## Deploy to Vercel (free)

1. Push this folder to GitHub. `.gitignore` already keeps `.env.local` (your key) out of git.
2. On https://vercel.com, go to **Add New… → Project** and import the repository.
3. For **Framework Preset**, choose **Other**. Leave the build command and output directory empty.
4. Go to **Settings → Environment Variables** and add `GEMINI_API_KEY` with your key.
5. **Redeploy**. Environment variables only apply to new deployments.

The app works without the key too. You just lose the internet search for model numbers.

The Gemini model name is a constant at the top of `api/lookup.js`:

```js
const GEMINI_MODEL = 'gemini-2.5-flash';
```

If Google renames or retires it, check https://aistudio.google.com for the current name.

---

## How "Find watts" stays accurate

Getting watts right is the hardest part of a bill estimate. This is what the app does, in order:

1. **Watts typed directly.** "1200W" is used as-is. This is the most accurate source: it's the number on the appliance's sticker. The app shows a drawing of such a sticker.
2. **Size.** "1.5 ton", "1 HP", "43 inch", "250 L" and "7 kg" are converted with the rules in `SIZE_RULES` (`js/appliances.js`). Each card also has one-tap size buttons.
3. **Internet search (AI).** `/api/lookup` asks Gemini with Google Search turned on, so it reads real product pages instead of guessing from memory.
   - It returns the **rated** watts (the sticker maximum) and the **average running** watts.
   - The app uses the running watts, because a bill depends on average use, not the peak. For example, a front-load washing machine is rated about 2000 W because of its heater, but averages about 750 W.
   - ACs are the exception: they use the rated watts, because the app already applies its own "runs 70% of the time" factor.
   - A search takes about 10–20 seconds.
4. **AC model codes.** If the search fails, "…-12C" is read as 12,000 BTU = 1 ton.
5. **Common value.** If nothing else works, the category's typical watts are used.

Every result shows where it came from and how sure it is, and reminds the user that the sticker is the most accurate.

---

## Customising

- **Example prices:** `SAMPLE_TARIFF` in `js/appliances.js`. Each step is `[from, to, price]`; `null` as "to" means "and above". These are examples, not official rates.
- **Appliance sizes and watts:** `CATEGORIES` in `js/appliances.js`. The size labels are `size_…` keys in `js/i18n.js`.
- **Words:** everything is in `js/i18n.js`, under `en` and `bn`. Keep it simple: use words from the bill paper, and explain any technical term.
- **Colours:** CSS variables at the top of `css/styles.css`. Light theme is on `:root`, dark theme on `[data-theme="dark"]`.
- **Icons:** `js/icons.js` holds SVG paths from https://icon-sets.iconify.design/material-symbols-light/. To change one, copy a new icon's `<path>` over the old one.
- **Fonts:** Anek Bangla for Bangla and Space Grotesk for English, both from Google Fonts. They're loaded in `index.html` and set as `--font-bn` / `--font-en` in the CSS, and they switch with the language.

### Icons (app icon)

`icons/icon.svg` is the master. If you change it, re-export it at 192×192 and 512×512 PNG (with Figma, Inkscape or https://svgtopng.com) and replace `icon-192.png` and `icon-512.png`. Keep the bolt in the middle ~70% so Android's round crop doesn't cut it.

---

## How the bill is calculated

- **Units per item** = watts × how many × hours/day × days/month × motor-on % ÷ 1000.
  - Motor-on % is used only for fridges (50%) and ACs (70%).
- **Electricity charge** depends on how your bill charges:
  - "Each step at its own price" (most bills), or
  - "All units at the last step's price", or
  - one price for every unit.
- **VAT** = (electricity charge + demand charge) × VAT%.
- **Total** = electricity charge + demand charge + meter rent + VAT.

This is an estimate. Real bills differ a little because of reading dates, rounding and rate changes.

---

## The PDF bill slip

The **Download bill slip (PDF)** button on the result screen saves `bill-koto-ashbe-YYYY-MM.pdf` on A4 paper. It includes:

- the date and billing days
- the total bill, units, your budget and the status
- a table of every item: how many, watts, hours/day, days, units and cost
- the bill calculation step by step
- the 3 ways to save

How it works (`js/pdf.js`):

- The slip is built as normal HTML in the current language, so Bangla letters join correctly.
- [html2canvas](https://html2canvas.hertzen.com) photographs it, and [jsPDF](https://github.com/parallax/jsPDF) puts it on A4 pages.
- Long slips split between table rows, never through one.
- Both libraries load from cdnjs only when the button is tapped, so they don't slow down the page.
- If they can't load (for example, offline), the print window opens with just the slip. Choose **Save as PDF** there.

## Accessibility & tech

- Plain HTML, CSS and JavaScript. [Motion](https://motion.dev) handles the gentle animations and has a fallback if the CDN fails.
- Respects "reduce motion": no movement, only fades.
- Every input has a label, and totals are announced to screen readers.
- Focus rings are visible, touch targets are at least 44px, and text meets AA contrast in both themes.
- Language and theme reset on refresh (nothing is stored).
