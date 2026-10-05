/*
 * ==========================================================
 *  animations.js — all motion + the drawings
 * ----------------------------------------------------------
 *  Motion (motion.dev, the plain-JS version of Framer Motion)
 *  is loaded from a CDN in index.html as the global `Motion`.
 *
 *  Safety nets, so the app ALWAYS works:
 *   • No Motion? The same animations run with the browser's
 *     built-in Web Animations API, or simply jump to the end.
 *   • "Reduce motion" turned on in the phone/computer settings?
 *     All movement is dropped; only quick fades remain.
 *
 *  Motion here is deliberately calm: short springs and fades
 *  that help you follow what changed — nothing flashy.
 *
 *  Drawings (plain SVG, coloured by CSS so they follow the theme):
 *   miniDiscSVG() – the small spinning meter disc
 *   bijliSVG()    – "Bijli", the light-bulb character on the result
 * ==========================================================
 */

/* ---------------- Basics ---------------- */

const reduceQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

export const prefersReducedMotion = () => !!(reduceQuery && reduceQuery.matches);

/** The Motion library, or null if the CDN script didn't load. */
const getMotion = () => {
  const M = typeof window !== 'undefined' ? window.Motion : null;
  return M && typeof M.animate === 'function' ? M : null;
};

const EASE_OUT = [0.22, 1, 0.36, 1];
const SPRING_CSS = 'cubic-bezier(0.34, 1.3, 0.64, 1)';
const TRANSFORM_KEYS = ['x', 'y', 'scale', 'scaleX', 'rotate'];

const pick = (value, i) => (Array.isArray(value) ? value[Math.min(i, value.length - 1)] : value);
const withUnit = (key, v) => {
  if (typeof v === 'string') return v;
  if (key === 'x' || key === 'y') return `${v}px`;
  if (key === 'rotate') return `${v}deg`;
  return String(v);
};

/** CSS transform string from {x, y, scale, scaleX, rotate} keyframes at step i. */
function transformAt(frames, i) {
  const parts = [];
  if ('x' in frames) parts.push(`translateX(${withUnit('x', pick(frames.x, i))})`);
  if ('y' in frames) parts.push(`translateY(${withUnit('y', pick(frames.y, i))})`);
  if ('scale' in frames) parts.push(`scale(${pick(frames.scale, i)})`);
  if ('scaleX' in frames) parts.push(`scaleX(${pick(frames.scaleX, i)})`);
  if ('rotate' in frames) parts.push(`rotate(${withUnit('rotate', pick(frames.rotate, i))})`);
  return parts.join(' ');
}

function isIdentityEnd(frames) {
  const end = (k, d) => (k in frames ? pick(frames[k], Infinity) : d);
  const zero = (v) => v === 0 || v === '0' || v === '0px' || v === '0%';
  return zero(end('x', 0)) && zero(end('y', 0)) && Number(end('scale', 1)) === 1
    && Number(end('scaleX', 1)) === 1 && zero(end('rotate', 0));
}

/** Write the last keyframe as inline styles (fallback path). */
function applyFinal(el, frames) {
  if (TRANSFORM_KEYS.some((k) => k in frames)) {
    el.style.transform = isIdentityEnd(frames) ? '' : transformAt(frames, Infinity);
  }
  Object.keys(frames).forEach((key) => {
    if (!TRANSFORM_KEYS.includes(key)) el.style[key] = String(pick(frames[key], Infinity));
  });
}

/** Turn whatever Motion returns into a Promise that always settles (with a safety timeout). */
function toPromise(controls, seconds) {
  const safety = new Promise((resolve) => setTimeout(resolve, (seconds + 1.5) * 1000));
  let done = Promise.resolve();
  if (controls && controls.finished) done = controls.finished;
  else if (controls && typeof controls.then === 'function') done = new Promise((resolve) => controls.then(resolve, resolve));
  return Promise.race([done.catch(() => {}), safety]);
}

