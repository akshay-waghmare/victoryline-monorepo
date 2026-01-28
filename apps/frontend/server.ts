// Minimal SSR/Express placeholder for Phase 1 setup
// Note: Angular Universal integration will be added later.
declare const process: any;
// @ts-ignore - types not installed in this placeholder
import express from 'express';
// @ts-ignore - types not installed in this placeholder
import helmet from 'helmet';
import { getOgImageForMatch } from './src/app/seo/og-images';

// =============================================================================
// SEO HELPER FUNCTIONS (Feature 008 - Match Page Title SEO Optimization)
// =============================================================================

/**
 * Fetch match data from Backend API for SSR title generation (T008)
 * Implements FR-002: Use exact official team names
 */
async function fetchMatchData(matchId: string): Promise<{
  homeTeam: string;
  awayTeam: string;
  status: 'live' | 'scheduled' | 'completed' | 'abandoned';
}> {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8099';
  const FETCH_TIMEOUT = 200; // 200ms timeout per spec
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    
    const response = await fetch(`${BACKEND_URL}/api/matches/${matchId}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    return {
      homeTeam: data.homeTeam || data.team1 || 'TBD',
      awayTeam: data.awayTeam || data.team2 || 'TBD',
      status: normalizeMatchStatus(data.status || data.matchStatus)
    };
  } catch (error) {
    console.error('[SSR] Failed to fetch match data:', error);
    // T013: Fallback handling for failed API calls
    return { homeTeam: 'TBD', awayTeam: 'TBD', status: 'scheduled' };
  }
}

/**
 * Normalize match status to standard values (T011 helper)
 */
function normalizeMatchStatus(status: string): 'live' | 'scheduled' | 'completed' | 'abandoned' {
  const normalized = (status || '').toLowerCase().trim();
  
  if (['live', 'in-progress', 'in_progress', 'ongoing', 'innings break'].includes(normalized)) {
    return 'live';
  }
  if (['completed', 'finished', 'ended', 'result'].includes(normalized)) {
    return 'completed';
  }
  if (['abandoned', 'cancelled', 'no result', 'no_result'].includes(normalized)) {
    return 'abandoned';
  }
  return 'scheduled';
}

/**
 * Escape special characters for safe HTML embedding (T012)
 * Implements FR-011: Handle special characters in team names
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate SEO-optimized match page title (T009, T011)
 * Implements FR-001: Dynamic title with team names
 * Implements FR-012: Title ≤60 characters
 * Implements FR-014: Status-aware title variations
 */
function generateMatchTitle(homeTeam: string, awayTeam: string, status: string): string {
  const teams = `${homeTeam} vs ${awayTeam}`;
  let suffix: string;
  
  // T011: Status-aware suffix mapping
  switch (status.toLowerCase()) {
    case 'completed':
    case 'finished':
      suffix = ' Final Score | Full Scorecard';
      break;
    case 'abandoned':
    case 'cancelled':
      suffix = ' Match Scorecard';
      break;
    default:
      // Live, scheduled, or unknown → default to live format for SEO
      suffix = ' Live Score Ball by Ball';
  }
  
  const fullTitle = teams + suffix;
  
  // FR-012: Truncate if >60 chars
  if (fullTitle.length > 60) {
    const maxTeamsLength = 60 - suffix.length - 3; // 3 for "..."
    const truncated = teams.substring(0, maxTeamsLength);
    const lastSpace = truncated.lastIndexOf(' ');
    const cleanTruncated = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
    return escapeHtml(cleanTruncated) + '...' + suffix;
  }
  
  return escapeHtml(fullTitle);
}

/**
 * Generate SEO-optimized meta description (T010)
 * Implements FR-013: CTR-optimized descriptions ≤155 characters
 */
function generateMatchDescription(homeTeam: string, awayTeam: string, status: string): string {
  const teams = `${homeTeam} vs ${awayTeam}`;
  let description: string;
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'finished':
      description = `${teams} final score, full scorecard, match summary, and highlights on Crickzen.`;
      break;
    case 'abandoned':
    case 'cancelled':
      description = `${teams} match scorecard and status updates on Crickzen.`;
      break;
    default:
      description = `${teams} live score, ball by ball commentary, latest runs, wickets, overs, and match updates.`;
  }
  
  // Truncate if >155 chars (with ellipsis)
  if (description.length > 155) {
    return escapeHtml(description.substring(0, 152)) + '...';
  }
  
  return escapeHtml(description);
}

// =============================================================================
// CACHE CONTROL CONFIGURATION
// =============================================================================


// Page state cache policy mapping
// live: max-age=5, stale-while-revalidate=55
// scheduled: max-age=60
// completed: max-age=3600
// archived: max-age=86400 (may be excluded later)
type MatchState = 'live' | 'scheduled' | 'completed' | 'archived';

type CachePolicy = {
  browser: string;
  edge: string;
};

// Cache policies map match state to browser/edge directives per SEO spec.
const CACHE_CONTROL_BY_STATE: Record<MatchState, CachePolicy> = {
  live: {
    browser: 'public, max-age=5, stale-while-revalidate=55',
    edge: 'public, max-age=5, stale-while-revalidate=55',
  },
  scheduled: {
    browser: 'public, max-age=60, stale-while-revalidate=300',
    edge: 'public, max-age=60, stale-while-revalidate=300',
  },
  completed: {
    browser: 'public, max-age=3600, stale-while-revalidate=86400',
    edge: 'public, max-age=3600, stale-while-revalidate=86400',
  },
  archived: {
    browser: 'public, max-age=86400, immutable',
    edge: 'public, max-age=86400, immutable',
  },
};

function getCacheControlForState(state: MatchState): string {
  return CACHE_CONTROL_BY_STATE[state]?.browser ?? CACHE_CONTROL_BY_STATE.scheduled.browser;
}

function applyCacheHeaders(res: express.Response, state: MatchState): void {
  const policy = CACHE_CONTROL_BY_STATE[state] ?? CACHE_CONTROL_BY_STATE.scheduled;

  res.setHeader('Cache-Control', policy.browser);
  res.setHeader('CDN-Cache-Control', policy.edge);
  res.setHeader('Surrogate-Control', policy.edge);
  res.setHeader('X-SSR-Cache-State', state);
}

// Temporary heuristic until real data integration:
// If id ends with L -> live, S -> scheduled, C -> completed, else scheduled.
function inferMatchState(matchId: string): MatchState {
  if (/L$/i.test(matchId)) return 'live';
  if (/S$/i.test(matchId)) return 'scheduled';
  if (/C$/i.test(matchId)) return 'completed';
  return 'scheduled';
}

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(helmet());
app.disable('x-powered-by');

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SSR Error]', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Fall back to CSR for critical errors
  const csrFallbackHtml = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Crickzen - Cricket Live Scores</title>
      <meta name="description" content="Live cricket scores, ball-by-ball updates, and match statistics."/>
      <link rel="canonical" href="https://www.crickzen.com${req.path}"/>
    </head>
    <body>
      <div id="app">Loading...</div>
      <script>
        // CSR fallback - load Angular app
        window.SSR_ERROR = true;
        console.warn('[SSR] Falling back to client-side rendering due to server error');
      </script>
      <noscript>JavaScript is required to view this page.</noscript>
    </body>
  </html>`;

  res.status(500).type('html').send(csrFallbackHtml);
});

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'frontend-ssr-placeholder' });
});

