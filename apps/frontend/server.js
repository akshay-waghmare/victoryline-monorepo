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
// The catalogue snapshot is the bounded source of truth for schedule-first
// upcoming SSR. A 700 ms budget turns normal backend contention into a 503;
// keep it bounded, but long enough for a cold H2/Redis read behind Caddy.
const SSR_SNAPSHOT_TIMEOUT_MS = process.env.SSR_SNAPSHOT_TIMEOUT_MS ? Number(process.env.SSR_SNAPSHOT_TIMEOUT_MS) : 2500;
const SSR_SNAPSHOT_CACHE_TTL_MS = process.env.SSR_SNAPSHOT_CACHE_TTL_MS ? Number(process.env.SSR_SNAPSHOT_CACHE_TTL_MS) : 120000;
const SSR_LIVE_SNAPSHOT_MAX_AGE_MS = process.env.SSR_LIVE_SNAPSHOT_MAX_AGE_MS ? Number(process.env.SSR_LIVE_SNAPSHOT_MAX_AGE_MS) : 180000;
const SSR_RETAINED_ENTITY_TIMEOUT_MS = process.env.SSR_RETAINED_ENTITY_TIMEOUT_MS ? Number(process.env.SSR_RETAINED_ENTITY_TIMEOUT_MS) : 1200;
const ssrSnapshotCache = new Map();
// Availability must never downgrade an indexable match page to generic copy.
// Keep the last complete match document for this SSR process until a newer
// canonical snapshot replaces it.
const ssrLastKnownRichSnapshot = new Map();
const ssrRenderedMatchDocumentCache = new Map();
const SSR_RENDERED_MATCH_DOCUMENT_TTL_MS = process.env.SSR_RENDERED_MATCH_DOCUMENT_TTL_MS ? Number(process.env.SSR_RENDERED_MATCH_DOCUMENT_TTL_MS) : 120000;
const KNOWN_FRONTEND_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/Home\/?$/,
  /^\/login\/?$/,
  /^\/live-cricket-score\/?$/,
  /^\/matches\/?$/,
  /^\/prediction\/?$/,
  /^\/how-it-works\/?$/,
  /^\/history\/?$/,
  /^\/history\/[^/]+\/?$/,
  /^\/creator-packs\/?$/,
  /^\/partners\/?$/,
  /^\/media-kit\/?$/,
  /^\/developers\/?$/,
  /^\/share\/[^/]+\/?$/,
  /^\/embed\/[^/]+\/?$/,
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
  /^\/series\/[^/]+\/[^/]+\/stats\/?$/,
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