/** Fallback: the browser's own Web Animations API. */
function nativeAnimate(el, frames, { duration, delay, easing }) {
  if (typeof el.animate !== 'function') { applyFinal(el, frames); return Promise.resolve(); }
  const count = Math.max(1, ...Object.values(frames).map((v) => (Array.isArray(v) ? v.length : 1)));
  const hasTransform = TRANSFORM_KEYS.some((k) => k in frames);
  const keyframes = [];
  for (let i = 0; i < count; i++) {
    const kf = {};
    if (hasTransform) kf.transform = transformAt(frames, i);
    Object.keys(frames).forEach((key) => { if (!TRANSFORM_KEYS.includes(key)) kf[key] = pick(frames[key], i); });
    keyframes.push(kf);
  }
  try {
    const anim = el.animate(keyframes, { duration: duration * 1000, delay: delay * 1000, easing, fill: 'both' });
    return anim.finished.then(() => { applyFinal(el, frames); anim.cancel(); }).catch(() => {});
  } catch {
    applyFinal(el, frames);
    return Promise.resolve();
  }
}

/** Remove inline transform/opacity so CSS is in charge again (keeps :active press states working). */
export function clearInline(el) {
  if (!el) return;
  el.style.transform = '';
  el.style.opacity = '';
}
export const resetStyles = clearInline;

/**
 * The one helper everything else uses.
 * frames: { opacity: [0, 1], x: [20, 0], y, scale, scaleX, rotate, height, ... }
 * opts:   { duration, delay, ease, spring, stiffness, damping, cleanup }
 */
export function animateEl(el, frames, opts = {}) {
  if (!el) return Promise.resolve();
  let { duration = 0.4, delay = 0, spring = false } = opts;
  const { ease = EASE_OUT, stiffness = 300, damping = 30, cleanup = false } = opts;
  let f = frames;

  if (prefersReducedMotion()) {
    f = Object.fromEntries(Object.entries(frames).filter(([key]) => !TRANSFORM_KEYS.includes(key)));
    if (!Object.keys(f).length) return Promise.resolve();
    duration = Math.min(duration, 0.2);
    delay = Math.min(delay, 0.1);
    spring = false;
  }

  let promise = null;
  const M = getMotion();
  if (M) {
    try {
      const options = spring ? { type: 'spring', stiffness, damping, delay } : { duration, delay, ease };
      promise = toPromise(M.animate(el, f, options), (spring ? 1 : duration) + delay);
    } catch {
      promise = null;
    }
  }
  if (!promise) {
    const easing = spring ? SPRING_CSS : (Array.isArray(ease) ? `cubic-bezier(${ease.join(',')})` : 'linear');
    promise = nativeAnimate(el, f, { duration: spring ? Math.max(duration, 0.5) : duration, delay, easing });
  }
  return cleanup ? promise.then(() => clearInline(el)) : promise;
}

/* ---------------- Reusable effects ---------------- */

export const fadeIn = (el) => animateEl(el, { opacity: [0, 1] }, { duration: 0.25, cleanup: true });

export const fadeSwap = (el) => animateEl(el, { opacity: [0, 1], y: [6, 0] }, { duration: 0.28, cleanup: true });

export const pop = (el) => animateEl(el, { scale: [1, 1.06, 1] }, { duration: 0.28, cleanup: true });

export function springIn(el) {
  if (!el) return Promise.resolve();
  el.style.opacity = '0';
  return animateEl(el, { opacity: [0, 1], y: [16, 0] }, { spring: true, cleanup: true });
}

export function slideUp(el) {
  if (!el) return Promise.resolve();
  el.style.opacity = '0';
  return animateEl(el, { opacity: [0, 1], y: [40, 0] }, { spring: true, cleanup: true });
}

