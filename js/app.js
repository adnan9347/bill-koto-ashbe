/*
 * ==========================================================
 *  app.js — the conductor of "Bill Koto Ashbe?"
 * ----------------------------------------------------------
 *  • ALL data lives in one plain object called `state`.
 *    Nothing is stored in the browser (no localStorage, no
 *    cookies) — refresh the page and you start fresh.
 *  • render…() functions turn `state` into HTML for each step.
 *  • Event listeners update `state` when the user types or taps,
 *    then refresh only the parts of the page that changed.
 *  • Helpers from other files:
 *      calculator.js → bill math        i18n.js     → words & numbers
 *      appliances.js → defaults/sizes   lookup.js   → "Find watts"
 *      animations.js → motion & drawings icons.js   → icons
 *      theme.js      → light/dark
 * ==========================================================
 */

import {
  t, setLang, getLang, detectLang, fmtNum, fmtMoney, fmtMoneyWhole, fmtUnits, parseNum, inputValue,
} from './i18n.js';
import { CATEGORIES, getCategory, SAMPLE_TARIFF, QUICK_BUDGETS } from './appliances.js';
import { calculateBill, validateTariff, computeSavingsTips } from './calculator.js';
import { lookupWattage } from './lookup.js';
import * as fx from './animations.js';
import { icon } from './icons.js';
import { downloadSlipPdf } from './pdf.js';
import { initTheme, toggleTheme, getTheme } from './theme.js';

/* ---------------- Small helpers ---------------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Make user text safe inside HTML (so "<b>" typed as a name stays plain text). */
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

let idCounter = 0;
const makeId = (prefix) => `${prefix}-${++idCounter}`;

const TIP_ICONS = { tipHours: 'clock', tipLed: 'led', tipAcDuty: 'ac', tipFridge: 'fridge', tipIron: 'iron', tipPump: 'pump', tipGeyser: 'geyser', tipFans: 'fan' };

/* ---------------- State (in memory only) ---------------- */

/** Price settings start filled with the example prices so anyone can get an answer quickly. */
function createTariff() {
  return {
    mode: 'slab',              // 'slab' (price goes up in steps) | 'simple' (one price)
    method: 'progressive',     // 'progressive' | 'whole'
    slabs: SAMPLE_TARIFF.slabs.map(([from, to, rate]) => ({ id: makeId('slab'), from, to, rate })),
    simpleRate: null,
    demand: SAMPLE_TARIFF.demand,
    meterRent: SAMPLE_TARIFF.meterRent,
    vat: SAMPLE_TARIFF.vat,
    days: SAMPLE_TARIFF.days,
  };
}

function createState() {
  return {
    step: 0,          // 0 start, 1 price, 2 appliances, 3 budget, 4 result
    maxStep: 0,
    tariff: createTariff(),
    appliances: [],   // [{ id, category, name, qty, watts, hours, days, duty, model, lookup, helpOpen }]
    budget: null,
    showTariffErrors: false,
  };
}

const state = createState();
const ui = { busy: false, liveTimer: null, tariffTimer: null, toastTimer: null, makingPdf: false };
const els = {};

const section = (n) => els.steps.querySelector(`[data-step="${n}"]`);
const findAppliance = (id) => state.appliances.find((a) => a.id === id);
const applianceName = (a) => (a && a.name && a.name.trim()) || t(`cat_${a ? a.category : 'other'}`);
const localizeVars = (vars = {}) => Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, isNum(v) ? fmtNum(v) : v]));
const sizeLabel = (size) => (size.key ? t(`size_${size.key}`) : `${fmtNum(size.watts)} ${t('wattUnit')}`);

/* ==========================================================
 *  Start-up
 * ========================================================== */

function init() {
  els.app = $('#app');
  els.steps = $('#steps');
  els.progress = $('#progress');
  els.progressMeta = $('#progress-meta');
  els.liveBar = $('#live-bar');
  els.liveUnits = $('#live-units');
  els.liveBill = $('#live-bill');
  els.liveMeter = $('#live-meter');
  els.langToggle = $('#lang-toggle');
  els.themeToggle = $('#theme-toggle');
  els.toast = $('#toast');

  $('#brand-mark').innerHTML = icon('bolt');
  els.themeToggle.innerHTML = `<span class="ti ti-sun">${icon('sun')}</span><span class="ti ti-moon">${icon('moon')}</span>`;
  els.liveMeter.innerHTML = fx.miniDiscSVG();

  setLang(detectLang());
  initTheme();
  applyLanguage();

  renderStep(0);
  section(0).hidden = false;
  renderProgress();
  bindEvents();
  fx.heroIntro(section(0));
}

function bindEvents() {
  els.steps.addEventListener('click', onStepsClick);
  els.steps.addEventListener('input', onStepsInput);
  els.steps.addEventListener('keydown', onStepsKeydown);
  // <details> "toggle" doesn't bubble, so listen in the capture phase.
  els.steps.addEventListener('toggle', onDetailsToggle, true);
  els.progress.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goto]');
    if (btn && !btn.disabled) requestStep(Number(btn.dataset.goto));
  });
  els.langToggle.addEventListener('click', onLangToggle);
  els.themeToggle.addEventListener('click', () => {
    toggleTheme(els.themeToggle);
    updateThemeLabel();
  });
}

/* ==========================================================
 *  Language
 * ========================================================== */

function applyLanguage() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.title = `${t('appName')} — ${t('titleSuffix')}`;
  $('meta[name="description"]')?.setAttribute('content', t('metaDescription'));
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  els.langToggle.dataset.lang = lang;
  els.langToggle.setAttribute('aria-label', t(lang === 'bn' ? 'langToEn' : 'langToBn'));
  updateThemeLabel();
}

function updateThemeLabel() {
  els.themeToggle.setAttribute('aria-label', t(getTheme() === 'dark' ? 'themeToLight' : 'themeToDark'));
}

/** Switching language re-draws everything instantly; all typed data stays in `state`. */
function onLangToggle() {
  setLang(getLang() === 'bn' ? 'en' : 'bn');
  applyLanguage();
  renderProgress();
  renderStep(state.step, { instant: true });
  updateLive(true);
}

/* ==========================================================
 *  Moving between steps
 * ========================================================== */

function renderProgress() {
  const { step } = state;
  const wasHidden = els.progress.hidden;
  els.progress.hidden = step === 0;
  if (wasHidden && step !== 0) fx.fadeIn(els.progress);
  const names = ['', 'stepTariff', 'stepAppliances', 'stepBudget', 'stepResult'];
  els.progressMeta.innerHTML = step
    ? `<span>${t('stepOf', { n: fmtNum(step), total: fmtNum(4) })}</span><strong>${t(names[step])}</strong>`
    : '';

  $$('.progress__step', els.progress).forEach((btn) => {
    const n = Number(btn.dataset.goto);
    btn.classList.toggle('is-done', n < step);
    btn.classList.toggle('is-current', n === step);
    if (n === step) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    btn.disabled = n > Math.max(state.maxStep, step);
  });
}

function renderStep(n, opts = {}) {
  const renderers = [renderHero, renderTariff, renderAppliances, renderBudget, renderResult];
  renderers[n](section(n), opts);
  updateLiveBar();
}