function applyRetainedEntitySsrLinks(html, navigation) {
  if (!html || !navigation || !navigation.series || !navigation.series.externalId || !navigation.series.name) {
    return html;
  }
  const seriesHref = `/series/${encodeURIComponent(navigation.series.externalId)}/${String(navigation.series.name)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
  // Restrict replacement to the small canonical-intelligence entity nav. The
  // navigation payload was accepted only after exact-series and in-standings
  // checks, so this cannot manufacture a route from a partial match record.
  return html.replace(
    /(<nav[^>]+aria-label="Related match entities"[^>]*>[\s\S]*?<a[^>]+href=")[^"]+("[^>]*>Tournament table &amp; stats<\/a>)/i,
    `$1${seriesHref}$2`
  );
}

function schemaEventStatusForLifecycle(lifecycle) {
  switch (lifecycle) {
    case 'live':
    case 'innings-break': return 'https://schema.org/EventInProgress';
    case 'completed': return 'https://schema.org/EventCompleted';
    case 'abandoned': return 'https://schema.org/EventCancelled';
    default: return 'https://schema.org/EventScheduled';
  }
}

// Angular SSR can use delayed match-info hydration for its page schema. The
// backend canonical snapshot is the shared lifecycle authority, so apply its
// resolved phase to the final HTML before it reaches a crawler. This keeps the
// human SSR label and SportsEvent status aligned with catalogue and sitemap.
function applyCanonicalSnapshotToSsrHtml(html, snapshot) {
  if (!html || !isRichCanonicalSnapshot(snapshot)) {
    return html;
  }
  const lifecycle = deriveSnapshotLifecycle(snapshot);
  const eventStatus = schemaEventStatusForLifecycle(lifecycle);
  const scriptPattern = /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
  const normalized = html.replace(scriptPattern, (whole, open, raw, close) => {
    try {
      const data = JSON.parse(raw);
      if (data && data['@type'] === 'SportsEvent') {
        data.eventStatus = eventStatus;
        return open + JSON.stringify(data).replace(/</g, '\\u003c') + close;
      }
    } catch (_) {
      // Keep an unrelated or malformed JSON-LD block untouched.
    }
    return whole;
  });
  let parityHtml = normalized;
  if (lifecycle === 'innings-break') {
    parityHtml = parityHtml
      .replace(/>\s*Upcoming match\s*</gi, '>Innings break<')
      .replace(/>\s*Match completed\s*</gi, '>Innings break<');
  }

  // A live SSR render can complete with the match shell and JSON-LD already
  // present while match-info arrives just after the first Angular template
  // pass. Keep the crawler-facing answer deterministic by applying the same
  // backend snapshot used for lifecycle/schema parity whenever the component
  // did not emit its block yet. Browser hydration can then reuse the same
  // authoritative text instead of exposing a blank answer surface.
  if (!/id=["']canonical-match-aeo["']/i.test(parityHtml)) {
    const canonicalSlug = cleanSnapshotText(snapshot.canonicalSlug || snapshot.slug);
    const parsedMatch = canonicalSlug ? parseCanonicalMatchSlug(`/cric-live/${canonicalSlug}`) : null;
    const match = applySnapshotMatchIdentity(parsedMatch, snapshot);
    const summary = match ? lifecycleSummary(match, snapshot) : null;
    const aeoBlock = match && summary ? buildCanonicalMatchAeoFallbackHtml(match, snapshot, summary) : '';
    if (aeoBlock) {
      parityHtml = parityHtml.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, (heading) => heading + aeoBlock);
    }
  }

  return parityHtml;
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

function parseSeriesRequest(pathname) {
  const match = String(pathname || '').match(/^\/series\/([^/]+)\/([^/]+)(?:\/(table|stats))?\/?$/i);
  if (!match) {
    return null;
  }

  let externalId = match[1];
  try {
    externalId = decodeURIComponent(externalId);
  } catch (_) {
    // Keep the encoded route token when it is malformed.
  }

  return {
    externalId,
    slug: match[2],
    section: (match[3] || 'matches').toLowerCase()
  };
}

function titleCaseSeriesRouteSlug(value) {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((token) => {
      if (/^(ipl|psl|bbl|cpl|sa20|t20i?|odi|t10)$/i.test(token)) {
        return token.toUpperCase();
      }
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

function seriesPayloadRows(detail) {
  const rows = [];
  const snapshots = detail && Array.isArray(detail.standings) ? detail.standings : [];
  snapshots.forEach((snapshot) => {
    const payload = snapshot && snapshot.payload;
    if (Array.isArray(payload)) {
      payload.forEach((row) => rows.push(row));
    } else if (payload && Array.isArray(payload.rows)) {
      payload.rows.forEach((row) => rows.push(row));
    }
  });

  const unique = [];
  const seen = new Set();
  rows.forEach((row) => {
    const key = String(row && (row.teamExternalId || row.externalId || row.teamName || row.Team || row.teamCode) || '').trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  });
  return unique;
}

function seriesRowValue(row, keys) {
  for (let index = 0; index < keys.length; index += 1) {
    const value = row && row[keys[index]];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function seriesSlug(value) {
  return String(value || 'series')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'series';
}

function canonicalSeriesMatchHref(row) {
  const rawUrl = String(row && (row.url || row.matchUrl || '') || '');
  const segments = rawUrl.split('/').filter(Boolean);
  const slug = segments.reverse().find((segment) => /-vs-/.test(segment) && /-match-updates-[A-Za-z0-9]+$/i.test(segment));
  return slug ? `/cric-live/${slug}` : '';
}

function seriesMatchLabel(row, href) {
  const team1 = seriesRowValue(row, ['team1Name', 'team1', 'teamA']);
  const team2 = seriesRowValue(row, ['team2Name', 'team2', 'teamB']);
  if (team1 && team2) {
    return `${team1} vs ${team2} match centre`;
  }
  const slug = String(href || '').replace(/^\/cric-live\//, '').replace(/-match-updates-[A-Za-z0-9]+$/i, '');
  return `${titleCaseSeriesRouteSlug(slug)} match centre`;
}

async function fetchSeriesProfileFallbackData(seriesRequest) {
  if (!seriesRequest || !seriesRequest.externalId || seriesRequest.externalId === 'current') {
    return null;
  }

  const externalId = encodeURIComponent(seriesRequest.externalId);
  const requests = [
    fetchJsonResponse(`${BACKEND_URL}/crawler/player-stats/series?externalId=${externalId}`, 3000),
    fetchJsonResponse(`${BACKEND_URL}/crawler/player-stats/series/standings?externalId=${externalId}`, 3000)
  ];
  if (seriesRequest.section === 'matches') {
    requests.push(fetchJsonResponse(`${BACKEND_URL}/cricket-data/match-cohorts`, 5000));
  }

  const responses = await Promise.all(requests);
  const detail = responses[0] && responses[0].data;
  const standings = responses[1] && responses[1].data;
  const series = (detail && detail.series) || (standings && standings.series);
  const name = String(series && series.name || titleCaseSeriesRouteSlug(seriesRequest.slug)).trim();
  if (!name) {
    return null;
  }

  const matches = [];
  const matchResponse = responses[2] && responses[2].data;
  if (matchResponse && typeof matchResponse === 'object') {
    ['live', 'upcoming', 'recent', 'archive'].forEach((cohort) => {
      const rows = Array.isArray(matchResponse[cohort]) ? matchResponse[cohort] : [];
      rows.forEach((row) => {
        const rawUrl = String(row && row.url || '').toLowerCase();
        if (rawUrl.indexOf(seriesRequest.slug.toLowerCase()) === -1) {
          return;
        }
        const href = canonicalSeriesMatchHref(row);
        if (href && !matches.some((item) => item.href === href)) {
          matches.push({ href, label: seriesMatchLabel(row, href), cohort });
        }
      });
    });
  }

  const stats = detail && Array.isArray(detail.stats) ? detail.stats.filter((snapshot) => snapshot && snapshot.payload) : [];
  return {
    externalId: seriesRequest.externalId,
    slug: seriesRequest.slug,
    section: seriesRequest.section,
    name,
    rows: seriesPayloadRows(standings || detail),
    stats,
    matches: matches.slice(0, 12)
  };
}

function buildSeriesProfileFallbackHtml(req, data) {
  if (!data) {
    return null;
  }

  const section = data.section;
  const seriesPath = `/series/${encodeURIComponent(data.externalId)}/${data.slug}`;
  const canonicalPath = section === 'matches' ? seriesPath : `${seriesPath}/${section}`;
  const canonicalUrl = `https://www.crickzen.com${canonicalPath}`;
  const heading = section === 'table'
    ? `${data.name} Points Table & Standings`
    : section === 'stats' ? `${data.name} Team Stats` : `${data.name} Fixtures, Results & Schedule`;
  const description = section === 'table'
    ? `Current ${data.name} points table and standings with team positions, results and points where supplied.`
    : section === 'stats'
      ? `Current ${data.name} team statistics and series data from Crickzen.`
      : `Live, upcoming and recent ${data.name} fixtures, results and match details on Crickzen.`;
  const answer = `${data.name} tracks fixtures, results, points table and team statistics on Crickzen.`;
  const tabs = `<nav aria-label="Series sections">
    <a href="${escapeHtml(seriesPath)}">Matches</a>
    <a href="${escapeHtml(`${seriesPath}/table`)}">Points table</a>
    <a href="${escapeHtml(`${seriesPath}/stats`)}">Team stats</a>
  </nav>`;
  let content = `<p>${escapeHtml(answer)}</p>`;

  if (section === 'table') {
    if (data.rows.length === 0) {
      content += `<h2>${escapeHtml(data.name)} points table unavailable</h2><p>The source has not supplied a current standings payload.</p>`;
    } else {
      content += `<h2>${escapeHtml(data.name)} points table</h2><p>The current points table lists ${data.rows.length} teams with supplied played, win, loss, net run rate and points fields.</p>`;
      content += '<table><thead><tr><th>Team</th><th>Played</th><th>Won</th><th>Lost</th><th>NRR</th><th>Points</th></tr></thead><tbody>';
      data.rows.forEach((row) => {
        const teamName = seriesRowValue(row, ['teamName', 'Team', 'name', 'teamCode']) || 'Team';
        const teamId = seriesRowValue(row, ['teamExternalId', 'externalId', 'id']);
        const teamHref = teamId ? `/teams/${encodeURIComponent(teamId)}/${seriesSlug(teamName)}` : '';
        const teamCell = teamHref ? `<a href="${escapeHtml(teamHref)}">${escapeHtml(teamName)}</a>` : escapeHtml(teamName);
        content += `<tr><td>${teamCell}</td><td>${escapeHtml(seriesRowValue(row, ['P', 'played']))}</td><td>${escapeHtml(seriesRowValue(row, ['W', 'won']))}</td><td>${escapeHtml(seriesRowValue(row, ['L', 'lost']))}</td><td>${escapeHtml(seriesRowValue(row, ['Nrr', 'NRR', 'nrr']))}</td><td>${escapeHtml(seriesRowValue(row, ['Pts', 'points']))}</td></tr>`;
      });
      content += '</tbody></table>';
    }
  } else if (section === 'stats') {
    content += `<h2>${escapeHtml(data.name)} team statistics</h2><p>${data.stats.length > 0 ? `Team statistics for ${escapeHtml(data.name)} are available below from the current series data payload.` : `Team statistics for ${escapeHtml(data.name)} are unavailable because the source has not supplied a current stats payload.`}</p>`;
  } else {
    content += `<h2>${escapeHtml(data.name)} fixtures and results</h2>`;
    if (data.matches.length === 0) {
      content += `<p>No live, upcoming or recent ${escapeHtml(data.name)} matches are currently available in the Crickzen catalogue.</p>`;
    } else {
      content += `<p>${escapeHtml(data.name)} currently lists ${data.matches.length} canonical match pages. Open a match for its score, details and lifecycle state.</p><ul>`;
      data.matches.forEach((match) => {
        content += `<li><a href="${escapeHtml(match.href)}">${escapeHtml(match.label)}</a></li>`;
      });
      content += '</ul>';
    }
  }

  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: heading,
    url: canonicalUrl,
    description
  }).replace(/</g, '\\u003c');
  const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8').replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  const head = [
    `<title>${escapeHtml(heading)} | Crickzen</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta name="robots" content="index,follow">',
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    `<meta property="og:title" content="${escapeHtml(heading)} | Crickzen">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    `<script type="application/ld+json">${structuredData}</script>`
  ].join('');
  const body = `<main id="series-profile-ssr-fallback" data-ssr-fallback="series-profile"><nav aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/series">Series</a> <span aria-hidden="true">/</span> <span>${escapeHtml(data.name)}</span></nav><h1>${escapeHtml(heading)}</h1>${tabs}<section aria-label="Series answer">${content}</section></main>`;
  return indexHtml
    .replace(/<title>[^<]*<\/title>/i, head)
    .replace(/<app-root><\/app-root>/i, `<app-root>${body}</app-root>`);
}

