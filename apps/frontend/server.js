require('zone.js/dist/zone-node');

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const domino = require('domino');
const http = require('http');
const https = require('https');
const { APP_BASE_HREF } = require('@angular/common');
const { ngExpressEngine } = require('@nguniversal/express-engine');
const { provideModuleMap } = require('@nguniversal/module-map-ngfactory-loader');
const { REQUEST, RESPONSE } = require('@nguniversal/express-engine/tokens');
const { createProxyMiddleware } = require('http-proxy-middleware');

const DIST_FOLDER = path.join(process.cwd(), 'dist', 'id-card-app');
const SERVER_BUNDLE = path.join(process.cwd(), 'dist', 'id-card-app-server', 'main');
const INDEX_HTML = path.join(DIST_FOLDER, 'index.html');
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const BACKEND_URL = (process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:8099').replace(/\/+$/, '');
const SCRAPER_URL = (process.env.SCRAPER_URL || 'http://scraper:5000').replace(/\/+$/, '');
const MODEL_API_URL = (process.env.MODEL_API_URL || 'http://host.docker.internal:8000').replace(/\/+$/, '');
const SSR_RENDER_TIMEOUT_MS = process.env.SSR_RENDER_TIMEOUT_MS ? Number(process.env.SSR_RENDER_TIMEOUT_MS) : 8000;
const SSR_SNAPSHOT_TIMEOUT_MS = process.env.SSR_SNAPSHOT_TIMEOUT_MS ? Number(process.env.SSR_SNAPSHOT_TIMEOUT_MS) : 700;
const SSR_SNAPSHOT_CACHE_TTL_MS = process.env.SSR_SNAPSHOT_CACHE_TTL_MS ? Number(process.env.SSR_SNAPSHOT_CACHE_TTL_MS) : 120000;
const ssrSnapshotCache = new Map();
const KNOWN_FRONTEND_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/Home\/?$/,
  /^\/login\/?$/,
  /^\/live-cricket-score\/?$/,
  /^\/matches\/?$/,
  /^\/live-score\/?$/,
  /^\/live-score\/today\/?$/,
  /^\/live-score\/ipl\/?$/,
  /^\/live-score\/archive\/?$/,
  /^\/live-score\/archive\/\d+\/?$/,
  /^\/cricket-schedule\/today\/?$/,
  /^\/cricket-schedule\/ipl-2026\/?$/,
  /^\/players\/?$/,
  /^\/player\/[^/]+\/[^/]+\/?$/,
  /^\/teams\/?$/,
  /^\/teams\/[^/]+\/[^/]+\/?$/,
  /^\/series\/?$/,
  /^\/series\/[^/]+\/[^/]+\/?$/,
  /^\/series\/[^/]+\/[^/]+\/table\/?$/,
  /^\/privacy-policy\/?$/,
  /^\/terms-of-service\/?$/,
  /^\/about\/?$/,
  /^\/contact\/?$/,
  /^\/dashboard\/?$/,
  /^\/add-service\/?$/,
  /^\/football\/?$/,
  /^\/add-customer\/?$/,
  /^\/customer-list\/?$/,
  /^\/add-fuller\/?$/,
  /^\/fuller-list\/?$/,
  /^\/bet-market\/[^/]+\/?$/,
  /^\/tennis\/?$/,
  /^\/tennis\/atp\/ranking\/?$/,
  /^\/tennis\/wta\/ranking\/?$/,
  /^\/account\/bet-history\/?$/,
  /^\/account\/profit-loss\/?$/,
  /^\/scraping\/?$/,
  /^\/logout\/?$/,
  /^\/scorecard\/?$/,
  /^\/banner\/?$/,
  /^\/match-intelligence\/.+\/?$/,
  /^\/cric-live\/.+\/?$/
];