async function goTo(n) {
  if (ui.busy || n === state.step || n < 0 || n > 4) return;
  ui.busy = true;
  const dir = n > state.step ? 1 : -1;
  const from = section(state.step);
  await fx.stepOut(from, dir);
  from.hidden = true;
  fx.resetStyles(from);

  state.step = n;
  state.maxStep = Math.max(state.maxStep, n);
  const to = section(n);
  renderStep(n);
  to.hidden = false;
  renderProgress();
  window.scrollTo({ top: 0, behavior: fx.prefersReducedMotion() ? 'auto' : 'smooth' });
  $('[data-focus]', to)?.focus({ preventScroll: true });
  fx.stepIn(to, dir);
  afterEnter(n);
  ui.busy = false;
}

/** Forward checks every step in between; going back is always allowed. */
function requestStep(n) {
  if (n <= state.step) { goTo(n); return; }
  for (let s = Math.max(1, state.step); s < n; s++) {
    const isCurrent = s === state.step;
    if (!validateStep(s, isCurrent)) {
      if (!isCurrent) {
        if (s === 1) state.showTariffErrors = true;
        goTo(s);
      }
      return;
    }
  }
  goTo(n);
}

function validateStep(n, feedback) {
  if (n === 1) {
    const { valid } = validateTariff(state.tariff);
    if (!valid && feedback) {
      state.showTariffErrors = true;
      refreshTariffValidation();
      fx.shake($('#tariff-errors'));
      toast(t('fixToContinue'));
      $('[aria-invalid="true"]', section(1))?.focus();
    }
    return valid;
  }
  if (n === 2) {
    const ok = state.appliances.length > 0;
    if (!ok && feedback) {
      showError('#appl-errors', t('errNeedAppliance'));
      fx.shake($('.tiles'));
    }
    return ok;
  }
  if (n === 3) {
    const ok = isNum(state.budget) && state.budget > 0;
    if (!ok && feedback) {
      showError('#budget-errors', t('errBudget'));
      const input = $('#budget-input');
      input?.setAttribute('aria-invalid', 'true');
      fx.shake($('.budget-input-wrap'));
      input?.focus();
    }
    return ok;
  }
  return true;
}

function afterEnter(n) {
  const root = section(n);
  if (n === 0) fx.heroIntro(root);
  if (n === 1 || n === 3) fx.staggerIn($$('.panel, .step-nav', root), { delay: 0.05 });
  if (n === 2) {
    fx.staggerIn($$('.tile', root), { y: 8, gap: 0.02 });
    fx.staggerIn($$('.appl-card', root), { delay: 0.1 });
  }
  if (n === 4) playResultIntro(root);
}

function stepNavHTML({ nextLabel = t('next') } = {}) {
  return `<div class="step-nav">
    <button type="button" class="btn btn--quiet" data-action="back">${icon('back')}<span>${t('back')}</span></button>
    <button type="button" class="btn btn--primary" data-action="next"><span>${nextLabel}</span>${icon('forward')}</button>
  </div>`;
}

function stepHeadHTML(titleKey, introKey) {
  return `<div class="step-head">
    <h2 class="step-title" tabindex="-1" data-focus>${t(titleKey)}</h2>
    ${introKey ? `<p class="step-intro">${t(introKey)}</p>` : ''}
  </div>`;
}

/* ==========================================================
 *  Events (one listener per event type)
 * ========================================================== */

function onStepsClick(e) {
  const target = e.target.closest('[data-action], [data-add], [data-seg], [data-pick], [data-size]');
  if (!target || target.disabled) return;
  if (target.dataset.add) { addAppliance(target.dataset.add); return; }
  if (target.dataset.seg) { onSegment(target); return; }
  if (target.dataset.pick) { pickBudget(Number(target.dataset.pick)); return; }
  const card = target.closest('.appl-card');
  if (target.dataset.size) { pickSize(card, Number(target.dataset.size)); return; }

  switch (target.dataset.action) {
    case 'start': goTo(1); break;
    case 'next': requestStep(state.step + 1); break;
    case 'back': goTo(state.step - 1); break;
    case 'reset-sample': loadSample(); break;
    case 'add-slab': addSlab(); break;
    case 'remove-slab': removeSlab(target.closest('[data-slab-id]')); break;
    case 'delete': deleteAppliance(card); break;
    case 'inc': stepQty(card, 1); break;
    case 'dec': stepQty(card, -1); break;
    case 'lookup': runLookup(card); break;
    case 'share': shareResult(); break;
    case 'pdf': downloadSlip(target); break;
    case 'edit': goTo(2); break;
    case 'reset': startOver(); break;
    default: break;
  }
}

function onStepsInput(e) {
  const el = e.target;
  if (el.dataset.tariff) {
    state.tariff[el.dataset.tariff] = parseNum(el.value);
    scheduleTariffValidation();
  } else if (el.dataset.slabField) {
    const slab = state.tariff.slabs.find((s) => s.id === el.closest('[data-slab-id]').dataset.slabId);
    if (slab) slab[el.dataset.slabField] = parseNum(el.value);
    scheduleTariffValidation();
  } else if (el.dataset.field) {
    onApplianceInput(el);
  } else if (el.id === 'budget-input') {
    state.budget = parseNum(el.value);
    el.removeAttribute('aria-invalid');
    syncBudgetChips();
    showError('#budget-errors', '');
  }
}

function onStepsKeydown(e) {
  const el = e.target;
  if (el.classList.contains('seg__btn') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    const buttons = $$('.seg__btn', el.parentElement);
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    const next = buttons[(buttons.indexOf(el) + step + buttons.length) % buttons.length];
    next.focus();
    next.click();
  }
  if (e.key === 'Enter' && el.id === 'budget-input') { e.preventDefault(); requestStep(4); }
  if (e.key === 'Enter' && el.dataset.field === 'model') { e.preventDefault(); runLookup(el.closest('.appl-card')); }
}

/** Remember which "Don't know the watts?" boxes are open, so a language switch keeps them open. */
function onDetailsToggle(e) {
  const details = e.target;
  if (!details.classList || !details.classList.contains('watts-help')) return;
  const a = findAppliance(details.closest('.appl-card')?.dataset.id);
  if (a) a.helpOpen = details.open;
}

/* ==========================================================
 *  Toast + inline errors
 * ========================================================== */

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(ui.toastTimer);
  ui.toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 2800);
}

function showError(selector, message) {
  const box = $(selector);
  if (!box) return;
  box.innerHTML = message ? `<p class="form-error">${icon('warning')}<span>${esc(message)}</span></p>` : '';
}

/* ==========================================================
 *  Step 0 — Start screen
 * ========================================================== */

function renderHero(root) {
  root.innerHTML = `
    <div class="hero">
      <div class="hero__text">
        <p class="kicker">${t('heroKicker')}</p>
        <h1 class="hero__title" tabindex="-1" data-focus>${t('heroTitle')}</h1>
        <p class="hero__lead">${t('heroLead')}</p>
        <ol class="how">
          <li><span class="how__num">${fmtNum(1)}</span><span>${t('how1')}</span></li>
          <li><span class="how__num">${fmtNum(2)}</span><span>${t('how2')}</span></li>
          <li><span class="how__num">${fmtNum(3)}</span><span>${t('how3')}</span></li>
        </ol>
        <div class="hero__cta">
          <button type="button" class="btn btn--primary btn--lg" data-action="start"><span>${t('start')}</span>${icon('forward')}</button>
          <p class="hero__note">${t('heroNote')}</p>
        </div>
      </div>
    </div>`;
}