// Live match SSR route with dynamic team-based titles (Feature 008)
// T014: Updated to use fetchMatchData() and inject dynamic title
app.get('/cric-live/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const canonicalHost = 'https://www.crickzen.com';
    
    // T014: Fetch match data from Backend API for dynamic title generation
    const match = await fetchMatchData(id);
    
    // T016, T017: Generate dynamic title and description with team names
    const title = generateMatchTitle(match.homeTeam, match.awayTeam, match.status);
    const description = generateMatchDescription(match.homeTeam, match.awayTeam, match.status);
    
    // T018: Canonical URL uses /cric-live/ format per FR-007
    const livePath = `/cric-live/${encodeURIComponent(id)}`;
    const canonicalUrl = new URL(livePath, canonicalHost).toString();
    
    const ogImage = new URL(getOgImageForMatch(id), canonicalHost).toString();

    // Enhanced JSON-LD with actual team names
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${match.homeTeam} vs ${match.awayTeam}`,
      startDate: new Date().toISOString(),
      eventStatus: match.status === 'live' ? 'EventScheduled' : 
                   match.status === 'completed' ? 'EventEnded' : 
                   match.status === 'abandoned' ? 'EventCancelled' : 'EventScheduled',
      homeTeam: { '@type': 'SportsTeam', name: match.homeTeam },
      awayTeam: { '@type': 'SportsTeam', name: match.awayTeam },
    };

    const breadcrumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalHost },
        { '@type': 'ListItem', position: 2, name: 'Live Matches', item: `${canonicalHost}/live` },
        { '@type': 'ListItem', position: 3, name: `${match.homeTeam} vs ${match.awayTeam}`, item: canonicalUrl },
      ],
    };

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>${title}</title>
      <meta name="description" content="${description}"/>
      <link rel="canonical" href="${canonicalUrl}"/>
      <meta name="robots" content="index,follow"/>
      <meta property="og:title" content="${title}"/>
      <meta property="og:description" content="${description}"/>
      <meta property="og:image" content="${ogImage}"/>
      <meta property="og:url" content="${canonicalUrl}"/>
      <meta property="og:type" content="website"/>
      <meta property="og:site_name" content="Crickzen"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:site" content="@crickzen"/>
      <meta name="twitter:title" content="${title}"/>
      <meta name="twitter:description" content="${description}"/>
      <meta name="twitter:image" content="${ogImage}"/>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
    </head>
    <body>
      <div id="app-root">Loading live match...</div>
      <noscript>JavaScript is required for live updates.</noscript>
    </body>
  </html>`;

    // T019: Cache-control headers based on match status
    const cacheState = match.status === 'live' ? 'live' : 
                       match.status === 'completed' ? 'completed' : 'scheduled';
    applyCacheHeaders(res, cacheState as MatchState);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[/cric-live/:id SSR Error]', error);
    next(error);
  }
});

