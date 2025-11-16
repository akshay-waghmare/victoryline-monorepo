export const environment = {
  production: true,
  ws: {
    // WebSocket through Nginx proxy - uses relative path for portability
    brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/websocket`,
    login: 'guest',
    passcode: 'guest'
  },
  // All API calls go through Nginx proxy at /api
  apiUrl: '/api',
  REST_API_URL: '/api/',
  REST_API_SCRAPING_URL: '/api/',
  // Ghost CMS API through Caddy proxy - uses production domain
  ghostApiUrl: 'https://crickzen.com/ghost/api/content',
  ghostApiKey: '30d103b8c5c578c76a6c0d1283' // REPLACE with production Ghost Content API key after setup
};