function fetchJsonResponse(url, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_) {
      finish({ status: null, data: null, timedOut: false });
      return;
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const request = client.get(parsed, { timeout: timeoutMs, headers: { Accept: 'application/json' } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          finish({ status: response.statusCode, data: JSON.parse(body), timedOut: false });
        } catch (_) {
          finish({ status: response.statusCode, data: null, timedOut: false });
        }
      });
    });
    request.on('timeout', () => {
      request.destroy();
      finish({ status: null, data: null, timedOut: true });
    });
    request.on('error', () => finish({ status: null, data: null, timedOut: false }));
  });
}

function cleanSnapshotText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return /^(null|undefined|no (?:match|venue|data|toss)(?: .*)?)$/i.test(text) ? '' : text;
}

function cleanSnapshotIdentityText(value) {
  const text = cleanSnapshotText(value);
  // Lifecycle records can occasionally carry the last score-state in their
  // series/venue fields.  It is safer to use route identity than publish it
  // as an event name or location.
  return /(?:\b\d+[-/]\d+\b|\b\d{1,3}b\b|\brain delay\b)/i.test(text) ? '' : text;
}

function formatSnapshotSchedule(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

async function fetchCanonicalMatchSnapshot(match) {
  if (!match || !match.slug) {
    return null;
  }

  const cached = ssrSnapshotCache.get(match.slug);
  if (cached && Date.now() - cached.createdAt < SSR_SNAPSHOT_CACHE_TTL_MS) {
    return cached.value;
  }

  const snapshotUrl = `${BACKEND_URL}/cricket-data/canonical-match-snapshot?slug=${encodeURIComponent(match.slug)}`;
  const response = await fetchJsonResponse(snapshotUrl, SSR_SNAPSHOT_TIMEOUT_MS);
  if (response.status === 404) {
    const invalid = { validity: 'invalid' };
    ssrSnapshotCache.set(match.slug, { createdAt: Date.now(), value: invalid });
    return invalid;
  }
  if (response.status < 200 || response.status >= 300 || !response.data || typeof response.data !== 'object') {
    const retained = ssrLastKnownRichSnapshot.get(match.slug);
    return retained ? Object.assign({}, retained, { source: 'last-known-rich-snapshot', retained: true }) : { validity: 'unknown' };
  }

  const data = response.data;
  const snapshot = {
    validity: 'valid',
    team1: cleanSnapshotIdentityText(data.team1),
    team2: cleanSnapshotIdentityText(data.team2),
    series: cleanSnapshotIdentityText(data.series),
    venue: cleanSnapshotIdentityText(data.venue),
    scheduledAt: cleanSnapshotIdentityText(data.scheduledLabel),
    scheduledAtMs: Number(data.scheduledAt) || null,
    toss: cleanSnapshotText(data.toss),
    status: cleanSnapshotText(data.status),
    result: cleanSnapshotText(data.finalResult || data.result),
    lastKnownState: cleanSnapshotText(data.lastKnownState),
    score: cleanSnapshotText(data.score),
    overs: data.overs === null || data.overs === undefined || data.overs === '' ? null : String(data.overs),
    battingTeam: cleanSnapshotText(data.battingTeam),
    stateUpdatedAt: Number(data.stateUpdatedAt || data.snapshotTimestamp) || null,
    source: cleanSnapshotText(data.source)
  };
  snapshot.canonicalSlug = cleanSnapshotText(data.canonicalSlug);
  if (!snapshot.scheduledAt) {
    snapshot.scheduledAt = formatSnapshotSchedule(snapshot.scheduledAtMs);
  }
  ssrSnapshotCache.set(match.slug, { createdAt: Date.now(), value: snapshot });
  if (isRichCanonicalSnapshot(snapshot)) {
    ssrLastKnownRichSnapshot.set(match.slug, snapshot);
  }
  return snapshot;
}

function applySnapshotMatchIdentity(match, snapshot) {
  if (!match || !snapshot) {
    return match;
  }

  const team1 = cleanSnapshotIdentityText(snapshot.team1) || match.team1;
  const team2 = cleanSnapshotIdentityText(snapshot.team2) || match.team2;
  if (!team1 || !team2) {
    return match;
  }

  return Object.assign({}, match, {
    team1,
    team2,
    teams: `${team1} vs ${team2}`
  });
}

function normalizeEntityText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isExactRetainedSeriesMatch(series, seriesName, slug) {
  const candidate = normalizeEntityText(series && series.name);
  const base = normalizeEntityText(seriesName);
  if (!candidate || !base) return false;
  if (candidate === base) return true;
  // Some source match-info labels omit the gender qualifier while the series
  // directory correctly distinguishes parallel Men/Women competitions. Use
  // only the explicit canonical-slug marker; never guess from team codes.
  const qualifier = /(?:^|-)women(?:-|$)/i.test(slug) ? 'women'
    : /(?:^|-)men(?:-|$)/i.test(slug) ? 'men' : '';
  return !!qualifier && candidate === `${base} ${qualifier}`;
}

function extractStandingTeams(detail, teamCodes) {
  const rows = [];
  const standings = detail && Array.isArray(detail.standings) ? detail.standings : [];
  standings.forEach((standing) => {
    const payload = standing && Array.isArray(standing.payload) ? standing.payload : [];
    payload.forEach((row) => rows.push(row));
  });
  const required = new Set(teamCodes.map((code) => String(code || '').trim()).filter(Boolean));
  const found = [];
  rows.forEach((row) => {
    const code = String(row && (row.teamCode || row.shortName) || '').trim();
    const externalId = String(row && (row.teamExternalId || row.externalId || row.id) || '').trim();
    const name = String(row && (row.teamName || row.name) || '').trim();
    if (required.has(code) && externalId && name && !found.some((team) => team.externalId === externalId)) {
      found.push({ externalId, name, shortName: code });
    }
  });
  return found.length === required.size ? found : [];
}

async function fetchRetainedEntityNavigation(match) {
  if (!match || !match.slug) return null;
  const matchInfoResponse = await fetchJsonResponse(
    `${BACKEND_URL}/cricket-data/match-info/get?url=${encodeURIComponent(match.slug)}`,
    SSR_RETAINED_ENTITY_TIMEOUT_MS
  );
  const matchInfo = matchInfoResponse && matchInfoResponse.data;
  if (!matchInfo || String(matchInfo.match_status || matchInfo.status || '').toUpperCase() !== 'COMPLETED') return null;
  const seriesName = String(matchInfo.series_name || matchInfo.match_name || '').trim();
  const teamCodes = Object.keys(matchInfo.team_comparison || {}).filter(Boolean).slice(0, 2);
  if (!seriesName || teamCodes.length !== 2) return null;

  const seriesResponse = await fetchJsonResponse(
    `${BACKEND_URL}/crawler/player-stats/series/list?q=${encodeURIComponent(seriesName)}`,
    SSR_RETAINED_ENTITY_TIMEOUT_MS
  );
  const matches = (Array.isArray(seriesResponse && seriesResponse.data) ? seriesResponse.data : []).filter((series) =>
    series && series.externalId && isExactRetainedSeriesMatch(series, seriesName, match.slug)
  );
  if (matches.length !== 1) return null;
  const series = matches[0];
  const standingsResponse = await fetchJsonResponse(
    `${BACKEND_URL}/crawler/player-stats/series/standings?externalId=${encodeURIComponent(series.externalId)}`,
    SSR_RETAINED_ENTITY_TIMEOUT_MS
  );
  const teams = extractStandingTeams(standingsResponse && standingsResponse.data, teamCodes);
  if (teams.length !== 2) return null;
  return { slug: match.slug, series: { externalId: series.externalId, name: series.name, shortName: series.shortName || series.name }, teams };
}

function deriveSnapshotLifecycle(snapshot) {
  const status = cleanSnapshotText(snapshot && snapshot.status).toUpperCase();
  const detail = `${cleanSnapshotText(snapshot && snapshot.result)} ${cleanSnapshotText(snapshot && snapshot.lastKnownState)}`.toLowerCase();
  // Multi-day matches at stumps remain active.  This evidence must win over a
  // stale schedule row or an alias that was incorrectly retired as completed.
  if (/stumps|lead by/.test(detail) && !/won by|match (?:drawn|tied)|abandoned|no result/.test(detail)) return 'innings-break';
  if (status === 'UPCOMING') return 'upcoming';
  if (status === 'LIVE') return 'live';
  if (status === 'INNINGS_BREAK') return 'innings-break';
  if (status === 'RAIN_DELAY' || /delay|postpon/.test(detail)) return 'delayed';
  if (status === 'ABANDONED' || /abandoned|no result/.test(detail)) return 'abandoned';
  if (status === 'COMPLETED' || /won by|match (?:drawn|tied)|result/.test(detail)) return 'completed';
  if (snapshot && Number(snapshot.scheduledAtMs) > Date.now()) return 'upcoming';
  return 'neutral';
}

function canonicalizeMatchRequestUrl(originalUrl, requestedSlug, canonicalSlug) {
  if (!requestedSlug || !canonicalSlug || requestedSlug === canonicalSlug) return null;
  const escaped = requestedSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(originalUrl || '').replace(new RegExp('(/cric-live/)' + escaped + '(?=/|\\?|#|$)', 'i'), '$1' + canonicalSlug);
}

function hasFreshLiveScore(snapshot, lifecycle) {
  if (lifecycle !== 'live' && lifecycle !== 'innings-break') return false;
  if (!snapshot || !snapshot.score || !snapshot.stateUpdatedAt) return false;
  return Date.now() - snapshot.stateUpdatedAt <= SSR_LIVE_SNAPSHOT_MAX_AGE_MS;
}

function isRichCanonicalSnapshot(snapshot) {
  if (!snapshot || snapshot.validity !== 'valid' || deriveSnapshotLifecycle(snapshot) === 'neutral') return false;
  return !!(snapshot.series || snapshot.score || snapshot.result || snapshot.lastKnownState || snapshot.scheduledAt);
}

function canonicalSnapshotFingerprint(snapshot) {
  if (!snapshot) return '';
  return JSON.stringify({
    slug: snapshot.canonicalSlug || snapshot.slug,
    status: snapshot.status, team1: snapshot.team1, team2: snapshot.team2,
    series: snapshot.series, venue: snapshot.venue, toss: snapshot.toss,
    scheduledAt: snapshot.scheduledAt, score: snapshot.score, overs: snapshot.overs,
    battingTeam: snapshot.battingTeam, result: snapshot.result,
    finalResult: snapshot.finalResult, lastKnownState: snapshot.lastKnownState
  });
}

function renderedMatchDocumentKey(snapshot, pathname) {
  return `${(snapshot && (snapshot.canonicalSlug || snapshot.slug)) || ''}|${pathname || ''}`;
}

function getRenderedMatchDocument(snapshot, pathname) {
  if (!isRichCanonicalSnapshot(snapshot)) return null;
  const key = renderedMatchDocumentKey(snapshot, pathname);
  const cached = key && ssrRenderedMatchDocumentCache.get(key);
  if (!cached || cached.fingerprint !== canonicalSnapshotFingerprint(snapshot)
      || Date.now() - cached.cachedAt > SSR_RENDERED_MATCH_DOCUMENT_TTL_MS) return null;
  return cached.html;
}

function rememberRenderedMatchDocument(snapshot, pathname, html) {
  if (!isRichCanonicalSnapshot(snapshot) || !html) return;
  ssrRenderedMatchDocumentCache.set(renderedMatchDocumentKey(snapshot, pathname), {
    html,
    cachedAt: Date.now(),
    fingerprint: canonicalSnapshotFingerprint(snapshot),
  });
}

function lifecycleSummary(match, snapshot) {
  const lifecycle = deriveSnapshotLifecycle(snapshot);
  const scoreIsFresh = hasFreshLiveScore(snapshot, lifecycle);
  const scoreLine = scoreIsFresh
    ? `${snapshot.battingTeam ? `${snapshot.battingTeam} ` : ''}${snapshot.score}${snapshot.overs ? ` (${snapshot.overs} overs)` : ''}`
    : '';
  const result = cleanSnapshotText(snapshot && (snapshot.result || snapshot.lastKnownState));
  switch (lifecycle) {
    case 'upcoming': return { lifecycle, label: 'Upcoming match', copy: `${match.teams} is scheduled to begin shortly.`, scoreLine: '' };
    case 'live': return { lifecycle, label: 'Live match', copy: scoreLine ? `Live score: ${scoreLine}.` : 'The match is live; the verified snapshot does not include a current score.', scoreLine };
    case 'innings-break': return { lifecycle, label: 'Innings break', copy: scoreLine ? `Innings break: ${scoreLine}.` : 'The match is at an innings break; the verified snapshot does not include the current score.', scoreLine };
    case 'completed': return { lifecycle, label: 'Match completed', copy: result || 'This match has concluded. The final result is being confirmed.', scoreLine: '' };
    case 'delayed': return { lifecycle, label: 'Match delayed', copy: result || 'The match is delayed or postponed. Updates will appear when play resumes.', scoreLine: '' };
    case 'abandoned': return { lifecycle, label: 'Match abandoned or no result', copy: result || 'This match ended without a result or was abandoned.', scoreLine: '' };
    default: return { lifecycle, label: 'Match update', copy: 'Match data is temporarily loading. Score, commentary, and scorecard updates will appear shortly.', scoreLine: '' };
  }
}

function buildCanonicalMatchAeoFallbackHtml(match, snapshot, summary) {
  const facts = [
    ['Teams', match.teams],
    ['Status', summary.label]
  ];
  const series = cleanSnapshotText(snapshot && snapshot.series) || match.series;
  if (series) facts.push(['Series', series]);
  if (snapshot && snapshot.scheduledAt) facts.push(['Start time', snapshot.scheduledAt]);
  if (snapshot && snapshot.venue) facts.push(['Venue', snapshot.venue]);
  if (summary.scoreLine) facts.push(['Score', summary.scoreLine]);
  if (snapshot && snapshot.toss) facts.push(['Toss', snapshot.toss]);

  const factsHtml = facts.slice(0, 8).map(([label, value]) =>
    `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
  ).join('');

  return `<section id="canonical-match-aeo" data-lifecycle="${escapeHtml(summary.lifecycle)}" aria-label="Match answer">
    <span>Direct match answer</span>
    <h2>${escapeHtml(match.teams)} — ${escapeHtml(summary.label)}</h2>
    <p>${escapeHtml(summary.copy)}</p>
    <dl>${factsHtml}</dl>
  </section>`;
}

function buildCanonicalMatchFallbackHtml(req, snapshot) {
  const parsedMatch = parseCanonicalMatchSlug(req.path);
  const match = applySnapshotMatchIdentity(parsedMatch, snapshot);
  if (!match || !isRichCanonicalSnapshot(snapshot)) {
    return null;
  }

  const canonicalPath = `/cric-live/${match.slug}`;
  const canonicalUrl = `https://www.crickzen.com${canonicalPath}`;
  const series = cleanSnapshotText(snapshot && snapshot.series) || match.series;
  const summary = lifecycleSummary(match, snapshot);
  const title = series
    ? `${match.teams} ${summary.label}, ${series} | Crickzen`
    : `${match.teams} ${summary.label} | Crickzen`;
  const description = series
    ? `${summary.copy} Follow ${match.teams} score, commentary, and scorecard from ${series} on Crickzen.`
    : `${summary.copy} Follow ${match.teams} score, commentary, and scorecard on Crickzen.`;
  // Google requires both startDate and location for Event rich-result
  // eligibility. A fallback must omit SportsEvent rather than emit an invalid
  // event when the stored snapshot has not yet resolved a trustworthy venue.
  const structuredData = snapshot && snapshot.scheduledAtMs && snapshot.venue ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: match.teams,
    url: canonicalUrl,
    competitor: [
      { '@type': 'SportsTeam', name: match.team1 },
      { '@type': 'SportsTeam', name: match.team2 }
    ],
    eventStatus: summary.lifecycle === 'live' || summary.lifecycle === 'innings-break'
      ? 'https://schema.org/EventInProgress'
      : summary.lifecycle === 'completed' ? 'https://schema.org/EventCompleted'
        : summary.lifecycle === 'abandoned' ? 'https://schema.org/EventCancelled'
          : 'https://schema.org/EventScheduled',
    startDate: snapshot && snapshot.scheduledAtMs ? new Date(snapshot.scheduledAtMs).toISOString() : undefined,
    location: snapshot && snapshot.venue ? { '@type': 'Place', name: snapshot.venue } : undefined,
    description
  }).replace(/</g, '\\u003c') : '';
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
    structuredData ? `<script type="application/ld+json">${structuredData}</script>` : ''
  ].join('');
  const aeoBlock = buildCanonicalMatchAeoFallbackHtml(match, snapshot, summary);
  const body = `<main id="canonical-match-ssr-fallback" data-ssr-fallback="canonical-match">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/live-score">Live Cricket Scores</a>${series ? ` <span aria-hidden="true">/</span> <span>${escapeHtml(series)}</span>` : ''}</nav>
    <h1>${escapeHtml(match.teams)} — ${escapeHtml(summary.label)}</h1>
    ${aeoBlock}
    ${series ? `<p>${escapeHtml(series)}</p>` : ''}
    ${snapshot && snapshot.scheduledAt ? `<p>Scheduled: ${escapeHtml(snapshot.scheduledAt)}</p>` : ''}
    ${snapshot && snapshot.venue ? `<p>Venue: ${escapeHtml(snapshot.venue)}</p>` : ''}
    ${snapshot && snapshot.toss ? `<p>${escapeHtml(snapshot.toss)}</p>` : ''}
    <p>${escapeHtml(summary.copy)}</p>
    <p><a href="${canonicalPath}">${escapeHtml(match.teams)} match centre</a> · <a href="/live-score">Live cricket scores</a> · <a href="/cricket-schedule/today">Today’s cricket schedule</a></p>
  </main>`;

  return indexHtml
    .replace(/<title>[^<]*<\/title>/i, head)
    .replace(/<app-root><\/app-root>/i, `<app-root>${body}</app-root>`);
}