// Match page SSR route with dynamic team-based titles (Feature 008)
// T015: Updated to use fetchMatchData() and inject dynamic title
app.get('/match/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const canonicalHost = 'https://www.crickzen.com';
    
    // T015: Fetch match data from Backend API for dynamic title generation
    const match = await fetchMatchData(id);
    
    // Generate dynamic title and description with team names
    const title = generateMatchTitle(match.homeTeam, match.awayTeam, match.status);
    const description = generateMatchDescription(match.homeTeam, match.awayTeam, match.status);
    
    // Canonical URL for match page
    const path = `/match/${encodeURIComponent(id)}`;
    const canonicalUrl = new URL(path, canonicalHost).toString();
    
    const ogImage = new URL(getOgImageForMatch(id), canonicalHost).toString();

    // Determine cache state from match status
    const cacheState = match.status === 'live' ? 'live' : 
                       match.status === 'completed' ? 'completed' : 'scheduled';

    // Enhanced JSON-LD with actual team names
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${match.homeTeam} vs ${match.awayTeam}`,
      startDate: new Date().toISOString(),
      eventStatus: match.status === 'live' ? 'EventScheduled' : 
                   match.status === 'completed' ? 'EventEnded' : 
                   match.status === 'abandoned' ? 'EventCancelled' : 'EventScheduled',
      homeTeam: { '@type': 'SportsTeam', name: match.homeTeam },
      awayTeam: { '@type': 'SportsTeam', name: match.awayTeam },
    };

    const breadcrumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalHost },
        { '@type': 'ListItem', position: 2, name: 'Matches', item: `${canonicalHost}/matches` },
        { '@type': 'ListItem', position: 3, name: `${match.homeTeam} vs ${match.awayTeam}`, item: canonicalUrl },
      ],
    };

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>${title}</title>
      <meta name="description" content="${description}"/>
      <link rel="canonical" href="${canonicalUrl}"/>
      <meta name="robots" content="index,follow"/>
      <meta property="og:title" content="${title}"/>
      <meta property="og:description" content="${description}"/>
      <meta property="og:image" content="${ogImage}"/>
      <meta property="og:url" content="${canonicalUrl}"/>
      <meta property="og:type" content="website"/>
      <meta property="og:site_name" content="Crickzen"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:site" content="@crickzen"/>
      <meta name="twitter:title" content="${title}"/>
      <meta name="twitter:description" content="${description}"/>
      <meta name="twitter:image" content="${ogImage}"/>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
    </head>
    <body>
      <div id="app">Loading match details...</div>
      <noscript>JavaScript is required to view this page.</noscript>
    </body>
  </html>`;

    applyCacheHeaders(res, cacheState as MatchState);
    res.status(200).type('html').send(html);
  } catch (error) {
    console.error('[/match/:id SSR Error]', error);
    next(error);
  }
});

app.get(['/team/:id', '/player/:id'], (req, res, next) => {
  try {
    applyCacheHeaders(res, 'scheduled');
    res.status(501).send(`SSR not yet implemented for ${req.path}. Placeholder server running.`);
  } catch (error) {
    console.error('[SSR Error]', error);
    next(error);
  }
});

// Static assets (if built)
app.use('/static', express.static('dist'));

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[frontend] SSR placeholder listening on http://localhost:${port}`);
});
