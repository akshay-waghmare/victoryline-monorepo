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

function getCacheControlForState(state: MatchState): string {
  switch (state) {
    case 'live':
      return 'public, max-age=5, stale-while-revalidate=55';
    case 'scheduled':
      return 'public, max-age=60, stale-while-revalidate=300';
    case 'completed':
      return 'public, max-age=3600, stale-while-revalidate=86400';
    case 'archived':
      return 'public, max-age=86400, immutable';
    default:
      return 'public, max-age=60';
  }
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

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'frontend-ssr-placeholder' });
});

// Placeholder SSR routes (to be implemented with Angular Universal)
app.get('/match/:id', (req, res) => {
  const id = req.params.id;
  const canonicalHost = 'https://www.crickzen.com';
  const path = `/match/${encodeURIComponent(id)}`;
  const canonicalUrl = new URL(path, canonicalHost).toString();

  const state = inferMatchState(id);
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

  res.setHeader('Cache-Control', getCacheControlForState(state));
  res.status(200).type('html').send(html);
});

app.get(['/team/:id', '/player/:id'], (req, res) => {
  res.status(501).send(`SSR not yet implemented for ${req.path}. Placeholder server running.`);
});

// Static assets (if built)
app.use('/static', express.static('dist'));

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[frontend] SSR placeholder listening on http://localhost:${port}`);
});
