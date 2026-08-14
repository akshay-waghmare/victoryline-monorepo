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
const SSR_LIVE_SNAPSHOT_MAX_AGE_MS = process.env.SSR_LIVE_SNAPSHOT_MAX_AGE_MS ? Number(process.env.SSR_LIVE_SNAPSHOT_MAX_AGE_MS) : 180000;
const SSR_RETAINED_ENTITY_TIMEOUT_MS = process.env.SSR_RETAINED_ENTITY_TIMEOUT_MS ? Number(process.env.SSR_RETAINED_ENTITY_TIMEOUT_MS) : 1200;
const ssrSnapshotCache = new Map();
// Availability must never downgrade an indexable match page to generic copy.
// Keep the last complete match document for this SSR process until a newer
// canonical snapshot replaces it.
const ssrLastKnownRichSnapshot = new Map();
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

function lifecycleSummary(match, snapshot) {
  const lifecycle = deriveSnapshotLifecycle(snapshot);
  const scoreIsFresh = hasFreshLiveScore(snapshot, lifecycle);
  const scoreLine = scoreIsFresh
    ? `${snapshot.battingTeam ? `${snapshot.battingTeam} ` : ''}${snapshot.score}${snapshot.overs ? ` (${snapshot.overs} overs)` : ''}`
    : '';
  const result = cleanSnapshotText(snapshot && (snapshot.result || snapshot.lastKnownState));
  switch (lifecycle) {
    case 'upcoming': return { lifecycle, label: 'Upcoming match', copy: `${match.teams} is scheduled to begin shortly.`, scoreLine: '' };
    case 'live': return { lifecycle, label: 'Live match', copy: scoreLine ? `Live score: ${scoreLine}.` : 'Live match data is temporarily unavailable; updates will appear shortly.', scoreLine };
    case 'innings-break': return { lifecycle, label: 'Innings break', copy: scoreLine ? `Innings break: ${scoreLine}.` : 'The match is at an innings break; the next update will appear shortly.', scoreLine };
    case 'completed': return { lifecycle, label: 'Match completed', copy: result || 'This match has concluded. The final result is being confirmed.', scoreLine: '' };
    case 'delayed': return { lifecycle, label: 'Match delayed', copy: result || 'The match is delayed or postponed. Updates will appear when play resumes.', scoreLine: '' };
    case 'abandoned': return { lifecycle, label: 'Match abandoned or no result', copy: result || 'This match ended without a result or was abandoned.', scoreLine: '' };
    default: return { lifecycle, label: 'Match update', copy: 'Match data is temporarily loading. Score, commentary, and scorecard updates will appear shortly.', scoreLine: '' };
  }
}

function buildCanonicalMatchFallbackHtml(req, snapshot) {
  const match = parseCanonicalMatchSlug(req.path);
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
  const body = `<main id="canonical-match-ssr-fallback" data-ssr-fallback="canonical-match">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/live-score">Live Cricket Scores</a>${series ? ` <span aria-hidden="true">/</span> <span>${escapeHtml(series)}</span>` : ''}</nav>
    <h1>${escapeHtml(match.teams)} — ${escapeHtml(summary.label)}</h1>
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
    // Retained result pages need exact series/team IDs in their first HTML
    // response. Resolve only a unique exact series and its own standings
    // before Angular begins SSR; any uncertainty safely leaves this unset.
    req.retainedEntityNavigation = await fetchRetainedEntityNavigation(canonicalMatch);
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
    res.status(routeStatus).send(moveTransferStateBeforeBundles(applyRetainedEntitySsrLinks(html, req.retainedEntityNavigation)));
  });
});

const server = app.listen(PORT, () => {
  console.log(`[frontend] Angular SSR listening on http://localhost:${PORT}`);
});

server.on('upgrade', apiProxy.upgrade);