/* ==========================================================
 *  Step 1 — Price of electricity
 * ========================================================== */

function segmentedHTML(name, options, value, labelledBy) {
  const index = Math.max(0, options.findIndex(([v]) => v === value));
  return `<div class="seg" role="radiogroup" aria-labelledby="${labelledBy}" style="--seg-n:${options.length};--seg-i:${index}">
    <span class="seg__thumb" aria-hidden="true"></span>
    ${options.map(([v, label]) => `<button type="button" class="seg__btn" role="radio" data-seg="${name}" data-value="${v}" aria-checked="${v === value}" tabindex="${v === value ? 0 : -1}">${label}</button>`).join('')}
  </div>`;
}

function setSegment(group, value) {
  $$('.seg__btn', group).forEach((btn, i) => {
    const on = btn.dataset.value === value;
    btn.setAttribute('aria-checked', String(on));
    btn.tabIndex = on ? 0 : -1;
    if (on) group.style.setProperty('--seg-i', i);
  });
}

function numberFieldHTML(key, label, value, help = '') {
  const helpId = `f-${key}-help`;
  return `<div class="field">
    <label for="f-${key}">${label}</label>
    <input id="f-${key}" class="input" type="text" inputmode="decimal" autocomplete="off" data-tariff="${key}" value="${inputValue(value)}"${help ? ` aria-describedby="${helpId}"` : ''}>
    ${help ? `<p class="help" id="${helpId}">${help}</p>` : ''}
  </div>`;
}

/** A small drawing of a bill paper, pointing at the "units / rate" table. Pure HTML + CSS. */
function billPaperHTML() {
  const rows = SAMPLE_TARIFF.slabs.slice(0, 3)
    .map(([from, to, rate]) => `<span>${fmtNum(from)}–${fmtNum(to)}</span><span>${fmtNum(rate, 2, 2)}</span>`).join('');
  return `<figure class="paper-illus" aria-hidden="true">
    <div class="paper-illus__sheet">
      <p class="paper-illus__title">${icon('bolt')}${t('paperTitle')}</p>
      <span class="paper-illus__line w70"></span><span class="paper-illus__line w45"></span>
      <div class="paper-illus__table">
        <span class="th">${t('paperUnits')}</span><span class="th">${t('paperRate')}</span>
        ${rows}
      </div>
      <span class="paper-illus__line w60"></span><span class="paper-illus__line w35"></span>
    </div>
  </figure>`;
}

function slabRowHTML(slab, i) {
  const n = fmtNum(i + 1);
  // Column titles are shown once above the list; each box keeps a hidden label for screen readers.
  const field = (key, label, value, extra = '') => `
    <div class="field">
      <label for="${slab.id}-${key}" class="sr-only">${t('stepRowLabel', { n })}: ${label}</label>
      <input id="${slab.id}-${key}" class="input" type="text" inputmode="decimal" autocomplete="off" data-slab-field="${key}" value="${inputValue(value)}" ${extra}>
    </div>`;
  return `<div class="slab-row" data-slab-id="${slab.id}">
    <span class="slab-row__num" aria-hidden="true">${n}</span>
    <div class="slab-row__fields">
      ${field('from', t('stepFrom'), slab.from)}
      ${field('to', t('stepTo'), slab.to, `placeholder="${esc(t('stepToPlaceholder'))}"`)}
      ${field('rate', t('stepRate'), slab.rate)}
    </div>
    <button type="button" class="icon-btn" data-action="remove-slab" aria-label="${esc(t('removeStep', { n }))}">${icon('close')}</button>
  </div>`;
}

function slabBodyHTML() {
  return `
    <p class="explain">${t('stepsExplain')}</p>
    <div class="slab-head" aria-hidden="true">
      <span class="slab-head__num"></span>
      <span>${t('stepFrom')}</span><span>${t('stepTo')}</span><span>${t('stepRate')}</span>
      <span></span>
    </div>
    <div class="slab-list" id="slab-list">${state.tariff.slabs.map(slabRowHTML).join('')}</div>
    <div class="row-actions">
      <button type="button" class="btn btn--quiet btn--sm" data-action="add-slab">${icon('add')}<span>${t('addStep')}</span></button>
      <button type="button" class="btn btn--quiet btn--sm" data-action="reset-sample">${icon('refresh')}<span>${t('resetSample')}</span></button>
    </div>`;
}

function simpleBodyHTML() {
  return `<div class="simple-body">${numberFieldHTML('simpleRate', t('simpleRate'), state.tariff.simpleRate, t('simpleHelp'))}</div>`;
}

function renderTariff(root) {
  const tr = state.tariff;
  root.innerHTML = `
    ${stepHeadHTML('tariffTitle', 'tariffIntro')}
    <p class="notice">${icon('info')}<span>${t('sampleNotice')}</span></p>

    <details class="help-box">
      <summary>${icon('help')}<span>${t('whereOnBill')}</span>${icon('expand', 'chev')}</summary>
      <div class="help-box__body">${billPaperHTML()}<p>${t('whereOnBillText')}</p></div>
    </details>

    <div class="panel">
      <div class="field-group">
        <span class="group-label" id="mode-label">${t('modeLabel')}</span>
        ${segmentedHTML('mode', [['slab', t('modeSlab')], ['simple', t('modeSimple')]], tr.mode, 'mode-label')}
      </div>
      <div id="tariff-mode-body">${tr.mode === 'slab' ? slabBodyHTML() : simpleBodyHTML()}</div>
    </div>

    <div class="panel">
      <h3 class="panel-title">${t('chargesTitle')}</h3>
      <p class="panel-intro">${t('chargesIntro')}</p>
      <div class="charges-grid">
        ${numberFieldHTML('demand', t('demand'), tr.demand, t('demandHelp'))}
        ${numberFieldHTML('meterRent', t('meterRent'), tr.meterRent, t('meterRentHelp'))}
        ${numberFieldHTML('vat', t('vat'), tr.vat, t('vatHelp'))}
      </div>
      <details class="more">
        <summary>${t('moreSettings')}${icon('expand', 'chev')}</summary>
        <div class="more__body">
          <div class="field-group">
            <span class="group-label" id="method-label">${t('methodLabel')}</span>
            ${segmentedHTML('method', [['progressive', t('methodProgressive')], ['whole', t('methodWhole')]], tr.method, 'method-label')}
            <p class="help" id="method-help">${t(tr.method === 'whole' ? 'methodWholeHelp' : 'methodProgressiveHelp')}</p>
          </div>
          <div class="charges-grid">${numberFieldHTML('days', t('billingDays'), tr.days, t('billingDaysHelp'))}</div>
        </div>
      </details>
    </div>

    <div class="form-errors" id="tariff-errors" role="status" aria-live="polite"></div>
    ${stepNavHTML()}`;
  refreshTariffValidation();
}