/** Elements appear one after another (Motion's stagger()). */
export function staggerIn(elements, { y = 12, gap = 0.05, delay = 0 } = {}) {
  const list = Array.from(elements || []).filter(Boolean);
  if (!list.length) return Promise.resolve();
  list.forEach((el) => { el.style.opacity = '0'; });

  const M = getMotion();
  if (M && typeof M.stagger === 'function' && !prefersReducedMotion()) {
    try {
      const controls = M.animate(list, { opacity: [0, 1], y: [y, 0] }, {
        type: 'spring', stiffness: 320, damping: 32, delay: M.stagger(gap, { startDelay: delay }),
      });
      return toPromise(controls, 1 + delay + gap * list.length).then(() => list.forEach(clearInline));
    } catch { /* fall through */ }
  }
  return Promise.all(list.map((el, i) => animateEl(el, { opacity: [0, 1], y: [y, 0] }, { spring: true, delay: delay + i * gap })))
    .then(() => list.forEach(clearInline));
}

/** Slide out, then close the gap it leaves (deleting a card or a price step). */
export async function collapseOut(el) {
  if (!el) return;
  if (prefersReducedMotion()) {
    await animateEl(el, { opacity: [1, 0] }, { duration: 0.15 });
    return;
  }
  await animateEl(el, { opacity: [1, 0], x: [0, -24] }, { duration: 0.18, ease: [0.4, 0, 1, 1] });
  const styles = getComputedStyle(el);
  el.style.overflow = 'hidden';
  await animateEl(el, {
    height: [`${el.offsetHeight}px`, '0px'],
    marginTop: [styles.marginTop, '0px'],
    marginBottom: [styles.marginBottom, '0px'],
  }, { duration: 0.22 });
}

/** A short "no" shake for forms that need fixing. Skipped under reduced motion. */
export const shake = (el, amount = 6) => animateEl(el, { x: [0, -amount, amount, -amount * 0.6, amount * 0.6, 0] }, { duration: 0.36, ease: 'linear', cleanup: true });

/** Flash an input that was just filled in for the user. */
export function highlight(input) {
  if (!input) return;
  input.classList.remove('just-filled');
  void input.offsetWidth; // restart the CSS animation
  input.classList.add('just-filled');
}

/* ---------------- Step transitions ---------------- */

export const stepOut = (el, dir) => animateEl(el, { opacity: [1, 0], x: [0, -24 * dir] }, { duration: 0.16, ease: [0.4, 0, 1, 1] });

export function stepIn(el, dir) {
  if (!el) return Promise.resolve();
  el.style.opacity = '0';
  return animateEl(el, { opacity: [0, 1], x: [32 * dir, 0] }, { spring: true, stiffness: 340, damping: 34, cleanup: true });
}

export const resetOut = (el) => animateEl(el, { opacity: [1, 0] }, { duration: 0.2 });

/** First screen: text lines appear one after another. */
export function heroIntro(root) {
  if (!root) return;
  staggerIn(root.querySelectorAll('.hero__text > *'), { y: 14, gap: 0.06 });
}

/* ---------------- Numbers ---------------- */