function buildCanonicalMatchUnavailableHtml() {
  const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8').replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  const head = '<title>Match data temporarily unavailable | Crickzen</title><meta name="robots" content="noindex,follow"><meta name="description" content="Match data is temporarily unavailable. Please retry shortly.">';
  return indexHtml.replace(/<title>[^<]*<\/title>/i, head)
    .replace(/<app-root><\/app-root>/i, '<app-root><main id="canonical-match-unavailable"><h1>Match data temporarily unavailable</h1><p>Please retry shortly.</p></main></app-root>');
}

function buildCanonicalMatchNotFoundHtml(req) {
  const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8').replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  const head = '<title>Cricket Match Not Found | Crickzen</title><meta name="robots" content="noindex,follow"><meta name="description" content="This cricket match URL could not be resolved.">';
  const body = '<main id="canonical-match-not-found"><h1>Cricket match not found</h1><p>This match URL could not be resolved. Browse live scores or today’s schedule for current cricket coverage.</p><p><a href="/live-score">Live cricket scores</a> · <a href="/cricket-schedule/today">Today’s cricket schedule</a></p></main>';
  return indexHtml.replace(/<title>[^<]*<\/title>/i, head).replace(/<app-root><\/app-root>/i, `<app-root>${body}</app-root>`);
}