function installDominoGlobals() {
  const template = fs.existsSync(INDEX_HTML) ? fs.readFileSync(INDEX_HTML).toString() : '<html><head></head><body><app-root></app-root></body></html>';
  const win = domino.createWindow(template);
  const storage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    get length() { return 0; }
  };

  global.window = win;
  global.__SSR__ = true;
  global.document = win.document;
  global.navigator = win.navigator;
  global.HTMLElement = win.HTMLElement;
  global.HTMLImageElement = win.HTMLImageElement;
  global.HTMLIFrameElement = win.HTMLIFrameElement;
  global.HTMLVideoElement = win.HTMLVideoElement;
  global.Node = win.Node;
  global.Event = win.Event;
  global.KeyboardEvent = win.KeyboardEvent;
  global.MouseEvent = win.MouseEvent;
  global.getComputedStyle = win.getComputedStyle.bind(win);
  global.localStorage = storage;
  global.sessionStorage = storage;
  global.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  global.window.localStorage = storage;
  global.window.sessionStorage = storage;
  global.window.__SSR__ = true;
  global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.window.matchMedia = global.window.matchMedia || (() => ({
    matches: false,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  }));
}

function createApiProxy() {
  return createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    ws: true,
    logLevel: process.env.PROXY_LOG_LEVEL || 'warn',
    pathRewrite: (proxyPath) => {
      if (/^\/api\/(v1|poll)(\/|$)/.test(proxyPath)) {
        return proxyPath;
      }
      return proxyPath.replace(/^\/api/, '') || '/';
    }
  });
}

