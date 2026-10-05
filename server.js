/*
 * ==========================================================
 *  server.js — run the WHOLE app on your computer, including
 *  the AI "Find wattage" lookup. No npm install needed.
 * ----------------------------------------------------------
 *      node server.js            → http://localhost:3000
 *
 *  • Serves the website files (index.html, css/, js/, icons/).
 *  • Runs api/lookup.js for POST /api/lookup, just like Vercel.
 *  • Reads GEMINI_API_KEY from .env.local (or .env) in this folder.
 *  • Never serves hidden files (like .env.local), so your key
 *    can't be downloaded from the browser.
 *
 *  Needs Node.js 18 or newer (for built-in fetch).
 * ==========================================================
 */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lookupHandler from './api/lookup.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Load KEY=value lines from .env.local / .env (only if not already set).
for (const file of ['.env.local', '.env']) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

/** Give the API handler the same res.status(...).json(...) helpers Vercel provides. */
function withVercelHelpers(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

async function handleApi(req, res) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10000) { res.writeHead(413).end(); return; } // tiny requests only
  }
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  await lookupHandler(req, withVercelHelpers(res));
}

async function handleStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // Refuse hidden files/folders (.env.local, .git, .claude …) and anything outside this folder.
  if (urlPath.split('/').some((part) => part.startsWith('.'))) { res.writeHead(404).end('Not found'); return; }
  const filePath = path.normalize(path.join(ROOT, urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}

http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://x').pathname;
  if (pathname === '/api/lookup') handleApi(req, res).catch(() => { if (!res.headersSent) res.writeHead(500).end(); });
  else handleStatic(req, res);
}).listen(PORT, () => {
  console.log(`⚡ Bill Koto Ashbe? running at http://localhost:${PORT}`);
  console.log(process.env.GEMINI_API_KEY ? '   AI wattage lookup: ON' : '   AI wattage lookup: OFF (add GEMINI_API_KEY to .env.local)');
});