function onSegment(btn) {
  const { seg: name, value } = btn.dataset;
  setSegment(btn.closest('.seg'), value);
  if (name === 'mode' && state.tariff.mode !== value) {
    state.tariff.mode = value;
    const body = $('#tariff-mode-body');
    body.innerHTML = value === 'slab' ? slabBodyHTML() : simpleBodyHTML();
    fx.fadeSwap(body);
    refreshTariffValidation();
  }
  if (name === 'method' && state.tariff.method !== value) {
    state.tariff.method = value;
    const help = $('#method-help');
    help.textContent = t(value === 'whole' ? 'methodWholeHelp' : 'methodProgressiveHelp');
    fx.fadeSwap(help);
  }
}

function scheduleTariffValidation() {
  clearTimeout(ui.tariffTimer);
  ui.tariffTimer = setTimeout(() => {
    state.showTariffErrors = true;
    refreshTariffValidation();
  }, 450);
}

/** Mark wrong boxes red, list plain-language messages, and dim "Next" until it's all fine. */
function refreshTariffValidation() {
  const root = section(1);
  const box = $('#tariff-errors', root);
  if (!box) return;
  const { valid, errors } = validateTariff(state.tariff);

  $$('[aria-invalid]', root).forEach((el) => el.removeAttribute('aria-invalid'));
  $('[data-action="next"]', root)?.setAttribute('aria-disabled', String(!valid));
  if (!state.showTariffErrors || valid) { box.innerHTML = ''; return; }

  errors.forEach((err) => err.fields.forEach((f) => {
    const input = f.slabId ? document.getElementById(`${f.slabId}-${f.field}`) : document.getElementById(`f-${f.field}`);
    input?.setAttribute('aria-invalid', 'true');
    if (f.field === 'days') input?.closest('details')?.setAttribute('open', '');
  }));
  const messages = [...new Set(errors.map((err) => t(err.key, localizeVars(err.vars))))];
  box.innerHTML = `<ul class="form-errors__list">${messages.map((m) => `<li>${icon('warning')}<span>${esc(m)}</span></li>`).join('')}</ul>`;
}

function addSlab() {
  const slabs = state.tariff.slabs;
  const last = slabs[slabs.length - 1];
  const slab = { id: makeId('slab'), from: last && isNum(last.to) ? last.to + 1 : null, to: null, rate: null };
  slabs.push(slab);
  const list = $('#slab-list');
  list.insertAdjacentHTML('beforeend', slabRowHTML(slab, slabs.length - 1));
  fx.springIn(list.lastElementChild);
  // If the old last step was open-ended, it now needs an "Up to" number — put the cursor there.
  const focusId = last && last.to === null ? `${last.id}-to` : `${slab.id}-${slab.from === null ? 'from' : 'to'}`;
  document.getElementById(focusId)?.focus();
  scheduleTariffValidation();
}

async function removeSlab(row) {
  if (!row) return;
  state.tariff.slabs = state.tariff.slabs.filter((s) => s.id !== row.dataset.slabId);
  await fx.collapseOut(row);
  $('#slab-list').innerHTML = state.tariff.slabs.map(slabRowHTML).join('');
  state.showTariffErrors = true;
  refreshTariffValidation();
  $('[data-action="add-slab"]')?.focus();
}

function loadSample() {
  const fresh = createTariff();
  Object.assign(state.tariff, { mode: 'slab', slabs: fresh.slabs, demand: fresh.demand, meterRent: fresh.meterRent, vat: fresh.vat, days: fresh.days });
  const root = section(1);
  renderTariff(root);
  fx.staggerIn($$('.slab-row', root), { gap: 0.04 });
  $('[data-action="reset-sample"]', root)?.focus();
  toast(t('resetSampleDone'));
}

/* ==========================================================
 *  Step 2 — Appliances
 * ========================================================== */

function newAppliance(categoryId) {
  const c = getCategory(categoryId);
  const billingDays = isNum(state.tariff.days) ? state.tariff.days : 30;
  return {
    id: makeId('app'),
    category: c.id,
    name: null,          // null = use the translated category name
    qty: 1,
    watts: c.watts,
    hours: c.hours,
    days: Math.min(c.days, billingDays),
    duty: c.duty ?? null,
    model: '',
    lookup: null,        // { watts, source, capacity?, confidence? } after "Find watts"
    helpOpen: false,
  };
}

/** A drawing of the rating sticker found on appliances, with the watts highlighted. */
function stickerHTML() {
  return `<figure class="sticker-illus" aria-hidden="true">
    <div class="sticker-illus__label">
      <span class="sticker-illus__brand">MODEL: AB-1234</span>
      <span>220-240V ~ 50Hz</span>
      <span class="sticker-illus__hl">${t('stickerRated')}: 1200W</span>
      <span class="sticker-illus__ce">CE ⏚ IP20</span>
    </div>
  </figure>`;
}

function lookupResultHTML(lookup) {
  const parts = [t('lookupSource', { src: t(`src_${lookup.source}`) })];
  if (lookup.capacity) parts.push(t('lookupCapacity', { c: esc(lookup.capacity) }));
  if (lookup.confidence) parts.push(t('lookupConfidence', { c: t(`conf_${lookup.confidence}`) }));
  return `<div class="lookup-result">
    <p class="lookup-result__w">${icon('check')}<strong>${t('lookupResult', { w: fmtNum(lookup.watts, 0) })}</strong></p>
    <p class="lookup-result__meta">${parts.join(' · ')}</p>
    <p class="lookup-result__note">${t('lookupNote')}</p>
  </div>`;
}

function lookupLoadingHTML() {
  return `<div class="lookup-loading">
    <span class="lookup-loading__bulb">${fx.bijliSVG({ decorative: true, extraClass: 'bijli--search' })}</span>
    <div><p><strong>${t('lookupSearching')}</strong><span class="dots" aria-hidden="true"><span></span><span></span><span></span></span></p>
    <p class="lookup-loading__slow">${t('lookupSlow')}</p></div>
  </div>`;
}

function sizeChipsHTML(a, c) {
  if (!c.sizes.length) return '';
  return `<div class="field-block">
    <span class="mini-label" id="${a.id}-size-label">${t('fieldSize')}</span>
    <div class="size-chips" role="group" aria-labelledby="${a.id}-size-label">
      ${c.sizes.map((s) => `<button type="button" class="size-chip" data-size="${s.watts}" aria-pressed="${a.watts === s.watts}">
        <span>${sizeLabel(s)}</span>${s.key ? `<span class="size-chip__w">${fmtNum(s.watts)}W</span>` : ''}
      </button>`).join('')}
    </div>
  </div>`;
}