async function sendSsrFallback(req, res, routeStatus, reason) {
  const routeMatch = routeStatus === 200 ? parseCanonicalMatchSlug(req.path) : null;
  const seriesRequest = routeStatus === 200 ? parseSeriesRequest(req.path) : null;
  const startedAt = Date.now();
  const snapshot = routeMatch ? (req.canonicalMatchSnapshot || await fetchCanonicalMatchSnapshot(routeMatch)) : null;
  if (routeMatch && snapshot && snapshot.validity === 'invalid') {
    res.status(404).send(buildCanonicalMatchNotFoundHtml(req));
    return;
  }
  const canonicalFallback = routeMatch && buildCanonicalMatchFallbackHtml(req, snapshot);
  if (canonicalFallback) {
    const lifecycle = deriveSnapshotLifecycle(snapshot);
    console.error('[SSR] Canonical match fallback', { url: req.originalUrl, reason, snapshot: snapshot && snapshot.validity === 'valid' ? snapshot.source || 'backend' : 'route', lifecycle, fallbackMs: Date.now() - startedAt });
    res.setHeader('X-SSR-Fallback', 'canonical-match');
    res.setHeader('X-SSR-Fallback-Level', snapshot && snapshot.validity === 'valid' ? 'snapshot' : 'route');
    res.setHeader('X-SSR-Lifecycle', lifecycle);
    res.status(200).send(canonicalFallback);
    return;
  }

  if (seriesRequest) {
    const seriesFallback = buildSeriesProfileFallbackHtml(req, await fetchSeriesProfileFallbackData(seriesRequest));
    if (seriesFallback) {
      console.error('[SSR] Series profile fallback', {
        url: req.originalUrl,
        reason,
        section: seriesRequest.section,
        fallbackMs: Date.now() - startedAt
      });
      res.setHeader('X-SSR-Fallback', 'series-profile');
      res.setHeader('X-SSR-Fallback-Level', 'source-data');
      res.status(200).send(seriesFallback);
      return;
    }
  }

  if (routeMatch) {
    res.setHeader('Retry-After', '60');
    res.setHeader('X-SSR-Fallback', 'unavailable-no-rich-snapshot');
    res.status(503).send(buildCanonicalMatchUnavailableHtml());
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

app.get('*', async (req, res) => {
  const canonicalMatch = parseCanonicalMatchSlug(req.path);
  if (/^\/cric-live\//.test(req.path) && !canonicalMatch) {
    res.status(404).send(buildCanonicalMatchNotFoundHtml(req));
    return;
  }

  if (canonicalMatch) {
    req.canonicalMatchSnapshot = await fetchCanonicalMatchSnapshot(canonicalMatch);
    if (req.canonicalMatchSnapshot && req.canonicalMatchSnapshot.validity === 'invalid') {
      console.warn('[SSR] Canonical match route not found', { url: req.originalUrl });
      res.status(404).send(buildCanonicalMatchNotFoundHtml(req));
      return;
    }
    const redirectTo = canonicalizeMatchRequestUrl(req.originalUrl, canonicalMatch.slug,
      req.canonicalMatchSnapshot && req.canonicalMatchSnapshot.canonicalSlug);
    if (redirectTo) {
      res.redirect(301, redirectTo);
      return;
    }
    // A rich, canonical document is safe to reuse only while the lifecycle
    // snapshot it was rendered from is unchanged. This keeps all SSR content
    // (rather than a reduced fallback) available to crawlers at cache speed.
    const cachedDocument = getRenderedMatchDocument(req.canonicalMatchSnapshot, req.path);
    if (cachedDocument) {
      applyRouteCacheHeaders(req, res);
      res.setHeader('X-SSR-Document-Cache', 'hit');
      res.status(200).send(cachedDocument);
      return;
    }
    // Retained result pages need exact series/team IDs in their first HTML
    // response. Upcoming and live pages must remain schedule/score-first and
    // must not wait on retained-result entity fan-out that cannot improve their
    // primary answer.
    const snapshotLifecycle = deriveSnapshotLifecycle(req.canonicalMatchSnapshot);
    // Upcoming pages are schedule documents first. Do not spend the full
    // Angular render budget waiting for live score/model/commentary fan-out
    // that does not exist before a match starts.
    if (snapshotLifecycle === 'upcoming') {
      const scheduleFirstHtml = buildCanonicalMatchFallbackHtml(req, req.canonicalMatchSnapshot);
      if (scheduleFirstHtml) {
        rememberRenderedMatchDocument(req.canonicalMatchSnapshot, req.path, scheduleFirstHtml);
        applyRouteCacheHeaders(req, res);
        res.setHeader('X-SSR-Fallback', 'canonical-match');
        res.setHeader('X-SSR-Fallback-Level', 'schedule-first');
        res.setHeader('X-SSR-Lifecycle', 'upcoming');
        res.setHeader('X-SSR-Document-Cache', 'miss');
        res.status(200).send(scheduleFirstHtml);
        return;
      }
    }
    if (snapshotLifecycle === 'completed' || snapshotLifecycle === 'abandoned') {
      req.retainedEntityNavigation = await fetchRetainedEntityNavigation(canonicalMatch);
    }
  }

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
    const canonicalizedHtml = canonicalMatch
      ? applyCanonicalSnapshotToSsrHtml(html, req.canonicalMatchSnapshot)
      : html;
    const finalHtml = moveTransferStateBeforeBundles(applyRetainedEntitySsrLinks(canonicalizedHtml, req.retainedEntityNavigation));
    if (canonicalMatch && routeStatus === 200) {
      rememberRenderedMatchDocument(req.canonicalMatchSnapshot, req.path, finalHtml);
      res.setHeader('X-SSR-Document-Cache', 'miss');
    }
    res.status(routeStatus).send(finalHtml);
  });
});

const server = app.listen(PORT, () => {
  console.log(`[frontend] Angular SSR listening on http://localhost:${PORT}`);
});

server.on('upgrade', apiProxy.upgrade);