function applyRouteCacheHeaders(req, res) {
  if (/^\/cric-live\//.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=55');
    res.setHeader('CDN-Cache-Control', 'public, max-age=5, stale-while-revalidate=55');
    res.setHeader('Surrogate-Control', 'public, max-age=5, stale-while-revalidate=55');
    res.setHeader('X-SSR-Cache-State', 'live');
    return;
  }

  if (req.path === '/' || req.path === '/Home' || req.path === '/matches') {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
}

function moveTransferStateBeforeBundles(html) {
  const statePattern = /<script id="crickzen-app-state"[^>]*>[\s\S]*?<\/script>/i;
  const stateMatch = html.match(statePattern);
  if (!stateMatch) {
    return html;
  }

  const withoutState = html.replace(stateMatch[0], '');
  const bundlePattern = /<script[^>]+src="runtime\.[^"]+"[^>]*><\/script>/i;
  const bundleMatch = bundlePattern.exec(withoutState);
  if (!bundleMatch || bundleMatch.index === undefined) {
    return html;
  }

  return withoutState.slice(0, bundleMatch.index) + stateMatch[0] + withoutState.slice(bundleMatch.index);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCaseSlugToken(value) {
  const token = String(value || '').trim();
  if (!token) {
    return '';
  }
  if (/^(odi|t20|t20i|ipl|wpl|bbl|bblw|wc)$/i.test(token)) {
    return token.toUpperCase();
  }
  if (/^[a-z0-9]{1,4}$/i.test(token)) {
    return token.toUpperCase();
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function titleCaseSeriesSlugToken(value) {
  const token = String(value || '').trim();
  if (/^\d+(st|nd|rd|th)$/i.test(token)) {
    return token.toLowerCase();
  }
  if (/^(the|men|women|match|tour|cup|league|tournament)$/i.test(token)) {
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  }
  return titleCaseSlugToken(token);
}

function parseCanonicalMatchSlug(pathname) {
  let decodedPath = String(pathname || '');
  try {
    decodedPath = decodeURIComponent(decodedPath);
  } catch (_) {
    // Keep the original request path when malformed escaping is present.
  }

  const match = decodedPath.match(/^\/cric-live\/([^/?#]+?)(?:\/(?:live|commentary|scorecard|match-scorecard|match-details|info|lineups|report|match-report))?\/?$/i);
  const slug = match && match[1] ? match[1] : '';
  if (!slug || slug.indexOf('-vs-') === -1) {
    return null;
  }

  const parts = slug.split('-').filter(Boolean);
  const vsIndex = parts.indexOf('vs');
  if (vsIndex <= 0 || vsIndex >= parts.length - 1) {
    return null;
  }

  const ordinalIndex = parts.findIndex((part, index) => index > vsIndex && /^\d+(st|nd|rd|th)$/i.test(part));
  const team2End = ordinalIndex > vsIndex ? ordinalIndex : Math.min(parts.length, vsIndex + 2);
  const team1 = parts.slice(0, vsIndex).map(titleCaseSlugToken).join(' ');
  const team2 = parts.slice(vsIndex + 1, team2End).map(titleCaseSlugToken).join(' ');
  const seriesTokens = (ordinalIndex > -1 ? parts.slice(ordinalIndex) : parts.slice(team2End))
    .join('-')
    .replace(/-?match-updates-[a-z0-9]+$/i, '')
    .split('-')
    .filter(Boolean);
  const series = seriesTokens.map(titleCaseSeriesSlugToken).join(' ');

  return {
    slug,
    team1,
    team2,
    teams: team1 && team2 ? `${team1} vs ${team2}` : 'Cricket Match',
    series
  };
}

function fetchJson(url, timeoutMs) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_) {
      resolve(null);
      return;
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const request = client.get(parsed, { timeout: timeoutMs, headers: { Accept: 'application/json' } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (_) {
          resolve(null);
        }
      });
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(null));
  });
}

function cleanSnapshotText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function fetchCanonicalMatchSnapshot(match) {
  if (!match || !match.slug) {
    return null;
  }

  const cached = ssrSnapshotCache.get(match.slug);
  if (cached && Date.now() - cached.createdAt < SSR_SNAPSHOT_CACHE_TTL_MS) {
    return cached.value;
  }

  const infoUrl = `${BACKEND_URL}/cricket-data/match-info/get?url=${encodeURIComponent(match.slug)}`;
  const data = await fetchJson(infoUrl, SSR_SNAPSHOT_TIMEOUT_MS);
  if (!data || typeof data !== 'object') {
    return null;
  }

  const snapshot = {
    series: cleanSnapshotText(data.match_name || data.series_name),
    venue: cleanSnapshotText(data.venue),
    scheduledAt: cleanSnapshotText(data.match_date || data.start_date),
    toss: cleanSnapshotText(data.toss_info),
    status: cleanSnapshotText(data.match_status || data.status)
  };
  ssrSnapshotCache.set(match.slug, { createdAt: Date.now(), value: snapshot });
  return snapshot;
}

function buildCanonicalMatchFallbackHtml(req, snapshot) {
  const match = parseCanonicalMatchSlug(req.path);
  if (!match) {
    return null;
  }

  const canonicalPath = `/cric-live/${match.slug}`;
  const canonicalUrl = `https://www.crickzen.com${canonicalPath}`;
  const series = cleanSnapshotText(snapshot && snapshot.series) || match.series;
  const title = series
    ? `${match.teams} Cricket Match Score and Updates, ${series} | Crickzen`
    : `${match.teams} Cricket Match Score and Updates | Crickzen`;
  const description = series
    ? `Follow ${match.teams} score, match updates, commentary, and scorecard from ${series} on Crickzen.`
    : `Follow ${match.teams} score, match updates, commentary, and scorecard on Crickzen.`;
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: match.teams,
    url: canonicalUrl,
    competitor: [
      { '@type': 'SportsTeam', name: match.team1 },
      { '@type': 'SportsTeam', name: match.team2 }
    ]
  }).replace(/</g, '\\u003c');
  const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8')
    // The application shell has a generic description. Remove it before
    // injecting the fallback head so a crawler receives one authoritative
    // description instead of competing generic and match-specific tags.
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="robots" content="index,follow">`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    `<script type="application/ld+json">${structuredData}</script>`
  ].join('');
  const body = `<main id="canonical-match-ssr-fallback" data-ssr-fallback="canonical-match">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/live-score">Live Cricket Scores</a>${series ? ` <span aria-hidden="true">/</span> <span>${escapeHtml(series)}</span>` : ''}</nav>
    <h1>${escapeHtml(match.teams)} Cricket Match Score and Updates</h1>
    ${series ? `<p>${escapeHtml(series)}</p>` : ''}
    ${snapshot && snapshot.scheduledAt ? `<p>Scheduled: ${escapeHtml(snapshot.scheduledAt)}</p>` : ''}
    ${snapshot && snapshot.venue ? `<p>Venue: ${escapeHtml(snapshot.venue)}</p>` : ''}
    ${snapshot && snapshot.toss ? `<p>${escapeHtml(snapshot.toss)}</p>` : ''}
    <p>Match data is temporarily loading. Score, commentary, and scorecard updates will appear shortly.</p>
    <p><a href="${canonicalPath}">${escapeHtml(match.teams)} match centre</a> · <a href="/live-score">Live cricket scores</a> · <a href="/cricket-schedule/today">Today’s cricket schedule</a></p>
  </main>`;

  return indexHtml
    .replace(/<title>[^<]*<\/title>/i, head)
    .replace(/<app-root><\/app-root>/i, `<app-root>${body}</app-root>`);
}

async function sendSsrFallback(req, res, routeStatus, reason) {
  const routeMatch = routeStatus === 200 ? parseCanonicalMatchSlug(req.path) : null;
  const startedAt = Date.now();
  const snapshot = routeMatch ? await fetchCanonicalMatchSnapshot(routeMatch) : null;
  const canonicalFallback = routeMatch && buildCanonicalMatchFallbackHtml(req, snapshot);
  if (canonicalFallback) {
    console.error('[SSR] Canonical match fallback', { url: req.originalUrl, reason, snapshot: snapshot ? 'backend' : 'route', fallbackMs: Date.now() - startedAt });
    res.setHeader('X-SSR-Fallback', 'canonical-match');
    res.setHeader('X-SSR-Fallback-Level', snapshot ? 'snapshot' : 'route');
    res.status(200).send(canonicalFallback);
    return;
  }

  res.status(routeStatus).sendFile(INDEX_HTML);
}

function isKnownFrontendRoute(pathname) {
  return KNOWN_FRONTEND_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

installDominoGlobals();

const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require(SERVER_BUNDLE);
const app = express();
const apiProxy = createApiProxy();

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
  noSniff: false,
  referrerPolicy: false
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'frontend-ssr' });
});

app.use(['/robots.txt', '/sitemap.xml', '/sitemaps'], createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  logLevel: process.env.PROXY_LOG_LEVEL || 'warn'
}));

app.use('/token', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  logLevel: process.env.PROXY_LOG_LEVEL || 'warn'
}));

app.use('/api', apiProxy);

app.use('/prediction-api', createProxyMiddleware({
  target: MODEL_API_URL,
  changeOrigin: true,
  logLevel: process.env.PROXY_LOG_LEVEL || 'warn',
  pathRewrite: { '^/prediction-api': '' }
}));

app.use('/scraper', createProxyMiddleware({
  target: SCRAPER_URL,
  changeOrigin: true,
  logLevel: process.env.PROXY_LOG_LEVEL || 'warn',
  pathRewrite: { '^/scraper': '' }
}));

app.engine('html', ngExpressEngine({
  bootstrap: AppServerModuleNgFactory,
  providers: [
    provideModuleMap(LAZY_MODULE_MAP)
  ]
}));

app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

app.get('*.*', express.static(DIST_FOLDER, {
  index: false,
  maxAge: '1y'
}));

app.get('*', (req, res) => {
  const routeStatus = isKnownFrontendRoute(req.path) ? 200 : 404;

  if (path.extname(req.path) && routeStatus !== 200) {
    res.status(404).send('Not found');
    return;
  }

  if (routeStatus === 200) {
    applyRouteCacheHeaders(req, res);
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }

  let completed = false;
  const fallbackTimer = setTimeout(() => {
    if (completed || res.headersSent) {
      return;
    }

    completed = true;
    console.error('[SSR] Render timed out', { url: req.originalUrl, timeoutMs: SSR_RENDER_TIMEOUT_MS });
    sendSsrFallback(req, res, routeStatus, 'timeout');
  }, SSR_RENDER_TIMEOUT_MS);

  res.render('index', {
    req: req,
    res: res,
    providers: [
      { provide: APP_BASE_HREF, useValue: req.baseUrl || '/' },
      { provide: REQUEST, useValue: req },
      { provide: RESPONSE, useValue: res }
    ]
  }, (err, html) => {
    if (completed) {
      return;
    }

    completed = true;
    clearTimeout(fallbackTimer);

    if (err) {
      console.error('[SSR] Render failed', {
        url: req.originalUrl,
        error: err.message,
        stack: err.stack
      });
      sendSsrFallback(req, res, routeStatus, 'render-error');
      return;
    }
    res.status(routeStatus).send(moveTransferStateBeforeBundles(html));
  });
});

const server = app.listen(PORT, () => {
  console.log(`[frontend] Angular SSR listening on http://localhost:${PORT}`);
});

server.on('upgrade', apiProxy.upgrade);