function applianceCardHTML(a) {
  const c = getCategory(a.category);
  const id = a.id;
  const name = applianceName(a);
  const hours = isNum(a.hours) ? Math.min(24, Math.max(0, a.hours)) : 0;
  const hasDuty = c.duty != null;
  const input = (field, value, mode = 'decimal', extra = '') =>
    `<input id="${id}-${field}" class="input" type="text" inputmode="${mode}" autocomplete="off" data-field="${field}" value="${inputValue(value)}" ${extra}>`;

  return `<article class="appl-card" data-id="${id}" aria-label="${esc(name)}">
    <div class="appl-card__head">
      <span class="appl-card__icon">${icon(c.icon)}</span>
      <div class="field field--name">
        <label for="${id}-name" class="sr-only">${t('fieldName')}</label>
        <input id="${id}-name" class="input input--name" type="text" autocomplete="off" maxlength="40" data-field="name" value="${esc(name)}">
      </div>
      <button type="button" class="icon-btn" data-action="delete" aria-label="${esc(t('deleteAppliance', { name }))}">${icon('delete')}</button>
    </div>

    ${sizeChipsHTML(a, c)}

    <div class="appl-grid">
      <div class="field">
        <label for="${id}-qty">${t('fieldQty')}</label>
        <div class="stepper">
          <button type="button" data-action="dec" aria-label="${esc(t('decrease'))}">${icon('remove')}</button>
          ${input('qty', a.qty, 'numeric')}
          <button type="button" data-action="inc" aria-label="${esc(t('increase'))}">${icon('add')}</button>
        </div>
      </div>
      <div class="field">
        <label for="${id}-watts">${t('fieldWatts')}</label>
        ${input('watts', a.watts)}
      </div>
      <div class="field field--hours">
        <label for="${id}-hours-range">${t('fieldHours')}</label>
        <div class="hours-control">
          <input id="${id}-hours-range" class="range" type="range" min="0" max="24" step="0.5" data-field="hours" value="${hours}" style="--fill:${(hours / 24) * 100}%">
          <label for="${id}-hours" class="sr-only">${t('fieldHours')}</label>
          ${input('hours', a.hours)}
        </div>
      </div>
      <div class="field">
        <label for="${id}-days">${t('fieldDays')}</label>
        ${input('days', a.days, 'numeric')}
      </div>
      ${hasDuty ? `<div class="field">
        <label for="${id}-duty">${t('fieldDuty')}</label>
        ${input('duty', a.duty, 'decimal', `aria-describedby="${id}-duty-help"`)}
      </div>` : ''}
    </div>
    ${hasDuty ? `<p class="help help--duty" id="${id}-duty-help">${t(`dutyHelp_${c.id}`)}</p>` : ''}

    <details class="watts-help"${a.helpOpen || a.lookup ? ' open' : ''}>
      <summary>${icon('help')}<span>${t('wattsHelpToggle')}</span>${icon('expand', 'chev')}</summary>
      <div class="watts-help__body">
        <div class="watts-help__sticker">${stickerHTML()}<p>${t('stickerCaption')}</p></div>
        <div class="model-row">
          <label for="${id}-model">${t('fieldModel')}</label>
          <div class="model-input">
            <input id="${id}-model" class="input" type="text" autocomplete="off" maxlength="60" data-field="model" placeholder="${esc(t('modelPlaceholder'))}" value="${esc(a.model)}">
            <button type="button" class="btn btn--outline btn--sm" data-action="lookup">${icon('search')}<span>${t('findWatts')}</span></button>
          </div>
          <div class="lookup-out" aria-live="polite">${a.lookup ? lookupResultHTML(a.lookup) : ''}</div>
        </div>
      </div>
    </details>

    <div class="appl-card__foot">
      <span class="appl-card__kwh" data-role="kwh"></span>
      <span class="appl-card__cost" data-role="cost"></span>
    </div>
    <div class="share-track" aria-hidden="true"><span class="share-fill" data-role="share"></span></div>
  </article>`;
}

function emptyStateHTML() {
  return `<div class="empty-state">
    <span class="empty-state__plug" aria-hidden="true"><span class="plug-head"></span><span class="plug-cord"></span></span>
    <div><h3 class="empty-state__title">${t('emptyTitle')}</h3><p>${t('emptyText')}</p></div>
  </div>`;
}

function renderAppliances(root) {
  const has = state.appliances.length > 0;
  root.innerHTML = `
    ${stepHeadHTML('appliancesTitle', 'appliancesIntro')}
    <div class="tiles" role="group" aria-label="${esc(t('tilesLabel'))}">
      ${CATEGORIES.map((c) => `<button type="button" class="tile" data-add="${c.id}">
        <span class="tile__icon">${icon(c.icon)}</span>
        <span class="tile__label">${t(`cat_${c.id}`)}</span>
        <span class="tile__count" data-count-for="${c.id}" aria-hidden="true" hidden></span>
        <span class="sr-only" data-count-sr="${c.id}"></span>
      </button>`).join('')}
    </div>
    <div class="form-errors" id="appl-errors" role="status" aria-live="polite"></div>
    <div class="appl-list" id="appl-list">${state.appliances.map(applianceCardHTML).join('')}</div>
    <div id="appl-empty"${has ? ' hidden' : ''}>${emptyStateHTML()}</div>
    ${stepNavHTML()}`;
  updateTileCounts();
  updateLive(true);
}

/** Small number on each tile showing how many of that item were added. */
function updateTileCounts() {
  const counts = {};
  state.appliances.forEach((a) => { counts[a.category] = (counts[a.category] || 0) + 1; });
  $$('[data-count-for]').forEach((badge) => {
    const n = counts[badge.dataset.countFor] || 0;
    badge.hidden = n === 0;
    badge.textContent = fmtNum(n);
    badge.closest('.tile').classList.toggle('is-added', n > 0);
  });
  $$('[data-count-sr]').forEach((sr) => {
    const n = counts[sr.dataset.countSr] || 0;
    sr.textContent = n ? `, ${t('addedCount', { n: fmtNum(n) })}` : '';
  });
}

function addAppliance(categoryId) {
  const a = newAppliance(categoryId);
  state.appliances.push(a);
  $('#appl-empty').hidden = true;
  showError('#appl-errors', '');

  const list = $('#appl-list');
  list.insertAdjacentHTML('beforeend', applianceCardHTML(a));
  const card = list.lastElementChild;
  fx.springIn(card);
  card.scrollIntoView({ block: 'nearest', behavior: fx.prefersReducedMotion() ? 'auto' : 'smooth' });
  const badge = $(`[data-count-for="${categoryId}"]`);
  updateTileCounts();
  fx.pop(badge);
  updateLive();
}

async function deleteAppliance(card) {
  if (!card) return;
  const id = card.dataset.id;
  const neighbour = card.nextElementSibling || card.previousElementSibling;
  state.appliances = state.appliances.filter((a) => a.id !== id);
  updateTileCounts();
  updateLive();
  await fx.collapseOut(card);
  card.remove();

  if (!state.appliances.length) {
    const empty = $('#appl-empty');
    if (empty) { empty.hidden = false; fx.springIn(empty); }
    $('.tile')?.focus();
  } else {
    $('[data-action="delete"]', neighbour)?.focus();
  }
}

function onApplianceInput(el) {
  const card = el.closest('.appl-card');
  const a = card && findAppliance(card.dataset.id);
  if (!a) return;
  const field = el.dataset.field;

  if (field === 'name') { a.name = el.value; return; }
  if (field === 'model') { a.model = el.value; return; }

  a[field] = parseNum(el.value);
  if (field === 'hours') syncHours(card, a, el);
  if (field === 'watts') syncSizeChips(card, a);
  scheduleLive();
}

