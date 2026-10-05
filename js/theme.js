/*
 * ==========================================================
 *  theme.js — day (light) and night (dark) colours
 * ----------------------------------------------------------
 *  • Light: white + green.  Dark: black + white + neon green.
 *  • The app ALWAYS starts in light mode (we don't follow the
 *    phone setting and nothing is saved — refresh = light).
 *  • toggleTheme() flips <html data-theme="light|dark">. Every
 *    colour in styles.css is a CSS variable that changes with
 *    that attribute, and CSS transitions fade between them.
 *  • The sun icon turns away and the moon turns in (Motion);
 *    CSS gives the same end state if Motion didn't load.
 *  • The phone's status-bar colour (<meta name="theme-color">)
 *    is updated to match.
 * ==========================================================
 */

const META_COLORS = { light: '#FFFFFF', dark: '#000000' };
let theme = 'light';

export const getTheme = () => theme;

function apply(next) {
  theme = next;
  document.documentElement.setAttribute('data-theme', next);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLORS[next]);
}

export function initTheme() {
  apply('light');
}

/** Sun rotates and shrinks away while the moon rotates in (and back). */
function morphIcon(button, toDark) {
  const M = window.Motion;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!M || typeof M.animate !== 'function' || reduce || !button) return;
  const sun = button.querySelector('.ti-sun');
  const moon = button.querySelector('.ti-moon');
  const shown = { rotate: 0, scale: 1, opacity: 1 };
  const hiddenSun = { rotate: 90, scale: 0.3, opacity: 0 };
  const hiddenMoon = { rotate: -90, scale: 0.3, opacity: 0 };
  const pair = (from, to) => Object.fromEntries(Object.keys(from).map((k) => [k, [from[k], to[k]]]));
  try {
    M.animate(sun, toDark ? pair(shown, hiddenSun) : pair(hiddenSun, shown), { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
    M.animate(moon, toDark ? pair(hiddenMoon, shown) : pair(shown, hiddenMoon), { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
  } catch { /* CSS transitions take over */ }
}

/** Flip between light and dark. Returns the new theme name. */
export function toggleTheme(button) {
  const next = theme === 'light' ? 'dark' : 'light';
  morphIcon(button, next === 'dark');
  apply(next);
  return next;
}
