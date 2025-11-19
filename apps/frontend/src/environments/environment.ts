// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  ws: {
    // WebSocket through Nginx proxy - works for Docker builds
    // For local dev with `ng serve`, you may need to configure proxy in angular.json
    brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/websocket`,
    login: 'guest',
    passcode: 'guest'
  },
  // All API calls go through Nginx proxy at /api
  // This works for Docker builds. For local `ng serve`, configure proxy in angular.json
  apiUrl: '/api',
  REST_API_URL: '/api/',
  REST_API_SCRAPING_URL: '/api/',
  // Blog/Strapi configuration
  strapiApiUrl: '/api/blog',
  strapiMediaUrl: '/api/blog/uploads'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