/** Tapping "1.5 ton" (etc.) fills in the watts for that size. */
function pickSize(card, watts) {
  const a = card && findAppliance(card.dataset.id);
  if (!a) return;
  a.watts = watts;
  const input = $('[data-field="watts"]', card);
  input.value = inputValue(watts);
  fx.highlight(input);
  syncSizeChips(card, a);
  updateLive();
}

function syncSizeChips(card, a) {
  $$('.size-chip', card).forEach((chip) => chip.setAttribute('aria-pressed', String(Number(chip.dataset.size) === a.watts)));
}

/** Keep the hours slider and the hours box showing the same value. */
function syncHours(card, a, source) {
  const range = $('input[type="range"][data-field="hours"]', card);
  const text = $('input[type="text"][data-field="hours"]', card);
  const h = isNum(a.hours) ? Math.min(24, Math.max(0, a.hours)) : 0;
  if (range && source !== range) range.value = String(h);
  if (text && source !== text) text.value = inputValue(h);
  range?.style.setProperty('--fill', `${(h / 24) * 100}%`);
}

function stepQty(card, delta) {
  const a = card && findAppliance(card.dataset.id);
  if (!a) return;
  a.qty = Math.min(99, Math.max(1, Math.round((isNum(a.qty) ? a.qty : 0) + delta)));
  const input = $('[data-field="qty"]', card);
  input.value = inputValue(a.qty);
  fx.pop(input);
  updateLive();
}

async function runLookup(card) {
  const a = card && findAppliance(card.dataset.id);
  if (!a) return;
  const out = $('.lookup-out', card);
  const model = (a.model || '').trim();
  if (!model) {
    out.innerHTML = `<p class="lookup-msg">${t('lookupNeedModel')}</p>`;
    $('[data-field="model"]', card)?.focus();
    return;
  }

  const btn = $('[data-action="lookup"]', card);
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  out.innerHTML = lookupLoadingHTML();

  // Short minimum wait so the "searching" state doesn't just flash.
  const [result] = await Promise.all([lookupWattage(model, a.category), wait(600)]);
  if (!state.appliances.includes(a)) return; // removed or reset while searching

  a.watts = result.watts;
  a.lookup = result;

  // The card may have been re-drawn meanwhile (e.g. language switch) — find the current one.
  const liveCard = els.steps.querySelector(`.appl-card[data-id="${a.id}"]`);
  if (!liveCard) return;
  const liveBtn = $('[data-action="lookup"]', liveCard);
  liveBtn.disabled = false;
  liveBtn.removeAttribute('aria-busy');
  const watts = $('[data-field="watts"]', liveCard);
  watts.value = inputValue(a.watts);
  fx.highlight(watts);
  syncSizeChips(liveCard, a);
  $('.lookup-out', liveCard).innerHTML = lookupResultHTML(a.lookup);
  if (document.activeElement === document.body) liveBtn.focus();
  updateLive();
}

/* ---------- Live totals (bottom bar + card footers) ---------- */

function scheduleLive() {
  clearTimeout(ui.liveTimer);
  ui.liveTimer = setTimeout(() => updateLive(), 150);
}

function updateLive(immediate = false) {
  clearTimeout(ui.liveTimer);
  const bill = calculateBill(state);
  const totalCost = bill.perAppliance.reduce((sum, p) => sum + p.cost, 0);

  bill.perAppliance.forEach((p) => {
    const card = els.steps.querySelector(`.appl-card[data-id="${p.id}"]`);
    if (!card) return;
    // The bar under each card shows its share of the bill — the costliest item gets the longest bar.
    const share = totalCost > 0 ? p.cost / totalCost : 0;
    $('[data-role="share"]', card).style.transform = `scaleX(${share.toFixed(3)})`;
    card.classList.toggle('is-costly', share >= 0.35);
    $('[data-role="cost"]', card).textContent = `${fmtMoneyWhole(p.cost)}${t('perMonth')}`;
    $('[data-role="kwh"]', card).textContent = t('applianceMonthly', { kwh: fmtUnits(p.kwh) });
  });

  fx.tweenNumber(els.liveUnits, bill.totalKwh, (v) => `${fmtUnits(v)} ${t('unitShort')}`, immediate);
  fx.tweenNumber(els.liveBill, bill.total, (v) => fmtMoney(v), immediate);

  // The meter disc spins faster when more watts are switched on.
  const watts = state.appliances.reduce((sum, a) => {
    const on = isNum(a.hours) && a.hours > 0;
    return sum + (on && isNum(a.watts) && isNum(a.qty) ? a.watts * a.qty : 0);
  }, 0);
  fx.setDiscSpeed($('.mini-disc', els.liveMeter), watts);
}

function updateLiveBar() {
  const show = state.step === 2;
  document.body.classList.toggle('has-live-bar', show);
  if (show && els.liveBar.hidden) {
    els.liveBar.hidden = false;
    fx.slideUp(els.liveBar.firstElementChild);
  } else if (!show) {
    els.liveBar.hidden = true;
  }
}

/* ==========================================================
 *  Step 3 — Budget
 * ========================================================== */

function renderBudget(root) {
  root.innerHTML = `
    ${stepHeadHTML('budgetTitle', 'budgetIntro')}
    <div class="panel budget-panel">
      <label for="budget-input" class="budget-label">${t('budgetLabel')}</label>
      <div class="budget-input-wrap">
        <span class="budget-currency" aria-hidden="true">৳</span>
        <input id="budget-input" class="input input--xl" type="text" inputmode="decimal" autocomplete="off" placeholder="${esc(t('budgetPlaceholder'))}" value="${inputValue(state.budget)}" aria-describedby="budget-errors">
      </div>
      <p class="group-label" id="quick-label">${t('quickPick')}</p>
      <div class="quick-picks" role="group" aria-labelledby="quick-label">
        ${QUICK_BUDGETS.map((v) => `<button type="button" class="pick" data-pick="${v}" aria-pressed="${state.budget === v}">${fmtMoneyWhole(v)}</button>`).join('')}
      </div>
      <div class="form-errors" id="budget-errors" role="status" aria-live="polite"></div>
    </div>
    ${stepNavHTML({ nextLabel: t('seeResult') })}`;
}

function pickBudget(value) {
  state.budget = value;
  const input = $('#budget-input');
  input.value = inputValue(value);
  input.removeAttribute('aria-invalid');
  fx.highlight(input);
  syncBudgetChips();
  showError('#budget-errors', '');
}

function syncBudgetChips() {
  $$('[data-pick]').forEach((btn) => btn.setAttribute('aria-pressed', String(state.budget === Number(btn.dataset.pick))));
}

/* ==========================================================
 *  Step 4 — Result
 * ========================================================== */

function moodFor(total, budget) {
  if (!isNum(budget) || budget <= 0) return 'worried';
  if (total <= budget) return 'relief';
  if (total <= budget * 1.3) return 'worried';
  return 'angry';
}

function nextSlabWarningHTML(bill) {
  const next = bill.nextSlab;
  if (!next || bill.totalKwh <= 0 || next.unitsAway < 0 || next.unitsAway > next.threshold * 0.15) return '';
  return `<div class="warn" role="note">
    ${icon('warning')}
    <div><p class="warn__title">${t('nextSlabTitle')}</p><p>${t('nextSlabWarn', { u: fmtUnits(next.unitsAway), r: fmtMoney(next.rate) })}</p></div>
  </div>`;
}

