require('zone.js/dist/zone-node');

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const domino = require('domino');
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
  /^\/teams\/?$/,
  /^\/series\/?$/,
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
    res.status(routeStatus).sendFile(INDEX_HTML);
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
      res.status(routeStatus).sendFile(INDEX_HTML);
      return;
    }
    res.status(routeStatus).send(html);
  });
});

const server = app.listen(PORT, () => {
  console.log(`[frontend] Angular SSR listening on http://localhost:${PORT}`);
});

server.on('upgrade', apiProxy.upgrade);
