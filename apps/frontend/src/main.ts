import 'hammerjs';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Hydration / runtime error beacon sender
function sendHydrationBeacon(type: string, data: any) {
  try {
    const payload = {
      t: type,
      ts: Date.now(),
      u: window.location.href,
      d: (data && (data.stack || data.message)) || String(data)
    };
    navigator.sendBeacon && navigator.sendBeacon('/api/v1/seo/hydration-log', JSON.stringify(payload));
  } catch (e) {
    // silent
  }
}

window.addEventListener('error', (e) => {
  sendHydrationBeacon('error', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  sendHydrationBeacon('unhandledrejection', e.reason);
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => {
    console.error(err);
    sendHydrationBeacon('bootstrap-failure', err);
  });