function breakdownRowsHTML(bill) {
  const calc = (units, rate) => `${fmtUnits(units)} × ${fmtMoney(rate)}`;
  const row = (label, detail, amount, higher = false) => `
    <tr class="${higher ? 'row--higher' : ''}">
      <th scope="row">${label}${detail ? `<span class="calc">${detail}</span>` : ''}</th>
      <td class="amount">${fmtMoney(amount)}</td>
    </tr>`;

  const rows = [];
  if (!bill.slabBreakdown.length) {
    rows.push(row(t('rowEnergy'), '', bill.energy));
  } else if (bill.mode === 'simple') {
    const r = bill.slabBreakdown[0];
    rows.push(row(t('rowEnergySimple'), calc(r.units, r.rate), r.amount));
  } else if (bill.method === 'whole') {
    const r = bill.slabBreakdown[0];
    rows.push(row(t('rowEnergyWhole', { n: fmtNum(r.index) }), calc(r.units, r.rate), r.amount, r.index > 1));
  } else {
    bill.slabBreakdown.forEach((r) => {
      const label = r.to === null
        ? t('rowStepOpen', { n: fmtNum(r.index), from: fmtNum(r.from) })
        : t('rowStep', { n: fmtNum(r.index), from: fmtNum(r.from), to: fmtNum(r.to) });
      rows.push(row(label, calc(r.units, r.rate), r.amount, r.index > 1));
    });
  }
  rows.push(row(t('rowDemand'), '', bill.demand));
  rows.push(row(t('rowMeter'), '', bill.meterRent));
  rows.push(row(t('rowVat', { p: fmtNum(bill.vatPct) }), '', bill.vat));
  return rows.join('');
}

function receiptHTML(bill, instant) {
  return `<section class="receipt" aria-labelledby="receipt-title">
    <header class="receipt__head">
      <h3 class="receipt__title" id="receipt-title">${icon('receipt')}<span>${t('receiptTitle')}</span></h3>
      <span class="receipt__days">${t('receiptDays', { days: fmtNum(state.tariff.days || 30) })}</span>
    </header>
    <div class="receipt__total">
      <span class="receipt__label">${t('totalBill')}</span>
      <span class="receipt__amount" data-count="${bill.total}" data-format="money" aria-hidden="true">${instant ? fmtMoney(bill.total) : fmtMoney(0)}</span>
      <span class="receipt__units">${t('totalUnits')}: <strong data-count="${bill.totalKwh}" data-format="units">${instant ? fmtUnits(bill.totalKwh) : fmtUnits(0)}</strong></span>
    </div>
    <div class="receipt__tear" aria-hidden="true"></div>
    <h4 class="receipt__sub">${t('breakdownTitle')}</h4>
    <table class="breakdown">
      <thead class="sr-only"><tr><th scope="col">${t('breakdownTitle')}</th><th scope="col">৳</th></tr></thead>
      <tbody>${breakdownRowsHTML(bill)}</tbody>
      <tfoot><tr><th scope="row">${t('rowTotal')}</th><td class="amount">${fmtMoney(bill.total)}</td></tr></tfoot>
    </table>
    <p class="sr-only" id="result-live" aria-live="polite"></p>
  </section>`;
}

function chartHTML(bill) {
  const items = bill.perAppliance
    .map((p) => ({ ...p, a: findAppliance(p.id) }))
    .filter((item) => item.a)
    .sort((x, y) => y.cost - x.cost);
  const max = Math.max(0, ...items.map((item) => item.cost));

  const bars = items.map((item, i) => {
    const width = max > 0 && item.cost > 0 ? Math.max((item.cost / max) * 100, 2) : 0;
    const qty = isNum(item.a.qty) && item.a.qty > 1 ? ` <span class="bar-row__qty">× ${fmtNum(item.a.qty)}</span>` : '';
    return `<li class="bar-row${i === 0 ? ' is-top' : ''}">
      <span class="bar-row__icon">${icon(getCategory(item.a.category).icon)}</span>
      <div class="bar-row__body">
        <div class="bar-row__top">
          <span class="bar-row__name">${esc(applianceName(item.a))}${qty}</span>
          <span class="bar-row__value">${fmtMoney(item.cost)}</span>
        </div>
        <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${width.toFixed(1)}%"></div></div>
      </div>
    </li>`;
  }).join('');
  return `<section class="panel"><h3 class="panel-title">${t('chartTitle')}</h3><ol class="bar-chart">${bars}</ol></section>`;
}

function tipsHTML() {
  const tips = computeSavingsTips(state);
  const body = tips.length
    ? `<ol class="tips">${tips.map((tip) => `
        <li class="tip">
          <span class="tip__icon">${icon(TIP_ICONS[tip.key] || 'tips')}</span>
          <div>
            <p class="tip__text">${esc(t(tip.key, { name: tip.applianceId ? applianceName(findAppliance(tip.applianceId)) : '' }))}</p>
            <p class="tip__save">${t('tipSave', { amt: fmtMoney(tip.saved) })}</p>
          </div>
        </li>`).join('')}</ol>`
    : `<p class="tips-none">${t('tipsNone')}</p>`;
  return `<section class="panel"><h3 class="panel-title">${t('tipsTitle')}</h3>${body}</section>`;
}

function renderResult(root, { instant = false } = {}) {
  const bill = calculateBill(state);
  const mood = moodFor(bill.total, state.budget);
  const subKey = { relief: 'moodReliefSub', worried: 'moodWorriedSub', angry: 'moodAngrySub' }[mood];
  const sub = t(subKey, { amt: fmtMoney(Math.abs(bill.total - state.budget)), b: fmtMoney(state.budget) });

  root.innerHTML = `
    ${stepHeadHTML('resultTitle')}
    <section class="mood mood--${mood}" data-mood="${mood}" aria-labelledby="mood-title">
      <div class="mood__art">
        ${fx.bijliSVG({ label: t('mascotAlt'), mood })}
        <span class="mood__disc">${fx.miniDiscSVG()}</span>
      </div>
      <div class="mood__text">
        <p class="mood__title" id="mood-title">${t(`mood_${mood}`)}</p>
        <p class="mood__sub">${sub}</p>
      </div>
    </section>
    ${nextSlabWarningHTML(bill)}
    <div class="result-grid">
      ${receiptHTML(bill, instant)}
      <div class="result-side">${chartHTML(bill)}${tipsHTML()}</div>
    </div>
    <div class="result-actions">
      <button type="button" class="btn btn--primary" data-action="pdf">${icon('download')}<span>${t('downloadPdf')}</span></button>
      <button type="button" class="btn btn--outline" data-action="share">${icon('share')}<span>${t('share')}</span></button>
      <button type="button" class="btn btn--outline" data-action="edit">${icon('edit')}<span>${t('edit')}</span></button>
      <button type="button" class="btn btn--quiet" data-action="reset">${icon('refresh')}<span>${t('startOver')}</span></button>
    </div>
    <p class="disclaimer">${t('disclaimer')}</p>`;

  // Fill the screen-reader message a moment later so it is announced.
  setTimeout(() => {
    const live = $('#result-live', root);
    const stop = getLang() === 'bn' ? '। ' : '. ';
    if (live) live.textContent = `${t('totalBill')}: ${fmtMoney(bill.total)}${stop}${t('totalUnits')}: ${fmtUnits(bill.totalKwh)}${stop}${t(`mood_${mood}`)}`;
  }, 400);

  if (instant) fx.playMood($('.mood', root), mood, { instant: true });
}

