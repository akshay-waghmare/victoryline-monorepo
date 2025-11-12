// Minimal SSR/Express placeholder for Phase 1 setup
// Note: Angular Universal integration will be added later.
declare const process: any;
// @ts-ignore - types not installed in this placeholder
import express from 'express';
// @ts-ignore - types not installed in this placeholder
import helmet from 'helmet';
import { getOgImageForMatch } from './src/app/seo/og-images';

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

// Live match SSR route with canonical handoff to final URL
app.get('/cric-live/:id', (req, res, next) => {
  try {
    const id = req.params.id;
    const canonicalHost = 'https://www.crickzen.com';
    const livePath = `/cric-live/${encodeURIComponent(id)}`;
    
    // TODO: Fetch match data from backend to build finalUrl
    // For now, use placeholder logic - in production, fetch from API
    const finalUrl = `/match/placeholder/${id}`; // Replace with actual season-scoped URL
    const canonicalUrl = new URL(finalUrl, canonicalHost).toString();

    const title = `Live: Match ${id} | Crickzen`;
    const description = `Live score, ball-by-ball updates for match ${id} on Crickzen.`;
    const ogImage = new URL(getOgImageForMatch(id), canonicalHost).toString();

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `Match ${id}`,
      startDate: new Date().toISOString(),
      eventStatus: 'InProgress',
      homeTeam: { '@type': 'SportsTeam', name: 'TBD' },
      awayTeam: { '@type': 'SportsTeam', name: 'TBD' },
    };

    const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalHost },
      { '@type': 'ListItem', position: 2, name: 'Live Matches', item: `${canonicalHost}/live` },
      { '@type': 'ListItem', position: 3, name: `Match ${id}`, item: `${canonicalHost}${livePath}` },
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

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[/cric-live/:id SSR Error]', error);
    next(error);
  }
});

// Placeholder SSR routes (to be implemented with Angular Universal)
app.get('/match/:id', (req, res, next) => {
  try {
    const id = req.params.id;
    const canonicalHost = 'https://www.crickzen.com';
    const path = `/match/${encodeURIComponent(id)}`;
    const canonicalUrl = new URL(path, canonicalHost).toString();

    const stateCandidate = (req.query.state as string | undefined)?.toLowerCase() as MatchState | undefined;
    const state = CACHE_CONTROL_BY_STATE[stateCandidate ?? 'scheduled'] ? stateCandidate ?? inferMatchState(id) : inferMatchState(id);
    const title = `Match ${id} | Crickzen`;
    const description = `Live score, squads and updates for match ${id} on Crickzen.`;
    const ogImage = new URL(getOgImageForMatch(id), canonicalHost).toString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `Match ${id}`,
    startDate: new Date().toISOString(),
    eventStatus: 'Scheduled',
    homeTeam: { '@type': 'SportsTeam', name: 'TBD' },
    awayTeam: { '@type': 'SportsTeam', name: 'TBD' },
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalHost },
      { '@type': 'ListItem', position: 2, name: 'Matches', item: `${canonicalHost}/matches` },
      { '@type': 'ListItem', position: 3, name: `Match ${id}`, item: canonicalUrl },
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
      <meta property="og:title" content="${title}"/>
      <meta property="og:description" content="${description}"/>
      <meta property="og:image" content="${ogImage}"/>
      <meta property="og:url" content="${canonicalUrl}"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
    </head>
    <body>
      <div id="app">SSR placeholder for ${title}</div>
    </body>
  </html>`;

    applyCacheHeaders(res, state);
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