function rafTween(from, to, seconds, onUpdate, token = {}) {
  return new Promise((resolve) => {
    const start = performance.now();
    const ms = seconds * 1000;
    const frame = (now) => {
      if (token.cancelled) { resolve(); return; }
      const p = Math.min(1, (now - start) / ms);
      onUpdate(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/** Big result numbers count up from 0. */
export function countUp(el, to, format, duration = 1.2) {
  if (!el) return Promise.resolve();
  if (prefersReducedMotion()) { el.textContent = format(to); return Promise.resolve(); }
  const finish = () => { el.textContent = format(to); };
  const M = getMotion();
  if (M) {
    try {
      const controls = M.animate(0, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = format(v); } });
      return toPromise(controls, duration).then(finish);
    } catch { /* use requestAnimationFrame below */ }
  }
  return rafTween(0, to, duration, (v) => { el.textContent = format(v); }).then(finish);
}

/** Live totals glide to their new value. Fast typing cancels the previous glide. */
export function tweenNumber(el, to, format, immediate = false) {
  if (!el) return;
  const from = typeof el._value === 'number' ? el._value : 0;
  el._value = to;
  if (el._tween) el._tween.cancelled = true;
  if (immediate || prefersReducedMotion() || Math.abs(to - from) < 0.005) {
    el.textContent = format(to);
    return;
  }
  const token = { cancelled: false };
  el._tween = token;
  rafTween(from, to, 0.4, (v) => { el.textContent = format(v); }, token)
    .then(() => { if (!token.cancelled) el.textContent = format(to); });
}

/* ---------------- Result effects ---------------- */

/** Bars grow from the left, one after another. */
export function growBars(fills) {
  if (prefersReducedMotion()) return;
  fills.forEach((fill, i) => {
    fill.style.transform = 'scaleX(0)';
    animateEl(fill, { scaleX: [0, 1] }, { duration: 0.8, delay: 0.2 + i * 0.07, cleanup: true });
  });
}

/** Rows for the costlier price steps blink red once. */
export function flashRows(rows) {
  rows.forEach((row, i) => {
    setTimeout(() => {
      row.classList.add('is-flashing');
      row.addEventListener('animationend', () => row.classList.remove('is-flashing'), { once: true });
    }, i * 140);
  });
}

/**
 * Bijli's reaction on the result, then a calm idle loop (CSS).
 *  relief  → eyes close, a slow relieved breath
 *  worried → light flickers, sweat drop, small wobble
 *  angry   → turns red, steam puffs, the card shakes once (400 ms), meter disc spins fast
 * Everything settles within about 2 seconds.
 */
export function playMood(card, mood, { instant = false } = {}) {
  if (!card) return Promise.resolve();
  const svg = card.querySelector('.bijli');
  const body = svg && svg.querySelector('.bijli-body');
  const halo = svg && svg.querySelector('.bijli-halo');
  const sweat = svg && svg.querySelector('.bijli-sweat');
  const puffs = svg ? Array.from(svg.querySelectorAll('.puff')) : [];
  const disc = card.querySelector('.mini-disc');
  if (svg) svg.dataset.mood = mood;
  card.classList.remove('is-idle');

  const idleSpeed = { relief: 150, worried: 500, angry: 900 }[mood] || 300;
  const settle = () => {
    [body, halo, sweat, ...puffs].forEach(clearInline);
    card.classList.add('is-idle');
    setDiscSpeed(disc, idleSpeed);
  };
  if (instant || prefersReducedMotion()) { settle(); return Promise.resolve(); }

  setDiscSpeed(disc, mood === 'angry' ? 'wild' : 600);
  let anims;
  if (mood === 'relief') {
    anims = [
      animateEl(body, { scale: [1, 1.08, 0.97, 1.03, 1] }, { duration: 1.8, delay: 0.3, ease: [0.45, 0, 0.55, 1] }),
      animateEl(halo, { opacity: [0.2, 0.7, 0.35], scale: [0.9, 1.15, 1] }, { duration: 1.6, delay: 0.3 }),
    ];
  } else if (mood === 'worried') {
    anims = [
      animateEl(halo, { opacity: [0.35, 0.05, 0.6, 0.1, 0.5, 0.3] }, { duration: 1, delay: 0.2, ease: 'linear' }),
      animateEl(sweat, { y: [-6, 16], opacity: [0, 1, 0] }, { duration: 1.4, delay: 0.5 }),
      animateEl(body, { rotate: [0, -6, 6, -4, 4, 0] }, { duration: 1.3, delay: 0.3, ease: [0.45, 0, 0.55, 1] }),
    ];
  } else {
    anims = [
      shake(card, 8),
      animateEl(body, { scale: [1, 1.08, 1] }, { duration: 0.6, delay: 0.1 }),
      ...puffs.map((puff, i) => animateEl(puff, { y: [6, -16], scale: [0.5, 1.2], opacity: [0, 1, 0] }, { duration: 1.1, delay: 0.2 + i * 0.18 })),
    ];
  }
  return Promise.all(anims).then(settle);
}

/* ---------------- Meter discs ---------------- */

/** More watts → faster disc. 'wild' for the angry mood. 0 watts → disc stops. */
export function setDiscSpeed(svgEl, watts) {
  if (!svgEl) return;
  if (watts === 'wild') {
    svgEl.dataset.idle = 'false';
    svgEl.style.setProperty('--spin-dur', '0.25s');
    return;
  }
  const w = Math.max(0, Number(watts) || 0);
  svgEl.dataset.idle = String(w <= 0);
  if (w > 0) svgEl.style.setProperty('--spin-dur', `${Math.max(0.3, 6 / (1 + w / 400)).toFixed(2)}s`);
}

/* ---------------- Drawings (SVG strings, coloured by CSS) ---------------- */

/** Small top-down meter disc for the live bar and the result. */
export function miniDiscSVG() {
  return `<svg class="mini-disc" viewBox="0 0 40 40" aria-hidden="true" focusable="false" data-idle="true">
    <circle class="md-ring" cx="20" cy="20" r="17"/>
    <g class="spokes">
      <line x1="20" y1="7" x2="20" y2="33"/><line x1="7" y1="20" x2="33" y2="20"/>
      <circle class="md-mark" cx="20" cy="9.5" r="3"/>
    </g>
    <circle class="md-hub" cx="20" cy="20" r="2.6"/>
  </svg>`;
}

/**
 * Bijli — an original light-bulb character, drawn flat.
 * mood: 'neutral' | 'relief' | 'worried' | 'angry' — CSS shows the matching face.
 */
export function bijliSVG({ label = '', mood = 'neutral', decorative = false, extraClass = '' } = {}) {
  const a11y = decorative || !label ? 'aria-hidden="true" focusable="false"' : `role="img" aria-label="${label}"`;
  return `<svg class="bijli ${extraClass}" viewBox="-4 -8 128 156" data-mood="${mood}" ${a11y}>
    <circle class="bijli-halo" cx="60" cy="60" r="56"/>
    <g class="bijli-steam">
      <circle class="puff" cx="42" cy="6" r="7"/><circle class="puff" cx="60" cy="0" r="8"/><circle class="puff" cx="78" cy="6" r="7"/>
    </g>
    <g class="bijli-body">
      <path class="bijli-glass" d="M60 14 C84 14 102 32 102 56 C102 72 94 82 86 90 C81 95 79 100 79 106 L79 110 L41 110 L41 106 C41 100 39 95 34 90 C26 82 18 72 18 56 C18 32 36 14 60 14 Z"/>
      <path class="bijli-shine" d="M36 44 C38 34 45 27 54 25"/>
      <g class="bijli-base">
        <rect x="40" y="110" width="40" height="9" rx="3"/><rect x="42" y="120" width="36" height="8" rx="3"/><rect x="49" y="129" width="22" height="8" rx="4"/>
      </g>
      <g class="bijli-face">
        <g class="eyes-open"><circle cx="47" cy="58" r="4.5"/><circle cx="73" cy="58" r="4.5"/></g>
        <g class="eyes-closed"><path d="M41 59 Q47 64 53 59"/><path d="M67 59 Q73 64 79 59"/></g>
        <g class="brows brows-angry"><path d="M39 46 L53 52"/><path d="M81 46 L67 52"/></g>
        <g class="brows brows-worried"><path d="M40 50 L52 45"/><path d="M80 50 L68 45"/></g>
        <path class="mouth mouth-smile" d="M50 72 Q60 80 70 72"/>
        <path class="mouth mouth-worried" d="M49 77 Q54.5 72 60 77 Q65.5 82 71 77"/>
        <path class="mouth mouth-angry" d="M50 80 Q60 71 70 80"/>
      </g>
      <path class="bijli-sweat" d="M95 30 Q101 40 95 44 Q89 40 95 30 Z"/>
    </g>
  </svg>`;
}