function playResultIntro(root) {
  $$('[data-count]', root).forEach((el) => {
    const format = el.dataset.format === 'money' ? fmtMoney : fmtUnits;
    fx.countUp(el, Number(el.dataset.count), format, 1.2);
  });
  fx.staggerIn($$('.breakdown tbody tr, .breakdown tfoot tr', root), { y: 8, gap: 0.06, delay: 0.2 })
    .then(() => fx.flashRows($$('.row--higher', root)));
  fx.growBars($$('.bar-fill', root));
  fx.staggerIn($$('.tip', root), { y: 10, gap: 0.08, delay: 0.35 });
  const card = $('.mood', root);
  fx.playMood(card, card.dataset.mood);
}

/* ---------- Bill slip (PDF download) ---------- */

/**
 * The printable slip: usage per item + the bill, on plain white paper.
 * It's built as normal HTML in a hidden box (#pdf-slip), then pdf.js
 * turns it into a PDF. Colours are fixed (not the dark theme) so it prints well.
 */
function slipHTML() {
  const bill = calculateBill(state);
  const mood = moodFor(bill.total, state.budget);
  const lang = getLang();
  const date = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const usageRows = bill.perAppliance.map((p) => {
    const a = findAppliance(p.id);
    if (!a) return '';
    return `<tr>
      <td>${esc(applianceName(a))}</td>
      <td class="num">${fmtNum(isNum(a.qty) ? a.qty : 0)}</td>
      <td class="num">${fmtNum(isNum(a.watts) ? a.watts : 0)}</td>
      <td class="num">${fmtNum(isNum(a.hours) ? a.hours : 0, 1)}</td>
      <td class="num">${fmtNum(isNum(a.days) ? a.days : 0)}</td>
      <td class="num">${fmtUnits(p.kwh)}</td>
      <td class="num">${fmtMoney(p.cost)}</td>
    </tr>`;
  }).join('');

  const tips = computeSavingsTips(state);
  const tipsList = tips.length
    ? `<ol class="slip__tips">${tips.map((tip) => `<li data-break>${esc(t(tip.key, { name: tip.applianceId ? applianceName(findAppliance(tip.applianceId)) : '' }))} <strong>${t('tipSave', { amt: fmtMoney(tip.saved) })}</strong></li>`).join('')}</ol>`
    : `<p>${t('tipsNone')}</p>`;

  return `<div class="slip" lang="${lang}">
    <header class="slip__head" data-break>
      <div class="slip__brand">
        <span class="slip__mark">${icon('bolt')}</span>
        <div><p class="slip__app">${t('appName')}</p><p class="slip__doc">${t('slipTitle')}</p></div>
      </div>
      <div class="slip__meta"><p>${t('slipDate', { date })}</p><p>${t('receiptDays', { days: fmtNum(state.tariff.days || 30) })}</p></div>
    </header>

    <section class="slip__summary" data-break>
      <div class="slip__big"><span>${t('totalBill')}</span><strong>${fmtMoney(bill.total)}</strong></div>
      <div><span>${t('totalUnits')}</span><strong>${fmtUnits(bill.totalKwh)}</strong></div>
      <div><span>${t('slipBudget')}</span><strong>${fmtMoney(state.budget)}</strong></div>
      <div class="slip__status slip__status--${mood}"><span>${t('slipStatus')}</span><strong>${t(`mood_${mood}`)}</strong></div>
    </section>

    <h2 class="slip__h" data-break>${t('slipUsageTitle')}</h2>
    <table class="slip__table">
      <thead><tr>
        <th>${t('colItem')}</th><th class="num">${t('colQty')}</th><th class="num">${t('colWatts')}</th>
        <th class="num">${t('colHours')}</th><th class="num">${t('colDays')}</th><th class="num">${t('colUnits')}</th><th class="num">${t('colCost')}</th>
      </tr></thead>
      <tbody>${usageRows}</tbody>
      <tfoot><tr><th colspan="5">${t('rowTotal')}</th><td class="num">${fmtUnits(bill.totalKwh)}</td><td class="num">${fmtMoney(bill.energy)}</td></tr></tfoot>
    </table>

    <h2 class="slip__h" data-break>${t('breakdownTitle')}</h2>
    <table class="slip__table slip__table--bill">
      <tbody>${breakdownRowsHTML(bill)}</tbody>
      <tfoot><tr><th scope="row">${t('rowTotal')}</th><td class="amount">${fmtMoney(bill.total)}</td></tr></tfoot>
    </table>

    <h2 class="slip__h" data-break>${t('tipsTitle')}</h2>
    ${tipsList}

    <footer class="slip__foot" data-break>${t('slipFooter')}</footer>
  </div>`;
}

async function downloadSlip(btn) {
  if (ui.makingPdf) return;
  ui.makingPdf = true;
  const label = $('span', btn);
  const oldText = label.textContent;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  label.textContent = t('pdfMaking');

  const holder = $('#pdf-slip');
  holder.innerHTML = slipHTML();
  const month = new Date().toISOString().slice(0, 7);
  try {
    await downloadSlipPdf(holder, `bill-koto-ashbe-${month}.pdf`);
    toast(t('pdfDone'));
  } catch {
    // Offline or the PDF tools didn't load: the print window can "Save as PDF" the same slip.
    toast(t('pdfFailed'));
    await wait(600);
    window.print();
  } finally {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    label.textContent = oldText;
    ui.makingPdf = false;
  }
}

/* ---------- Share & start again ---------- */

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* try the old way below */ }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

async function shareResult() {
  const bill = calculateBill(state);
  const mood = moodFor(bill.total, state.budget);
  const text = t('shareText', {
    total: fmtMoney(bill.total),
    units: fmtUnits(bill.totalKwh),
    budget: fmtMoney(state.budget),
    mood: t(`mood_${mood}`),
  });
  if (navigator.share) {
    try {
      await navigator.share({ title: t('appName'), text });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user closed the share sheet
    }
  }
  toast(t((await copyText(text)) ? 'copied' : 'copyFailed'));
}

async function startOver() {
  if (ui.busy || !window.confirm(t('confirmReset'))) return;
  ui.busy = true;
  const current = section(state.step);
  await fx.resetOut(current);
  current.hidden = true;
  fx.resetStyles(current);

  Object.assign(state, createState()); // language & theme live elsewhere and stay as they are
  fx.tweenNumber(els.liveUnits, 0, (v) => `${fmtUnits(v)} ${t('unitShort')}`, true);
  fx.tweenNumber(els.liveBill, 0, fmtMoney, true);

  const hero = section(0);
  renderStep(0);
  hero.hidden = false;
  renderProgress();
  window.scrollTo({ top: 0 });
  $('[data-focus]', hero)?.focus({ preventScroll: true });
  fx.heroIntro(hero);
  ui.busy = false;
  toast(t('resetDone'));
}

/* ---------------- Go! ---------------- */
init();
