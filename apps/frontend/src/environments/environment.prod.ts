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
  REST_API_SCRAPING_URL: '/api/'
};
